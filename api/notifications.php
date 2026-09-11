<?php
require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $notifications = $db->getCollection('notifications');
    echo json_encode(['success' => true, 'notifications' => array_values($notifications)]);
    exit;
}

if ($method === 'PATCH') {
    $notifs = $db->getCollection('notifications');
    foreach ($notifs as $n) {
        $db->update('notifications', $n['id'], ['is_read' => 1]);
    }
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $db->clearCollection('notifications');
    echo json_encode(['success' => true]);
    exit;
}
