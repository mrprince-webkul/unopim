<?php

use Illuminate\Support\Facades\Route;
use Webkul\AWSIntegration\Http\Controllers\AWSS3StorageController;
use Webkul\AWSIntegration\Http\Controllers\MappingHistoryController;

Route::group(['middleware' => ['web', 'admin']], function () {
    Route::prefix('admin')->group(function () {
        Route::controller(AWSS3StorageController::class)->prefix('aws')->group(function () {
            Route::get('document', 'index')->name('aws.document.index');
            Route::get('credential', 'show')->name('aws.credential.index');
            Route::post('credential', 'store')->name('aws.credential.store');
        });

        Route::controller(MappingHistoryController::class)->group(function () {
            Route::get('history', 'index')->name('aws.credentials.history');

            // API endpoint for Vue modal (JSON)
            Route::get('credential/{id}/history', 'getHistory')->name('aws.history.credential');
        });
    });
});
