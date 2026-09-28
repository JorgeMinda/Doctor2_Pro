<?php
require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET' && in_array($action, ['movements', 'audit'])) {
    $dateFrom = $_GET['date_from'] ?? '';
    $dateTo = $_GET['date_to'] ?? '';
    $type = $_GET['type'] ?? '';
    $itemId = $_GET['item_id'] ?? '';
    $search = strtolower(trim($_GET['search'] ?? ''));

    $movements = $db->getCollection('inventory_movements');

    if ($dateFrom) {
        $movements = array_filter($movements, function($m) use ($dateFrom) {
            $created = substr($m['created_at'] ?? '', 0, 10);
            return $created >= $dateFrom;
        });
    }

    if ($dateTo) {
        $movements = array_filter($movements, function($m) use ($dateTo) {
            $created = substr($m['created_at'] ?? '', 0, 10);
            return $created <= $dateTo;
        });
    }

    if ($type && $type !== 'all') {
        $movements = array_filter($movements, fn($m) => ($m['type'] ?? '') === $type);
    }

    if ($itemId) {
        $movements = array_filter($movements, fn($m) => ($m['item_id'] ?? '') === $itemId);
    }

    if ($search) {
        $movements = array_filter($movements, fn($m) =>
            str_contains(strtolower($m['item_name'] ?? ''), $search) ||
            str_contains(strtolower($m['item_code'] ?? ''), $search) ||
            str_contains(strtolower($m['reason'] ?? ''), $search)
        );
    }

    usort($movements, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

    echo json_encode([
        'success' => true,
        'movements' => array_values($movements),
        'total' => count($movements)
    ]);
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

    $stockBefore = (int)($item['stock'] ?? 0);
    $newStock = $stockBefore;
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
        'item_code' => $item['code'] ?? '',
        'item_name' => $item['name'],
        'type' => $type,
        'quantity' => $quantity,
        'stock_before' => $stockBefore,
        'stock_after' => $newStock,
        'unit' => $item['unit'] ?? 'unidades',
        'reason' => $reason ?: ($type === 'entrada' ? 'Ingreso de stock' : 'Uso clínico'),
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
    
    // Registrar auditoría de alta
    $db->insert('inventory_movements', [
        'id' => 'mov-' . uniqid(),
        'item_id' => $newItem['id'],
        'item_code' => $newItem['code'],
        'item_name' => $newItem['name'],
        'type' => 'creacion',
        'quantity' => $newItem['stock'],
        'stock_before' => 0,
        'stock_after' => $newItem['stock'],
        'unit' => $newItem['unit'],
        'reason' => 'Alta de nuevo insumo en catálogo',
        'created_at' => date('Y-m-d H:i:s')
    ]);

    echo json_encode(['success' => true, 'item' => $newItem]);
    exit;
}

if ($method === 'PATCH' || $method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? '';
    if ($id) {
        $oldItem = $db->findById('inventory', $id);
        $db->update('inventory', $id, $input);
        if ($oldItem) {
            $oldStock = (int)($oldItem['stock'] ?? 0);
            $newStock = isset($input['stock']) ? (int)$input['stock'] : $oldStock;
            if ($oldStock !== $newStock) {
                $db->insert('inventory_movements', [
                    'id' => 'mov-' . uniqid(),
                    'item_id' => $id,
                    'item_code' => $input['code'] ?? $oldItem['code'] ?? '',
                    'item_name' => $input['name'] ?? $oldItem['name'] ?? 'Insumo',
                    'type' => 'ajuste',
                    'quantity' => abs($newStock - $oldStock),
                    'stock_before' => $oldStock,
                    'stock_after' => $newStock,
                    'unit' => $input['unit'] ?? $oldItem['unit'] ?? 'unidades',
                    'reason' => 'Ajuste manual de stock / Edición de insumo',
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
        }
    }
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID de insumo no especificado']);
        exit;
    }

    $item = $db->findById('inventory', $id);
    if (!$item) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Insumo no encontrado']);
        exit;
    }

    $currentStock = (int)($item['stock'] ?? 0);
    if ($currentStock > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "No se puede eliminar el insumo '{$item['name']}' porque aún tiene {$currentStock} " . ($item['unit'] ?? 'unidades') . " en stock. El stock debe estar en 0."
        ]);
        exit;
    }

    // Registrar auditoría de baja
    $db->insert('inventory_movements', [
        'id' => 'mov-' . uniqid(),
        'item_id' => $id,
        'item_code' => $item['code'] ?? '',
        'item_name' => $item['name'] ?? 'Insumo',
        'type' => 'eliminacion',
        'quantity' => 0,
        'stock_before' => 0,
        'stock_after' => 0,
        'unit' => $item['unit'] ?? 'unidades',
        'reason' => 'Baja / Eliminación definitiva de insumo (Stock 0)',
        'created_at' => date('Y-m-d H:i:s')
    ]);

    $db->delete('inventory', $id);
    $db->logAudit('INVENTORY', $id, 'DELETE', $item, null);
    echo json_encode(['success' => true, 'message' => 'Insumo eliminado correctamente']);
    exit;
}
