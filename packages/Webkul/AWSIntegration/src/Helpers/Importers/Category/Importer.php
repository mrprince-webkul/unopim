<?php

namespace Webkul\AWSIntegration\Helpers\Importers\Category;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Webkul\DAM\Models\Asset;
use Webkul\DAM\Repositories\AssetRepository;
use Webkul\DataTransfer\Helpers\Importers\Category\Importer as BaseImporter;

class Importer extends BaseImporter
{
    /**
     * {@inheritdoc}
     */
    public function prepareCategories(array $rowData, array &$categories): void
    {
        $categoryFields = $this->getCategoryFields();

        if (class_exists(Asset::class)) {
            $assetRepository = app(AssetRepository::class);

            foreach ($rowData as $field => $value) {
                if (! in_array($field, $categoryFields) || is_null($value)) {
                    continue;
                }

                $catalogField = $this->categoryFieldRepository->where('code', $field)->first();

                if (! $catalogField || $catalogField->type !== Asset::ASSET_ATTRIBUTE_TYPE) {
                    continue;
                }

                unset($rowData[$field]);

                if (empty($value)) {
                    continue;
                }

                $assets = [];

                foreach (explode(',', $value) as $v) {
                    $asset = $assetRepository->findWhereIn('path', [trim($v)])->first();

                    if ($asset) {
                        $assets[] = $asset->id;
                    }
                }

                if ($assets) {
                    $code = $rowData['code'];

                    if ($this->isCategoryExist($code)) {
                        $categories['update'][$code]['additional_data']['common'][$field] = implode(',', $assets);
                    } else {
                        $categories['insert'][$code]['additional_data']['common'][$field] = implode(',', $assets);
                    }
                }
            }
        }

        $s3ImageValues = [];
        $imageDirPath = $this->import->images_directory_path ?? '';

        if (config('filesystems.default') === 's3' && ! empty($imageDirPath)) {
            foreach ($rowData as $field => $value) {
                if (! in_array($field, $categoryFields) || empty($value)) {
                    continue;
                }

                $catalogField = $this->categoryFieldRepository->where('code', $field)->first();

                if (! $catalogField || ! in_array($catalogField->type, ['image', 'file', 'gallery'])) {
                    continue;
                }

                $csvValues = array_map('trim', explode(',', $value));
                $uploadedPaths = [];

                foreach ($csvValues as $csvValue) {
                    if (empty($csvValue)) {
                        continue;
                    }

                    $localPath = 'public/'.rtrim($imageDirPath, '/').'/'.ltrim($csvValue, '/');

                    if (! Storage::disk('local')->exists($localPath)) {
                        continue;
                    }

                    $s3Key = ltrim($csvValue, '/');

                    if (! Storage::disk('s3')->exists($s3Key)) {
                        Storage::disk('s3')->put($s3Key, Storage::disk('local')->get($localPath));
                    }

                    $uploadedPaths[] = $s3Key;
                }

                if (! empty($uploadedPaths)) {
                    unset($rowData[$field]);
                    $s3ImageValues[$field] = [
                        'value'            => implode(',', $uploadedPaths),
                        'value_per_locale' => $catalogField->value_per_locale,
                    ];
                }
            }
        }

        if (config('filesystems.default') !== 's3') {
            parent::prepareCategories($rowData, $categories);
        } else {
            $originalDisk = config('filesystems.default');
            Config::set('filesystems.default', 'public');

            try {
                parent::prepareCategories($rowData, $categories);
            } finally {
                Config::set('filesystems.default', $originalDisk);
            }
        }

        if (! empty($s3ImageValues)) {
            $code = $rowData['code'];
            $isExisting = $this->isCategoryExist($code);
            $key = $isExisting ? 'update' : 'insert';
            $locale = $rowData['locale'] ?? null;

            foreach ($s3ImageValues as $field => $fieldData) {
                if ($fieldData['value_per_locale'] && $locale) {
                    $categories[$key][$code]['additional_data']['locale_specific'][$locale][$field] = $fieldData['value'];
                } else {
                    $categories[$key][$code]['additional_data']['common'][$field] = $fieldData['value'];
                }
            }
        }
    }

    /**
     * Temporarily switch the default filesystem disk back to 'public' during
     * row validation so that FileOrImageValidValue::Storage::exists() checks
     * the local public disk instead of S3.
     */
    public function validateRow(array $rowData, int $rowNumber): bool
    {
        if (config('filesystems.default') !== 's3') {
            return parent::validateRow($rowData, $rowNumber);
        }

        $originalDisk = config('filesystems.default');
        Config::set('filesystems.default', 'public');

        try {
            return parent::validateRow($rowData, $rowNumber);
        } finally {
            Config::set('filesystems.default', $originalDisk);
        }
    }
}
