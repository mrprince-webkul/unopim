<?php

namespace Webkul\AWSIntegration\Helpers\Exporters\Product;

use Illuminate\Support\Facades\Event;
use Webkul\DataTransfer\Buffer\FileBuffer;
use Webkul\DataTransfer\Contracts\JobTrackBatch as JobTrackBatchContract;
use Webkul\DataTransfer\Helpers\Export;
use Webkul\DataTransfer\Helpers\Exporters\Product\Exporter as BaseExporter;
use Webkul\DataTransfer\Jobs\Export\File\SpoutWriterFactory;

class Exporter extends BaseExporter
{
    public function initializeFileBuffer()
    {
        $fileName = $this->getFileName();
        $directory = sprintf('exports/%s/%s', $this->export->id, FileBuffer::FOLDER_PREFIX);

        return $this->exportFileBuffer->initialize(
            $directory,
            $fileName,
            ['type' => $this->filters['file_format'] ?? SpoutWriterFactory::CSV],
        );
    }

    public function exportBatch(JobTrackBatchContract $batch, $filePath): bool
    {
        Event::dispatch('data_transfer.exports.batch.export.before', $batch);

        $this->initilize();
        $fileBuffer = $this->initializeFileBuffer();

        $filePath = $fileBuffer->getFilePath();
        $products = $this->prepareProducts($batch, $filePath);

        $this->exportBuffer->write($products);

        /**
         * Update export batch process state summary
         */
        $this->updateBatchState($batch->id, Export::STATE_PROCESSED);

        Event::dispatch('data_transfer.exports.batch.export.after', $batch);

        return true;
    }
}
