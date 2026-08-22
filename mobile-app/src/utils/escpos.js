/**
 * ============================================================================
 * BUILDER STRUK ESC/POS — PURE JS (aman buat OTA)
 * ============================================================================
 * Di-port dari referensi web (print-escpos-bluetooth.js) TAPI:
 *  - Transport `navigator.bluetooth` (Web-only) DIBUANG. Transport asli ada di
 *    PrinterService.js (native: Bluetooth Classic / BLE).
 *  - `TextEncoder` (UTF-8) DIGANTI `latin1Encode` (1 byte/char). Head thermal
 *    pakai tabel PC437; kalau teks dikirim UTF-8, karakter non-ASCII jadi
 *    multi-byte dan ngeprint sampah. Command byte ESC/POS semua < 0x80 → aman.
 *  - Tambah `bytesToBase64` (tanpa Buffer, karena app ga punya polyfill Buffer),
 *    `chunkBytes`, `paperToCharsPerLine`, dan mapper `receiptToPrinterData`.
 *
 * Modul ini MURNI JS (tanpa native) → boleh diubah lewat OTA update.
 */

// Byte command standar ESC/POS
export const ESC_POS = {
  INIT: '\x1B\x40',                 // Inisialisasi printer & reset buffer
  CHARSET_PC437: '\x1B\x74\x00',    // Set tabel karakter standar PC437 (ASCII)
  ALIGN_LEFT: '\x1B\x61\x00',       // Rata Kiri
  ALIGN_CENTER: '\x1B\x61\x01',     // Rata Tengah
  ALIGN_RIGHT: '\x1B\x61\x02',      // Rata Kanan
  BOLD_ON: '\x1B\x45\x01',          // Huruf Tebal Aktif
  BOLD_OFF: '\x1B\x45\x00',         // Huruf Tebal Nonaktif
  DOUBLE_HEIGHT_ON: '\x1B\x21\x10', // Huruf Tinggi Ganda (untuk nama toko)
  NORMAL_TEXT: '\x1B\x21\x00',      // Huruf Normal
  FEED_LINES: (n = 3) => '\x1B\x64' + String.fromCharCode(n), // Feed kertas n baris
  CUT_PAPER: '\x1D\x56\x41\x00',    // Auto-Cut Kertas (printer 80mm auto cutter)
};

/**
 * Format angka ke format mata uang Rupiah (contoh: Rp 25.000)
 */
export function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

/**
 * Word-wrap: pecah teks panjang jadi beberapa baris sesuai lebar kolom biar rapi.
 * Mencegah nama item panjang merusak penataan struk.
 * @returns {string[]}
 */
export function wrapText(text, maxLength = 32) {
  if (!text) return [];
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + ' ' + word).length <= maxLength) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Penataan 2 kolom presisi (kiri & kanan) — panjang string pas lebar kertas.
 * @param {string} left  Teks kiri (mis. "2 x Rp 15.000")
 * @param {string} right Teks kanan (mis. "Rp 30.000")
 * @param {number} maxLength Lebar kolom (default 32 untuk 58mm, 48 untuk 80mm)
 */
export function padLine(left, right, maxLength = 32) {
  const l = String(left || '');
  const r = String(right || '');
  const availableLeft = maxLength - r.length - 1; // minimal 1 spasi pemisah

  let formattedLeft = l;
  if (availableLeft > 0 && formattedLeft.length > availableLeft) {
    // teks kiri kepanjangan → potong aman + tanda ".."
    formattedLeft = formattedLeft.substring(0, Math.max(0, availableLeft - 2)) + '..';
  }

  const spaceCount = Math.max(1, maxLength - formattedLeft.length - r.length);
  return formattedLeft + ' '.repeat(spaceCount) + r;
}

/**
 * Encode string → Uint8Array 1 byte per char (Latin-1 / raw). Char > 0xFF
 * diganti '?' (0x3F). WAJIB dipakai (bukan TextEncoder/UTF-8) biar cocok PC437.
 */
export function latin1Encode(str) {
  const s = String(str == null ? '' : str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    out[i] = code > 0xff ? 0x3f : code;
  }
  return out;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Uint8Array → string base64 (pure JS, tanpa Buffer). Kedua lib Bluetooth
 * (classic & ble-plx) nulis raw byte lewat string base64.
 */
export function bytesToBase64(bytes) {
  let out = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < len ? B64_CHARS[b2 & 63] : '=';
  }
  return out;
}

/**
 * Pecah Uint8Array jadi potongan-potongan <= size (buat chunked write BLE/SPP).
 * @returns {Uint8Array[]}
 */
export function chunkBytes(bytes, size = 180) {
  const chunks = [];
  const step = Math.max(1, size | 0);
  for (let i = 0; i < bytes.length; i += step) {
    chunks.push(bytes.slice(i, i + step));
  }
  return chunks;
}

/**
 * Ukuran kertas → jumlah karakter per baris. 80mm = 48, selain itu 58mm = 32.
 */
export function paperToCharsPerLine(size) {
  return String(size || '').includes('80') ? 48 : 32;
}

/**
 * Rakit seluruh byte data struk ESC/POS.
 * @param {Object} data - hasil receiptToPrinterData()
 * @param {Object} [options] - { charsPerLine: 32|48, cutPaper: false, headerText }
 * @returns {Uint8Array}
 */
export function buildReceiptBytes(data = {}, options = {}) {
  const charsPerLine = options.charsPerLine || 32; // 32 untuk 58mm, 48 untuk 80mm
  const cutPaper = options.cutPaper || false;
  const headerText = options.headerText || data.headerText || '';
  const divider = '-'.repeat(charsPerLine) + '\n';
  const lines = [];

  // 1. Inisialisasi printer
  lines.push(ESC_POS.INIT);
  lines.push(ESC_POS.CHARSET_PC437);

  // 2. Header toko (rata tengah)
  lines.push(ESC_POS.ALIGN_CENTER);
  lines.push(ESC_POS.BOLD_ON);
  lines.push(`${data.storeName || 'TOKO KASIR'}\n`);
  lines.push(ESC_POS.BOLD_OFF);

  if (data.storeAddress) {
    wrapText(data.storeAddress, charsPerLine).forEach(line => lines.push(`${line}\n`));
  }
  if (data.storePhone) {
    lines.push(`Telp: ${data.storePhone}\n`);
  }
  // Header custom dari setting struk (opsional) — masih rata tengah.
  if (headerText) {
    wrapText(headerText, charsPerLine).forEach(line => lines.push(`${line}\n`));
  }

  lines.push(divider);

  // 3. Info transaksi (rata kiri)
  lines.push(ESC_POS.ALIGN_LEFT);
  lines.push(padLine(`No: ${data.receiptNumber || '-'}`, data.paymentMethod || 'TUNAI', charsPerLine) + '\n');
  lines.push(padLine(`Tgl: ${data.date || new Date().toLocaleString('id-ID')}`, '', charsPerLine) + '\n');

  if (data.cashierName) lines.push(`Kasir: ${data.cashierName}\n`);
  if (data.customerName) lines.push(`Pelanggan: ${data.customerName}\n`);
  if (data.tableNumber) lines.push(`Meja: ${data.tableNumber}\n`);
  if (data.remarks) {
    wrapText(`Catatan: ${data.remarks}`, charsPerLine).forEach(line => lines.push(`${line}\n`));
  }

  lines.push(divider);

  // 4. Daftar item
  if (Array.isArray(data.items) && data.items.length > 0) {
    data.items.forEach((item) => {
      const productName = item.name || item.productName || 'Item';
      const qty = item.quantity || item.qty || 1;
      const price = item.price || 0;
      const subtotal = item.subtotal || (qty * price);
      const discount = item.discountAmount || 0;

      // Nama produk (auto-wrap rapi kalau panjang)
      wrapText(productName, charsPerLine).forEach(line => lines.push(`${line}\n`));

      // Catatan item (kalau ada)
      if (item.notes) {
        wrapText(`  * ${item.notes}`, charsPerLine).forEach(line => lines.push(`${line}\n`));
      }

      // Qty x harga  +  subtotal item
      lines.push(padLine(`  ${qty} x ${formatRupiah(price)}`, formatRupiah(subtotal), charsPerLine) + '\n');

      // Diskon item (kalau ada)
      if (discount > 0) {
        lines.push(padLine('    (Diskon)', `-${formatRupiah(discount)}`, charsPerLine) + '\n');
      }
    });
  }

  lines.push(divider);

  // 5. Totalan & pembayaran
  lines.push(padLine('Subtotal:', formatRupiah(data.subtotal), charsPerLine) + '\n');

  if (data.discountAmount && Number(data.discountAmount) > 0) {
    lines.push(padLine('Diskon Total:', `-${formatRupiah(data.discountAmount)}`, charsPerLine) + '\n');
  }
  if (data.taxAmount && Number(data.taxAmount) > 0) {
    lines.push(padLine('Pajak:', formatRupiah(data.taxAmount), charsPerLine) + '\n');
  }

  lines.push(ESC_POS.BOLD_ON);
  lines.push(padLine('TOTAL:', formatRupiah(data.total), charsPerLine) + '\n');
  lines.push(ESC_POS.BOLD_OFF);

  if (data.paymentAmount !== undefined) {
    lines.push(padLine('Bayar:', formatRupiah(data.paymentAmount), charsPerLine) + '\n');
  }
  if (data.change !== undefined) {
    lines.push(padLine('Kembali:', formatRupiah(data.change), charsPerLine) + '\n');
  }

  lines.push(divider);

  // 6. Footer (rata tengah)
  lines.push(ESC_POS.ALIGN_CENTER);
  if (data.footerText) {
    wrapText(data.footerText, charsPerLine).forEach(line => lines.push(`${line}\n`));
  } else {
    lines.push('Terima kasih atas kunjungan Anda!\n');
  }

  // Feed 3 baris biar ga kepotong pas disobek manual
  lines.push('\n\n\n');

  // Potong kertas kalau printer support auto-cutter
  if (cutPaper) {
    lines.push(ESC_POS.CUT_PAPER);
  }

  return latin1Encode(lines.join(''));
}

/**
 * Mapper TUNGGAL: bentuk receiptData (dari PosScreen) + settings (toko/struk)
 * → bentuk `data` yang dimengerti buildReceiptBytes.
 */
export function receiptToPrinterData(receiptData = {}, settings = {}) {
  const r = receiptData || {};
  const s = settings || {};

  // "Pelanggan Umum" ga usah dicetak (default umum).
  const customerName = r.customer && r.customer !== 'Pelanggan Umum' ? r.customer : '';

  const items = Array.isArray(r.cart)
    ? r.cart.map((i) => ({
        name: i.name,
        qty: Number(i.qty) || 1,
        price: Number(i.price) || 0,
        notes: i.item_notes || '',
      }))
    : [];

  // Diskon manual + voucher digabung jadi satu "Diskon Total".
  const discountAmount = (Number(r.discount) || 0) + (Number(r.voucher) || 0);

  return {
    storeName: r.store || s.store_name || 'TOKO',
    storeAddress: s.store_address || '',
    storePhone: s.store_phone || '',
    headerText: s.receipt_header || '',
    receiptNumber: r.invoice || '-',
    date: r.date,
    cashierName: r.cashier || '',
    customerName,
    tableNumber: r.table || '',
    paymentMethod: r.paymentMethod || 'TUNAI',
    items,
    subtotal: Number(r.subtotal) || 0,
    discountAmount,
    taxAmount: Number(r.tax) || 0,
    total: Number(r.total) || 0,
    paymentAmount: Number(r.paid) || 0,
    change: Number(r.change) || 0,
    footerText: s.receipt_footer || '',
  };
}
