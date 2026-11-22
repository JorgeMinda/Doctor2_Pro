-- Script aditivo idempotente para "Cita Emergente Express"
-- No DROP, no ALTER destructivo. Seguro de re-ejecutar.

-- Columnas opcionales en patients
ALTER TABLE `patients` ADD COLUMN IF NOT EXISTS `registro_incompleto` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `patients` ADD COLUMN IF NOT EXISTS `edad_aproximada` INT NULL;

-- Columna opcional en appointments
ALTER TABLE `appointments` ADD COLUMN IF NOT EXISTS `emergencia` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `appointments` ADD COLUMN IF NOT EXISTS `deleted_at` DATETIME NULL;

-- Rollback (ejecutar manualmente si se desea revertir):
-- ALTER TABLE `patients` DROP COLUMN `registro_incompleto`;
-- ALTER TABLE `patients` DROP COLUMN `edad_aproximada`;
-- ALTER TABLE `appointments` DROP COLUMN `emergencia`;
-- ALTER TABLE `appointments` DROP COLUMN `deleted_at`;
