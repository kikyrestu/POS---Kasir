import axios from 'axios';
import * as SecureStore from './storage';

// ============================================================================
// api.js — HTTP client ke Laravel/Sanctum, baseURL DINAMIS per-tenant.
// ============================================================================
// Server multi-tenant subdomain: tiap toko dilayani di https://{kodetoko}.{DOMAIN}/api
// (header X-Tenant DIABAIKAN server — subdomain yang nentuin tenant). Karena itu
// baseURL TIDAK boleh dibekuin di axios.create; kita simpen di variabel modul yang
// bisa diubah runtime (setTenant/setBaseUrl) + di-persist, lalu ditembak ke tiap
// request lewat interceptor. Nilai awal dipersist dari login sebelumnya.

const STORE_KEY = 'apiBaseUrl';   // baseURL final (…/api) hasil resolve, dipersist
const CODE_KEY = 'storeCode';     // kode toko mentah (buat prefill field login)

// Domain induk multi-tenant. Bisa dioverride lewat .env (EXPO_PUBLIC_TENANT_DOMAIN).
const TENANT_DOMAIN = (process.env.EXPO_PUBLIC_TENANT_DOMAIN || 'buildypos.store')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');

// Override dev/LAN opsional: kalau diisi FULL url, dipakai langsung (field Kode Toko
// diabaikan). Kosongin di build produksi biar tiap toko masukin kodenya sendiri.
const ENV_BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || '';

// Rapihin url → pastiin ada skema & berakhiran /api, tanpa trailing slash dobel.
const normalize = (url) => {
  if (!url) return '';
  let u = String(url).trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  if (!/\/api$/i.test(u)) u = `${u}/api`;
  return u;
};

// Kode toko (subdomain) → baseURL produksi. Sanitasi ke [a-z0-9-] biar aman.
export const tenantBaseUrl = (code) => {
  const c = String(code || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!c) return '';
  return `https://${c}.${TENANT_DOMAIN}/api`;
};

// Nilai berjalan (dibaca sinkron oleh serverStatus/resolveProductImage). Default
// dari .env; kalau ada yang dipersist, ditimpa lewat initBaseUrl() saat bootstrap.
let _baseURL = normalize(ENV_BASE_URL);

export const getBaseUrl = () => _baseURL;

// Dipanggil SEKALI di App bootstrap (sebelum request/ping pertama): tarik override
// yang dipersist dari sesi sebelumnya. Balikin baseURL efektif.
export const initBaseUrl = async () => {
  try {
    const saved = await SecureStore.getItemAsync(STORE_KEY);
    if (saved) _baseURL = saved;
  } catch (_) { /* storage belum siap → pakai default env */ }
  return _baseURL;
};

// Set baseURL langsung (url penuh) + persist. Balikin url yg dinormalisasi.
export const setBaseUrl = async (url) => {
  const u = normalize(url);
  _baseURL = u;
  try { await SecureStore.setItemAsync(STORE_KEY, u); } catch (_) {}
  return u;
};

// Set tenant dari KODE TOKO (subdomain) + persist kode mentahnya buat prefill.
export const setTenant = async (code) => {
  const u = tenantBaseUrl(code);
  if (!u) throw new Error('Kode toko tidak valid');
  try { await SecureStore.setItemAsync(CODE_KEY, String(code).trim().toLowerCase()); } catch (_) {}
  return setBaseUrl(u);
};

// Kode toko terakhir (buat prefill field login). '' kalau belum pernah diisi.
export const getStoreCode = async () => {
  try { return (await SecureStore.getItemAsync(CODE_KEY)) || ''; } catch (_) { return ''; }
};

// True kalau baseURL sudah kebentuk (env override ATAU tenant sudah dipilih).
export const hasBaseUrl = () => !!_baseURL;

const api = axios.create({
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  // baseURL dibaca PER-REQUEST (bukan dibekuin) → ganti tenant langsung kepakai.
  if (_baseURL) config.baseURL = _baseURL;
  const token = await SecureStore.getItemAsync('userToken');
  if (token && token !== 'OFFLINE_MODE') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 = token basi → auto-logout. TAPI jangan hapus token gara-gara login
    // gagal (POST /login sendiri balikin 401 pas password salah).
    const url = error.config?.url || '';
    if (error.response && error.response.status === 401 && !url.endsWith('/login')) {
      SecureStore.deleteItemAsync('userToken');
    }
    return Promise.reject(error);
  }
);

export default api;
