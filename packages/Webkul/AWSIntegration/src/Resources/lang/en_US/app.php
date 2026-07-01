<?php

return [
    'components' => [
        'layouts' => [
            'sidebar' => [
                'aws'        => 'AWS S3',
                'document'   => 'Documentation',
                'credential' => 'Credentials',
                'history'    => 'History',
            ],
        ],
    ],

    'aws' => [
        'document' => [
            'copy-to-clipboard' => [
                'copy'   => 'Copy',
                'copied' => 'Copied!',
            ],
            'index' => [
                'title'       => 'AWS S3 Documentation',
                'description' => 'Amazon S3 is an object storage service that offers industry-leading scalability, data availability, security, and performance.',
            ],

            'setup' => [
                'title' => 'How to Set Up',
                'steps' => [
                    'step1' => 'Create an S3 bucket in your AWS account.',
                    'step2' => 'Generate Access Key and Secret Key from IAM.',
                    'step3' => 'Configure AWS credentials in UnoPim.',
                ],
            ],

            'migration' => [
                'title'            => 'Migrate Existing Media to AWS S3',
                'migrate-existing' => 'To migrate existing media from UnoPim to AWS S3, run the following command:',
                'remove-migrated'  => 'To remove media files from local storage after migration, run:',
            ],

            'visibility' => [
                'title'              => 'Update S3 File Visibility (ACL)',
                'description'        => 'This command updates the visibility (ACL) of files stored in your AWS S3 bucket. You can make files :public or :private.',
                'public'             => 'public',
                'private'            => 'private',
                'run-command'        => 'Run Command:',
                'options'            => 'Options:',
                'examples'           => 'Examples:',
                'option-visibility'  => 'Override default visibility from DB.',
                'option-path'        => 'Apply visibility only to a specific folder (prefix).',
                'option-dry-run'     => 'Preview changes without applying them. Useful for testing.',
                'example-label'      => 'Example:',
                'warning'            => 'This command updates ALL matching files in your S3 bucket. Use --dry-run before running in production.',
            ],

            'version' => 'Version',
        ],

        'credential' => [
            'index' => [
                'title'                  => 'AWS Credential',
                'page-title'             => 'AWS Credentials',
                'credential-label'       => 'Credentials',
                'history-label'          => 'History',

                'enable-aws'             => 'Enable AWS S3',
                'default-visibility'     => 'Default File Visibility',
                'visibility-help-public' => 'Switch ON for :strong (files accessible via URL)',
                'visibility-help-private'=> 'Switch OFF for :strong (files need authentication)',
                'public'                 => 'Public',
                'private'                => 'Private',

                'access-key'             => 'Access Key',
                'secret-key'             => 'Secret Key',
                'region'                 => 'Region',
                'bucket-name'            => 'Bucket Name',
                'bucket-url'             => 'Bucket URL',
                'environment-updated-at' => 'Environment Update Time',
                'enabled'                => 'Enable AWS S3',

                'save'                   => 'Save',

                'access-key-placeholder'  => 'AKIAIOSFODNN7EXAMPLE',
                'secret-key-placeholder'  => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                'region-placeholder'      => 'e.g. us-east-1',
                'bucket-name-placeholder' => 'e.g. my-company-assets',
                'bucket-url-placeholder'  => 'https://your-bucket.s3.amazonaws.com',
                'environment-placeholder' => 'YYYY-MM-DD HH:MM:SS',
            ],

            'invalid'      => 'Invalid AWS credentials',
            'save-success' => 'AWS credentials saved successfully',
        ],

        'history' => [
            'page-title'    => 'AWS Credentials History',
            'columns'       => [
                'id'      => 'ID',
                'event'   => 'Event',
                'changes' => 'Changes',
                'user'    => 'User',
                'date'    => 'Date',
            ],
            'view-details'  => 'View Details',
            'no-changes'    => 'No changes',
            'no-history'    => 'No history found',
            'system'        => 'System',
            'modal'         => [
                'title'         => 'Change Details',
                'event'         => 'Event:',
                'user'          => 'User:',
                'date'          => 'Date:',
                'changed-fields'=> 'Changed Fields',
                'field'         => 'Field',
                'old-value'     => 'Old Value',
                'new-value'     => 'New Value',
                'no-changes'    => 'No changes',
                'close'         => 'Close',
            ],
            'api' => [
                'record-not-found'   => 'Record not found',
                'fetch-error'        => 'Error fetching history: :error',
                'updated'            => 'Updated',
                'not-updated'        => 'Not Updated',
                'yes'                => 'Yes',
                'no'                 => 'No',
                'configuration'      => 'Configuration',
                'initial-setup'      => 'Initial setup',
                'updated-config'     => 'Updated configuration',
                'credential-created' => 'Credential Created',
                'credential-added'   => 'AWS Credential added',
            ],
        ],

        'export' => [
            'archive' => [
                'open-zip-failed' => 'Failed to open temporary zip file for writing.',
            ],
        ],
    ],

    'acl' => [
        'credential' => [
            'view' => 'View AWS Credentials',
            'save' => 'Save AWS Credentials',
        ],
    ],
];
