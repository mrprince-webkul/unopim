<?php

namespace Webkul\AWSIntegration\Console\Commands;

use Aws\S3\S3Client;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Webkul\AWSIntegration\Models\S3StorageCredential;

class UpdateS3Visibility extends Command
{
    protected $signature = 'aws_integration:update_visibility
                            {--path= : S3 folder path (prefix)}
                            {--visibility= : public or private (override DB)}
                            {--dry-run : Show what will be changed without applying}';

    protected $description = 'Update visibility (ACL) of files in AWS S3';

    public function handle()
    {
        if (! Schema::hasTable('wk_aws_s3_storage_credentials')) {
            return $this->error('AWS credentials table not found.');
        }

        $cred = S3StorageCredential::first();

        if (! $cred || ! $cred->enabled) {
            return $this->error('AWS S3 is not enabled.');
        }

        $visibility = $this->option('visibility') ?: $cred->default_visibility;

        if (! in_array($visibility, ['public', 'private'])) {
            return $this->error('Invalid visibility. Use public or private.');
        }

        $acl = $visibility === 'public' ? 'public-read' : 'private';
        $prefix = $this->option('path');
        $dryRun = $this->option('dry-run');

        if (! $this->confirm(
            "This will update S3 files visibility to '{$visibility}'".
            ($prefix ? " under '{$prefix}'" : ' for ALL files').
            ($dryRun ? ' (DRY RUN)' : '').
            '. Continue?',
            true
        )) {
            return $this->warn('Operation cancelled.');
        }

        $client = new S3Client([
            'version'     => 'latest',
            'region'      => $cred->region,
            'credentials' => [
                'key'    => $cred->access_key,
                'secret' => $cred->secret_key,
            ],
        ]);

        $bucket = $cred->bucket_name;
        $processed = 0;

        $params = [
            'Bucket' => $bucket,
        ];

        if ($prefix) {
            $params['Prefix'] = ltrim($prefix, '/');
        }

        do {
            $result = $client->listObjectsV2($params);

            foreach ($result['Contents'] ?? [] as $object) {
                $key = $object['Key'];

                $this->line("Updating: {$key}");

                if (! $dryRun) {
                    $client->putObjectAcl([
                        'Bucket' => $bucket,
                        'Key'    => $key,
                        'ACL'    => $acl,
                    ]);
                }

                $processed++;
            }

            $params['ContinuationToken'] = $result['NextContinuationToken'] ?? null;

        } while (! empty($params['ContinuationToken']));

        $this->info(
            $dryRun
                ? "Dry run completed. {$processed} files would be updated."
                : "Visibility updated for {$processed} files."
        );
    }
}
