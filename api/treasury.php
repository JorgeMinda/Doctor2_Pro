<?php
/**
 * api/treasury.php - Endpoint REST para Tesorería, Cajas, Arqueos, Cierres Diarios y Auditoría
 */
require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'accounts' || empty($action)) {
        echo json_encode([
            'success' => true,
            'accounts' => $db->getTreasuryAccounts()
        ]);
        exit;
    }

    if ($action === 'movements') {
        $accountId = $_GET['accountId'] ?? null;
        $limit = (int)($_GET['limit'] ?? 100);
        echo json_encode([
            'success' => true,
            'movements' => $db->getTreasuryMovements($limit, $accountId)
        ]);
        exit;
    }

    if ($action === 'closures') {
        $accountId = $_GET['accountId'] ?? null;
        $limit = (int)($_GET['limit'] ?? 50);
        echo json_encode([
            'success' => true,
            'closures' => $db->getTreasuryClosures($limit, $accountId)
        ]);
        exit;
    }

    if ($action === 'audit') {
        $entity = $_GET['entity'] ?? null;
        $limit = (int)($_GET['limit'] ?? 100);
        echo json_encode([
            'success' => true,
            'audit_logs' => $db->getAuditLogs($limit, $entity)
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'accounts' => $db->getTreasuryAccounts(),
        'movements' => $db->getTreasuryMovements(50),
        'closures' => $db->getTreasuryClosures(20)
    ]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $postAction = $input['action'] ?? $action;

    if ($postAction === 'closure' || $postAction === 'record_closure') {
        $accountId = $input['accountId'] ?? 'acc_cash_1';
        $countedAmount = (float)($input['countedAmount'] ?? 0);
        $notes = trim($input['notes'] ?? '');
        $closedBy = trim($input['closedBy'] ?? 'Dr. Jorge Valenzuela');

        $closure = $db->recordCashClosure($accountId, $countedAmount, $notes, $closedBy);
        if ($closure) {
            echo json_encode([
                'success' => true,
                'closure' => $closure,
                'message' => 'Arqueo y cierre de caja registrado correctamente'
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No se pudo registrar el cierre de caja']);
        }
        exit;
    }

    if ($postAction === 'movement' || $postAction === 'record_movement') {
        $accountId = $input['accountId'] ?? 'acc_cash_1';
        $amount = (float)($input['amount'] ?? 0);
        $type = strtoupper($input['type'] ?? 'INCOME');
        $concept = trim($input['concept'] ?? 'Movimiento manual');
        $referenceId = $input['referenceId'] ?? null;
        $patientId = $input['patientId'] ?? null;

        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'El monto debe ser mayor a 0']);
            exit;
        }

        $movement = $db->recordTreasuryMovement($accountId, $amount, $type, $concept, $referenceId, $patientId, [
            'origin' => 'MANUAL_ENTRY'
        ]);

        if ($movement) {
            echo json_encode([
                'success' => true,
                'movement' => $movement,
                'message' => 'Movimiento de tesorería registrado'
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Error al registrar el movimiento']);
        }
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Acción no válida']);
    exit;
}
