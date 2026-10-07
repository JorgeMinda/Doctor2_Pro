/**
 * supabase-config.js - Configuración Centralizada de Supabase para Doctor2_Pro
 */

const STORAGE_KEY = 'doctor2_supabase_config';

// Configuración por defecto vinculada a tu proyecto Supabase
export const defaultSupabaseConfig = {
  url: 'https://aihecmyzzchwfobquhky.supabase.co',
  anonKey: '',
  enabled: true
};

export function getSupabaseConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.url && parsed.anonKey) {
        return { ...parsed, enabled: parsed.enabled !== false };
      }
    }
  } catch (e) {
    console.error('Error al leer configuración de Supabase:', e);
  }
  return { ...defaultSupabaseConfig };
}

export function saveSupabaseConfig(url, anonKey, enabled = true) {
  const config = {
    url: (url || '').trim().replace(/\/+$/, ''),
    anonKey: (anonKey || '').trim(),
    enabled: Boolean(enabled)
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Error al guardar configuración de Supabase:', e);
    return false;
  }
}

export function isSupabaseConfigured() {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.enabled && cfg.url && cfg.anonKey && cfg.url.startsWith('https://'));
}

export function clearSupabaseConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
