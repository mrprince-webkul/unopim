<?php

namespace Webkul\AWSIntegration\Adapter;

use Aws\S3\PostObjectV4;
use Aws\S3\S3Client;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Traits\Conditionable;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter as S3Adapter;
use League\Flysystem\FilesystemOperator;

class AWSS3Adapter extends FilesystemAdapter
{
    use Conditionable;

    /**
     * The AWS S3 client.
     *
     * @var S3Client
     */
    protected $client;

    /**
     * Create a new AWSS3Adapter instance.
     *
     * @return void
     */
    public function __construct(FilesystemOperator $driver, S3Adapter $adapter, array $config, S3Client $client)
    {
        parent::__construct($driver, $adapter, $config);

        $this->client = $client;
    }

    /**
     * Get the URL for the file at the given path.
     *
     * When the bucket is configured with private visibility, direct object
     * URLs would 403. Fall back to a short-lived presigned URL instead so
     * callers using Storage::url() keep working transparently.
     *
     * @param  string  $path
     * @return string
     */
    public function url($path)
    {
        $visibility = $this->config['visibility'] ?? 'public';

        if ($visibility === 'private') {
            return $this->temporaryUrl($path, now()->addMinutes(30));
        }

        if (isset($this->config['url'])) {
            return $this->concatPathToUrl($this->config['url'], $this->prefixer->prefixPath($path));
        }

        return $this->client->getObjectUrl(
            $this->config['bucket'],
            $this->prefixer->prefixPath($path)
        );
    }

    /**
     * Get a temporary URL for the file at the given path.
     *
     * @param  string  $path
     * @param  \DateTimeInterface  $expiration
     * @return string
     */
    public function temporaryUrl($path, $expiration, array $options = [])
    {
        $command = $this->client->getCommand('GetObject', [
            'Bucket' => $this->config['bucket'],
            'Key'    => $this->prefixer->prefixPath($path),
        ]);

        $uri = $this->client->createPresignedRequest(
            $command,
            $expiration,
            $options
        )->getUri();

        // If a custom URL endpoint is provided, replace the host
        if (isset($this->config['url'])) {
            $parsedUrl = parse_url($this->config['url']);
            $uri = $uri->withScheme($parsedUrl['scheme'] ?? 'https')
                ->withHost($parsedUrl['host'] ?? $uri->getHost())
                ->withPort($parsedUrl['port'] ?? $uri->getPort());
        }

        return (string) $uri;
    }

    /**
     * Get a temporary upload URL for the file at the given path.
     *
     * @param  string  $path
     * @param  \DateTimeInterface  $expiration
     * @return array
     */
    public function temporaryUploadUrl($path, $expiration, array $options = [])
    {
        $key = $this->prefixer->prefixPath($path);

        // Set default options
        $formInputs = $options['FormInputs'] ?? [];
        $policy = $options['Policy'] ?? [];

        // Create POST object for direct browser uploads
        $postObject = new PostObjectV4(
            $this->client,
            $this->config['bucket'],
            $formInputs,
            $policy,
            $expiration->format('Y-m-d\TH:i:s\Z')
        );

        return [
            'url'    => $postObject->getFormAttributes()['action'],
            'fields' => $postObject->getFormInputs(),
        ];
    }

    /**
     * Generate a pre-signed URL for PUT operation (upload).
     *
     * @param  string  $path
     * @param  \DateTimeInterface  $expiration
     * @return string
     */
    public function temporaryPutUrl($path, $expiration, array $options = [])
    {
        $command = $this->client->getCommand('PutObject', array_merge([
            'Bucket' => $this->config['bucket'],
            'Key'    => $this->prefixer->prefixPath($path),
        ], $options));

        $uri = $this->client->createPresignedRequest(
            $command,
            $expiration
        )->getUri();

        return (string) $uri;
    }

    /**
     * Check if a file exists and is accessible.
     *
     * @param  string  $path
     * @return bool
     */
    public function exists($path)
    {
        try {
            return $this->driver->fileExists($path);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get the file size.
     *
     * @param  string  $path
     * @return int
     */
    public function size($path)
    {
        try {
            return $this->driver->fileSize($path);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get the file's last modification time.
     *
     * @param  string  $path
     * @return int
     */
    public function lastModified($path)
    {
        try {
            return $this->driver->lastModified($path);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get the file's MIME type.
     *
     * @param  string  $path
     * @return string|null
     */
    public function mimeType($path)
    {
        try {
            return $this->driver->mimeType($path);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get the underlying AWS S3 client.
     *
     * @return S3Client
     */
    public function getClient()
    {
        return $this->client;
    }

    /**
     * Get the bucket name.
     *
     * @return string
     */
    public function getBucket()
    {
        return $this->config['bucket'];
    }

    /**
     * Get the region.
     *
     * @return string
     */
    public function getRegion()
    {
        return $this->config['region'] ?? 'us-east-1';
    }

    /**
     * List contents of a directory.
     *
     * @param  string  $directory
     * @param  bool  $recursive
     * @return array
     */
    public function listContents($directory = '', $recursive = false)
    {
        try {
            $contents = $this->driver->listContents($directory, $recursive)->toArray();

            return $contents;
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Create a directory.
     *
     * @param  string  $path
     * @return bool
     */
    public function makeDirectory($path)
    {
        try {
            // In S3, directories don't actually exist, but we can create a placeholder
            // by creating an empty object with a trailing slash
            $directoryPath = rtrim($path, '/').'/';
            $this->driver->write($directoryPath, '');

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Delete a directory.
     *
     * @param  string  $directory
     * @return bool
     */
    public function deleteDirectory($directory)
    {
        try {
            $this->driver->deleteDirectory($directory);

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
