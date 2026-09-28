-- ==========================================================
-- DOCTOR2_PRO - BASE DE DATOS COMPLETA (MySQL / MariaDB)
-- Compatible con: Aiven, TiDB Cloud, Clever Cloud, cPanel, InfinityFree
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- 1. TABLA: USUARIOS
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'admin',
  `email` VARCHAR(150),
  `phone` VARCHAR(50),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA: PROFESIONALES
CREATE TABLE IF NOT EXISTS `professionals` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `specialty` VARCHAR(100) DEFAULT 'Odontología General',
  `email` VARCHAR(150),
  `phone` VARCHAR(50),
  `color` VARCHAR(20) DEFAULT '#4f46e5',
  `duration` INT DEFAULT 30,
  `schedule` LONGTEXT,
  `emergency_block` LONGTEXT,
  `license_code` VARCHAR(50) DEFAULT 'MSP-78421',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA: PACIENTES
CREATE TABLE IF NOT EXISTS `patients` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `dni` VARCHAR(50),
  `phone` VARCHAR(50),
  `email` VARCHAR(150),
  `birthdate` DATE,
  `age` INT,
  `insurance` VARCHAR(100),
  `plan` VARCHAR(100),
  `allergies` TEXT,
  `medical_alerts` TEXT,
  `notes` LONGTEXT,
  `history_entries` LONGTEXT,
  `odontogram_data` LONGTEXT,
  `attachments` LONGTEXT,
  `balance` DECIMAL(12,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA: TURNOS Y CITAS
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` VARCHAR(50) PRIMARY KEY,
  `patient_id` VARCHAR(50),
  `patient_name` VARCHAR(150) NOT NULL,
  `professional_id` VARCHAR(50),
  `professional_name` VARCHAR(150),
  `date` DATE NOT NULL,
  `time` VARCHAR(10) NOT NULL,
  `duration` INT DEFAULT 30,
  `status` VARCHAR(50) DEFAULT 'pendiente',
  `reason` VARCHAR(255),
  `notes` TEXT,
  `cost` DECIMAL(12,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`date`),
  INDEX (`patient_id`),
  INDEX (`professional_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA: CUENTAS DE TESORERÍA
CREATE TABLE IF NOT EXISTS `treasury_accounts` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) DEFAULT 'cash',
  `balance` DECIMAL(12,2) DEFAULT 0.00,
  `currency` VARCHAR(10) DEFAULT 'ARS',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA: MOVIMIENTOS DE TESORERÍA
CREATE TABLE IF NOT EXISTS `treasury_movements` (
  `id` VARCHAR(50) PRIMARY KEY,
  `account_id` VARCHAR(50),
  `type` VARCHAR(20) NOT NULL, -- 'income' / 'expense'
  `amount` DECIMAL(12,2) NOT NULL,
  `category` VARCHAR(100),
  `description` TEXT,
  `patient_id` VARCHAR(50),
  `payment_method` VARCHAR(50),
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(100),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`date`),
  INDEX (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABLA: INVENTARIO / FARMACIA
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` VARCHAR(50) PRIMARY KEY,
  `code` VARCHAR(50),
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100),
  `stock` INT DEFAULT 0,
  `min_stock` INT DEFAULT 5,
  `unit` VARCHAR(50) DEFAULT 'unidades',
  `cost_price` DECIMAL(12,2) DEFAULT 0.00,
  `sale_price` DECIMAL(12,2) DEFAULT 0.00,
  `expiry_date` DATE,
  `location` VARCHAR(100),
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABLA: MOVIMIENTOS DE INVENTARIO
CREATE TABLE IF NOT EXISTS `inventory_movements` (
  `id` VARCHAR(50) PRIMARY KEY,
  `item_id` VARCHAR(50),
  `type` VARCHAR(20) NOT NULL,
  `quantity` INT NOT NULL,
  `reason` VARCHAR(255),
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(100),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABLA: DÍAS BLOQUEADOS Y FERIADOS
CREATE TABLE IF NOT EXISTS `blocked_days` (
  `id` VARCHAR(50) PRIMARY KEY,
  `date` DATE NOT NULL,
  `reason` VARCHAR(255),
  `professional_id` VARCHAR(50),
  `type` VARCHAR(50) DEFAULT 'holiday',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABLA: NOTIFICACIONES
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT,
  `type` VARCHAR(50) DEFAULT 'info',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABLA: AUDITORÍA INMUTABLE
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `user_id` VARCHAR(50),
  `user_name` VARCHAR(150),
  `ip` VARCHAR(50),
  `entity` VARCHAR(50),
  `entity_id` VARCHAR(50),
  `action` VARCHAR(50),
  `diff` LONGTEXT,
  `meta` LONGTEXT,
  INDEX (`timestamp`),
  INDEX (`entity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- DATOS INICIALES (SEED DATA)
-- ==========================================================

INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`, `email`, `phone`) 
VALUES ('usr-admin-1', 'admin', 'admin123', 'Dr. Jorge Valenzuela', 'admin', 'dr.valenzuela@doctor2.com', '+5491100001111')
ON DUPLICATE KEY UPDATE `username`=`username`;

INSERT INTO `professionals` (`id`, `name`, `specialty`, `email`, `phone`, `color`, `duration`, `schedule`, `license_code`) 
VALUES ('prof-1', 'Dr. Jorge Valenzuela', 'Odontología Integral', 'dr.valenzuela@doctor2.com', '+5491100001111', '#4f46e5', 30, '{"mon":{"active":true,"start":"09:00","end":"18:00"},"tue":{"active":true,"start":"09:00","end":"18:00"},"wed":{"active":true,"start":"09:00","end":"18:00"},"thu":{"active":true,"start":"09:00","end":"18:00"},"fri":{"active":true,"start":"09:00","end":"18:00"}}', 'MSP-78421')
ON DUPLICATE KEY UPDATE `name`=`name`;

INSERT INTO `treasury_accounts` (`id`, `name`, `type`, `balance`, `currency`) VALUES
('acc-cash', 'Caja Efectivo Consultorio', 'cash', 45000.00, 'ARS'),
('acc-bank', 'Banco Santander / Galicia', 'bank', 185000.00, 'ARS'),
('acc-mp', 'Mercado Pago / Galicia Nave', 'digital', 62000.00, 'ARS')
ON DUPLICATE KEY UPDATE `name`=`name`;

INSERT INTO `inventory` (`id`, `code`, `name`, `category`, `stock`, `min_stock`, `unit`, `cost_price`, `sale_price`, `expiry_date`, `location`) VALUES
('inv-1', 'INS-001', 'Anestesia Tubo Lidocaína 2% x50', 'Anestésicos', 18, 5, 'cajas', 4500.00, 6000.00, '2027-12-31', 'Gabinete 1 - Cajón 2'),
('inv-2', 'INS-002', 'Guantes de Látex Talle M x100', 'Descartables', 14, 8, 'cajas', 3200.00, 4000.00, '2028-06-30', 'Depósito Central'),
('inv-3', 'INS-003', 'Resina Compuesta A2 Fotocurable', 'Restauración', 12, 3, 'jeringas', 8900.00, 12000.00, '2027-04-15', 'Gabinete 2 - Estante A')
ON DUPLICATE KEY UPDATE `name`=`name`;

INSERT INTO `notifications` (`id`, `title`, `message`, `type`, `is_read`, `created_at`) 
VALUES ('notif-1', 'Bienvenido a Doctor2_Pro', 'Sistema clínico inicializado correctamente con base de datos permanente.', 'info', 0, NOW())
ON DUPLICATE KEY UPDATE `title`=`title`;

SET FOREIGN_KEY_CHECKS = 1;
