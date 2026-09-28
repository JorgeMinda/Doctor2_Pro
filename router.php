<?php
/**
 * router.php - Router de seguridad para servidor PHP Built-in
 * Bloquea acceso público a archivos sensibles de base de datos y configuraciones.
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $uri;

// 1. Bloquear acceso a archivos sensibles
if (preg_match('/\.(json|lock|sql|env|md|bat|yaml|yml)$/i', $uri) && basename($uri) !== 'manifest.json') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Acceso denegado a recurso restringido']);
    exit;
}

// 2. Si el archivo existe físicamente y no es PHP, servirlo directamente
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    // Tipos MIME comunes
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $mimes = [
        'js'   => 'application/javascript',
        'mjs'  => 'application/javascript',
        'css'  => 'text/css',
        'svg'  => 'image/svg+xml',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'ico'  => 'image/x-icon',
        'json' => 'application/json',
        'woff2'=> 'font/woff2',
        'woff' => 'font/woff',
        'ttf'  => 'font/ttf'
    ];

    if (isset($mimes[$ext])) {
        header('Content-Type: ' . $mimes[$ext]);
    }

    if ($ext === 'php') {
        require $file;
        exit;
    }

    return false; // Servidor interno entrega el archivo
}

// 3. Si la ruta es raíz '/', servir index.html
if ($uri === '/' || $uri === '') {
    require __DIR__ . '/index.html';
    exit;
}

// 4. Default: false para que PHP intente servir
return false;
