<?php
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $accion = $input['accion'] ?? '';

    if ($accion === 'crear_intencion') {
        $intencionId = 'int_' . bin2hex(random_bytes(8));
        echo json_encode([
            'success' => true,
            'intencion_id' => $intencionId,
            'qr_data' => '00020101021243650014AR.GOB.BCRA.INTERCONEXION...',
            'monto' => $input['plan'] === 'premium' ? 28000 : 15000
        ]);
        exit;
    }
}

if ($method === 'GET' && isset($_GET['verificar'])) {
    $intencionId = $_GET['verificar'];
    // Mock de verificación exitosa o en espera
    echo json_encode([
        'success' => true,
        'status' => 'approved',
        'nueva_fecha' => date('d/m/Y', strtotime('+30 days'))
    ]);
    exit;
}

echo json_encode(['success' => true]);
