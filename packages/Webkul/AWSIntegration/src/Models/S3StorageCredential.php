<?php

namespace Webkul\AWSIntegration\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Webkul\AWSIntegration\Contracts\S3StorageCredential as S3StorageCredentialContract;
use Webkul\AWSIntegration\Presenters\MappingDataPresenter;
use Webkul\HistoryControl\Contracts\HistoryAuditable as HistoryContract;
use Webkul\HistoryControl\Interfaces\PresentableHistoryInterface;
use Webkul\HistoryControl\Traits\HistoryTrait;

// class S3StorageCredential extends Model implements S3StorageCredentialContract, HistoryContract, PresentableHistoryInterface
class S3StorageCredential extends Model implements HistoryContract, S3StorageCredentialContract
{
    use HistoryTrait, SoftDeletes;

    protected $table = 'wk_aws_s3_storage_credentials';

    /**
     * History tags for tracking changes
     */
    protected $historyTags = ['wk_aws_s3_storage_credentials'];

    /**
     * Get presenters for JSON fields
     */
    public static function getPresenters(): array
    {
        return [
            'mapping' => MappingDataPresenter::class,
        ];
    }

    protected $fillable = [
        'access_key',
        'secret_key',
        'region',
        'bucket_name',
        'bucket_url',
        'environment_updated_at',
        'enabled',
        'default_visibility',
    ];

    protected $casts = [
        'enabled'                => 'boolean',
        'environment_updated_at' => 'datetime',
        'default_visibility'     => 'string',
    ];

    protected $hidden = [
        'secret_key',
    ];

    /**
     * Get masked secret key
     */
    public function getMaskedSecretKeyAttribute(): string
    {
        return str_repeat('*', 20);
    }

    /**
     * Get masked access key
     */
    public function getMaskedAccessKeyAttribute(): string
    {
        if (strlen($this->access_key) > 4) {
            return substr($this->access_key, 0, 4).str_repeat('*', 12);
        }

        return str_repeat('*', 16);
    }

    /**
     * Required by HistoryTrait - Generate tags for history logging
     */
    public function generateTags(): array
    {
        return [
            'type'   => 'aws_s3_credential',
            'bucket' => $this->bucket_name,
            'region' => $this->region,
            'id'     => $this->id,
        ];
    }

    /**
     * Required by HistoryTrait - Get the display name for history
     */
    public function getHistoryDisplayName(): string
    {
        return "AWS S3 Credential - {$this->bucket_name} ({$this->region})";
    }

    /**
     * Required by HistoryTrait - Get fields to exclude from history logging
     */
    public function getHistoryExcludeFields(): array
    {
        return [
            'secret_key', // Never log secret key for security
            'access_key', // Also exclude access key from logs
        ];
    }

    /**
     * Required by HistoryTrait - Get the entity type for history
     */
    public function getEntityType(): string
    {
        return 'aws_s3_credential';
    }

    public function isPublic(): bool
    {
        return $this->default_visibility === 'public';
    }

    public function isPrivate(): bool
    {
        return $this->default_visibility === 'private';
    }
}
