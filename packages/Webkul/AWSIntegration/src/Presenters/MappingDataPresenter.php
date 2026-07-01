<?php

namespace Webkul\AWSIntegration\Presenters;

// class MappingDataPresenter extends JsonDataPresenter
class MappingDataPresenter
{
    // public static $sections = [
    //     'attributes',
    //     'attributes_default',
    // ];

    // public static $sectionNames = [
    //     'attributes'         => 'BigCommerce Field',
    //     'attributes_default' => 'BigCommerce Field (Default Value)',
    // ];

    // public static function representValueForHistory(mixed $oldValues, mixed $newValues, string $fieldName): array
    // {
    //     $oldArray = is_string($oldValues) ? json_decode($oldValues, true) : [];
    //     $newArray = is_string($newValues) ? json_decode($newValues, true) : [];

    //     if (empty($oldArray) && empty($newArray)) {
    //         return [];
    //     }

    //     $normalizedData = [];

    //     $removed = [];

    //     $updated = [];

    //     foreach (static::$sections as $section) {
    //         if (! isset($oldArray[$section]) && ! isset($newArray[$section])) {
    //             continue;
    //         }

    //         $removed[$section] = static::calculateDifference(
    //             values: ($oldArray[$section] ?? []),
    //             comparingArray: ($newArray[$section] ?? []),
    //         );

    //         $updated[$section] = static::calculateDifference(
    //             values: ($newArray[$section] ?? []),
    //             comparingArray: ($oldArray[$section] ?? []),
    //         );

    //         if (empty($removed[$section]) && empty($updated[$section])) {
    //             unset($removed[$section], $updated[$section]);

    //             continue;
    //         }
    //     }

    //     $removed = empty($removed) ? static::calculateDifference($oldArray, $newArray) : $removed;

    //     $updated = empty($updated) ? static::calculateDifference($newArray, $oldArray) : $updated;

    //     static::normalizeData($normalizedData, $removed, $updated, $fieldName);

    //     return $normalizedData;
    // }

    // public static function normalizeData(array &$normalizedData, array $removed, array $updated, string $fieldName)
    // {
    //     foreach (static::$sections as $section) {
    //         if (! isset($updated[$section]) && ! isset($removed[$section])) {
    //             continue;
    //         }

    //         static::normalizeWithSections($removed[$section], 'old', $normalizedData, $section);
    //         static::normalizeWithSections($updated[$section], 'new', $normalizedData, $section);
    //     }

    //     if (empty($normalizedData)) {
    //         static::normalizeWithFieldName($removed, 'old', $normalizedData, static::$sectionNames['attributes']);

    //         static::normalizeWithFieldName($updated, 'new', $normalizedData, static::$sectionNames['attributes']);
    //     }
    // }

    // public static function normalizeWithSections(array $values, string $valueKey, array &$normalizedData, string $section): void
    // {
    //     foreach ($values as $name => $value) {
    //         $normalizedName = $section.'_'.$name;

    //         if (! isset($normalizedData[$normalizedName])) {
    //             $normalizedData[$normalizedName] = [];
    //         }

    //         $normalizedData[$normalizedName] += [
    //             'name'    => (static::$sectionNames[$section] ?? $section).' ('.$name.')',
    //             $valueKey => $value,
    //         ];
    //     }
    // }
}
