<?php

use Webkul\AWSIntegration\Models\S3StorageCredential;
use Webkul\AWSIntegration\Validators\AWSS3StorageCredentialValidator;

use function Pest\Laravel\get;
use function Pest\Laravel\post;

beforeEach(function () {
    $this->loginAsAdmin();
    S3StorageCredential::query()->forceDelete();
});

it('renders the credential page with empty state when no credential exists', function () {
    get(route('aws.credential.index'))
        ->assertOk()
        ->assertSee('AWS Credential');
});

it('renders the credential page masking existing secrets', function () {
    S3StorageCredential::create([
        'access_key'         => 'AKIAIOSFODNN7EXAMPLE',
        'secret_key'         => 'super-secret-value',
        'region'             => 'us-east-1',
        'bucket_name'        => 'my-bucket',
        'bucket_url'         => 'https://my-bucket.s3.us-east-1.amazonaws.com',
        'enabled'            => true,
        'default_visibility' => 'public',
    ]);

    $response = get(route('aws.credential.index'));

    $response->assertOk();
    $response->assertSee('AKIA'.str_repeat('*', 12));
    $response->assertDontSee('super-secret-value');
});

it('requires access_key, secret_key, region and bucket_name when storing', function () {
    post(route('aws.credential.store'), [
        'default_visibility' => 'public',
    ])->assertSessionHasErrors(['access_key', 'secret_key', 'region', 'bucket_name']);
});

it('requires default_visibility when storing', function () {
    post(route('aws.credential.store'), [
        'access_key'  => 'AKIAIOSFODNN7EXAMPLE',
        'secret_key'  => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'region'      => 'us-east-1',
        'bucket_name' => 'my-bucket',
    ])->assertSessionHasErrors(['default_visibility']);
});

it('rejects a non url bucket_url when storing', function () {
    post(route('aws.credential.store'), [
        'access_key'         => 'AKIAIOSFODNN7EXAMPLE',
        'secret_key'         => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'region'             => 'us-east-1',
        'bucket_name'        => 'my-bucket',
        'bucket_url'         => 'not-a-url',
        'default_visibility' => 'public',
    ])->assertSessionHasErrors(['bucket_url']);
});

it('stores a credential when the AWS validator accepts the input', function () {
    $this->mock(AWSS3StorageCredentialValidator::class)
        ->shouldReceive('validateAWSS3Credentials')
        ->once()
        ->andReturnTrue();

    post(route('aws.credential.store'), [
        'access_key'         => 'AKIAIOSFODNN7EXAMPLE',
        'secret_key'         => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'region'             => 'us-east-1',
        'bucket_name'        => 'my-bucket',
        'default_visibility' => 'public',
        'enabled'            => 1,
    ])
        ->assertRedirect(route('aws.credential.index'))
        ->assertSessionHas('success');

    expect(S3StorageCredential::where('bucket_name', 'my-bucket')->exists())->toBeTrue();
});

it('flashes an error when the AWS validator rejects the credentials', function () {
    $this->mock(AWSS3StorageCredentialValidator::class)
        ->shouldReceive('validateAWSS3Credentials')
        ->once()
        ->andThrow(new Exception('Invalid AWS credentials'));

    post(route('aws.credential.store'), [
        'access_key'         => 'AKIAIOSFODNN7EXAMPLE',
        'secret_key'         => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'region'             => 'us-east-1',
        'bucket_name'        => 'my-bucket',
        'default_visibility' => 'public',
    ])
        ->assertRedirect()
        ->assertSessionHas('error', 'Invalid AWS credentials');

    expect(S3StorageCredential::where('bucket_name', 'my-bucket')->exists())->toBeFalse();
});

it('auto-generates bucket_url when omitted', function () {
    $this->mock(AWSS3StorageCredentialValidator::class)
        ->shouldReceive('validateAWSS3Credentials')
        ->once()
        ->andReturnTrue();

    post(route('aws.credential.store'), [
        'access_key'         => 'AKIAIOSFODNN7EXAMPLE',
        'secret_key'         => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'region'             => 'us-east-1',
        'bucket_name'        => 'my-bucket',
        'default_visibility' => 'public',
    ]);

    expect(S3StorageCredential::where('bucket_name', 'my-bucket')->first()->bucket_url)
        ->toBe('https://my-bucket.s3.us-east-1.amazonaws.com');
});

it('updates the existing credential instead of creating a new one', function () {
    S3StorageCredential::create([
        'access_key'         => 'AKIAOLDKEY1234567890',
        'secret_key'         => 'old-secret',
        'region'             => 'us-west-2',
        'bucket_name'        => 'old-bucket',
        'default_visibility' => 'private',
    ]);

    $this->mock(AWSS3StorageCredentialValidator::class)
        ->shouldReceive('validateAWSS3Credentials')
        ->once()
        ->andReturnTrue();

    post(route('aws.credential.store'), [
        'access_key'         => 'AKIANEWKEY1234567890',
        'secret_key'         => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'region'             => 'us-east-1',
        'bucket_name'        => 'new-bucket',
        'default_visibility' => 'public',
    ])->assertRedirect(route('aws.credential.index'));

    expect(S3StorageCredential::count())->toBe(1);
    expect(S3StorageCredential::first()->bucket_name)->toBe('new-bucket');
});

it('keeps the original secret when a masked secret key is submitted', function () {
    S3StorageCredential::create([
        'access_key'         => 'AKIAIOSFODNN7EXAMPLE',
        'secret_key'         => 'original-super-secret-value',
        'region'             => 'us-east-1',
        'bucket_name'        => 'my-bucket',
        'default_visibility' => 'public',
    ]);

    $this->mock(AWSS3StorageCredentialValidator::class)
        ->shouldReceive('validateAWSS3Credentials')
        ->once()
        ->andReturnTrue();

    post(route('aws.credential.store'), [
        'access_key'         => 'AKIAIOSFODNN7EXAMPLE',
        'secret_key'         => str_repeat('*', 20),
        'region'             => 'us-east-1',
        'bucket_name'        => 'my-bucket',
        'default_visibility' => 'public',
    ])->assertRedirect(route('aws.credential.index'));

    expect(S3StorageCredential::first()->secret_key)->toBe('original-super-secret-value');
});
