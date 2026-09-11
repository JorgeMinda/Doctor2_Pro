<?php
require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    $user = $db->findOneBy('users', 'username', $username);

    if ($user && password_verify($password, $user['password'])) {
        unset($user['password']);
        echo json_encode([
            'success' => true,
            'user' => $user,
            'token' => base64_encode($user['id'] . ':' . time())
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Usuario o contraseña incorrectos']);
    }
    exit;
}

if ($method === 'GET' && $action === 'session') {
    $users = $db->getCollection('users');
    $user = $users[0] ?? null;

    if ($user) {
        unset($user['password']);
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'No hay sesión activa']);
    }
    exit;
}

if ($method === 'PATCH' && $action === 'profile') {
    $input = json_decode(file_get_contents('php://input'), true);
    $users = $db->getCollection('users');
    $user = $users[0] ?? null;

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
        exit;
    }

    $appearance = $user['appearance'] ?? [];
    if (isset($input['appearance'])) {
        $appearance = array_merge($appearance, $input['appearance']);
    }

    $updates = [
        'email' => $input['email'] ?? $user['email'],
        'phone' => $input['phone'] ?? $user['phone'],
        'appearance' => $appearance
    ];

    $db->update('users', $user['id'], $updates);
    echo json_encode(['success' => true, 'appearance' => $appearance]);
    exit;
}

echo json_encode(['success' => true, 'status' => 'Auth service ready']);
