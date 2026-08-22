/**
 * ============================================================================
 * PrinterService — cetak struk ESC/POS ke printer Bluetooth (Classic + BLE)
 * ============================================================================
 * "Apa aja harus bisa": printer thermal murah di Indonesia kebanyakan pakai
 * Bluetooth Classic (SPP), sebagian model baru pakai BLE (GATT). Ga ada 1 lib
 * yang nutup dua-duanya buat printer generic → kita bungkus DUA transport:
 *   - Classic : react-native-bluetooth-classic  (pilih dari device yg sudah di-pair)
 *   - BLE     : react-native-ble-plx            (scan + auto-detect characteristic)
 * Dua-duanya nulis RAW BYTE lewat string base64 → byte-nya dibuat oleh
 * escpos.buildReceiptBytes (pure JS, sama buat dua transport).
 *
 * File ini manggil native module. `require` dibungkus try/catch biar bundling
 * (dan build lama sebelum rebuild) ga langsung crash kalau module belum ada;
 * fungsi cetak baru ngasih pesan ramah kalau module-nya beneran ga tersedia.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import {
  buildReceiptBytes,
  receiptToPrinterData,
  bytesToBase64,
  chunkBytes,
  paperToCharsPerLine,
} from '../utils/escpos';

// ---- Native module (defensive require) ----
let RNBluetoothClassic = null;
try { RNBluetoothClassic = require('react-native-bluetooth-classic').default; } catch (_) { /* belum di-build */ }

let Ble = null;
try { Ble = require('react-native-ble-plx'); } catch (_) { /* belum di-build */ }

// Pasangan UUID printer BLE yang paling umum (dipakai sebagai prioritas saat
// auto-detect). Printer murah suka beda-beda, makanya tetap ada auto-detect.
const BLE_COMMON_CHARS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // service 000018f0 (printer ESC/POS standar)
  '0000ffe1-0000-1000-8000-00805f9b34fb', // service 0000ffe0 (HM-10 dsb)
  '0000ff02-0000-1000-8000-00805f9b34fb',
];

let _bleManager = null;
function getBleManager() {
  if (!Ble) throw new Error('Modul BLE tidak tersedia di build ini.');
  if (!_bleManager) _bleManager = new Ble.BleManager();
  return _bleManager;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normTransport = (t) => (t === 'ble' ? 'ble' : 'classic');

/** Apakah transport tsb ke-compile di binary ini. */
export function isTransportAvailable(transport) {
  return normTransport(transport) === 'ble' ? !!Ble : !!RNBluetoothClassic;
}

/**
 * Minta izin runtime sesuai versi Android & transport.
 * - Android 12+ (API 31+): BLUETOOTH_CONNECT (+ BLUETOOTH_SCAN utk BLE).
 *   Manifest ble-plx TIDAK memakai flag neverForLocation, jadi scan BLE di 12+
 *   TETAP butuh izin lokasi supaya hasil scan muncul → ikut diminta.
 * - Android <= 11: scan BLE butuh ACCESS_FINE_LOCATION. Classic ke device yg
 *   sudah di-pair tidak butuh izin runtime.
 * iOS: diatur lewat Info.plist, tidak ada runtime request di sini.
 */
export async function requestPrinterPermissions(transport = 'classic') {
  if (Platform.OS !== 'android') return true;
  const P = PermissionsAndroid.PERMISSIONS;
  const GRANTED = PermissionsAndroid.RESULTS.GRANTED;
  const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10) || 0;
  const t = normTransport(transport);

  const perms = [];
  if (api >= 31) {
    if (P.BLUETOOTH_CONNECT) perms.push(P.BLUETOOTH_CONNECT);
    if (t === 'ble') {
      if (P.BLUETOOTH_SCAN) perms.push(P.BLUETOOTH_SCAN);
      // Tanpa neverForLocation → lokasi wajib buat dapat hasil scan BLE di 12+.
      if (P.ACCESS_FINE_LOCATION) perms.push(P.ACCESS_FINE_LOCATION);
    }
  } else if (t === 'ble' && P.ACCESS_FINE_LOCATION) {
    perms.push(P.ACCESS_FINE_LOCATION);
  }

  if (perms.length === 0) return true;
  const res = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((p) => res[p] === GRANTED);
}

/** Daftar printer Classic yang SUDAH di-pair di Setelan Bluetooth HP. */
export async function listBondedClassicDevices() {
  if (!RNBluetoothClassic) throw new Error('Modul Bluetooth Classic tidak tersedia di build ini.');
  const ok = await requestPrinterPermissions('classic');
  if (!ok) throw new Error('Izin Bluetooth ditolak. Aktifkan izin Bluetooth di Pengaturan HP.');
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) throw new Error('Bluetooth mati. Nyalakan Bluetooth dulu, lalu coba lagi.');
  const devices = await RNBluetoothClassic.getBondedDevices();
  return (devices || []).map((d) => ({ id: d.address || d.id, name: d.name || d.address || 'Printer' }));
}

/** Scan printer BLE di sekitar (default 8 detik). Balikin [{id, name}]. */
export async function scanBleDevices({ timeoutMs = 8000, onDevice } = {}) {
  if (!Ble) throw new Error('Modul BLE tidak tersedia di build ini.');
  const ok = await requestPrinterPermissions('ble');
  if (!ok) throw new Error('Izin Bluetooth/Lokasi ditolak. Aktifkan izin di Pengaturan HP.');
  const manager = getBleManager();
  const state = await manager.state();
  if (String(state) !== 'PoweredOn') throw new Error('Bluetooth mati. Nyalakan Bluetooth dulu, lalu coba lagi.');

  return new Promise((resolve, reject) => {
    const found = new Map();
    let done = false;
    const stop = (fn) => {
      if (done) return;
      done = true;
      try { manager.stopDeviceScan(); } catch (_) {}
      fn();
    };
    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) { stop(() => reject(new Error(mapError(error)))); return; }
      if (device && !found.has(device.id)) {
        const name = device.name || device.localName || '';
        const entry = { id: device.id, name: name || device.id };
        found.set(device.id, entry);
        if (typeof onDevice === 'function') onDevice(entry);
      }
    });
    setTimeout(() => stop(() => resolve(Array.from(found.values()))), timeoutMs);
  });
}

/**
 * ENTRY TUNGGAL. Bangun byte struk lalu kirim ke printer sesuai transport.
 * @returns {Promise<{success:boolean, message:string}>}
 */
export async function printReceipt(receiptData, settings = {}) {
  const transport = normTransport(settings.printer_transport);
  const deviceId = settings.printer_device_id;
  if (!deviceId) {
    throw new Error('Printer belum dipilih. Buka Pengaturan › Printer untuk memilih printer.');
  }
  if (!isTransportAvailable(transport)) {
    throw new Error('Modul printer belum ada di aplikasi ini. Perlu update/pasang ulang aplikasi (rebuild).');
  }

  const ok = await requestPrinterPermissions(transport);
  if (!ok) throw new Error('Izin Bluetooth ditolak. Aktifkan izin Bluetooth di Pengaturan HP.');

  const data = receiptToPrinterData(receiptData, settings);
  const paper = settings.receipt_paper_size;
  const bytes = buildReceiptBytes(data, {
    charsPerLine: paperToCharsPerLine(paper),
    cutPaper: String(paper || '').includes('80'), // 80mm biasanya ada auto-cutter; 58mm nggak
  });

  try {
    if (transport === 'ble') await connectAndPrintBle(deviceId, bytes, settings);
    else await connectAndPrintClassic(deviceId, bytes);
    return { success: true, message: 'Struk berhasil dicetak.' };
  } catch (e) {
    throw new Error(mapError(e));
  }
}

/** Cetak struk contoh (buat tombol "Tes Cetak" di Pengaturan). */
export async function testPrint(settings = {}) {
  const sample = {
    store: settings.store_name || 'BuildyPOS',
    invoice: 'TEST-0001',
    date: new Date().toLocaleString('id-ID'),
    cashier: 'Kasir',
    customer: 'Pelanggan Umum',
    paymentMethod: 'TUNAI',
    cart: [
      { name: 'Kopi Susu Gula Aren', qty: 2, price: 18000, item_notes: 'Less sugar' },
      { name: 'Roti Bakar Coklat Keju Spesial', qty: 1, price: 22000 },
    ],
    subtotal: 58000,
    discount: 0,
    voucher: 0,
    tax: 0,
    total: 58000,
    paid: 60000,
    change: 2000,
  };
  return printReceipt(sample, settings);
}

// ---------------- Internal: Classic (SPP) ----------------
async function connectAndPrintClassic(address, bytes) {
  if (!RNBluetoothClassic) throw new Error('Modul Bluetooth Classic tidak tersedia di build ini.');
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) throw new Error('Bluetooth mati. Nyalakan Bluetooth dulu, lalu coba lagi.');

  let device = null;
  try {
    try {
      // delimiter kosong: jangan tambahin newline ke data byte mentah.
      device = await RNBluetoothClassic.connectToDevice(address, { delimiter: '' });
    } catch (connErr) {
      // Mungkin masih nyambung dari sesi sebelumnya — coba ambil handle-nya.
      const already = await RNBluetoothClassic.isDeviceConnected(address).catch(() => false);
      if (already && RNBluetoothClassic.getConnectedDevice) {
        device = await RNBluetoothClassic.getConnectedDevice(address).catch(() => null);
      }
      if (!device) throw connErr;
    }
    if (!device) throw new Error('Gagal menyambung ke printer.');

    const chunks = chunkBytes(bytes, 256).map(bytesToBase64);
    for (const chunk of chunks) {
      await device.write(chunk, 'base64');
      await sleep(15);
    }
  } finally {
    try {
      if (device && device.disconnect) await device.disconnect();
      else if (RNBluetoothClassic.disconnectFromDevice) await RNBluetoothClassic.disconnectFromDevice(address);
    } catch (_) {}
  }
}

// ---------------- Internal: BLE (GATT) ----------------
async function connectAndPrintBle(deviceId, bytes, settings = {}) {
  if (!Ble) throw new Error('Modul BLE tidak tersedia di build ini.');
  const manager = getBleManager();
  const state = await manager.state();
  if (String(state) !== 'PoweredOn') throw new Error('Bluetooth mati. Nyalakan Bluetooth dulu, lalu coba lagi.');

  try {
    let device = await manager.connectToDevice(deviceId, { timeout: 12000 });
    device = await device.discoverAllServicesAndCharacteristics();

    // Hint manual dari settings (opsional), kalau kosong → auto-detect.
    let serviceUuid = settings.printer_ble_service || '';
    let charUuid = settings.printer_ble_char || '';
    if (!serviceUuid || !charUuid) {
      const found = await findWritableCharacteristic(device);
      serviceUuid = found.service;
      charUuid = found.char;
    }

    // Negosiasi MTU (best-effort) → chunk sebesar mungkin biar cepat & utuh.
    let mtu = 23;
    try {
      const d = await manager.requestMTUForDevice(deviceId, 185);
      if (d && d.mtu) mtu = d.mtu;
    } catch (_) { /* pakai default 23 */ }
    const chunkSize = Math.max(20, Math.min(mtu - 3, 180));

    const chunks = chunkBytes(bytes, chunkSize).map(bytesToBase64);
    for (const chunk of chunks) {
      try {
        await manager.writeCharacteristicWithoutResponseForDevice(deviceId, serviceUuid, charUuid, chunk);
      } catch (_) {
        await manager.writeCharacteristicWithResponseForDevice(deviceId, serviceUuid, charUuid, chunk);
      }
      await sleep(20);
    }
  } finally {
    try { await manager.cancelDeviceConnection(deviceId); } catch (_) {}
  }
}

/** Cari characteristic yang bisa ditulis; utamakan UUID printer yang umum & write-without-response. */
async function findWritableCharacteristic(device) {
  const services = await device.services();
  let best = null;
  for (const svc of services) {
    let chars = [];
    try { chars = await svc.characteristics(); } catch (_) { continue; }
    for (const c of chars) {
      if (!c.isWritableWithoutResponse && !c.isWritableWithResponse) continue;
      const cand = { service: svc.uuid, char: c.uuid, woResp: !!c.isWritableWithoutResponse };
      // Kalau ketemu UUID printer umum → langsung pakai.
      if (BLE_COMMON_CHARS.includes(String(c.uuid).toLowerCase())) return cand;
      if (!best) best = cand;
      else if (cand.woResp && !best.woResp) best = cand; // utamakan write-without-response
    }
  }
  if (!best) {
    throw new Error('Printer ini tidak punya karakteristik BLE yang bisa ditulis. Coba mode Bluetooth Classic.');
  }
  return best;
}

// ---------------- Error → pesan ramah (Bahasa Indonesia) ----------------
function mapError(e) {
  const raw = e && e.message ? e.message : String(e || '');
  const msg = raw.toLowerCase();
  if (msg.includes('bluetooth mati') || msg.includes('powered') || msg.includes('not enabled') || msg.includes('disabled') || msg.includes('bluetoothle is powered off')) {
    return 'Bluetooth mati. Nyalakan Bluetooth dulu, lalu coba lagi.';
  }
  if (msg.includes('izin') || msg.includes('permission') || msg.includes('denied') || msg.includes('unauthorized')) {
    return 'Izin Bluetooth ditolak. Aktifkan izin Bluetooth di Pengaturan HP.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Sambungan ke printer time-out. Pastikan printer nyala & dekat, lalu coba lagi.';
  }
  if (msg.includes('not found') || msg.includes('was not found') || msg.includes('unreachable') || msg.includes('no device')) {
    return 'Printer tidak ditemukan. Pastikan printer nyala dan dalam jangkauan.';
  }
  if (msg.includes('connect') || msg.includes('gatt') || msg.includes('disconnected') || msg.includes('read failed') || msg.includes('write')) {
    return 'Gagal menyambung/menulis ke printer. Pastikan printer nyala & tidak dipakai perangkat lain.';
  }
  // Sudah informatif / Bahasa Indonesia → kembalikan apa adanya.
  return raw || 'Gagal mencetak. Coba lagi.';
}
