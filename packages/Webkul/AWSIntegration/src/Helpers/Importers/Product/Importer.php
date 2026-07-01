<?php

namespace Webkul\AWSIntegration\Helpers\Importers\Product;

use Illuminate\Support\Facades\Config;
use Webkul\DAM\Models\Asset;
use Webkul\DAM\Repositories\AssetRepository;
use Webkul\DataTransfer\Helpers\Importers\Product\Importer as BaseImporter;

class Importer extends BaseImporter
{
    /**
     * {@inheritdoc}
     */
    public function prepareAttributeValues(array $rowData, array &$attributeValues): void
    {
        if (class_exists(Asset::class)) {
            $assetRepository = app(AssetRepository::class);
            $familyAttributes = $this->getProductTypeFamilyAttributes($rowData['type'], $rowData[self::ATTRIBUTE_FAMILY_CODE]);

            foreach ($rowData as $attributeCode => $value) {
                if (is_null($value)) {
                    continue;
                }

                [$resolvedCode] = $this->getAttributeCodeAndCurrency($attributeCode);
                $attribute = $familyAttributes->where('code', $resolvedCode)->first();

                if (! $attribute || $attribute->type !== Asset::ASSET_ATTRIBUTE_TYPE) {
                    continue;
                }

                unset($rowData[$attributeCode]);

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
                    $attribute->setProductValue(
                        implode(',', $assets),
                        $attributeValues,
                        $rowData['channel'] ?? null,
                        $rowData['locale'] ?? null
                    );
                }
            }
        }

        if (config('filesystems.default') !== 's3') {
            parent::prepareAttributeValues($rowData, $attributeValues);

            return;
        }

        $originalDisk = config('filesystems.default');
        Config::set('filesystems.default', 'public');

        try {
            parent::prepareAttributeValues($rowData, $attributeValues);
        } finally {
            Config::set('filesystems.default', $originalDisk);
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
