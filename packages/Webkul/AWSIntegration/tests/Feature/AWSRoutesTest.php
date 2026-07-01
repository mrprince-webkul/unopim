<?php

use function Pest\Laravel\get;

beforeEach(function () {
    $this->loginAsAdmin();
});

it('exposes the aws document route', function () {
    expect(route('aws.document.index'))->toContain('/admin/aws/document');
});

it('exposes the aws credential index route', function () {
    expect(route('aws.credential.index'))->toContain('/admin/aws/credential');
});

it('exposes the aws credential store route', function () {
    expect(route('aws.credential.store'))->toContain('/admin/aws/credential');
});

it('exposes the aws credentials history route', function () {
    expect(route('aws.credentials.history'))->toContain('/admin/history');
});

it('redirects unauthenticated users away from the credential page', function () {
    auth()->guard('admin')->logout();

    $response = get('/admin/aws/credential');

    expect($response->status())->toBeIn([302, 401]);
});
