<?php
require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $month = $_GET['month'] ?? '';
    $date = $_GET['date'] ?? '';
    $prof = $_GET['professional'] ?? '';

    $appointments = $db->getCollection('appointments');

    if ($date) {
        $appointments = array_filter($appointments, fn($a) => ($a['date'] ?? '') === $date);
    } elseif ($month) {
        $appointments = array_filter($appointments, fn($a) => str_starts_with($a['date'] ?? '', $month));
    }

    if ($prof) {
        $appointments = array_filter($appointments, fn($a) => ($a['professional_id'] ?? '') === $prof);
    }

    usort($appointments, function($a, $b) {
        return strcmp(($a['date'] ?? '') . ($a['time'] ?? ''), ($b['date'] ?? '') . ($b['time'] ?? ''));
    });

    echo json_encode(['success' => true, 'appointments' => array_values($appointments)]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $id = 'apt-' . substr(md5(uniqid(rand(), true)), 0, 10);
    $patientName = trim($input['patient_name'] ?? '');
    $professionalId = $input['professional_id'] ?? '';
    $date = $input['date'] ?? '';
    $time = $input['time'] ?? '';

    if (empty($patientName) || empty($date) || empty($time)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos obligatorios incompletos']);
        exit;
    }

    $newApt = [
        'id' => $id,
        'patient_id' => $input['patient_id'] ?? null,
        'patient_name' => $patientName,
        'patient_phone' => trim($input['patient_phone'] ?? ''),
        'patient_email' => trim($input['patient_email'] ?? ''),
        'professional_id' => $professionalId,
        'date' => $date,
        'time' => $time,
        'duration' => (int)($input['duration'] ?? 30),
        'reason' => trim($input['reason'] ?? ''),
        'status' => $input['status'] ?? 'Reservado',
        'cost' => (float)($input['cost'] ?? 0),
        'payments' => $input['payments'] ?? [],
        'observation' => trim($input['observation'] ?? ''),
        'created_at' => date('Y-m-d H:i:s')
    ];

    $db->insert('appointments', $newApt);
    $db->logAudit('APPOINTMENT', $id, 'CREATE', null, $newApt);

    // Notificación interna
    $db->insert('notifications', [
        'id' => 'notif-' . uniqid(),
        'title' => 'Nuevo Turno Agendado',
        'message' => "$patientName · $date $time hs",
        'type' => 'success',
        'is_read' => 0,
        'created_at' => date('Y-m-d H:i')
    ]);

    echo json_encode(['success' => true, 'appointment' => $newApt]);
    exit;
}

if ($method === 'PATCH' || $method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? '';

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID no especificado']);
        exit;
    }

    $oldApt = $db->findById('appointments', $id);
    if (!$oldApt) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Turno no encontrado']);
        exit;
    }

    // Check if new payments were added
    if (isset($input['payments']) && is_array($input['payments'])) {
        $oldPayments = $oldApt['payments'] ?? [];
        $newPayments = $input['payments'];

        // If new payments count is greater, process treasury ledger entries for new payments
        if (count($newPayments) > count($oldPayments)) {
            $addedCount = count($newPayments) - count($oldPayments);
            $recentPayments = array_slice($newPayments, -$addedCount);

            foreach ($recentPayments as $p) {
                $pAmount = (float)($p['amount'] ?? 0);
                if ($pAmount > 0) {
                    $pMethod = $p['method'] ?? 'Efectivo';
                    $accountId = $db->resolveAccountIdByMethod($pMethod);
                    $concept = "Cobro Turno #" . substr($id, -6) . " - " . ($oldApt['patient_name'] ?? 'Paciente') . " ($pMethod)";
                    $db->recordTreasuryMovement(
                        $accountId,
                        $pAmount,
                        'INCOME',
                        $concept,
                        $id,
                        $oldApt['patient_id'] ?? null,
                        ['paymentMethod' => $pMethod, 'note' => $p['note'] ?? '']
                    );
                }
            }
        }
    }

    $updated = $db->update('appointments', $id, $input);
    $db->logAudit('APPOINTMENT', $id, 'UPDATE', $oldApt, $input);

    echo json_encode(['success' => true, 'appointment' => $updated]);
    exit;
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id) {
        $oldApt = $db->findById('appointments', $id);
        $db->delete('appointments', $id);
        if ($oldApt) {
            $db->logAudit('APPOINTMENT', $id, 'DELETE', $oldApt, null);
        }
    }
    echo json_encode(['success' => true]);
    exit;
}
