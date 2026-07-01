<?php

namespace Webkul\AWSIntegration\Repositories;

use Webkul\AWSIntegration\Contracts\S3StorageCredential;
use Webkul\Core\Eloquent\Repository;

class AWSStorageCredentialRepository extends Repository
{
    /**
     * Specify model class name.
     */
    public function model(): string
    {
        return S3StorageCredential::class;
    }
}
