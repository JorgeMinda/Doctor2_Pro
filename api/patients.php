<?php
require_once __DIR__ . '/db.php';
$db = getDatabase();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    $id = $_GET['id'] ?? $_GET['patientId'] ?? '';
    $search = strtolower(trim($_GET['search'] ?? ''));

    if ($action === 'get_attachments' && $id) {
        $patient = $db->findById('patients', $id);
        $attachments = $patient['attachments'] ?? [];
        echo json_encode(['success' => true, 'attachments' => $attachments]);
        exit;
    }

    if ($id) {
        $patient = $db->findById('patients', $id);
        if (!$patient) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Paciente no encontrado']);
            exit;
        }

        // Historial de turnos
        $apts = $db->getCollection('appointments');
        $patient['appointments'] = array_values(array_filter($apts, fn($a) => ($a['patient_id'] ?? '') === $id || ($a['patient_name'] ?? '') === $patient['name']));

        echo json_encode(['success' => true, 'patient' => $patient]);
        exit;
    }

    $patients = $db->getCollection('patients');
    if ($search) {
        $patients = array_filter($patients, function($p) use ($search) {
            return str_contains(strtolower($p['name'] ?? ''), $search) ||
                   str_contains(strtolower($p['dni'] ?? ''), $search) ||
                   str_contains(strtolower($p['phone'] ?? ''), $search);
        });
    }

    echo json_encode(['success' => true, 'patients' => array_values($patients)]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (($input['action'] ?? '') === 'save_budget') {
        $patientId = $input['patientId'] ?? '';
        $budget = $input['budget'] ?? null;
        if ($patientId && $budget) {
            $patient = $db->findById('patients', $patientId);
            if ($patient) {
                if (!isset($patient['budgets']) || !is_array($patient['budgets'])) {
                    $patient['budgets'] = [];
                }
                array_unshift($patient['budgets'], $budget);
                $db->update('patients', $patientId, ['budgets' => $patient['budgets']]);
                echo json_encode(['success' => true, 'budgets' => $patient['budgets']]);
                exit;
            }
        }
        echo json_encode(['success' => false, 'error' => 'Paciente no encontrado']);
        exit;
    }

    if (($input['action'] ?? '') === 'save_clinical_note') {
        $patientId = $input['patientId'] ?? '';
        $note = $input['note'] ?? null;
        if ($patientId && $note) {
            $patient = $db->findById('patients', $patientId);
            if ($patient) {
                if (!isset($patient['clinicalNotes']) || !is_array($patient['clinicalNotes'])) {
                    $patient['clinicalNotes'] = [];
                }
                array_unshift($patient['clinicalNotes'], $note);
                $db->update('patients', $patientId, ['clinicalNotes' => $patient['clinicalNotes']]);
                echo json_encode(['success' => true, 'clinicalNotes' => $patient['clinicalNotes']]);
                exit;
            }
        }
        echo json_encode(['success' => false, 'error' => 'Paciente no encontrado']);
        exit;
    }

    if (($input['action'] ?? '') === 'save_treatment_plans') {
        $patientId = $input['patientId'] ?? '';
        $plans = $input['plans'] ?? [];
        if ($patientId) {
            $patient = $db->findById('patients', $patientId);
            if ($patient) {
                $db->update('patients', $patientId, ['treatmentPlans' => $plans]);
                echo json_encode(['success' => true, 'treatmentPlans' => $plans]);
                exit;
            }
        }
        echo json_encode(['success' => false, 'error' => 'Paciente no encontrado']);
        exit;
    }

    if (($input['action'] ?? '') === 'save_attachment') {
        $patientId = $input['patientId'] ?? '';
        $att = $input['attachment'] ?? null;
        if ($patientId && $att) {
            $patient = $db->findById('patients', $patientId);
            if ($patient) {
                if (!isset($patient['attachments']) || !is_array($patient['attachments'])) {
                    $patient['attachments'] = [];
                }
                array_unshift($patient['attachments'], $att);
                $db->update('patients', $patientId, ['attachments' => $patient['attachments']]);
                echo json_encode(['success' => true, 'attachments' => $patient['attachments']]);
                exit;
            }
        }
        echo json_encode(['success' => false, 'error' => 'Paciente no encontrado']);
        exit;
    }

    if (($input['action'] ?? '') === 'delete_attachment') {
        $patientId = $input['patientId'] ?? '';
        $attId = $input['attachmentId'] ?? '';
        if ($patientId && $attId) {
            $patient = $db->findById('patients', $patientId);
            if ($patient) {
                $atts = $patient['attachments'] ?? [];
                $atts = array_values(array_filter($atts, fn($a) => ($a['id'] ?? '') !== $attId));
                $db->update('patients', $patientId, ['attachments' => $atts]);
                echo json_encode(['success' => true, 'attachments' => $atts]);
                exit;
            }
        }
        echo json_encode(['success' => false, 'error' => 'Paciente no encontrado']);
        exit;
    }

    $name = trim($input['name'] ?? '');

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'El nombre es obligatorio']);
        exit;
    }

    $newPatient = [
        'id' => 'pat-' . substr(md5(uniqid(rand(), true)), 0, 10),
        'name' => $name,
        'dni' => trim($input['dni'] ?? ''),
        'sex' => trim($input['sex'] ?? ''),
        'occupation' => trim($input['occupation'] ?? ''),
        'phone' => trim($input['phone'] ?? ''),
        'email' => trim($input['email'] ?? ''),
        'birthdate' => $input['birthdate'] ?? '',
        'health_insurance' => trim($input['health_insurance'] ?? 'Particular'),
        'affiliate_number' => trim($input['affiliate_number'] ?? ''),
        'representativeName' => trim($input['representativeName'] ?? ''),
        'representativeDni' => trim($input['representativeDni'] ?? ''),
        'emergencyPhone' => trim($input['emergencyPhone'] ?? ''),
        'notes' => trim($input['notes'] ?? ''),
        'allergies' => trim($input['allergies'] ?? ''),
        'created_at' => date('Y-m-d H:i:s')
    ];

    $db->insert('patients', $newPatient);
    echo json_encode(['success' => true, 'patient' => $newPatient]);
    exit;
}

if ($method === 'PATCH' || $method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? '';
    if ($id) {
        $db->update('patients', $id, $input);
    }
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id) $db->delete('patients', $id);
    echo json_encode(['success' => true]);
    exit;
}
