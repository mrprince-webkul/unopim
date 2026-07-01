<?php

namespace Webkul\AWSIntegration\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Webkul\AWSIntegration\Models\S3StorageCredential;

class MoveExistingFilesToS3 extends Command
{
    protected $signature = 'aws_integration:move_existing_files';

    protected $description = 'Move existing product and category media files from local storage to AWS S3 using default visibility';

    public function handle()
    {
        if (! $this->confirm(
            'Are you sure you want to move all product and category images from local storage to AWS S3?',
            true
        )) {
            return $this->warn('Operation cancelled by user.');
        }

        if (! Schema::hasTable('wk_aws_s3_storage_credentials')) {
            return $this->error('AWS credentials table not found.');
        }

        $credential = S3StorageCredential::first();

        if (! $credential || ! $credential->enabled) {
            return $this->error('AWS S3 is not enabled.');
        }

        if (! config('filesystems.disks.s3')) {
            return $this->error('AWS S3 disk is not configured.');
        }

        // ✅ Resolve visibility from DB
        $visibility = $credential->default_visibility === 'private'
            ? 'private'
            : 'public';

        $this->info("Using default visibility: {$visibility}");

        $localDisk = Storage::disk('local');
        $s3Disk = Storage::disk('s3');

        $productFiles = $localDisk->allFiles('public/product');
        $categoryFiles = $localDisk->allFiles('public/category');

        $files = array_merge($productFiles, $categoryFiles);

        if (count($files) === 0) {
            return $this->info('No files found to upload.');
        }

        $this->info('Found '.count($files).' files to upload.');

        foreach ($files as $filePath) {
            $s3Path = preg_replace('#^public/#', '', $filePath);
            $this->line("Uploading: {$s3Path}");

            try {
                $stream = $localDisk->readStream($filePath);

                if (! is_resource($stream)) {
                    $this->error("Unable to read file: {$filePath}");

                    continue;
                }

                $s3Disk->writeStream($s3Path, $stream, [
                    'visibility'   => $visibility,
                    'CacheControl' => 'max-age=604800',
                ]);

                fclose($stream);

                $this->info("Uploaded successfully: {$s3Path}");
            } catch (\Throwable $e) {
                $this->error("Failed to upload {$filePath}: {$e->getMessage()}");
            }
        }

        $this->info('Media files successfully migrated to AWS S3.');
        $this->info('Visibility applied using default_visibility setting.');
    }
}
