<?php

namespace Webkul\AWSIntegration\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\View\View;
use Webkul\AWSIntegration\Repositories\AWSStorageCredentialRepository;
use Webkul\HistoryControl\Repositories\AuditRepository;

class MappingHistoryController
{
    public function __construct(protected AWSStorageCredentialRepository $s3StorageCredentialRepository, protected AuditRepository $audit_repository)
    {
        $this->s3StorageCredentialRepository = $s3StorageCredentialRepository;
        $this->audit_repository = $audit_repository;
    }

    /**
     * History view for AWS S3 credentials
     */
    public function index(): View
    {
        // return view('aws::history.index', ['entityName' => 'wk_aws_s3_storage_credentials', 'id' => 1]);
        // Get paginated data (10 items per page)

        $data = $this->s3StorageCredentialRepository
            ->orderBy('id', 'desc')
            ->paginate(10);

        $data = $this->audit_repository
            ->where('auditable_type', '=', 'Webkul\AWSIntegration\Models\S3StorageCredential')
            ->orderBy('id', 'desc')
            ->paginate(10);

        return view('aws::history.index', [
            'data' => $data,
        ]);
    }

    /**
     * API endpoint to fetch history for a specific credential
     */
    public function getHistory(int $id): JsonResponse
    {
        try {
            // Get the credential record
            $credential = $this->s3StorageCredentialRepository->find($id);

            if (! $credential) {
                return response()->json([
                    'success'        => false,
                    'message'        => trans('aws::app.aws.history.api.record-not-found'),
                    'version'        => null,
                    'dateTime'       => null,
                    'user'           => null,
                    'versionHistory' => [],
                ], 404);
            }

            // Get version history (using activity log or similar)
            $versionHistory = $this->getVersionHistory($credential);

            // Mask access key for display
            $maskedAccessKey = ! empty($credential->access_key)
                ? substr($credential->access_key, 0, 5).'*****'.substr($credential->access_key, -4)
                : 'N/A';

            return response()->json([
                'success'         => true,
                'version'         => $credential->version ?? '1.0',
                'dateTime'        => $credential->updated_at?->format('Y-m-d H:i:s') ?? $credential->created_at?->format('Y-m-d H:i:s'),
                'user'            => $credential->user?->name ?? trans('aws::app.aws.history.system'),
                'maskedAccessKey' => $maskedAccessKey,
                'credentialInfo'  => [
                    'region'      => $credential->region,
                    'bucket_name' => $credential->bucket_name,
                    'environment' => $credential->environment_updated_at
                        ? trans('aws::app.aws.history.api.updated')
                        : trans('aws::app.aws.history.api.not-updated'),
                    'enabled'     => $credential->enabled
                        ? trans('aws::app.aws.history.api.yes')
                        : trans('aws::app.aws.history.api.no'),
                ],
                'versionHistory' => $versionHistory,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success'        => false,
                'message'        => trans('aws::app.aws.history.api.fetch-error', ['error' => $e->getMessage()]),
                'version'        => null,
                'dateTime'       => null,
                'user'           => null,
                'versionHistory' => [],
            ], 500);
        }
    }

    /**
     * Get version history for a credential
     */
    protected function getVersionHistory($credential): array
    {
        $history = [];

        // Example 1: If you have an activity log
        // You can use a package like spatie/laravel-activitylog
        // $activities = Activity::where('subject_id', $credential->id)
        //     ->where('subject_type', get_class($credential))
        //     ->orderBy('created_at', 'desc')
        //     ->get();

        // Example 2: Manual tracking based on updated fields
        // This would require storing previous values somewhere

        // For now, create dummy data based on update timestamps
        if ($credential->updated_at && $credential->created_at != $credential->updated_at) {
            $history[] = [
                'id'   => 1,
                'name' => trans('aws::app.aws.history.api.configuration'),
                'old'  => trans('aws::app.aws.history.api.initial-setup'),
                'new'  => trans('aws::app.aws.history.api.updated-config'),
                'date' => $credential->updated_at->format('Y-m-d H:i:s'),
            ];
        }

        // Add creation as first history entry
        $history[] = [
            'id'   => 2,
            'name' => trans('aws::app.aws.history.api.credential-created'),
            'old'  => 'N/A',
            'new'  => trans('aws::app.aws.history.api.credential-added'),
            'date' => $credential->created_at->format('Y-m-d H:i:s'),
        ];

        return $history;
    }
}
