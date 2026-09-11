<?php
require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $profs = $db->getCollection('professionals');
    echo json_encode(['success' => true, 'professionals' => array_values($profs)]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['name'] ?? '');

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'El nombre es obligatorio']);
        exit;
    }

    $newProf = [
        'id' => 'prof-' . substr(md5(uniqid(rand(), true)), 0, 10),
        'name' => $name,
        'specialty' => trim($input['specialty'] ?? 'General'),
        'email' => trim($input['email'] ?? ''),
        'phone' => trim($input['phone'] ?? ''),
        'color' => $input['color'] ?? '#3b82f6',
        'slot_minutes' => (int)($input['slot_minutes'] ?? 30),
        'start_time' => $input['start_time'] ?? '08:00',
        'end_time' => $input['end_time'] ?? '20:00',
        'work_days' => $input['work_days'] ?? '1,2,3,4,5',
        'active' => 1
    ];

    $db->insert('professionals', $newProf);
    echo json_encode(['success' => true, 'professional' => $newProf]);
    exit;
}

if ($method === 'PATCH' || $method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? '';
    if ($id) $db->update('professionals', $id, $input);
    echo json_encode(['success' => true]);
    exit;
}
