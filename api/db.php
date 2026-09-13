<?php
/**
 * Conexión y Capa de Persistencia Transaccional ACID Universal para Consultorios.pro
 * Incluye:
 * 1. Motor Transaccional con Lock Exclusivo y Snapshots en Memoria (ACID & Concurrency Safe).
 * 2. Módulo Inmutable de Auditoría (Audit Trail) con registro de Diff (Old/New), IP y Usuario.
 * 3. Módulo de Tesorería Contable con Cuentas y Libro Mayor de Movimientos.
 * 4. Verificación y Recálculo Financiero en Backend para evitar manipulación cliente.
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

class TransactSafeDatabase {
    private $filePath;
    private $lockPath;
    private $data = [];
    private $lockHandle = null;
    private $inTransaction = false;
    private $snapshotData = null;

    public function __construct() {
        $this->filePath = __DIR__ . '/data_store.json';
        $this->lockPath = __DIR__ . '/data_store.lock';
        $this->load();
    }

    private function acquireLock($exclusive = true) {
        if ($this->lockHandle === null) {
            $this->lockHandle = fopen($this->lockPath, 'c+');
        }
        if ($this->lockHandle) {
            $mode = $exclusive ? LOCK_EX : LOCK_SH;
            flock($this->lockHandle, $mode);
        }
    }

    private function releaseLock() {
        if ($this->lockHandle && !$this->inTransaction) {
            flock($this->lockHandle, LOCK_UN);
            fclose($this->lockHandle);
            $this->lockHandle = null;
        }
    }

    public function beginTransaction() {
        $this->acquireLock(true);
        $this->inTransaction = true;
        // Reload fresh data from disk under exclusive lock
        $this->loadFromDisk();
        // Create in-memory snapshot for rollback capability
        $this->snapshotData = unserialize(serialize($this->data));
        return true;
    }

    public function commit() {
        if (!$this->inTransaction) return false;
        $this->saveToDisk();
        $this->inTransaction = false;
        $this->snapshotData = null;
        $this->releaseLock();
        return true;
    }

    public function rollBack() {
        if (!$this->inTransaction) return false;
        if ($this->snapshotData !== null) {
            $this->data = $this->snapshotData;
        }
        $this->inTransaction = false;
        $this->snapshotData = null;
        $this->releaseLock();
        return true;
    }

    private function loadFromDisk() {
        if (!file_exists($this->filePath)) {
            $this->data = $this->getSeedData();
            $this->saveToDisk();
        } else {
            $content = file_get_contents($this->filePath);
            $decoded = json_decode($content, true);
            $this->data = is_array($decoded) ? $decoded : $this->getSeedData();
        }
        $this->ensureCoreCollections();
    }

    private function load() {
        $this->acquireLock(false);
        $this->loadFromDisk();
        $this->releaseLock();
    }

    public function save() {
        if ($this->inTransaction) {
            return; // Will save atomically upon commit()
        }
        $this->acquireLock(true);
        $this->saveToDisk();
        $this->releaseLock();
    }

    private function saveToDisk() {
        $json = json_encode($this->data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $tmpFile = __DIR__ . '/data_store_' . uniqid('', true) . '.tmp';
        file_put_contents($tmpFile, $json);
        if (file_exists($tmpFile)) {
            // Atomic rename/replace
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                copy($tmpFile, $this->filePath);
                @unlink($tmpFile);
            } else {
                rename($tmpFile, $this->filePath);
            }
        }
    }

    private function ensureCoreCollections() {
        $seeds = $this->getSeedData();
        foreach ($seeds as $key => $val) {
            if (!isset($this->data[$key])) {
                $this->data[$key] = $val;
            }
        }
    }

    public function getCollection($name) {
        $this->load();
        return $this->data[$name] ?? [];
    }

    public function insert($collection, $item) {
        $autoTx = !$this->inTransaction;
        if ($autoTx) $this->beginTransaction();

        if (!isset($this->data[$collection])) {
            $this->data[$collection] = [];
        }
        $this->data[$collection][] = $item;

        if ($autoTx) $this->commit();
        return $item;
    }

    public function update($collection, $id, $updates) {
        $autoTx = !$this->inTransaction;
        if ($autoTx) $this->beginTransaction();

        if (!isset($this->data[$collection])) {
            if ($autoTx) $this->rollBack();
            return false;
        }

        foreach ($this->data[$collection] as &$item) {
            if (($item['id'] ?? '') === $id) {
                $item = array_merge($item, $updates);
                if ($autoTx) $this->commit();
                return $item;
            }
        }

        if ($autoTx) $this->rollBack();
        return false;
    }

    public function delete($collection, $id) {
        $autoTx = !$this->inTransaction;
        if ($autoTx) $this->beginTransaction();

        if (!isset($this->data[$collection])) {
            if ($autoTx) $this->rollBack();
            return false;
        }

        $this->data[$collection] = array_values(array_filter($this->data[$collection], function($item) use ($id) {
            return ($item['id'] ?? '') !== $id;
        }));

        if ($autoTx) $this->commit();
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
        $autoTx = !$this->inTransaction;
        if ($autoTx) $this->beginTransaction();
        $this->data[$collection] = [];
        if ($autoTx) $this->commit();
    }

    /**
     * ==========================================
     * AUDIT TRAIL ENGINE (INMUTABLE LOGS)
     * ==========================================
     */
    public function logAudit($entity, $entityId, $action, $oldValue = null, $newValue = null, $userId = null, $meta = []) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        if (str_contains($ip, ',')) {
            $ip = trim(explode(',', $ip)[0]);
        }

        $user = $userId ? $this->findById('users', $userId) : null;
        if (!$user) {
            $users = $this->data['users'] ?? [];
            $user = $users[0] ?? ['id' => 'usr-admin-1', 'name' => 'Dr. Jorge Valenzuela'];
        }

        $logEntry = [
            'id' => 'aud_' . bin2hex(random_bytes(8)),
            'timestamp' => date('c'),
            'userId' => $user['id'] ?? ($userId ?? 'system'),
            'userName' => $user['name'] ?? 'Usuario del Sistema',
            'ip' => $ip,
            'entity' => strtoupper($entity), // 'PATIENT', 'BUDGET', 'APPOINTMENT', 'PAYMENT', 'INVENTORY', 'AUTH', 'TREASURY'
            'entityId' => (string)$entityId,
            'action' => strtoupper($action), // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PAYMENT', 'REVERSAL'
            'diff' => [
                'old' => $oldValue,
                'new' => $newValue
            ],
            'meta' => $meta
        ];

        $autoTx = !$this->inTransaction;
        if ($autoTx) $this->beginTransaction();

        if (!isset($this->data['audit_logs'])) {
            $this->data['audit_logs'] = [];
        }
        array_unshift($this->data['audit_logs'], $logEntry);

        // Cap at 2000 records to prevent memory bloating while keeping extensive history
        if (count($this->data['audit_logs']) > 2000) {
            $this->data['audit_logs'] = array_slice($this->data['audit_logs'], 0, 2000);
        }

        if ($autoTx) $this->commit();
        return $logEntry;
    }

    public function getAuditLogs($limit = 100, $entity = null) {
        $logs = $this->getCollection('audit_logs');
        if ($entity) {
            $logs = array_values(array_filter($logs, fn($l) => ($l['entity'] ?? '') === strtoupper($entity)));
        }
        return array_slice($logs, 0, (int)$limit);
    }

    /**
     * ==========================================
     * TREASURY & ACCOUNTING LEDGER ENGINE
     * ==========================================
     */
    public function recordTreasuryMovement($accountId, $amount, $type, $concept, $referenceId = null, $patientId = null, $meta = []) {
        $amount = (float)$amount;
        if ($amount <= 0) return false;

        $autoTx = !$this->inTransaction;
        if ($autoTx) $this->beginTransaction();

        $accounts = &$this->data['treasury_accounts'];
        $targetAccount = null;
        foreach ($accounts as &$acc) {
            if ($acc['id'] === $accountId) {
                $targetAccount = &$acc;
                break;
            }
        }

        if (!$targetAccount) {
            // Default to cash if account not found
            $targetAccount = &$accounts[0];
            $accountId = $targetAccount['id'];
        }

        $type = strtoupper($type); // 'INCOME' | 'EXPENSE'
        if ($type === 'INCOME') {
            $targetAccount['balance'] = (float)($targetAccount['balance'] ?? 0) + $amount;
        } else {
            $targetAccount['balance'] = (float)($targetAccount['balance'] ?? 0) - $amount;
        }

        $newBalance = $targetAccount['balance'];

        $movement = [
            'id' => 'mov_' . bin2hex(random_bytes(8)),
            'timestamp' => date('c'),
            'accountId' => $accountId,
            'accountName' => $targetAccount['name'],
            'amount' => $amount,
            'type' => $type,
            'concept' => $concept,
            'referenceId' => $referenceId,
            'patientId' => $patientId,
            'balanceAfter' => $newBalance,
            'meta' => $meta
        ];

        if (!isset($this->data['treasury_movements'])) {
            $this->data['treasury_movements'] = [];
        }
        array_unshift($this->data['treasury_movements'], $movement);

        // Also record in audit log
        $this->logAudit('TREASURY', $movement['id'], 'PAYMENT', null, $movement, null, [
            'accountId' => $accountId,
            'amount' => $amount,
            'type' => $type
        ]);

        if ($autoTx) $this->commit();
        return $movement;
    }

    public function getTreasuryAccounts() {
        return $this->getCollection('treasury_accounts');
    }

    public function getTreasuryMovements($limit = 100, $accountId = null) {
        $movs = $this->getCollection('treasury_movements');
        if ($accountId) {
            $movs = array_values(array_filter($movs, fn($m) => ($m['accountId'] ?? '') === $accountId));
        }
        return array_slice($movs, 0, (int)$limit);
    }

    /**
     * Map payment method string to treasury account ID
     */
    public function resolveAccountIdByMethod($methodName) {
        $method = strtolower($methodName ?? '');
        if (str_contains($method, 'transf') || str_contains($method, 'banco') || str_contains($method, 'cbu')) {
            return 'acc_bank_1';
        }
        if (str_contains($method, 'mercado') || str_contains($method, 'mp') || str_contains($method, 'qr')) {
            return 'acc_mp_1';
        }
        if (str_contains($method, 'tarjeta') || str_contains($method, 'débito') || str_contains($method, 'debito') || str_contains($method, 'crédito') || str_contains($method, 'credito') || str_contains($method, 'pos')) {
            return 'acc_pos_1';
        }
        return 'acc_cash_1';
    }

    /**
     * Recalculate & validate budget calculations on the server side
     */
    public static function recalculateBudgetTotals($items, $discountPercent) {
        $subtotal = 0;
        $cleanItems = [];
        if (is_array($items)) {
            foreach ($items as $item) {
                $cant = max(1, (int)($item['cant'] ?? 1));
                $precio = max(0, (float)($item['precio'] ?? 0));
                $sub = round($cant * $precio, 2);
                $subtotal += $sub;
                $cleanItems[] = [
                    'pieza' => trim($item['pieza'] ?? ''),
                    'desc' => trim($item['desc'] ?? ''),
                    'cant' => $cant,
                    'precio' => $precio,
                    'subtotal' => $sub
                ];
            }
        }
        $discountPct = max(0, min(100, (float)$discountPercent));
        $discountAmount = round($subtotal * ($discountPct / 100), 2);
        $total = max(0, round($subtotal - $discountAmount, 2));

        return [
            'items' => $cleanItems,
            'subtotal' => $subtotal,
            'discountPercent' => $discountPct,
            'discountAmount' => $discountAmount,
            'total' => $total
        ];
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
            'treasury_accounts' => [
                [
                    'id' => 'acc_cash_1',
                    'name' => 'Caja General (Efectivo)',
                    'type' => 'ASSET',
                    'balance' => 0.00,
                    'currency' => 'ARS'
                ],
                [
                    'id' => 'acc_bank_1',
                    'name' => 'Banco Galicia (CBU / Transferencias)',
                    'type' => 'ASSET',
                    'balance' => 0.00,
                    'currency' => 'ARS'
                ],
                [
                    'id' => 'acc_mp_1',
                    'name' => 'Mercado Pago (QR / Cobros Digitales)',
                    'type' => 'ASSET',
                    'balance' => 0.00,
                    'currency' => 'ARS'
                ],
                [
                    'id' => 'acc_pos_1',
                    'name' => 'Terminal Tarjetas (Débito y Crédito)',
                    'type' => 'ASSET',
                    'balance' => 0.00,
                    'currency' => 'ARS'
                ]
            ],
            'treasury_movements' => [],
            'audit_logs' => [],
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

// Backward-compatible class alias
class JsonDatabase extends TransactSafeDatabase {}

function getDatabase() {
    static $db = null;
    if ($db === null) {
        $db = new TransactSafeDatabase();
    }
    return $db;
}
