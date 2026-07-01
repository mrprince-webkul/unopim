<?php

namespace Webkul\AWSIntegration\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class RemoveMediaFilesFromLocal extends Command
{
    protected $signature = 'aws_integration:remove_media_files';

    protected $description = 'Remove local media files if they already exist in AWS S3';

    public function handle()
    {
        if (! $this->confirm(
            'This will permanently delete local media files that already exist in AWS S3. Continue?',
            true
        )) {
            return $this->warn('Operation cancelled by user.');
        }

        $localDisk = Storage::disk('local');
        $s3Disk = Storage::disk('s3');

        $files = array_merge(
            $localDisk->allFiles('public/product'),
            $localDisk->allFiles('public/category')
        );

        $this->info('Found '.count($files).' local media files.');

        foreach ($files as $filePath) {
            $s3Path = preg_replace('#^public/#', '', $filePath);

            try {
                if ($s3Disk->exists($s3Path)) {
                    $this->info("Exists in S3, removing local file: {$filePath}");
                    $localDisk->delete($filePath);
                } else {
                    $this->line("Not found in S3: {$filePath}");
                }
            } catch (\Throwable $e) {
                $this->error("Error processing {$filePath}: {$e->getMessage()}");
            }
        }

        $this->info('Local media cleanup completed.');
    }
}
