<?php

namespace Webkul\AWSIntegration\Helpers;

use Aws\S3\S3Client;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Webkul\AWSIntegration\Models\S3StorageCredential;

class AWSConfigure
{
    private function getAWSConfigData(): array
    {
        if (! Schema::hasTable('wk_aws_s3_storage_credentials')) {
            return ['enabled' => false];
        }

        $cred = S3StorageCredential::first();

        if (! $cred || ! $cred->enabled) {
            return ['enabled' => false];
        }

        return [
            'enabled'            => true,
            'key'                => $cred->access_key,
            'secret'             => $cred->secret_key,
            'region'             => $cred->region,
            'bucket'             => $cred->bucket_name,
            'bucket_url'         => $cred->bucket_url,
            'expireHeader'       => $cred->environment_updated_at,
            'default_visibility' => $cred->default_visibility ?? 'public',
        ];
    }

    private function getS3Client(): ?S3Client
    {
        $aws = $this->getAWSConfigData();

        if (! $aws['enabled']) {
            return null;
        }

        return new S3Client([
            'version'     => 'latest',
            'region'      => $aws['region'],
            'credentials' => [
                'key'    => $aws['key'],
                'secret' => $aws['secret'],
            ],
        ]);
    }

    public function configureS3Storage(): bool
    {
        $aws = $this->getAWSConfigData();

        if (! $aws['enabled']) {
            return false;
        }

        $isPrivate = ($aws['default_visibility'] ?? 'public') === 'private';

        Config::set('filesystems.disks.s3', [
            'driver'     => 's3',
            'key'        => $aws['key'],
            'secret'     => $aws['secret'],
            'region'     => $aws['region'],
            'bucket'     => $aws['bucket'],
            // Skip the fixed bucket URL when private — our AWSS3Adapter::url()
            // will fall back to presigned URLs, and leaving a public 'url' set
            // would short-circuit that path.
            'url'        => $isPrivate ? null : $aws['bucket_url'],
            'visibility' => $aws['default_visibility'],
            'throw'      => true,
            'options'    => [
                'CacheControl' => 'max-age='.($aws['expireHeader'] ?? 604800),
            ],
        ]);

        Config::set('filesystems.default', 's3');

        return true;
    }

    public function uploadFile(string $path, $contents, array $options = []): bool
    {
        try {
            $aws = $this->getAWSConfigData();
            $visibility = $aws['default_visibility'];

            Storage::disk('s3')->put(
                $path,
                $contents,
                array_merge([
                    'visibility'   => $visibility,
                    'CacheControl' => 'max-age=604800',
                ], $options)
            );

            return true;
        } catch (\Throwable $e) {
            logger()->error('S3 upload failed', [
                'path'  => $path,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * ONLY required if visibility is public and file already exists
     */
    public function setFilePublic(string $path): bool
    {
        try {
            $aws = $this->getAWSConfigData();

            if ($aws['default_visibility'] !== 'public') {
                return true; // ✅ skip for private
            }

            $client = $this->getS3Client();

            if (! $client || ! $client->doesObjectExist($aws['bucket'], $path)) {
                return false;
            }

            $client->putObjectAcl([
                'Bucket' => $aws['bucket'],
                'Key'    => $path,
                'ACL'    => 'public-read',
            ]);

            return true;

        } catch (\Throwable $e) {
            logger()->error('ACL update failed', [
                'file'  => $path,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Public URL OR Signed URL
     */
    public function getFileUrl(string $path, int $minutes = 5): string
    {
        try {
            $aws = $this->getAWSConfigData();

            if ($aws['default_visibility'] === 'public') {
                return Storage::disk('s3')->url($path);
            }

            return Storage::disk('s3')->temporaryUrl(
                $path,
                now()->addMinutes($minutes)
            );
        } catch (\Throwable $e) {
            return '';
        }
    }

    public function checkVisibility(string $path): array
    {
        $result = ['is_public' => false];

        try {
            $aws = $this->getAWSConfigData();
            $client = $this->getS3Client();

            if (! $client || ! $client->doesObjectExist($aws['bucket'], $path)) {
                return $result;
            }

            $acl = $client->getObjectAcl([
                'Bucket' => $aws['bucket'],
                'Key'    => $path,
            ]);

            foreach ($acl['Grants'] as $grant) {
                if (
                    ($grant['Grantee']['URI'] ?? '') ===
                    'http://acs.amazonaws.com/groups/global/AllUsers' &&
                    $grant['Permission'] === 'READ'
                ) {
                    $result['is_public'] = true;
                }
            }

        } catch (\Throwable $e) {
        }

        return $result;
    }

    public function syncDirectory(string $localDir, string $prefix = ''): array
    {
        $out = ['synced' => 0, 'failed' => 0];
        $aws = $this->getAWSConfigData();

        foreach (File::allFiles($localDir) as $file) {
            try {
                $relative = str_replace($localDir.'/', '', $file->getPathname());
                $path = $prefix ? "$prefix/$relative" : $relative;

                $this->uploadFile(
                    $path,
                    file_get_contents($file),
                    ['ContentType' => mime_content_type($file)]
                );

                // ✅ Only public files need ACL
                if ($aws['default_visibility'] === 'public') {
                    $this->setFilePublic($path);
                }

                $out['synced']++;
            } catch (\Throwable $e) {
                $out['failed']++;
            }
        }

        return $out;
    }
}
