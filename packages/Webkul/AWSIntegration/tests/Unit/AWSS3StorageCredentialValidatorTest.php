<?php

use Webkul\AWSIntegration\Validators\AWSS3StorageCredentialValidator;

beforeEach(function () {
    $this->validator = new AWSS3StorageCredentialValidator;
});

it('accepts a valid region and bucket when credentials are masked', function () {
    $result = $this->validator->validateAWSS3Credentials(
        str_repeat('*', 20),
        str_repeat('*', 40),
        'us-east-1',
        'my-valid-bucket'
    );

    expect($result)->toBeTrue();
});

it('accepts ap-south-1 region when credentials are masked', function () {
    $result = $this->validator->validateAWSS3Credentials(
        str_repeat('*', 20),
        str_repeat('*', 40),
        'ap-south-1',
        'unopim-assets'
    );

    expect($result)->toBeTrue();
});

it('rejects an invalid region format', function () {
    $this->validator->validateAWSS3Credentials(
        str_repeat('*', 20),
        str_repeat('*', 40),
        'INVALID_REGION',
        'my-valid-bucket'
    );
})->throws(Exception::class, 'Region format is invalid');

it('rejects a bucket name shorter than three characters', function () {
    $this->validator->validateAWSS3Credentials(
        str_repeat('*', 20),
        str_repeat('*', 40),
        'us-east-1',
        'ab'
    );
})->throws(Exception::class);

it('rejects a bucket name with uppercase letters', function () {
    $this->validator->validateAWSS3Credentials(
        str_repeat('*', 20),
        str_repeat('*', 40),
        'us-east-1',
        'MyBucket'
    );
})->throws(Exception::class, 'Bucket name must be lowercase');

it('rejects a bucket name that looks like an ip address', function () {
    $this->validator->validateAWSS3Credentials(
        str_repeat('*', 20),
        str_repeat('*', 40),
        'us-east-1',
        '192.168.1.1'
    );
})->throws(Exception::class);

it('rejects an invalid custom endpoint url', function () {
    $this->validator->validateAWSS3Credentials(
        str_repeat('*', 20),
        str_repeat('*', 40),
        'us-east-1',
        'my-valid-bucket',
        'not-a-url'
    );
})->throws(Exception::class);

it('rejects an access key shorter than sixteen characters when not masked', function () {
    $this->validator->validateAWSS3Credentials(
        'short',
        'some-secret-that-is-long-enough-for-validation',
        'us-east-1',
        'my-valid-bucket'
    );
})->throws(Exception::class, 'Access Key must be at least 16 characters');

it('rejects a secret key shorter than thirty characters when not masked', function () {
    $this->validator->validateAWSS3Credentials(
        'AKIAIOSFODNN7EXAMPLE',
        'short-secret',
        'us-east-1',
        'my-valid-bucket'
    );
})->throws(Exception::class, 'Secret Key must be at least 30 characters');
