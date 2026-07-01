<?php

use Webkul\AWSIntegration\Models\S3StorageCredential;
use Webkul\AWSIntegration\Presenters\MappingDataPresenter;

it('marks credential as public when default_visibility is public', function () {
    $credential = new S3StorageCredential(['default_visibility' => 'public']);

    expect($credential->isPublic())->toBeTrue();
    expect($credential->isPrivate())->toBeFalse();
});

it('marks credential as private when default_visibility is private', function () {
    $credential = new S3StorageCredential(['default_visibility' => 'private']);

    expect($credential->isPrivate())->toBeTrue();
    expect($credential->isPublic())->toBeFalse();
});

it('masks the secret key with twenty asterisks', function () {
    $credential = new S3StorageCredential(['secret_key' => 'super-secret-value']);

    expect($credential->masked_secret_key)->toBe(str_repeat('*', 20));
});

it('masks the access key keeping the first four characters', function () {
    $credential = new S3StorageCredential(['access_key' => 'AKIAIOSFODNN7EXAMPLE']);

    expect($credential->masked_access_key)->toBe('AKIA'.str_repeat('*', 12));
});

it('returns sixteen asterisks when access key is too short to mask', function () {
    $credential = new S3StorageCredential(['access_key' => 'abc']);

    expect($credential->masked_access_key)->toBe(str_repeat('*', 16));
});

it('generates history tags with bucket, region and id', function () {
    $credential = new S3StorageCredential([
        'bucket_name' => 'my-bucket',
        'region'      => 'us-east-1',
    ]);
    $credential->id = 42;

    expect($credential->generateTags())->toMatchArray([
        'type'   => 'aws_s3_credential',
        'bucket' => 'my-bucket',
        'region' => 'us-east-1',
        'id'     => 42,
    ]);
});

it('builds a human readable history display name', function () {
    $credential = new S3StorageCredential([
        'bucket_name' => 'my-bucket',
        'region'      => 'us-east-1',
    ]);

    expect($credential->getHistoryDisplayName())
        ->toBe('AWS S3 Credential - my-bucket (us-east-1)');
});

it('excludes secret and access keys from history logging', function () {
    $credential = new S3StorageCredential;

    expect($credential->getHistoryExcludeFields())
        ->toContain('secret_key')
        ->toContain('access_key');
});

it('reports aws_s3_credential as entity type', function () {
    expect((new S3StorageCredential)->getEntityType())->toBe('aws_s3_credential');
});

it('hides secret_key when serialized to array', function () {
    $credential = new S3StorageCredential([
        'access_key' => 'AKIAIOSFODNN7EXAMPLE',
        'secret_key' => 'super-secret-value',
    ]);

    expect($credential->toArray())->not->toHaveKey('secret_key');
});

it('registers mapping presenter for JSON fields', function () {
    expect(S3StorageCredential::getPresenters())
        ->toHaveKey('mapping')
        ->and(S3StorageCredential::getPresenters()['mapping'])
        ->toBe(MappingDataPresenter::class);
});
