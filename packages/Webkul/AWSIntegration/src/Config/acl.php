<?php

return [
    [
        'key'   => 'aws',
        'name'  => 'aws::app.components.layouts.sidebar.aws',
        'route' => 'aws.document.index',
        'sort'  => 10,
    ],
    [
        'key'   => 'aws.document',
        'name'  => 'aws::app.components.layouts.sidebar.document',
        'route' => 'aws.document.index',
        'sort'  => 1,
    ],
    [
        'key'   => 'aws.credentials',
        'name'  => 'aws::app.components.layouts.sidebar.credential',
        'route' => 'aws.credential.index',
        'sort'  => 2,
    ],
    [
        'key'   => 'aws.credentials.store',
        'name'  => 'aws::app.acl.credential.save',
        'route' => 'aws.credentials.store',
        'sort'  => 1,
    ],
    [
        'key'   => 'aws.credentials.index',
        'name'  => 'aws::app.components.layouts.sidebar.credential',
        'route' => 'aws.credential.index',
        'sort'  => 2,
    ],
    [
        'key'   => 'aws.credentials.history',
        'name'  => 'aws::app.components.layouts.sidebar.history',
        'route' => 'aws.credentials.history',
        'sort'  => 3,
    ],
];
