<x-admin::layouts>
    <x-slot:title>
        @lang('aws::app.aws.document.index.title')
        </x-slot>
        <h2 class="w-full mt-1 rounded px-2 text-gray-600 dark:text-gray-300  text-xl font-bold mb-4">@lang('aws::app.aws.document.index.title')</h2>

        <div class="w-full mt-4 p-4 bg-white dark:bg-cherry-900 rounded box-shadow rounded-lg dark:border-cherry-800 text-gray-600 dark:text-gray-300 space-y-8">
            <!-- How to Setup Section -->
            <div class="space-y-3">
                <h3 class="text-lg font-semibold">@lang('aws::app.aws.document.setup.title'):</h3>

                <ol class="list-decimal list-inside space-y-4 mt-4">
                    <li><strong>Step 1:</strong> @lang('aws::app.aws.document.setup.steps.step1')</li>
                    <li><strong>Step 2:</strong> @lang('aws::app.aws.document.setup.steps.step2')</li>
                    <li><strong>Step 3:</strong> @lang('aws::app.aws.document.setup.steps.step3')</li>
                </ol>
            </div>
        </div>

        <!-- Media Migration Section -->
        <div class="w-full mt-4 p-4 bg-white dark:bg-cherry-900 rounded box-shadow rounded-lg dark:border-cherry-800 text-gray-600 dark:text-gray-300 space-y-8">
            <div class="!mt-8">
                <h3 class="text-lg font-semibold mb-3">@lang('aws::app.aws.document.migration.title'):</h3>

                <p class="mb-2">
                    @lang('aws::app.aws.document.migration.migrate-existing'):
                </p>

                <div class="relative bg-gray-100 dark:bg-cherry-800 p-3 rounded mb-4 flex justify-between">
                    <code class="text-sm" id="move-files">php artisan aws_integration:move_existing_files</code>

                    <button
                        type="button"
                        class="copy-btn text-white top-2 right-2 bg-violet-400 hover:bg-blue-600 text-xs px-2 font-semibold py-1 rounded"
                        onclick="copyToClipboard('move-files')">
                        @lang('aws::app.aws.document.copy-to-clipboard.copy')
                    </button>
                </div>

                <p class="mb-2">
                    @lang('aws::app.aws.document.migration.remove-migrated'):
                </p>

                <div class="relative bg-gray-100 dark:bg-cherry-800 p-3 rounded mb-4 flex justify-between">
                    <code class="text-sm" id="remove-files">php artisan aws_integration:remove_media_files</code>

                    <button
                        type="button"
                        class="copy-btn text-white top-2 right-2 bg-violet-400 hover:bg-cherry-600 text-xs px-2 font-semibold py-1 rounded"
                        onclick="copyToClipboard('remove-files')">
                        @lang('aws::app.aws.document.copy-to-clipboard.copy')
                    </button>
                </div>
            </div>
        </div>

        <!-- S3 Visibility Update Section -->
        <div class="w-full mt-4 p-4 bg-white dark:bg-cherry-900 rounded box-shadow rounded-lg dark:border-cherry-800 text-gray-600 dark:text-gray-300 space-y-6">

            <div>
                <h3 class="text-lg font-semibold mb-3">
                    @lang('aws::app.aws.document.visibility.title')
                </h3>

                <p class="mb-3 text-sm">
                    {!! trans('aws::app.aws.document.visibility.description', [
                        'public'  => '<strong>'.trans('aws::app.aws.document.visibility.public').'</strong>',
                        'private' => '<strong>'.trans('aws::app.aws.document.visibility.private').'</strong>',
                    ]) !!}
                </p>
            </div>

            {{-- Basic Command --}}
            <div>
                <p class="mb-2 font-medium">@lang('aws::app.aws.document.visibility.run-command')</p>

                <div class="relative bg-gray-100 dark:bg-cherry-800 p-3 rounded flex justify-between">
                    <code class="text-sm" id="update-visibility">
                        php artisan aws_integration:update_visibility
                    </code>

                    <button
                        type="button"
                        class="copy-btn text-white bg-violet-500 hover:bg-violet-600 text-xs px-2 py-1 rounded"
                        onclick="copyToClipboard('update-visibility')">
                        @lang('aws::app.aws.document.copy-to-clipboard.copy')
                    </button>
                </div>
            </div>

            {{-- Options --}}
            <div class="space-y-4">
                <h4 class="font-semibold">@lang('aws::app.aws.document.visibility.options')</h4>

                <ul class="list-disc list-inside text-sm space-y-2">

                    <li>
                        <strong>--visibility=public|private</strong><br>
                        @lang('aws::app.aws.document.visibility.option-visibility')<br>
                        @lang('aws::app.aws.document.visibility.example-label')
                        <code class="bg-gray-200 dark:bg-cherry-800 px-1 rounded">
                            --visibility=public
                        </code>
                    </li>

                    <li>
                        <strong>--path=folder/path</strong><br>
                        @lang('aws::app.aws.document.visibility.option-path')<br>
                        @lang('aws::app.aws.document.visibility.example-label')
                        <code class="bg-gray-200 dark:bg-cherry-800 px-1 rounded">
                            --path=products/images
                        </code>
                    </li>

                    <li>
                        <strong>--dry-run</strong><br>
                        @lang('aws::app.aws.document.visibility.option-dry-run')
                    </li>

                </ul>
            </div>

            {{-- Examples --}}
            <div class="space-y-3">
                <h4 class="font-semibold">@lang('aws::app.aws.document.visibility.examples')</h4>

                <div class="relative bg-gray-100 dark:bg-cherry-800 p-3 rounded flex justify-between">
                    <code class="text-sm" id="example-1">
                        php artisan aws_integration:update_visibility --visibility=public
                    </code>
                    <button onclick="copyToClipboard('example-1')" class="copy-btn text-white bg-violet-500 text-xs px-2 py-1 rounded">@lang('aws::app.aws.document.copy-to-clipboard.copy')</button>
                </div>

                <div class="relative bg-gray-100 dark:bg-cherry-800 p-3 rounded flex justify-between">
                    <code class="text-sm" id="example-2">
                        php artisan aws_integration:update_visibility --path=products --visibility=private
                    </code>
                    <button onclick="copyToClipboard('example-2')" class="copy-btn text-white bg-violet-500 text-xs px-2 py-1 rounded">@lang('aws::app.aws.document.copy-to-clipboard.copy')</button>
                </div>

                <div class="relative bg-gray-100 dark:bg-cherry-800 p-3 rounded flex justify-between">
                    <code class="text-sm" id="example-3">
                        php artisan aws_integration:update_visibility --dry-run
                    </code>
                    <button onclick="copyToClipboard('example-3')" class="copy-btn text-white bg-violet-500 text-xs px-2 py-1 rounded">@lang('aws::app.aws.document.copy-to-clipboard.copy')</button>
                </div>
            </div>

            {{-- Notes --}}
            <div class="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ @lang('aws::app.aws.document.visibility.warning')
            </div>

        </div>

        <!-- JavaScript for Copying to Clipboard -->
        <script>
            function copyToClipboard(elementId) {
                const targetElement = document.getElementById(elementId);

                if (targetElement) {
                    const textToCopy = targetElement.innerText.trim();

                    const textArea = document.createElement('textarea');
                    textArea.value = textToCopy;
                    document.body.appendChild(textArea);
                    textArea.select();
                    textArea.setSelectionRange(0, 99999); // For mobile devices

                    try {
                        document.execCommand('copy');
                    } catch (err) {
                        console.error('Fallback: Failed to copy text to clipboard: ', err);
                    }

                    // Remove the temporary textarea element
                    document.body.removeChild(textArea);

                    // Update the button text to "Copied!"
                    const button = event.target;
                    const originalText = button.innerText;
                    button.innerText = "@lang('aws::app.aws.document.copy-to-clipboard.copied')";
                    setTimeout(() => {
                        button.innerText = originalText;
                    }, 2000);

                } else {
                    console.error('Element not found:', elementId);
                }
            }
        </script>
</x-admin::layouts>