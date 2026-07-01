@php
    $awsStorageCredential = $awsStorageCredential ?? [];
    $isEnabled = (bool) ($awsStorageCredential['enabled'] ?? false);
    $isPublic = ($awsStorageCredential['default_visibility'] ?? 'public') == 'public';
@endphp

<x-admin::layouts>

    {{-- Page Title --}}
    <x-slot:title>
        @lang('aws::app.aws.credential.index.title')
    </x-slot:title>

    {{-- Entity Name --}}
    <x-slot:entityName>
        aws_credentials
    </x-slot:entityName>

    <x-admin::form :action="route('aws.credential.store')">
        @method('POST')

        <div class="flex justify-between items-center mb-4">
            <p class="text-xl font-bold text-gray-800 dark:text-white">
                @lang('aws::app.aws.credential.index.title')
            </p>

            <button type="submit" class="primary-button">
                @lang('aws::app.aws.credential.index.save')
            </button>
        </div>

        <div class="p-4 bg-white dark:bg-cherry-900 rounded box-shadow">

            {{-- Enable AWS S3 --}}
            <x-admin::form.control-group>
                <x-admin::form.control-group.label>
                    @lang('aws::app.aws.credential.index.enable-aws')
                </x-admin::form.control-group.label>

                <input type="hidden" name="enabled" value="0" />

                <x-admin::form.control-group.control
                    type="switch"
                    name="enabled"
                    value="1"
                    :checked="$isEnabled"
                />
            </x-admin::form.control-group>

            {{-- Default Visibility --}}
            <x-admin::form.control-group>
                <x-admin::form.control-group.label>
                    @lang('aws::app.aws.credential.index.default-visibility')
                </x-admin::form.control-group.label>

                <input type="hidden" name="default_visibility" value="private" />

                <x-admin::form.control-group.control
                    type="switch"
                    name="default_visibility"
                    value="public"
                    :checked="$isPublic"
                />

                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {!! trans('aws::app.aws.credential.index.visibility-help-public', [
                        'strong' => '<span class="font-semibold">'.trans('aws::app.aws.credential.index.public').'</span>',
                    ]) !!}<br>
                    {!! trans('aws::app.aws.credential.index.visibility-help-private', [
                        'strong' => '<span class="font-semibold">'.trans('aws::app.aws.credential.index.private').'</span>',
                    ]) !!}
                </p>
            </x-admin::form.control-group>

            {{-- Access Key --}}
            <x-admin::form.control-group>
                <x-admin::form.control-group.label class="required">
                    @lang('aws::app.aws.credential.index.access-key')
                </x-admin::form.control-group.label>

                <x-admin::form.control-group.control
                    type="text"
                    name="access_key"
                    rules="required"
                    :value="old('access_key', $awsStorageCredential['access_key'] ?? '')"
                    :placeholder="trans('aws::app.aws.credential.index.access-key-placeholder')"
                />

                <x-admin::form.control-group.error control-name="access_key" />
            </x-admin::form.control-group>

            {{-- Secret Key --}}
            <x-admin::form.control-group>
                <x-admin::form.control-group.label class="required">
                    @lang('aws::app.aws.credential.index.secret-key')
                </x-admin::form.control-group.label>

                <x-admin::form.control-group.control
                    type="password"
                    name="secret_key"
                    rules="required"
                    :value="old('secret_key', $awsStorageCredential['secret_key'] ?? '')"
                    :placeholder="trans('aws::app.aws.credential.index.secret-key-placeholder')"
                />

                <x-admin::form.control-group.error control-name="secret_key" />
            </x-admin::form.control-group>

            {{-- Region --}}
            <x-admin::form.control-group>
                <x-admin::form.control-group.label class="required">
                    @lang('aws::app.aws.credential.index.region')
                </x-admin::form.control-group.label>

                <x-admin::form.control-group.control
                    type="text"
                    name="region"
                    rules="required"
                    :value="old('region', $awsStorageCredential['region'] ?? '')"
                    :placeholder="trans('aws::app.aws.credential.index.region-placeholder')"
                />

                <x-admin::form.control-group.error control-name="region" />
            </x-admin::form.control-group>

            {{-- Bucket Name --}}
            <x-admin::form.control-group>
                <x-admin::form.control-group.label class="required">
                    @lang('aws::app.aws.credential.index.bucket-name')
                </x-admin::form.control-group.label>

                <x-admin::form.control-group.control
                    type="text"
                    name="bucket_name"
                    rules="required"
                    :value="old('bucket_name', $awsStorageCredential['bucket_name'] ?? '')"
                    :placeholder="trans('aws::app.aws.credential.index.bucket-name-placeholder')"
                />

                <x-admin::form.control-group.error control-name="bucket_name" />
            </x-admin::form.control-group>

            {{-- Bucket URL --}}
            <x-admin::form.control-group>
                <x-admin::form.control-group.label>
                    @lang('aws::app.aws.credential.index.bucket-url')
                </x-admin::form.control-group.label>

                <x-admin::form.control-group.control
                    type="text"
                    name="bucket_url"
                    :value="old('bucket_url', $awsStorageCredential['bucket_url'] ?? '')"
                    :placeholder="trans('aws::app.aws.credential.index.bucket-url-placeholder')"
                />

                <x-admin::form.control-group.error control-name="bucket_url" />
            </x-admin::form.control-group>

            {{-- Environment Update Time --}}
            <x-admin::form.control-group>
                <x-admin::form.control-group.label>
                    @lang('aws::app.aws.credential.index.environment-updated-at')
                </x-admin::form.control-group.label>

                <x-admin::form.control-group.control
                    type="text"
                    name="environment_updated_at"
                    :value="old('environment_updated_at', $awsStorageCredential['environment_updated_at'] ?? '')"
                    :placeholder="trans('aws::app.aws.credential.index.environment-placeholder')"
                />

                <x-admin::form.control-group.error control-name="environment_updated_at" />
            </x-admin::form.control-group>

        </div>
    </x-admin::form>

</x-admin::layouts>
