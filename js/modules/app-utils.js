/**
 * app-utils.js - Funciones Utilitarias y Helpers para Doctor2
 */

export function el(id) {
  return document.getElementById(id);
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatReadableDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const date = new Date(y, m - 1, d);
  const options = { weekday: 'long', day: 'numeric', month: 'short' };
  return date.toLocaleDateString('es-ES', options);
}

export function calculateAge(birthdate) {
  if (birthdate === null || birthdate === undefined) return 'Sin edad';
  if (typeof birthdate === 'number') {
    return birthdate > 0 ? `${birthdate} años` : 'Sin edad';
  }
  const str = String(birthdate).trim();
  if (!str || str === '0000-00-00' || str.toLowerCase() === 'sin edad' || str.toLowerCase() === 'sin registrar' || str.toLowerCase() === '-') {
    return 'Sin edad';
  }

  // Si ya es un valor de edad directo como "37" o "37 años"
  const ageOnlyMatch = str.match(/^(\d{1,3})(\s*años)?$/i);
  if (ageOnlyMatch) {
    const n = parseInt(ageOnlyMatch[1], 10);
    return n >= 0 ? `${n} años` : 'Sin edad';
  }

  let birth = null;
  // Soporte formato latino DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    birth = new Date(year, month, day);
  } else if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(str)) {
    // Formato ISO YYYY-MM-DD o YYYY/MM/DD
    const parts = str.split(/[\/\-T ]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    birth = new Date(year, month, day);
  } else {
    birth = new Date(str);
  }

  if (!birth || isNaN(birth.getTime())) return 'Sin edad';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} años` : 'Sin edad';
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };

  toast.style.cssText = `
    background: ${bgColors[type] || bgColors.info};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    pointer-events: auto;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.25s ease;
    font-family: inherit;
  `;
  toast.textContent = message;

  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error || `HTTP error! status: ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`Error al conectar con ${url}:`, err);
    throw err;
  }
}

export function getPatientHcNumber(patient) {
  if (!patient) return 'ND-0001';

  const existing = patient.hcNumber || patient.hc_number;
  if (existing && typeof existing === 'string' && existing.startsWith('ND-')) {
    return existing;
  }

  // Si es el paciente demo inicial pat-101 o formato previo HC-101 / HC-001 -> ND-0001
  if (patient.id === 'pat-101' || existing === 'HC-101' || existing === 'HC-001') {
    return 'ND-0001';
  }

  // Numeración continua según el índice en la lista de pacientes
  try {
    const list = window.state?.patients;
    if (Array.isArray(list) && list.length > 0) {
      const idx = list.findIndex(p => p.id === patient.id);
      if (idx !== -1) {
        return `ND-${String(idx + 1).padStart(4, '0')}`;
      }
    }
  } catch (e) {}

  // Si trae un prefijo HC- previo, convertir a ND-
  if (existing && typeof existing === 'string' && existing.startsWith('HC-')) {
    const numPart = parseInt(existing.replace('HC-', ''), 10);
    if (!isNaN(numPart)) {
      if (numPart === 101) return 'ND-0001';
      return `ND-${String(numPart).padStart(4, '0')}`;
    }
  }

  if (patient.id && typeof patient.id === 'string') {
    const numMatch = patient.id.match(/\d+/);
    if (numMatch) {
      const n = parseInt(numMatch[0], 10);
      if (n === 101) return 'ND-0001';
      return `ND-${String(n).padStart(4, '0')}`;
    }
  }

  return 'ND-0001';
}

if (typeof window !== 'undefined') {
  window.getPatientHcNumber = getPatientHcNumber;
}

