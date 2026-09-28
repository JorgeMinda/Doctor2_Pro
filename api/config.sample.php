<?php
/**
 * config.php - Configuración de Base de Datos MySQL para Doctor2_Pro
 * Copia este archivo como config.php y completa con tus credenciales de base de datos.
 */

return [
    'DB_HOST' => 'localhost',          // o servidor remoto (ej: gateway01.us-east-1.prod.aws.tidbcloud.com)
    'DB_PORT' => '3306',               // o 4000 en TiDB Cloud
    'DB_NAME' => 'doctor2_pro',        // nombre de tu base de datos
    'DB_USER' => 'root',               // usuario de la base de datos
    'DB_PASS' => '',                   // contraseña de la base de datos
    'DB_SSL'  => true                  // true para conexiones en la nube (TiDB / Aiven)
];
