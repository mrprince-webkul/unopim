<?php

namespace Webkul\AWSIntegration\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use OpenSpout\Reader\CSV\Options as CsvOptions;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;
use Webkul\Admin\Http\Controllers\Settings\DataTransfer\TrackerController as BaseTrackerController;
use ZipArchive;

class TrackerController extends BaseTrackerController
{
    protected const MEDIA_ATTRIBUTE_TYPES = ['image', 'file', 'gallery', 'asset'];

    public function download(int $id)
    {
        if (config('filesystems.default') !== 's3') {
            return parent::download($id);
        }

        $import = $this->jobTrackRepository->findOrFail($id);
        $disk = Storage::disk('s3');
        $path = $this->resolveDataFilePath($disk, $import->file_path);

        if (! $disk->exists($path)) {
            abort(404);
        }

        $filename = basename($path);

        return response()->streamDownload(function () use ($disk, $path) {
            $stream = $disk->readStream($path);
            if ($stream === null) {
                return;
            }
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, $filename, [
            'Content-Type' => $disk->mimeType($path) ?: 'application/octet-stream',
        ]);
    }

    public function downloadArchive(int $id)
    {
        $jobTrack = $this->jobTrackRepository->findOrFail($id);
        $csvPath = $jobTrack->file_path;

        $disk = config('filesystems.default') === 's3'
            ? Storage::disk('s3')
            : Storage::disk('public');

        if (! $csvPath) {
            abort(404);
        }

        // When with_media=true the base Export helper may store the folder
        // path (e.g. "exports/{id}/uno-pim") instead of the CSV file path.
        // Detect this and locate the actual data file inside the folder.
        $csvPath = $this->resolveDataFilePath($disk, $csvPath);

        if (! $disk->exists($csvPath)) {
            abort(404);
        }

        $csvContents = $disk->get($csvPath);
        $csvBasename = basename($csvPath);

        $tempCsv = tempnam(sys_get_temp_dir(), 'export-csv-');
        file_put_contents($tempCsv, $csvContents);

        $tempZip = tempnam(sys_get_temp_dir(), 'export-archive-');
        $zipFileName = sprintf(
            '%s-%s.zip',
            $jobTrack->jobInstance->code,
            $jobTrack->jobInstance->entity_type
        );

        try {
            $zip = new ZipArchive;

            if ($zip->open($tempZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \RuntimeException(trans('aws::app.aws.export.archive.open-zip-failed'));
            }

            // Data file goes at the root of the archive.
            $zip->addFromString($csvBasename, $csvContents);

            // Always bundle media under images/<key> so the user gets a
            // self-contained archive regardless of public/private mode.
            $jobInstance = $jobTrack->jobInstance;
            $delimiter = $jobInstance->field_separator ?? ',';
            $mediaKeys = $this->collectMediaKeysFromExport($tempCsv, $csvBasename, $delimiter);

            Log::info('Export archive: media scan complete.', [
                'job_track_id' => $id,
                'file'         => $csvBasename,
                'media_count'  => count($mediaKeys),
            ]);

            foreach ($mediaKeys as $key) {
                try {
                    if (! $disk->exists($key)) {
                        Log::warning('Export archive: media object missing, skipped.', [
                            'job_track_id' => $id,
                            'key'          => $key,
                        ]);

                        continue;
                    }

                    // $zip->addFromString('images/'.ltrim($key, '/'), $disk->get($key));
                    $zip->addFromString(ltrim($key, '/'), $disk->get($key));
                } catch (\Throwable $e) {
                    Log::warning('Export archive: failed to add media to zip.', [
                        'job_track_id' => $id,
                        'key'          => $key,
                        'error'        => $e->getMessage(),
                    ]);
                }
            }

            $zip->close();

            @unlink($tempCsv);

            return response()->download($tempZip, $zipFileName, [
                'Content-Type' => 'application/zip',
            ])->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            @unlink($tempCsv);
            @unlink($tempZip);

            throw $e;
        }
    }

    /**
     * Parse the export file and return a deduplicated list of storage keys
     * referenced by image/file/gallery/asset attribute columns. Handles CSV
     * (with a configurable delimiter) and XLSX/XLS — picks the OpenSpout
     * reader from the basename's extension.
     *
     * @return array<int, string>
     */
    protected function collectMediaKeysFromExport(string $localPath, string $basename, string $delimiter = ','): array
    {
        $mediaKeys = [];
        $extension = strtolower((string) pathinfo($basename, PATHINFO_EXTENSION));

        try {
            if ($extension === 'xlsx' || $extension === 'xls') {
                $reader = new XlsxReader;
            } else {
                $options = new CsvOptions;
                $options->FIELD_DELIMITER = $delimiter ?: ',';
                $reader = new CsvReader($options);
            }

            $reader->open($localPath);
        } catch (\Throwable $e) {
            Log::warning('Export archive: unable to open export for media scan.', [
                'path'      => $localPath,
                'extension' => $extension,
                'error'     => $e->getMessage(),
            ]);

            return [];
        }

        $mediaColumnIndexes = null;
        $isHeaderRow = true;
        $headerSnapshot = [];

        foreach ($reader->getSheetIterator() as $sheet) {
            foreach ($sheet->getRowIterator() as $row) {
                $cells = array_map(
                    fn ($cell) => is_object($cell) && method_exists($cell, 'getValue') ? $cell->getValue() : $cell,
                    $row->getCells()
                );

                if ($isHeaderRow) {
                    $isHeaderRow = false;
                    $headerSnapshot = $cells;
                    $mediaColumnIndexes = $this->resolveMediaColumnIndexes($cells);

                    if (empty($mediaColumnIndexes)) {
                        Log::warning('Export archive: no media columns matched headers.', [
                            'path'    => $localPath,
                            'headers' => $cells,
                        ]);

                        break 2;
                    }

                    continue;
                }

                foreach ($mediaColumnIndexes as $index) {
                    $value = $cells[$index] ?? null;

                    if (! is_string($value) || $value === '') {
                        continue;
                    }

                    foreach (preg_split('/\s*,\s*/', $value) as $entry) {
                        $key = $this->normalizeMediaKey((string) $entry);

                        if ($key !== '') {
                            $mediaKeys[$key] = true;
                        }
                    }
                }
            }

            break;
        }

        $reader->close();

        if (empty($mediaKeys) && ! empty($headerSnapshot)) {
            Log::info('Export archive: media columns matched but no values found.', [
                'path'    => $localPath,
                'headers' => $headerSnapshot,
            ]);
        }

        return array_keys($mediaKeys);
    }

    /**
     * Strip a public URL (or leading slash) down to a storage-relative key.
     * Accepts raw keys like `product/sku-1.jpg`, bucket URLs like
     * `https://my-bucket.s3.us-east-1.amazonaws.com/product/sku-1.jpg`, and
     * app URLs like `https://shop.example/storage/product/sku-1.jpg`.
     */
    protected function normalizeMediaKey(string $entry): string
    {
        $value = trim($entry);

        if ($value === '') {
            return '';
        }

        // Full URL → take the path segment, strip any /storage/ prefix that
        // Laravel's public disk adds for browser access.
        if (preg_match('#^https?://#i', $value)) {
            $path = parse_url($value, PHP_URL_PATH) ?: '';
            $path = ltrim($path, '/');
            $path = preg_replace('#^storage/#', '', $path);

            return (string) $path;
        }

        return ltrim($value, '/');
    }

    /**
     * Map header column indexes to attribute codes that resolve to a media type.
     *
     * @param  array<int, string>  $headers
     * @return array<int, int>
     */
    protected function resolveMediaColumnIndexes(array $headers): array
    {
        $codes = array_values(array_filter(array_map('strval', $headers), fn ($h) => $h !== ''));

        if (empty($codes)) {
            return [];
        }

        $attributeMediaCodes = DB::table('attributes')
            ->select('code')
            ->whereIn('code', $codes)
            ->whereIn('type', self::MEDIA_ATTRIBUTE_TYPES)
            ->pluck('code')
            ->all();

        $categoryFieldMediaCodes = DB::table('category_fields')
            ->select('code')
            ->whereIn('code', $codes)
            ->whereIn('type', ['image', 'file', 'asset'])
            ->pluck('code')
            ->all();

        $mediaCodes = array_flip(array_unique(array_merge($attributeMediaCodes, $categoryFieldMediaCodes)));
        $indexes = [];

        foreach ($headers as $i => $header) {
            if (isset($mediaCodes[$header])) {
                $indexes[] = $i;
            }
        }

        return $indexes;
    }

    /**
     * If the stored file_path points to a folder (no file extension), search
     * inside it for the actual CSV/XLSX data file. Returns the original path
     * unchanged when it already looks like a file.
     */
    protected function resolveDataFilePath($disk, string $path): string
    {
        if (preg_match('/\.(csv|xlsx|xls)$/i', $path)) {
            return $path;
        }

        $files = $disk->files($path);

        foreach ($files as $file) {
            if (preg_match('/\.(csv|xlsx|xls)$/i', $file)) {
                return $file;
            }
        }

        return $path;
    }
}
