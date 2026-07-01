<x-admin::layouts>
    <x-slot:title>
        @lang('aws::app.aws.credential.index.history-label')
    </x-slot>

    <v-modal-history ref="historyModal"></v-modal-history>

    <div class="p-4 w-full">

        {{-- Title --}}
        <h2 class="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
            AWS Credentials History
        </h2>
        <x-admin::modal.history />

        <x-admin::history src="{{ route('admin.history.index', [$entityName, $id]) }}" />
    </div>
</x-admin::layouts>