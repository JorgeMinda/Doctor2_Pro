<?php
require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $profId = $_GET['professional_id'] ?? '';
    $month = $_GET['month'] ?? '';
    $date = $_GET['date'] ?? '';

    $blocks = $db->getCollection('blocked_days');

    if ($profId) {
        $blocks = array_filter($blocks, fn($b) => ($b['professional_id'] ?? '') === $profId || ($b['professional_id'] ?? '') === 'all');
    }

    if ($date) {
        $blocks = array_filter($blocks, function($b) use ($date) {
            $from = $b['date_from'] ?? $b['date'] ?? '';
            $to = $b['date_to'] ?? $b['date'] ?? $from;
            return $date >= $from && $date <= $to;
        });
    } elseif ($month) {
        $blocks = array_filter($blocks, function($b) use ($month) {
            $from = $b['date_from'] ?? $b['date'] ?? '';
            $to = $b['date_to'] ?? $b['date'] ?? $from;
            return str_starts_with($from, $month) || str_starts_with($to, $month);
        });
    }

    usort($blocks, function($a, $b) {
        return strcmp($b['date_from'] ?? '', $a['date_from'] ?? '');
    });

    echo json_encode(['success' => true, 'blocked_days' => array_values($blocks)]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $profId = trim($input['professional_id'] ?? 'all');
    $dateFrom = trim($input['date_from'] ?? $input['date'] ?? '');
    $dateTo = trim($input['date_to'] ?? $dateFrom);
    $allDay = isset($input['all_day']) ? (bool)$input['all_day'] : true;
    $timeFrom = trim($input['time_from'] ?? '');
    $timeTo = trim($input['time_to'] ?? '');
    $reason = trim($input['reason'] ?? 'Emergencia médica');
    $type = trim($input['type'] ?? 'emergency');

    if (empty($dateFrom)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'La fecha de inicio es requerida']);
        exit;
    }

    if ($dateTo < $dateFrom) {
        $dateTo = $dateFrom;
    }

    if (!$allDay && (!empty($timeFrom) || !empty($timeTo))) {
        if (empty($timeFrom)) $timeFrom = '08:00';
        if (empty($timeTo)) $timeTo = '20:00';
        if ($timeTo < $timeFrom) {
            $tmp = $timeFrom;
            $timeFrom = $timeTo;
            $timeTo = $tmp;
        }
    } else {
        $allDay = true;
        $timeFrom = '';
        $timeTo = '';
    }

    $profName = 'Todos los profesionales';
    if ($profId !== 'all') {
        $profObj = $db->findById('professionals', $profId);
        if ($profObj) {
            $profName = $profObj['name'] ?? 'Profesional';
        }
    }

    $id = 'block-' . substr(md5(uniqid(rand(), true)), 0, 10);
    $newBlock = [
        'id' => $id,
        'professional_id' => $profId,
        'professional_name' => $profName,
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'all_day' => $allDay,
        'time_from' => $timeFrom,
        'time_to' => $timeTo,
        'reason' => $reason,
        'type' => $type,
        'created_at' => date('Y-m-d H:i:s')
    ];

    $db->insert('blocked_days', $newBlock);
    $db->logAudit('BLOCKED_DAYS', $id, 'CREATE', null, $newBlock);

    // Cancel appointments automatically in this date range and hour range for this professional
    $appointments = $db->getCollection('appointments');
    $cancelledCount = 0;
    $cancelledPatients = [];

    foreach ($appointments as $apt) {
        $aptDate = $apt['date'] ?? '';
        $aptProf = $apt['professional_id'] ?? '';
        $aptStatus = $apt['status'] ?? '';
        $aptTime = $apt['time'] ?? '';

        $matchProf = ($profId === 'all' || $aptProf === $profId);
        $matchDate = ($aptDate >= $dateFrom && $aptDate <= $dateTo);
        $matchTime = true;
        if (!$allDay && !empty($timeFrom) && !empty($timeTo)) {
            $matchTime = ($aptTime >= $timeFrom && $aptTime <= $timeTo);
        }

        if ($matchProf && $matchDate && $matchTime && $aptStatus !== 'Cancelado' && $aptStatus !== 'Atendido') {
            $aptId = $apt['id'];
            $oldApt = $apt;
            $timeSuffix = (!$allDay && !empty($timeFrom)) ? " ($timeFrom a $timeTo hs)" : "";
            $updatedData = [
                'status' => 'Cancelado',
                'cancel_reason' => "Cancelado por Emergencia$timeSuffix: $reason",
                'observation' => trim(($apt['observation'] ?? '') . " [Cancelado por Emergencia$timeSuffix: $reason]")
            ];

            $db->update('appointments', $aptId, $updatedData);
            $db->logAudit('APPOINTMENT', $aptId, 'CANCEL_EMERGENCY', $oldApt, $updatedData);
            
            $cancelledCount++;
            $cancelledPatients[] = [
                'patient_name' => $apt['patient_name'] ?? 'Paciente',
                'date' => $aptDate,
                'time' => $apt['time'] ?? '',
                'phone' => $apt['patient_phone'] ?? ''
            ];
        }
    }

    $timeDetail = $allDay ? 'Día completo' : "Horario $timeFrom a $timeTo hs";
    // Insert internal notification
    $db->insert('notifications', [
        'id' => 'notif-' . uniqid(),
        'title' => "Bloqueo por Emergencia: $profName",
        'message' => "Del $dateFrom al $dateTo ($timeDetail). Motivo: $reason ($cancelledCount turnos cancelados automáticamente)",
        'type' => 'warning',
        'is_read' => 0,
        'created_at' => date('Y-m-d H:i')
    ]);

    echo json_encode([
        'success' => true,
        'block' => $newBlock,
        'cancelled_count' => $cancelledCount,
        'cancelled_patients' => $cancelledPatients
    ]);
    exit;
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id) {
        $old = $db->findById('blocked_days', $id);
        $db->delete('blocked_days', $id);
        if ($old) {
            $db->logAudit('BLOCKED_DAYS', $id, 'DELETE', $old, null);
        }
    }
    echo json_encode(['success' => true]);
    exit;
}
