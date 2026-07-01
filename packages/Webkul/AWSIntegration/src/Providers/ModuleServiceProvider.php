<?php

namespace Webkul\AWSIntegration\Providers;

use Webkul\AWSIntegration\Models\S3StorageCredential;
use Webkul\Core\Providers\CoreModuleServiceProvider;

class ModuleServiceProvider extends CoreModuleServiceProvider
{
    protected $models = [
        S3StorageCredential::class,
    ];
}
