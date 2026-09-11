<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

if (isset($_GET['planes'])) {
    echo json_encode([
        'success' => true,
        'planes' => [
            'basico' => [
                'nombre' => 'Plan Profesional',
                'precio_mensual' => 15000,
                'precio_anual' => 150000,
                'caracteristicas' => [
                    'Agenda inteligente multi-profesional',
                    'Ficha clínica y odontograma digital',
                    'Control de stock e inventario',
                    'Recordatorios automáticos por WhatsApp',
                    'Chat interno para el equipo'
                ]
            ],
            'premium' => [
                'nombre' => 'Plan Clínica Completo',
                'precio_mensual' => 28000,
                'precio_anual' => 280000,
                'caracteristicas' => [
                    'Todo lo del Plan Profesional',
                    'Hasta 10 profesionales',
                    'Estadísticas avanzadas y reportes',
                    'Sincronización con Google Sheets',
                    'Soporte prioritario 24/7'
                ]
            ]
        ]
    ]);
    exit;
}

$check = $_GET['check'] ?? '';

echo json_encode([
    'success' => true,
    'estado' => 'activo',
    'mostrar_aviso' => false,
    'bloqueado' => false,
    'dias_restantes' => 30,
    'mensaje' => 'Tu suscripción está activa',
    'aviso_config' => [
        'mostrar_ver_planes' => true,
        'mostrar_soporte' => true,
        'mostrar_soporte_banner' => false,
        'mostrar_dias_restantes' => true,
        'whatsapp_soporte' => '5491123456789',
        'texto_soporte' => 'Contactar Soporte'
    ]
]);
