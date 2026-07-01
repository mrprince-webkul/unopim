<?php

namespace Webkul\AWSIntegration\Helpers;

use Illuminate\Support\Facades\Log;
use Webkul\DataTransfer\Helpers\Export as BaseExport;

class Export extends BaseExport
{
    public function uploadFile(string $filePath, string $temporaryPath, array $filters): void
    {
        Log::info('AWSS3Export::uploadFile called', [
            'filePath'      => $filePath,
            'temporaryPath' => $temporaryPath,
            'filters'       => $filters,
            'default_disk'  => config('filesystems.default'),
            'export_id'     => $this->export->id ?? null,
        ]);

        if (config('filesystems.default') !== 's3') {
            parent::uploadFile($filePath, $temporaryPath, $filters);

            return;
        }

        // Always store the CSV/XLSX file path (not the folder path) so that
        // downloadArchive() can read and parse the data file from S3.
        $this->jobTrackRepository->update([
            'file_path' => $filePath,
        ], $this->export->id);
    }
}
