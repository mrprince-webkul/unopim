<x-admin::layouts>
    <x-slot:title>
        @lang('aws::app.aws.credential.index.history-label')
    </x-slot>

    <v-aws-history></v-aws-history>

    @pushOnce('scripts')
        <script
            type="text/x-template"
            id="v-aws-history-template"
        >
            <div>
                <div class="p-4 w-full">
                    <h2 class="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                        @lang('aws::app.aws.history.page-title')
                    </h2>

                    <div class="bg-white dark:bg-cherry-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table class="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                                <tr>
                                    <th class="w-[80px] px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">@lang('aws::app.aws.history.columns.id')</th>
                                    <th class="w-[120px] px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">@lang('aws::app.aws.history.columns.event')</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">@lang('aws::app.aws.history.columns.changes')</th>
                                    <th class="w-[140px] px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">@lang('aws::app.aws.history.columns.user')</th>
                                    <th class="w-[180px] px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">@lang('aws::app.aws.history.columns.date')</th>
                                </tr>
                            </thead>

                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                @forelse($data as $item)
                                    @php
                                        $newValues = is_array($item->new_values)
                                            ? $item->new_values
                                            : json_decode($item->new_values ?? '[]', true);

                                        $oldValues = is_array($item->old_values)
                                            ? $item->old_values
                                            : json_decode($item->old_values ?? '[]', true);

                                        if (is_array($newValues)) {
                                            unset($newValues['secret_key']);
                                        }
                                        if (is_array($oldValues)) {
                                            unset($oldValues['secret_key']);
                                        }

                                        $changesPayload = [
                                            'id'         => $item->id,
                                            'event'      => $item->event,
                                            'user'       => class_basename($item->user_type ?? 'System').' #'.($item->user_id ?? '-'),
                                            'date'       => $item->created_at ? $item->created_at->format('d M Y, H:i') : '-',
                                            'old_values' => $oldValues ?: (object) [],
                                            'new_values' => $newValues ?: (object) [],
                                        ];

                                        $changeCount = is_array($newValues) ? count($newValues) : 0;
                                    @endphp

                                    <tr>
                                        <td class="px-6 py-4 text-sm text-gray-800 dark:text-gray-300">
                                            #{{ $item->id }}
                                        </td>

                                        <td class="px-6 py-4">
                                            <span class="px-2 py-1 text-xs font-semibold rounded-full dark:text-gray-300">
                                                {{ ucfirst($item->event) }}
                                            </span>
                                        </td>

                                        <td class="px-6 py-4 text-sm">
                                            @if ($changeCount > 0)
                                                <button
                                                    type="button"
                                                    class="secondary-button"
                                                    @click='openDetails(@json($changesPayload))'
                                                >
                                                    @lang('aws::app.aws.history.view-details') ({{ $changeCount }})
                                                </button>
                                            @else
                                                <span class="text-gray-400 dark:text-gray-500">@lang('aws::app.aws.history.no-changes')</span>
                                            @endif
                                        </td>

                                        <td class="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-300">
                                            {{ class_basename($item->user_type ?? 'System') }} #{{ $item->user_id ?? '-' }}
                                        </td>

                                        <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                            {{ $item->created_at ? $item->created_at->format('d M Y, H:i') : '-' }}
                                        </td>
                                    </tr>
                                @empty
                                    <tr>
                                        <td colspan="5" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                            @lang('aws::app.aws.history.no-history')
                                        </td>
                                    </tr>
                                @endforelse
                            </tbody>
                        </table>

                        @if($data->hasPages())
                            <div class="p-4 border-t border-gray-200 dark:border-gray-700">
                                {{ $data->links() }}
                            </div>
                        @endif
                    </div>
                </div>

                <x-admin::modal ref="historyDetailsModal">
                    <x-slot:header>
                        <p class="text-lg text-gray-800 dark:text-white font-bold">
                            @lang('aws::app.aws.history.modal.title') <span v-if="selected">#@{{ selected.id }}</span>
                        </p>
                    </x-slot>

                    <x-slot:content>
                        <div v-if="selected" class="space-y-4">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="font-semibold text-gray-600 dark:text-gray-300">@lang('aws::app.aws.history.modal.event')</span>
                                    <span class="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full"
                                        :class="selected.event === 'created'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'">
                                        @{{ selected.event ? selected.event.charAt(0).toUpperCase() + selected.event.slice(1) : '' }}
                                    </span>
                                </div>
                                <div>
                                    <span class="font-semibold text-gray-600 dark:text-gray-300">@lang('aws::app.aws.history.modal.user')</span>
                                    <span class="ml-2 text-gray-800 dark:text-gray-200">@{{ selected.user }}</span>
                                </div>
                                <div class="col-span-2">
                                    <span class="font-semibold text-gray-600 dark:text-gray-300">@lang('aws::app.aws.history.modal.date')</span>
                                    <span class="ml-2 text-gray-800 dark:text-gray-200">@{{ selected.date }}</span>
                                </div>
                            </div>

                            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <h3 class="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">@lang('aws::app.aws.history.modal.changed-fields')</h3>

                                <div class="overflow-x-auto">
                                    <table class="w-full text-sm border border-gray-200 dark:border-gray-700 rounded">
                                        <thead class="bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">@lang('aws::app.aws.history.modal.field')</th>
                                                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">@lang('aws::app.aws.history.modal.old-value')</th>
                                                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">@lang('aws::app.aws.history.modal.new-value')</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                            <tr v-for="(value, key) in selected.new_values" :key="key">
                                                <td class="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 align-top">
                                                    @{{ formatKey(key) }}
                                                </td>
                                                <td class="px-3 py-2 text-gray-600 dark:text-gray-400 align-top break-all">
                                                    <span v-if="hasOld(key)" class="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                                                        @{{ formatValue(selected.old_values[key]) }}
                                                    </span>
                                                    <span v-else class="text-gray-400 italic">—</span>
                                                </td>
                                                <td class="px-3 py-2 text-gray-800 align-top break-all">
                                                    <span class="px-2 py-0.5 bg-green-150 dark:bg-green-150 text-green-700 rounded">
                                                        @{{ formatValue(value) }}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr v-if="!Object.keys(selected.new_values || {}).length">
                                                <td colspan="3" class="px-3 py-4 text-center text-gray-400">@lang('aws::app.aws.history.modal.no-changes')</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </x-slot>

                    <x-slot:footer>
                        <button
                            type="button"
                            class="secondary-button"
                            @click="$refs.historyDetailsModal.close()"
                        >
                            @lang('aws::app.aws.history.modal.close')
                        </button>
                    </x-slot>
                </x-admin::modal>
            </div>
        </script>

        <script type="module">
            app.component('v-aws-history', {
                template: '#v-aws-history-template',

                data() {
                    return {
                        selected: null,
                    };
                },

                methods: {
                    openDetails(item) {
                        this.selected = item;
                        this.$refs.historyDetailsModal.open();
                    },

                    formatKey(key) {
                        return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                    },

                    formatValue(value) {
                        if (value === null || value === undefined || value === '') {
                            return '—';
                        }
                        if (typeof value === 'object') {
                            return JSON.stringify(value);
                        }
                        return value;
                    },

                    hasOld(key) {
                        return this.selected
                            && this.selected.old_values
                            && Object.prototype.hasOwnProperty.call(this.selected.old_values, key);
                    },
                },
            });
        </script>
    @endPushOnce
</x-admin::layouts>
