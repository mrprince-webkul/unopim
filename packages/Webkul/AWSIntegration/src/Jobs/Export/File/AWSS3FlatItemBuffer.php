<?php

namespace Webkul\AWSIntegration\Jobs\Export\File;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use OpenSpout\Common\Entity\Row;
use Webkul\DataTransfer\Jobs\Export\File\FlatItemBuffer;
use Webkul\DataTransfer\Jobs\Export\File\SpoutWriterFactory;
use Webkul\DataTransfer\Repositories\JobTrackRepository;

class AWSS3FlatItemBuffer extends FlatItemBuffer
{
    protected string $publicUrlPrefix;

    protected array $filters = [];

    protected $localTempPath;

    protected array $attributeTypeCache = [];

    public function __construct()
    {
        $this->publicUrlPrefix = config('filesystems.disks.aws.url') ?? '';
    }

    protected function getWriter($filePath, array $options = [])
    {
        if (! isset($options['type'])) {
            throw new \InvalidArgumentException('Option "type" must be defined');
        }

        $this->localTempPath = tempnam(sys_get_temp_dir(), 'export');

        $writer = SpoutWriterFactory::createWriter($options['type'], $options);
        $writer->openToFile($this->localTempPath);

        return $writer;
    }

    protected function getFiltersFromFilePath($filePath): array
    {
        preg_match('/exports\/(\d+)\//', $filePath->getFilePath(), $matches);

        if (! isset($matches[1])) {
            return [];
        }

        $batchId = (int) $matches[1];
        $track = app(JobTrackRepository::class)->findOrFail($batchId);
        if (! $track || empty($track->meta)) {
            return [];
        }

        $meta = json_decode($track->meta, true);

        return $meta['filters'] ?? [];
    }

    public function addData($items)
    {
        if (empty($this->filters) && isset($this->filePath)) {
            $this->filters = $this->getFiltersFromFilePath($this->filePath);
        }

        foreach ($items as $item) {
            foreach ($item as $columnKey => $value) {
                $item[$columnKey] = $this->transformMediaValue($columnKey, $value, $this->filePath);
            }

            if (! $this->headerWritten) {
                $headers = array_keys($item);
                $this->writeHeader($headers);
                $this->headerWritten = true;
            }

            $this->writer->addRow($this->escapeFormulaCells(Row::fromValues($item)));
            $this->count++;
        }
    }

    public function writerClose()
    {
        $this->writer->close();

        if (isset($this->filePath) && isset($this->localTempPath)) {
            Storage::put($this->filePath->getFilePath(), file_get_contents($this->localTempPath));
            unlink($this->localTempPath);
        }
    }

    public function transformMediaValue(string $columnKey, $value, $filePath = null)
    {
        if (config('filesystems.default') !== 's3') {
            return $value;
        }

        if ((bool) ($this->filters['with_media'] ?? false)) {
            return $value;
        }

        $attributeType = $this->resolveAttributeType($columnKey);

        if ($attributeType === null) {
            return $value;
        }

        switch ($attributeType) {
            case 'image':
            case 'file':
                return $value ? $this->generatePublicUrl($value) : $value;

            case 'gallery':
            case 'asset':
                if (! $value) {
                    return $value;
                }

                $files = explode(', ', $value);
                $urls = array_map(fn ($file) => $this->generatePublicUrl(trim($file)), $files);

                return implode(', ', $urls);

            default:
                return $value;
        }
    }

    protected function resolveAttributeType(string $columnKey): ?string
    {
        if (array_key_exists($columnKey, $this->attributeTypeCache)) {
            return $this->attributeTypeCache[$columnKey];
        }

        $attribute = DB::table('attributes')
            ->select('type')
            ->where('code', $columnKey)
            ->first();

        return $this->attributeTypeCache[$columnKey] = $attribute->type ?? null;
    }

    protected function generatePublicUrl(string $file): string
    {
        if ($file === '') {
            return $file;
        }

        if ($this->publicUrlPrefix !== '') {
            return rtrim($this->publicUrlPrefix, '/').'/'.ltrim($file, '/');
        }

        return Storage::disk('s3')->url(ltrim($file, '/'));
    }
}
