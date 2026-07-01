<?php

namespace Webkul\AWSIntegration\Validators;

use Aws\Exception\AwsException;
use Aws\S3\S3Client;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class AWSS3StorageCredentialValidator
{
    public function validateAWSS3Credentials(
        string $accessKey,
        string $secretKey,
        string $region,
        string $bucketName,
        ?string $endpoint = null
    ): bool {
        try {
            // Detect masked credentials (asterisks)
            $accessKeyMasked = preg_match('/^\*+$/', $accessKey);
            $secretKeyMasked = preg_match('/^\*+$/', $secretKey);

            // If both are masked, skip AWS validation (credentials unchanged)
            if ($accessKeyMasked && $secretKeyMasked) {
                // Still validate the format
                $this->validateInputParameters($accessKey, $secretKey, $region, $bucketName, $endpoint, true);

                return true;
            }

            // Validate input parameters
            $this->validateInputParameters($accessKey, $secretKey, $region, $bucketName, $endpoint);

            $config = [
                'version'     => 'latest',
                'region'      => $region,
                'credentials' => [
                    'key'    => $accessKey,
                    'secret' => $secretKey,
                ],
                'http' => [
                    'verify'  => false,
                    'timeout' => 30,
                ],
            ];

            // If custom endpoint is provided (for S3-compatible services)
            if ($endpoint) {
                $config['endpoint'] = $endpoint;
                $config['use_path_style_endpoint'] = true;
            }

            $s3Client = new S3Client($config);

            // First, test if credentials are valid by listing buckets
            try {
                $s3Client->listBuckets();
            } catch (AwsException $e) {
                if ($e->getAwsErrorCode() === 'InvalidAccessKeyId' ||
                    $e->getAwsErrorCode() === 'SignatureDoesNotMatch') {
                    throw new \Exception('Invalid AWS credentials. Please check your Access Key ID and Secret Key.');
                }
                throw $e;
            }

            // Check if bucket exists in the specified region
            $bucketExists = $s3Client->doesBucketExist($bucketName);

            if (! $bucketExists) {
                // Check if bucket exists in other regions
                $actualRegion = $this->findBucketRegion($accessKey, $secretKey, $bucketName);

                if ($actualRegion) {
                    throw new \Exception("Bucket '{$bucketName}' exists in region '{$actualRegion}', but you specified '{$region}'. Please update the region to '{$actualRegion}'.");
                }

                // Try to create the bucket if it doesn't exist
                try {
                    $this->createBucketWithConfiguration($s3Client, $bucketName, $region);
                    Log::info("AWS S3 bucket '{$bucketName}' created successfully in region '{$region}'");

                    // Test write permissions after creating
                    $this->testUploadPermissions($s3Client, $bucketName);

                    return true;

                } catch (AwsException $createException) {
                    throw new \Exception(
                        "Bucket '{$bucketName}' does not exist in region '{$region}'. ".
                        'Please create it in AWS S3 Console or check permissions. '.
                        'Error: '.$createException->getAwsErrorMessage()
                    );
                }
            }

            // Test write permissions with a test upload
            $this->testUploadPermissions($s3Client, $bucketName);

            return true;

        } catch (AwsException $e) {
            $errorCode = $e->getAwsErrorCode();

            // Map AWS errors to user-friendly messages
            $errorMessage = match ($errorCode) {
                'NoSuchBucket'                       => "Bucket '{$bucketName}' does not exist in region '{$region}'.",
                'InvalidBucketName'                  => 'Invalid bucket name format.',
                'IllegalLocationConstraintException' => "Region '{$region}' is invalid.",
                'InvalidAccessKeyId'                 => 'Invalid AWS Access Key ID.',
                'SignatureDoesNotMatch'              => 'Invalid AWS Secret Access Key.',
                'AccessDenied'                       => 'Access denied. Check IAM permissions.',
                'AllAccessDisabled'                  => 'All access disabled.',
                'NotFound'                           => "Bucket '{$bucketName}' not found.",
                default                              => 'Unable to connect to AWS S3: '.$e->getAwsErrorMessage(),
            };

            Log::error('AWS S3 Validation Failed', [
                'error_code' => $errorCode,
                'message'    => $e->getMessage(),
                'bucket'     => $bucketName,
                'region'     => $region,
            ]);

            throw new \Exception($errorMessage);
        } catch (\Exception $e) {
            Log::error('AWS S3 Validation Exception', [
                'message' => $e->getMessage(),
                'bucket'  => $bucketName,
                'region'  => $region,
            ]);

            throw $e;
        }
    }

    /**
     * Find which region the bucket actually exists in
     */
    private function findBucketRegion(string $accessKey, string $secretKey, string $bucketName): ?string
    {
        $commonRegions = [
            'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
            'eu-west-1', 'eu-west-2', 'eu-central-1', 'eu-north-1',
            'ap-south-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
            'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3',
            'ca-central-1', 'sa-east-1', 'af-south-1', 'me-south-1', 'eu-south-1',
        ];

        foreach ($commonRegions as $region) {
            try {
                $s3Client = new S3Client([
                    'version'     => 'latest',
                    'region'      => $region,
                    'credentials' => [
                        'key'    => $accessKey,
                        'secret' => $secretKey,
                    ],
                    'http' => ['verify' => false],
                ]);

                if ($s3Client->doesBucketExist($bucketName)) {
                    return $region;
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        return null;
    }

    /**
     * Validate input parameters before attempting AWS connection
     */
    private function validateInputParameters(
        string $accessKey,
        string $secretKey,
        string $region,
        string $bucketName,
        ?string $endpoint = null,
        bool $credentialsMasked = false
    ): void {
        $data = [
            'access_key'  => $accessKey,
            'secret_key'  => $secretKey,
            'region'      => $region,
            'bucket_name' => $bucketName,
            'endpoint'    => $endpoint,
        ];

        $rules = [
            'region'      => ['required', 'string', 'regex:/^[a-z]{2}-[a-z]+-\d+$/'],
            'bucket_name' => [
                'required',
                'string',
                'min:3',
                'max:63',
                'regex:/^(?!\d+\.\d+\.\d+\.\d+)[a-z0-9][a-z0-9.-]+[a-z0-9]$/',
            ],
            'endpoint' => 'nullable|url',
        ];

        // Only validate credentials if they're not masked
        if (! $credentialsMasked) {
            $rules['access_key'] = 'required|string|min:16';
            $rules['secret_key'] = 'required|string|min:30';
        }

        $validator = Validator::make($data, $rules, [
            'region.regex'      => 'Region format is invalid (e.g., us-east-1, ap-south-1)',
            'bucket_name.regex' => 'Bucket name must be lowercase, 3-63 chars',
            'access_key.min'    => 'Access Key must be at least 16 characters',
            'secret_key.min'    => 'Secret Key must be at least 30 characters',
        ]);

        if ($validator->fails()) {
            $errors = $validator->errors()->all();
            throw new \Exception(implode(' ', $errors));
        }
    }

    /**
     * Create bucket with proper configuration
     */
    private function createBucketWithConfiguration(S3Client $s3Client, string $bucketName, string $region): void
    {
        // For us-east-1, don't specify LocationConstraint
        if ($region === 'us-east-1') {
            $s3Client->createBucket([
                'Bucket' => $bucketName,
            ]);
        } else {
            $s3Client->createBucket([
                'Bucket'                    => $bucketName,
                'CreateBucketConfiguration' => [
                    'LocationConstraint' => $region,
                ],
            ]);
        }

        // Wait for bucket to be ready
        $s3Client->waitUntil('BucketExists', [
            'Bucket'  => $bucketName,
            '@waiter' => [
                'delay'       => 5,
                'maxAttempts' => 10,
            ],
        ]);
    }

    /**
     * Test upload permissions to the bucket
     */
    private function testUploadPermissions(S3Client $s3Client, string $bucketName): void
    {
        $testKey = 'unopim-upload-test-'.time().'.txt';

        $s3Client->putObject([
            'Bucket'      => $bucketName,
            'Key'         => $testKey,
            'Body'        => 'AWS upload permission test',
            'ContentType' => 'text/plain',
        ]);

        // Clean up the test file
        $s3Client->deleteObject([
            'Bucket' => $bucketName,
            'Key'    => $testKey,
        ]);
    }
}
