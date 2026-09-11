<?php
require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'movements') {
    $movements = $db->getCollection('inventory_movements');
    echo json_encode(['success' => true, 'movements' => $movements]);
    exit;
}

if ($method === 'GET') {
    $search = strtolower(trim($_GET['search'] ?? ''));
    $category = $_GET['category'] ?? '';
    $filter = $_GET['filter'] ?? '';

    $items = $db->getCollection('inventory');

    if ($search) {
        $items = array_filter($items, fn($i) =>
            str_contains(strtolower($i['name'] ?? ''), $search) ||
            str_contains(strtolower($i['code'] ?? ''), $search)
        );
    }

    if ($category) {
        $items = array_filter($items, fn($i) => ($i['category'] ?? '') === $category);
    }

    if ($filter === 'low_stock') {
        $items = array_filter($items, fn($i) => ($i['stock'] ?? 0) <= ($i['min_stock'] ?? 5));
    }

    $allCategories = array_values(array_unique(array_filter(array_map(fn($i) => $i['category'] ?? '', $db->getCollection('inventory')))));

    echo json_encode([
        'success' => true,
        'items' => array_values($items),
        'categories' => $allCategories
    ]);
    exit;
}

if ($method === 'POST' && $action === 'movement') {
    $input = json_decode(file_get_contents('php://input'), true);
    $itemId = $input['item_id'] ?? '';
    $type = $input['type'] ?? 'entrada';
    $quantity = (int)($input['quantity'] ?? 0);
    $reason = trim($input['reason'] ?? '');

    $item = $db->findById('inventory', $itemId);
    if (!$item || $quantity <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Insumo o cantidad inválida']);
        exit;
    }

    $newStock = $item['stock'];
    if ($type === 'entrada') $newStock += $quantity;
    elseif ($type === 'salida') {
        if ($newStock < $quantity) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Stock insuficiente']);
            exit;
        }
        $newStock -= $quantity;
    } elseif ($type === 'ajuste') {
        $newStock = $quantity;
    }

    $db->update('inventory', $itemId, ['stock' => $newStock]);
    $db->insert('inventory_movements', [
        'id' => 'mov-' . uniqid(),
        'item_id' => $itemId,
        'item_name' => $item['name'],
        'type' => $type,
        'quantity' => $quantity,
        'reason' => $reason,
        'created_at' => date('Y-m-d H:i:s')
    ]);

    echo json_encode(['success' => true, 'new_stock' => $newStock]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['name'] ?? '');

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'El nombre del insumo es obligatorio']);
        exit;
    }

    $newItem = [
        'id' => 'inv-' . substr(md5(uniqid(rand(), true)), 0, 8),
        'code' => trim($input['code'] ?? 'INS-' . rand(100, 999)),
        'name' => $name,
        'category' => trim($input['category'] ?? 'General'),
        'stock' => (int)($input['stock'] ?? 0),
        'min_stock' => (int)($input['min_stock'] ?? 5),
        'unit' => trim($input['unit'] ?? 'unidades'),
        'cost_price' => (float)($input['cost_price'] ?? 0),
        'expiry_date' => $input['expiry_date'] ?? '',
        'location' => trim($input['location'] ?? ''),
        'created_at' => date('Y-m-d H:i:s')
    ];

    $db->insert('inventory', $newItem);
    echo json_encode(['success' => true, 'item' => $newItem]);
    exit;
}

if ($method === 'PATCH' || $method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? '';
    if ($id) $db->update('inventory', $id, $input);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id) $db->delete('inventory', $id);
    echo json_encode(['success' => true]);
    exit;
}
