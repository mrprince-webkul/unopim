<?php

return [
    'components' => [
        'layouts' => [
            'sidebar' => [
                'aws'        => 'AWS S3',
                'document'   => 'Documentación',
                'credential' => 'Credenciales',
                'history'    => 'Historial',
            ],
        ],
    ],

    'aws' => [
        'document' => [
            'copy-to-clipboard' => [
                'copy'   => 'Copiar',
                'copied' => '¡Copiado!',
            ],
            'index' => [
                'title'       => 'Documentación de AWS S3',
                'description' => 'Amazon S3 es un servicio de almacenamiento de objetos que ofrece escalabilidad líder en la industria, alta disponibilidad de datos, seguridad y rendimiento.',
            ],

            'setup' => [
                'title' => 'Cómo configurar',
                'steps' => [
                    'step1' => 'Cree un bucket S3 en su cuenta de AWS.',
                    'step2' => 'Genere el Access Key y el Secret Key desde IAM.',
                    'step3' => 'Configure las credenciales de AWS en UnoPim.',
                ],
            ],

            'migration' => [
                'title'            => 'Migrar medios existentes a AWS S3',
                'migrate-existing' => 'Para migrar los medios existentes de UnoPim a AWS S3, ejecute el siguiente comando:',
                'remove-migrated'  => 'Para eliminar los archivos multimedia del almacenamiento local después de la migración, ejecute:',
            ],

            'visibility' => [
                'title'             => 'Actualizar la visibilidad de archivos S3 (ACL)',
                'description'       => 'Este comando actualiza la visibilidad (ACL) de los archivos almacenados en su bucket de AWS S3. Puede hacer que los archivos sean :public o :private.',
                'public'            => 'públicos',
                'private'           => 'privados',
                'run-command'       => 'Ejecutar comando:',
                'options'           => 'Opciones:',
                'examples'          => 'Ejemplos:',
                'option-visibility' => 'Anular la visibilidad predeterminada de la base de datos.',
                'option-path'       => 'Aplicar la visibilidad solo a una carpeta específica (prefijo).',
                'option-dry-run'    => 'Previsualizar los cambios sin aplicarlos. Útil para pruebas.',
                'example-label'     => 'Ejemplo:',
                'warning'           => 'Este comando actualiza TODOS los archivos coincidentes en su bucket de S3. Use --dry-run antes de ejecutarlo en producción.',
            ],

            'version' => 'Versión',
        ],

        'credential' => [
            'index' => [
                'title'                   => 'Credencial de AWS',
                'page-title'              => 'Credenciales de AWS',
                'credential-label'        => 'Credenciales',
                'history-label'           => 'Historial',

                'enable-aws'              => 'Habilitar AWS S3',
                'default-visibility'      => 'Visibilidad predeterminada de archivos',
                'visibility-help-public'  => 'Active para :strong (archivos accesibles por URL)',
                'visibility-help-private' => 'Desactive para :strong (los archivos requieren autenticación)',
                'public'                  => 'Público',
                'private'                 => 'Privado',

                'access-key'              => 'Clave de acceso',
                'secret-key'              => 'Clave secreta',
                'region'                  => 'Región',
                'bucket-name'             => 'Nombre del bucket',
                'bucket-url'              => 'URL del bucket',
                'environment-updated-at'  => 'Hora de actualización del entorno',
                'enabled'                 => 'Habilitar AWS S3',

                'save'                    => 'Guardar',

                'access-key-placeholder'  => 'AKIAIOSFODNN7EXAMPLE',
                'secret-key-placeholder'  => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                'region-placeholder'      => 'p. ej., us-east-1',
                'bucket-name-placeholder' => 'p. ej., my-company-assets',
                'bucket-url-placeholder'  => 'https://your-bucket.s3.amazonaws.com',
                'environment-placeholder' => 'YYYY-MM-DD HH:MM:SS',
            ],

            'invalid'      => 'Credenciales de AWS no válidas',
            'save-success' => 'Las credenciales de AWS se han guardado correctamente',
        ],

        'history' => [
            'page-title'   => 'Historial de credenciales de AWS',
            'columns'      => [
                'id'      => 'ID',
                'event'   => 'Evento',
                'changes' => 'Cambios',
                'user'    => 'Usuario',
                'date'    => 'Fecha',
            ],
            'view-details' => 'Ver detalles',
            'no-changes'   => 'Sin cambios',
            'no-history'   => 'No se encontró historial',
            'system'       => 'Sistema',
            'modal'        => [
                'title'          => 'Detalles del cambio',
                'event'          => 'Evento:',
                'user'           => 'Usuario:',
                'date'           => 'Fecha:',
                'changed-fields' => 'Campos modificados',
                'field'          => 'Campo',
                'old-value'      => 'Valor anterior',
                'new-value'      => 'Nuevo valor',
                'no-changes'     => 'Sin cambios',
                'close'          => 'Cerrar',
            ],
            'api' => [
                'record-not-found'   => 'Registro no encontrado',
                'fetch-error'        => 'Error al obtener el historial: :error',
                'updated'            => 'Actualizado',
                'not-updated'        => 'No actualizado',
                'yes'                => 'Sí',
                'no'                 => 'No',
                'configuration'      => 'Configuración',
                'initial-setup'      => 'Configuración inicial',
                'updated-config'     => 'Configuración actualizada',
                'credential-created' => 'Credencial creada',
                'credential-added'   => 'Credencial de AWS agregada',
            ],
        ],

        'export' => [
            'archive' => [
                'open-zip-failed' => 'No se pudo abrir el archivo zip temporal para escribir.',
            ],
        ],
    ],

    'acl' => [
        'credential' => [
            'view' => 'Ver credenciales de AWS',
            'save' => 'Guardar credenciales de AWS',
        ],
    ],
];
