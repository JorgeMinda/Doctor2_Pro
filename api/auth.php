<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    $user = $db->findOneBy('users', 'username', $username);

    $isPasswordValid = false;
    if ($user) {
        if (password_verify($password, $user['password']) || $user['password'] === $password) {
            $isPasswordValid = true;
        }
    }

    if ($user && $isPasswordValid) {
        $_SESSION['user_id'] = $user['id'];
        $db->logAudit('AUTH', $user['id'], 'LOGIN', null, ['username' => $username, 'status' => 'SUCCESS'], $user['id']);
        unset($user['password']);
        echo json_encode([
            'success' => true,
            'user' => $user,
            'token' => base64_encode($user['id'] . ':' . time())
        ]);
    } else {
        $db->logAudit('AUTH', $username ?: 'unknown', 'LOGIN', null, ['username' => $username, 'status' => 'FAILED_BAD_CREDENTIALS']);
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Usuario o contraseña incorrectos']);
    }
    exit;
}

if ($action === 'logout') {
    unset($_SESSION['user_id']);
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Sesión cerrada']);
    exit;
}

if ($method === 'GET' && $action === 'session') {
    $userId = $_SESSION['user_id'] ?? null;

    if ($userId) {
        $user = $db->findById('users', $userId);
        if ($user) {
            unset($user['password']);
            echo json_encode(['success' => true, 'user' => $user]);
            exit;
        }
    }

    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No hay sesión activa']);
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

    $licenseCode = isset($input['license_code']) ? trim($input['license_code']) : ($user['license_code'] ?? '');

    $updates = [
        'email' => $input['email'] ?? $user['email'],
        'phone' => $input['phone'] ?? $user['phone'],
        'license_code' => $licenseCode,
        'appearance' => $appearance
    ];

    $oldProfile = ['email' => $user['email'], 'phone' => $user['phone'], 'license_code' => $user['license_code'] ?? '', 'appearance' => $user['appearance'] ?? []];
    $db->update('users', $user['id'], $updates);
    $db->logAudit('AUTH_PROFILE', $user['id'], 'UPDATE', $oldProfile, $updates, $user['id']);

    // Sincronizar código con el profesional coincidente si existe
    $profs = $db->getCollection('professionals');
    foreach ($profs as $p) {
        if ((!empty($p['email']) && !empty($updates['email']) && strtolower($p['email']) === strtolower($updates['email'])) ||
            (!empty($user['name']) && !empty($p['name']) && stripos($p['name'], $user['name']) !== false)) {
            $profUpdates = ['license_code' => $licenseCode];
            if (!empty($updates['email'])) $profUpdates['email'] = $updates['email'];
            if (!empty($updates['phone'])) $profUpdates['phone'] = $updates['phone'];
            $db->update('professionals', $p['id'], $profUpdates);
        }
    }

    echo json_encode(['success' => true, 'license_code' => $licenseCode, 'appearance' => $appearance]);
    exit;
}

echo json_encode(['success' => true, 'status' => 'Auth service ready']);
