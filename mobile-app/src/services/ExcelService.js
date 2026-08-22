// ============================================================================
// ExcelService.js — Export/Import produk ke .xlsx ASLI, 100% OFFLINE.
// ============================================================================
// Dulu fitur ini nembak server (Laravel Excel). Server mati + app offline-first,
// jadi diganti murni di HP:
//   - SheetJS (`xlsx`) = pure-JS, ga ada native module → OTA-able, ga perlu rebuild.
//   - expo-file-system/legacy = tulis/baca file base64 (jalur teruji buat SheetJS).
//   - expo-document-picker + expo-sharing = pilih file & bagikan hasil.
//
// Sumber data = SQLite lokal (getLocalProductsManage). Import nyimpen balik lewat
// createLocalProduct/updateLocalProduct → otomatis kecatat di outbox buat sync nanti.
// ============================================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import {
  getLocalProductsManage,
  getLocalCategories,
  createLocalProduct,
  updateLocalProduct,
  createLocalCategory,
} from './SyncService';

// Urutan & judul kolom. Judul yang sama dikenali balik pas import (lihat FIELD_ALIASES).
const HEADERS = [
  'ID', 'Nama', 'Kategori', 'Harga Jual', 'Harga Modal', 'Kode', 'Barcode',
  'Stok', 'Stok Minimum', 'Satuan', 'Deskripsi', 'Unlimited', 'Aktif',
  'Kadaluarsa', 'Punya Varian',
];

// Lebar kolom biar enak dibaca di Excel.
const COL_WIDTHS = [8, 28, 18, 14, 14, 14, 16, 8, 12, 8, 30, 10, 8, 14, 12];

// Alias judul kolom (huruf kecil, sudah di-trim) → field internal. Fleksibel biar
// file dari mana pun tetap kebaca selama judulnya masuk akal.
const FIELD_ALIASES = {
  id: ['id'],
  name: ['nama', 'nama produk', 'name', 'product name', 'produk'],
  category: ['kategori', 'category', 'kategori produk'],
  selling_price: ['harga jual', 'harga', 'selling price', 'price', 'jual'],
  cost_price: ['harga modal', 'modal', 'cost', 'cost price', 'harga beli', 'beli'],
  code: ['kode', 'code', 'sku'],
  barcode: ['barcode', 'kode barcode', 'bar code'],
  stock: ['stok', 'stock', 'qty', 'jumlah', 'kuantitas'],
  stock_minimum: ['stok minimum', 'stok min', 'min stok', 'minimum stock', 'stok minimal'],
  unit: ['satuan', 'unit'],
  description: ['deskripsi', 'keterangan', 'description', 'catatan'],
  is_unlimited: ['unlimited', 'stok tak terbatas', 'tak terbatas', 'tanpa batas'],
  is_active: ['aktif', 'status', 'active'],
  expiry_date: ['kadaluarsa', 'kedaluwarsa', 'expired', 'expiry', 'tanggal kadaluarsa'],
};

// ---------- util angka & boolean (toleran format Indonesia) ----------

// "10.000" → 10000, "1.250.000,50" → 1250000.5, "10,5" → 10.5, 10000 → 10000.
const parseNum = (v) => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  let s = String(v).trim().replace(/[^0-9,.\-]/g, '');
  if (!s) return 0;
  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    s = s.replace(/\./g, '').replace(',', '.');   // titik ribuan, koma desimal
  } else if (hasComma) {
    s = s.replace(',', '.');                       // koma = desimal
  } else if (hasDot) {
    // titik dianggap ribuan hanya kalau polanya grup 3 digit (10.000 / 1.250.000)
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const parseBool = (v, def = false) => {
  if (v == null || v === '') return def;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (['ya', 'yes', 'true', '1', 'aktif', 'y', 'v', 'ok'].includes(s)) return true;
  if (['tidak', 'no', 'false', '0', 'nonaktif', 'n', '-'].includes(s)) return false;
  return def;
};

const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();

// Tanggal buat nama file (bukan Workflow, jadi `new Date()` aman di runtime app).
const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

// ============================ EXPORT ============================

// Baca semua produk lokal → workbook .xlsx → simpan ke cache → buka dialog "Bagikan".
// Return { count, filename, uri, shared }.
export async function exportProductsToExcel() {
  const XLSX = require('xlsx'); // lazy: SheetJS ~1MB, jangan dievaluasi pas boot app
  const products = await getLocalProductsManage({});

  const rows = products.map((p) => {
    const totalStock = Array.isArray(p.stocks)
      ? p.stocks.reduce((s, st) => s + (Number(st.quantity) || 0), 0)
      : Number(p.stock) || 0;
    return [
      p.id,
      p.name || '',
      p.category?.name || p.category_name || '',
      Number(p.selling_price) || 0,
      Number(p.cost_price) || 0,
      p.code || p.sku || '',
      p.barcode || '',
      p.is_unlimited ? 0 : totalStock,
      Number(p.stock_minimum) || 0,
      p.unit || 'pcs',
      p.description || '',
      p.is_unlimited ? 'Ya' : 'Tidak',
      p.is_active ? 'Ya' : 'Tidak',
      p.expiry_date || '',
      p.has_variants ? 'Ya' : 'Tidak',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  ws['!cols'] = COL_WIDTHS.map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produk');

  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `produk-${stamp()}.xlsx`;
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const uri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });

  let shared = false;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Export Produk',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
    shared = true;
  }
  return { count: products.length, filename, uri, shared };
}

// ============================ IMPORT ============================

// Ambil satu field dari baris pakai daftar alias judul (case-insensitive).
const makeGetter = (row) => {
  const map = {};
  for (const k of Object.keys(row)) map[norm(k)] = row[k];
  return (field) => {
    const aliases = FIELD_ALIASES[field] || [];
    for (const a of aliases) if (a in map && map[a] !== '') return map[a];
    for (const a of aliases) if (a in map) return map[a]; // ada kolomnya tapi kosong
    return undefined;
  };
};

// Pilih file .xlsx/.xls → parse → upsert ke SQLite. Cocokin baris ke produk yang ada
// urut: Kode → Barcode → Nama. Ketemu = update, ga ketemu = buat baru. Produk bervarian
// yang udah ada DILEWATI (satu baris Excel ga bisa merepresentasikan varian → jangan
// sampai numpuk/ngerusak data varian). Return ringkasan { created, updated, skipped, ... }.
export async function importProductsFromExcel() {
  const XLSX = require('xlsx'); // lazy: baru dimuat pas user beneran impor
  const res = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                          // .xls
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled) return { canceled: true };
  const asset = res.assets && res.assets[0];
  if (!asset || !asset.uri) throw new Error('File tidak terbaca.');

  const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  let wb;
  try {
    wb = XLSX.read(b64, { type: 'base64' });
  } catch (e) {
    throw new Error('File bukan Excel yang valid atau rusak.');
  }
  const sheetName = wb.SheetNames && wb.SheetNames[0];
  const sheet = sheetName && wb.Sheets[sheetName];
  if (!sheet) throw new Error('File Excel kosong (tidak ada sheet).');

  const rowsRaw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  if (!rowsRaw.length) throw new Error('Tidak ada baris data di file.');

  // Cache kategori (nama→id); auto-buat kalau nama kategori belum ada.
  const cats = await getLocalCategories();
  const catByName = new Map((cats || []).map((c) => [norm(c.name), c.id]));

  // Index produk yang ada buat pencocokan.
  const existing = await getLocalProductsManage({});
  const byCode = new Map(), byBarcode = new Map(), byName = new Map();
  const indexProduct = (p) => {
    const code = norm(p.code || p.sku);
    const bc = norm(p.barcode);
    const nm = norm(p.name);
    if (code) byCode.set(code, p);
    if (bc) byBarcode.set(bc, p);
    if (nm && !byName.has(nm)) byName.set(nm, p);
  };
  existing.forEach(indexProduct);

  let created = 0, updated = 0, skipped = 0;
  const errors = [];

  for (let i = 0; i < rowsRaw.length; i++) {
    const excelRow = i + 2; // +1 header, +1 karena baris mulai dari 1
    try {
      const get = makeGetter(rowsRaw[i]);
      const name = String(get('name') || '').trim();
      if (!name) { skipped++; errors.push(`Baris ${excelRow}: nama kosong, dilewati.`); continue; }

      // Kategori → id (buat baru bila perlu).
      let categoryId = null;
      const catName = String(get('category') || '').trim();
      if (catName) {
        const key = norm(catName);
        if (catByName.has(key)) {
          categoryId = catByName.get(key);
        } else {
          categoryId = await createLocalCategory({ name: catName, is_active: 1 });
          catByName.set(key, categoryId);
        }
      }

      const unlimited = parseBool(get('is_unlimited'), false);
      const form = {
        name,
        selling_price: parseNum(get('selling_price')),
        cost_price: parseNum(get('cost_price')),
        code: String(get('code') || '').trim(),
        barcode: String(get('barcode') || '').trim(),
        stock_minimum: parseNum(get('stock_minimum')) || 5,
        unit: String(get('unit') || '').trim() || 'pcs',
        description: String(get('description') || '').trim(),
        category_id: categoryId,
        has_variants: false,
        is_unlimited: unlimited,
        is_active: parseBool(get('is_active'), true),
        expiry_date: String(get('expiry_date') || '').trim() || null,
        stocks: [{ quantity: unlimited ? 0 : parseNum(get('stock')) }],
      };

      // Cari produk yang cocok: Kode → Barcode → Nama.
      const codeKey = norm(form.code), bcKey = norm(form.barcode), nameKey = norm(name);
      let match = (codeKey && byCode.get(codeKey)) ||
                  (bcKey && byBarcode.get(bcKey)) ||
                  byName.get(nameKey) || null;

      if (match) {
        if (match.has_variants) {
          skipped++;
          errors.push(`Baris ${excelRow}: "${name}" punya varian, dilewati (edit manual di app).`);
          continue;
        }
        await updateLocalProduct(match.id, form);
        updated++;
      } else {
        const newId = await createLocalProduct(form);
        // Masukkan ke index biar baris duplikat di file yang sama meng-update, bukan bikin dobel.
        const np = { id: newId, code: form.code, sku: form.code, barcode: form.barcode, name, has_variants: 0 };
        indexProduct(np);
        created++;
      }
    } catch (e) {
      skipped++;
      errors.push(`Baris ${excelRow}: ${e?.message || 'gagal diproses'}.`);
    }
  }

  return { created, updated, skipped, total: rowsRaw.length, errors, filename: asset.name || 'file.xlsx' };
}

export default { exportProductsToExcel, importProductsFromExcel };
