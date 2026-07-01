<?php

namespace Webkul\AWSIntegration\Providers;

use Aws\S3\S3Client;
use Illuminate\Filesystem\FilesystemAdapter as LaravelFilesystemAdapter;
use Illuminate\Foundation\AliasLoader;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;
use League\Flysystem\AwsS3V3\PortableVisibilityConverter;
use League\Flysystem\Filesystem;
use League\Flysystem\Visibility;
use Webkul\Admin\Http\Controllers\Settings\DataTransfer\TrackerController as CoreTrackerController;
use Webkul\AWSIntegration\Adapter\AWSS3Adapter;
use Webkul\AWSIntegration\Console\Commands\AWSS3Installer;
use Webkul\AWSIntegration\Console\Commands\MoveExistingFilesToS3;
use Webkul\AWSIntegration\Console\Commands\RemoveMediaFilesFromLocal;
use Webkul\AWSIntegration\Console\Commands\UpdateS3Visibility;
use Webkul\AWSIntegration\Helpers\AWSConfigure;
use Webkul\AWSIntegration\Helpers\Export as AWSS3Export;
use Webkul\AWSIntegration\Helpers\Importers\Category\Importer as AWSS3CategoryImporter;
use Webkul\AWSIntegration\Helpers\Importers\Product\Importer as AWSS3ProductImporter;
use Webkul\AWSIntegration\Http\Controllers\TrackerController as AWSS3TrackerController;
use Webkul\AWSIntegration\Jobs\Export\File\AWSS3FlatItemBuffer;
use Webkul\DataTransfer\Helpers\Export as CoreExport;
use Webkul\DataTransfer\Helpers\Importers\Category\Importer as CoreCategoryImporter;
use Webkul\DataTransfer\Helpers\Importers\Product\Importer as CoreProductImporter;
use Webkul\DataTransfer\Jobs\Export\File\FlatItemBuffer;
use Webkul\Product\Facades\ProductImage as ProductImageFacade;
use Webkul\Product\ProductImage;

class AWSIntegrationServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        $this->loadViewsFrom(__DIR__.'/../Resources/views', 'aws');
        $this->loadTranslationsFrom(__DIR__.'/../Resources/lang', 'aws');
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migration');

        // Load routes from aws-routes.php
        $this->loadRoutesFrom(__DIR__.'/../Routes/aws-routes.php');

        $this->app->register(ModuleServiceProvider::class);

        // Register AWS S3 filesystem driver
        Storage::extend('awss3', function ($app, $config) {
            return $this->createAWSS3Filesystem($config);
        });

        // Event listener for admin layout
        Event::listen('unopim.admin.layout.head', function ($viewRenderEventManager) {
            $viewRenderEventManager->addTemplate('aws::icon-style');
        });

        // Publish assets
        $this->publishes([
            __DIR__.'/../../publishable' => public_path('themes'),
        ], 'aws-s3-config');

        // Configure AWS S3
        $awsConfigure = new AWSConfigure;
        $awsConfigure->configureS3Storage();
    }

    /**
     * Create custom AWS S3 filesystem with additional features
     */
    protected function createAWSS3Filesystem(array $config): LaravelFilesystemAdapter
    {
        $s3Config = $this->getS3Config($config);

        // Add HTTP options
        $s3Config['http'] = [
            'verify'  => $config['verify'] ?? true,
            'timeout' => $config['timeout'] ?? 30,
        ];

        $client = new S3Client($s3Config);

        $adapter = $this->createAdapter($client, $config);

        // Create Filesystem instance with the adapter
        $filesystem = new Filesystem($adapter, $config);

        // Use our custom AWSS3Adapter
        return new AWSS3Adapter($filesystem, $adapter, $config, $client);
    }

    /**
     * Get S3 configuration array
     */
    protected function getS3Config(array $config): array
    {
        $s3Config = [
            'credentials' => [
                'key'    => $config['key'] ?? '',
                'secret' => $config['secret'] ?? '',
            ],
            'region'  => $config['region'] ?? 'us-east-1',
            'version' => 'latest',
        ];

        // Add endpoint for S3-compatible services
        if (! empty($config['endpoint'])) {
            $s3Config['endpoint'] = $config['endpoint'];
            $s3Config['use_path_style_endpoint'] = $config['use_path_style_endpoint'] ?? true;
        }

        return $s3Config;
    }

    /**
     * Create AwsS3V3Adapter
     */
    protected function createAdapter(S3Client $client, array $config): AwsS3V3Adapter
    {
        // Create visibility converter
        $visibility = new PortableVisibilityConverter(
            $config['visibility'] ?? Visibility::PUBLIC
        );

        // Get MIME type detector
        $mimeTypeDetector = $config['mimeTypeDetector'] ?? null;

        // Prepare options
        $options = array_merge([
            'CacheControl' => 'max-age=604800',
        ], $config['options'] ?? []);

        return new AwsS3V3Adapter(
            $client,
            $config['bucket'],
            $config['prefix'] ?? '',
            $visibility,
            $mimeTypeDetector,
            $options,
            false // streamReads
        );
    }

    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {
        $this->mergeConfigFrom(
            __DIR__.'/../Config/menu.php',
            'menu.admin'
        );

        $this->mergeConfigFrom(
            __DIR__.'/../Config/acl.php',
            'acl'
        );

        $this->mergeConfigFrom(
            dirname(__DIR__).'/Config/unopim-vite.php',
            'unopim-vite.viters'
        );

        // Always bind the tracker/export/import overrides — they fall back to the
        // parent behavior internally when S3 is not the active default disk.
        $this->app->bind(CoreTrackerController::class, AWSS3TrackerController::class);
        $this->app->bind(CoreExport::class, AWSS3Export::class);
        $this->app->bind(FlatItemBuffer::class, AWSS3FlatItemBuffer::class);
        $this->app->bind(CoreProductImporter::class, AWSS3ProductImporter::class);
        $this->app->bind(CoreCategoryImporter::class, AWSS3CategoryImporter::class);

        $this->registerFacades();
        $this->registerCommands();
    }

    /**
     * Register facades
     */
    protected function registerFacades()
    {
        $loader = AliasLoader::getInstance();
        $loader->alias('productimage', ProductImageFacade::class);

        $this->app->singleton('productimage', function () {
            return app()->make(ProductImage::class);
        });

        // Bind AWS S3 product image handler
        $this->app->bind('productimage', \Webkul\AWSIntegration\ProductImage::class);
    }

    /**
     * Register the Installer Commands of this package.
     */
    protected function registerCommands(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([
                AWSS3Installer::class,
                UpdateS3Visibility::class,
                MoveExistingFilesToS3::class,
                RemoveMediaFilesFromLocal::class,
            ]);
        }
    }
}
