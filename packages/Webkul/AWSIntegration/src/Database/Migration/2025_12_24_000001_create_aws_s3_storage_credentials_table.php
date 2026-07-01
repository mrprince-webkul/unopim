<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('wk_aws_s3_storage_credentials', function (Blueprint $table) {
            $table->id();
            $table->string('access_key', 255);              // AWS Access Key ID
            $table->string('secret_key', 255);              // AWS Secret Access Key
            $table->string('region', 50);                   // AWS Region (e.g., us-east-1, ap-south-1)
            $table->string('bucket_name', 255);             // S3 Bucket Name
            $table->string('bucket_url', 500)->nullable();  // Bucket URL (optional)
            $table->timestamp('environment_updated_at')->nullable(); // Environment update time
            $table->boolean('enabled')->default(false);     // Enable/Disable the credential
            $table->enum('default_visibility', ['public', 'private'])
                ->default('public')
                ->comment('Default visibility for uploaded files');
            $table->timestamps();                           // Created at & Updated at timestamps
            $table->softDeletes();                          // Soft delete support

            // Add indexes for better performance
            $table->index('enabled');
            $table->index('region');
            $table->index('bucket_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wk_aws_s3_storage_credentials');
    }
};
