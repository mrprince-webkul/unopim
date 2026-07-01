<?php

namespace Webkul\AWSIntegration\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Webkul\AWSIntegration\Models\S3StorageCredential;
use Webkul\AWSIntegration\Validators\AWSS3StorageCredentialValidator;

class AWSS3StorageController extends Controller
{
    protected $S3StorageCredential;

    protected $AWSS3StorageCredentialValidator;

    public function __construct(
        S3StorageCredential $S3StorageCredential,
        AWSS3StorageCredentialValidator $AWSS3StorageCredentialValidator
    ) {
        $this->S3StorageCredential = $S3StorageCredential;
        $this->AWSS3StorageCredentialValidator = $AWSS3StorageCredentialValidator;
    }

    public function index()
    {
        return view('aws::index');
    }

    /**
     * Store / Update AWS S3 Credential
     */
    public function store(Request $request)
    {
        // ✅ Validation (VISIBILITY ADDED)
        $data = $request->validate([
            'access_key'             => 'required|string|max:255',
            'secret_key'             => 'required|string|max:255',
            'region'                 => 'required|string|max:50',
            'bucket_name'            => 'required|string|max:255',
            // 'bucket_url'             => 'required|url|max:500',
            'bucket_url'             => 'nullable|url|max:500',
            'environment_updated_at' => 'nullable|date',
            'enabled'                => 'nullable|boolean',
            'default_visibility'     => 'required|in:public,private',
        ]);
        // generate bucket URL Dynamicly
        if (empty($data['bucket_url'])) {
            $data['bucket_url'] = sprintf(
                'https://%s.s3.%s.amazonaws.com',
                $data['bucket_name'],
                $data['region']
            );
        }

        $existingCredential = $this->S3StorageCredential->first();

        // ✅ Handle masked secret key
        if ($existingCredential && $data['secret_key'] === str_repeat('*', 20)) {
            $data['secret_key'] = $existingCredential->secret_key;
        }

        // ✅ Handle masked access key
        if ($existingCredential && preg_match('/^.{4}\*+$/', $data['access_key'])) {
            $data['access_key'] = $existingCredential->access_key;
        }

        try {
            $this->AWSS3StorageCredentialValidator->validateAWSS3Credentials(
                $data['access_key'],
                $data['secret_key'],
                $data['region'],
                $data['bucket_name'],
                $data['bucket_url'] ?? null
            );
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', $e->getMessage())
                ->withInput();
        }

        // ✅ Final data to store (VISIBILITY INCLUDED)
        $credentialData = [
            'access_key'         => $data['access_key'],
            'secret_key'         => $data['secret_key'],
            'region'             => $data['region'],
            'bucket_name'        => $data['bucket_name'],
            'bucket_url'         => $data['bucket_url'] ?? null,
            'enabled'            => $data['enabled'] ?? 0,
            'default_visibility' => $data['default_visibility'],
        ];

        if (! empty($data['environment_updated_at'])) {
            $credentialData['environment_updated_at'] = $data['environment_updated_at'];
        }

        // ✅ Correct update or create
        $this->S3StorageCredential->updateOrCreate(
            ['id' => $existingCredential?->id],
            $credentialData
        );

        return redirect()
            ->route('aws.credential.index')
            ->with('success', trans('aws::app.aws.credential.save-success'));
    }

    /**
     * Show AWS Credential
     */
    public function show()
    {
        $credential = $this->S3StorageCredential
            ->orderBy('id', 'desc')
            ->first();

        if (! $credential) {
            return view('aws::credential', [
                'awsStorageCredential' => null,
            ]);
        }

        // ✅ VISIBILITY INCLUDED
        $awsStorageCredential = [
            'id'                    => $credential->id,
            'access_key'            => substr($credential->access_key, 0, 4).str_repeat('*', 12),
            'secret_key'            => str_repeat('*', 20),
            'region'                => $credential->region,
            'bucket_name'           => $credential->bucket_name,
            'bucket_url'            => $credential->bucket_url,
            'environment_updated_at'=> $credential->environment_updated_at,
            'enabled'               => $credential->enabled,
            'default_visibility'    => $credential->default_visibility,
            'created_at'            => $credential->created_at,
            'updated_at'            => $credential->updated_at,
        ];

        return view('aws::credential', compact('awsStorageCredential'));
    }
}
