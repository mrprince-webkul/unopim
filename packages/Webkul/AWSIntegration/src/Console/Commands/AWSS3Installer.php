<?php

namespace Webkul\AWSIntegration\Console\Commands;

use Illuminate\Console\Command;

class AWSS3Installer extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'aws-s3-package:install';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Install the UnoPim AWS S3 connector';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Installing UnoPim AWS S3 connector...');

        /**
         * Step 1: Install required packages
         */
        $this->info('Installing required Composer packages...');

        $packages = [
            'league/flysystem-aws-s3-v3',
            'aws/aws-sdk-php',
        ];

        foreach ($packages as $package) {
            $this->line("→ Installing: {$package}");

            exec("composer require {$package}", $output, $returnCode);

            if ($returnCode !== 0) {
                $this->error("Failed to install {$package}");

                return Command::FAILURE;
            }
        }

        /**
         * Step 2: Run migrations
         */
        $this->info('Running database migrations...');
        $this->call('migrate');

        /**
         * Step 3: Publish config (optional but recommended)
         */
        $this->info('Publishing AWS S3 configuration...');
        $this->call('vendor:publish', [
            '--tag'   => 'aws-s3-config',
            '--force' => true,
        ]);

        $this->info('✅ UnoPim AWS S3 connector installed successfully!');

        return Command::SUCCESS;
    }
}
