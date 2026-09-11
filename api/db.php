<?php
/**
 * Conexión y Capa de Persistencia Universal (JSON / SQLite) para Consultorios.pro
 * Funciona de forma 100% autónoma en cualquier servidor o entorno local sin requerir extensiones extra.
 */

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

class JsonDatabase {
    private $filePath;
    private $data = [];

    public function __construct() {
        $this->filePath = __DIR__ . '/data_store.json';
        $this->load();
    }

    private function load() {
        if (!file_exists($this->filePath)) {
            $this->data = $this->getSeedData();
            $this->save();
        } else {
            $content = file_get_contents($this->filePath);
            $this->data = json_decode($content, true) ?: $this->getSeedData();
        }
    }

    public function save() {
        file_put_contents($this->filePath, json_encode($this->data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    public function getCollection($name) {
        return $this->data[$name] ?? [];
    }

    public function insert($collection, $item) {
        if (!isset($this->data[$collection])) {
            $this->data[$collection] = [];
        }
        $this->data[$collection][] = $item;
        $this->save();
        return $item;
    }

    public function update($collection, $id, $updates) {
        if (!isset($this->data[$collection])) return false;
        foreach ($this->data[$collection] as &$item) {
            if (($item['id'] ?? '') === $id) {
                $item = array_merge($item, $updates);
                $this->save();
                return $item;
            }
        }
        return false;
    }

    public function delete($collection, $id) {
        if (!isset($this->data[$collection])) return false;
        $this->data[$collection] = array_values(array_filter($this->data[$collection], function($item) use ($id) {
            return ($item['id'] ?? '') !== $id;
        }));
        $this->save();
        return true;
    }

    public function findById($collection, $id) {
        foreach ($this->getCollection($collection) as $item) {
            if (($item['id'] ?? '') === $id) return $item;
        }
        return null;
    }

    public function findOneBy($collection, $key, $value) {
        foreach ($this->getCollection($collection) as $item) {
            if (($item[$key] ?? '') === $value) return $item;
        }
        return null;
    }

    public function clearCollection($collection) {
        $this->data[$collection] = [];
        $this->save();
    }

    private function getSeedData() {
        return [
            'users' => [
                [
                    'id' => 'usr-admin-1',
                    'username' => 'admin',
                    'password' => password_hash('admin123', PASSWORD_DEFAULT),
                    'name' => 'Dr. Jorge Valenzuela',
                    'role' => 'admin',
                    'email' => 'contacto@consultorios.pro',
                    'phone' => '+5491123456789',
                    'appearance' => [
                        'theme' => 'light',
                        'fontSize' => 'normal',
                        'calendarView' => 'week'
                    ]
                ]
            ],
            'professionals' => [
                [
                    'id' => 'prof-378c0d79a7',
                    'name' => 'Dr. Juan Carlos Gómez',
                    'specialty' => 'Odontología General',
                    'email' => 'juancarlos@consultorios.pro',
                    'phone' => '+5491123456789',
                    'color' => '#3b82f6',
                    'slot_minutes' => 30,
                    'start_time' => '08:00',
                    'end_time' => '20:00',
                    'work_days' => '1,2,3,4,5',
                    'active' => 1
                ]
            ],
            'patients' => [
                [
                    'id' => 'pat-101',
                    'name' => 'María Rodríguez',
                    'dni' => '35123456',
                    'phone' => '+5491155551234',
                    'email' => 'maria.rodriguez@email.com',
                    'birthdate' => '1990-05-14',
                    'health_insurance' => 'OSDE 210',
                    'affiliate_number' => '884920192',
                    'notes' => 'Paciente con antecedentes de hipertensión controlada.',
                    'allergies' => 'Penicilina'
                ]
            ],
            'appointments' => [
                [
                    'id' => 'apt-sample-1',
                    'patient_id' => 'pat-101',
                    'patient_name' => 'María Rodríguez',
                    'patient_phone' => '+5491155551234',
                    'patient_email' => 'maria.rodriguez@email.com',
                    'professional_id' => 'prof-378c0d79a7',
                    'date' => date('Y-m-d'),
                    'time' => '10:00',
                    'duration' => 30,
                    'reason' => 'Control semestral y limpieza',
                    'status' => 'Confirmado',
                    'cost' => 15000,
                    'observation' => 'Paciente puntual'
                ]
            ],
            'inventory' => [
                [
                    'id' => 'inv-1',
                    'code' => 'INS-001',
                    'name' => 'Anestesia Dental 2% Cartuchos x50',
                    'category' => 'Anestésicos',
                    'stock' => 18,
                    'min_stock' => 5,
                    'unit' => 'cajas',
                    'cost_price' => 4500,
                    'sale_price' => 6000,
                    'expiry_date' => '2027-12-31',
                    'location' => 'Gabinete 1 - Cajón 2'
                ],
                [
                    'id' => 'inv-2',
                    'code' => 'INS-002',
                    'name' => 'Guantes de Látex Talle M x100',
                    'category' => 'Descartables',
                    'stock' => 4,
                    'min_stock' => 8,
                    'unit' => 'cajas',
                    'cost_price' => 3200,
                    'sale_price' => 4000,
                    'expiry_date' => '2028-06-30',
                    'location' => 'Depósito Central'
                ],
                [
                    'id' => 'inv-3',
                    'code' => 'INS-003',
                    'name' => 'Resina Compuesta A2 Fotocurable',
                    'category' => 'Restauración',
                    'stock' => 12,
                    'min_stock' => 3,
                    'unit' => 'jeringas',
                    'cost_price' => 8900,
                    'sale_price' => 12000,
                    'expiry_date' => '2027-04-15',
                    'location' => 'Gabinete 2 - Estante A'
                ]
            ],
            'notifications' => [
                [
                    'id' => 'notif-1',
                    'title' => 'Bienvenido a Consultorios.pro',
                    'message' => 'Sistema inicializado correctamente con todos los módulos activos.',
                    'type' => 'info',
                    'is_read' => 0,
                    'created_at' => date('Y-m-d H:i')
                ]
            ],
            'inventory_movements' => []
        ];
    }
}

function getDatabase() {
    static $db = null;
    if ($db === null) {
        $db = new JsonDatabase();
    }
    return $db;
}
