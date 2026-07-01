<?php

namespace Webkul\AWSIntegration;

use Illuminate\Support\Facades\Storage;
use Webkul\Customer\Contracts\Wishlist;
use Webkul\Product\Contracts\Product;
use Webkul\Product\Contracts\ProductFlat;
use Webkul\Product\ProductImage as ProductImageFacade;
use Webkul\Product\Repositories\ProductRepository;

class ProductImage extends ProductImageFacade
{
    /**
     * ProductRepository instance
     *
     * @var ProductRepository
     */
    protected $productRepository;

    /**
     * Create a new helper instance.
     *
     * @return void
     */
    public function __construct(
        ProductRepository $productRepository
    ) {
        $this->productRepository = $productRepository;
    }

    /**
     * Retrieve collection of gallery images
     *
     * @param  Product|ProductFlat  $product
     * @return array
     */
    public function getGalleryImages($product)
    {
        if (! $product) {
            return [];
        }

        $images = [];

        foreach ($product->images as $image) {
            $url = Storage::url($image->path);

            $images[] = [
                'small_image_url'    => $url,
                'medium_image_url'   => $url,
                'large_image_url'    => $url,
                'original_image_url' => $url,
            ];
        }

        if (! $product->parent_id && ! count($images) && ! count($product->videos)) {
            $images[] = [
                'small_image_url'    => asset('vendor/webkul/ui/assets/images/product/small-product-placeholder.webp'),
                'medium_image_url'   => asset('vendor/webkul/ui/assets/images/product/meduim-product-placeholder.webp'),
                'large_image_url'    => asset('vendor/webkul/ui/assets/images/product/large-product-placeholder.webp'),
                'original_image_url' => asset('vendor/webkul/ui/assets/images/product/large-product-placeholder.webp'),
            ];
        }

        return $images;
    }

    /**
     * Get product's base image
     *
     * @param  Product|ProductFlat  $product
     * @return array
     */
    public function getProductBaseImage($product, ?array $galleryImages = null)
    {
        $images = $product ? $product->images : null;

        if ($images && $images->count()) {
            $url = Storage::url($images[0]->path);

            $image = [
                'small_image_url'    => $url,
                'medium_image_url'   => $url,
                'large_image_url'    => $url,
                'original_image_url' => $url,
            ];
        } else {
            $image = [
                'small_image_url'    => asset('vendor/webkul/ui/assets/images/product/small-product-placeholder.webp'),
                'medium_image_url'   => asset('vendor/webkul/ui/assets/images/product/meduim-product-placeholder.webp'),
                'large_image_url'    => asset('vendor/webkul/ui/assets/images/product/large-product-placeholder.webp'),
                'original_image_url' => asset('vendor/webkul/ui/assets/images/product/large-product-placeholder.webp'),
            ];
        }

        return $image;
    }

    /**
     * Get product varient image if available otherwise product base image
     *
     * @param  Wishlist  $item
     * @return array
     */
    public function getProductImage($item)
    {
        if ($item instanceof Wishlist) {
            if (isset($item->additional['selected_configurable_option'])) {
                $product = $this->productRepository->find($item->additional['selected_configurable_option']);
            } else {
                $product = $item->product;
            }
        } else {
            $product = $item->product;
        }

        return $this->getProductBaseImage($product);
    }
}
