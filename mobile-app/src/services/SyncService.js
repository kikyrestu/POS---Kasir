import { getDB } from '../utils/database';
import api, { getBaseUrl } from '../utils/api';
import { Platform } from 'react-native';
import uuid from 'react-native-uuid';
import { pingServer } from '../utils/serverStatus';
import { hashPassword, verifyPassword } from '../utils/hash';

export const syncProducts = async () => {
  try {
    const db = getDB();

    // 1. Fetch products from API
    const response = await api.get('/products');
    const products = response.data.data || response.data;

    if (!products || !Array.isArray(products)) {
      throw new Error('Invalid product data from API');
    }

    // 2. Clear old data and insert new (async-safe for all platforms)
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM products;');

      for (const product of products) {
        await db.runAsync(
          'INSERT INTO products (id, name, price, selling_price, cost_price, sku, code, barcode, stock, stock_minimum, unit, description, category_id, image, has_variants, variants, is_unlimited, modifiers, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            product.id,
            product.name || '',
            product.price || product.selling_price || 0,
            product.selling_price || product.price || 0,
            product.cost_price || 0,
            product.sku || product.code || '',
            product.code || product.sku || '',
            product.barcode || '',
            product.stock || 0,
            product.stock_minimum || 5,
            product.unit || 'pcs',
            product.description || '',
            product.category_id || null,
            product.image || null,
            product.has_variants ? 1 : 0,
            product.variants ? JSON.stringify(product.variants) : null,
            product.is_unlimited ? 1 : 0,
            product.modifiers ? JSON.stringify(product.modifiers) : null,
            product.is_active === undefined ? 1 : (product.is_active ? 1 : 0),
          ]
        );
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to sync products:', error);
    return false;
  }
};

export const syncCategories = async () => {
  try {
    const db = getDB();
    const response = await api.get('/manage/categories'); // Using the manage/categories API we created earlier
    const categories = response.data.data || response.data;
    
    if (!categories || !Array.isArray(categories)) {
      throw new Error('Invalid category data from API');
    }

    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM categories;');
      for (const cat of categories) {
        await db.runAsync(
          'INSERT INTO categories (id, name, description, is_active) VALUES (?, ?, ?, ?)',
          [cat.id, cat.name || '', cat.description || '', cat.is_active ? 1 : 0]
        );
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to sync categories:', error);
    return false;
  }
};

export const syncCustomers = async () => {
  try {
    const db = getDB();
    const response = await api.get('/customers');
    const customers = response.data.data || response.data;

    if (!customers || !Array.isArray(customers)) {
      throw new Error('Invalid customer data from API');
    }

    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM customers;');

      for (const c of customers) {
        await db.runAsync(
          'INSERT INTO customers (id, name, phone, email, address, type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            c.id,
            c.name,
            c.phone || '',
            c.email || '',
            c.address || '',
            c.type || 'retail',
            c.is_active ? 1 : 0
          ]
        );
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to sync customers:', error);
    return false;
  }
};

export const getLocalProducts = async (searchQuery = '') => {
  const db = getDB();
  if (searchQuery) {
    return await db.getAllAsync(
      'SELECT * FROM products WHERE name LIKE ?',
      [`%${searchQuery}%`]
    );
  }
  return await db.getAllAsync('SELECT * FROM products');
};

export const getLocalCustomers = async () => {
  const db = getDB();
  return await db.getAllAsync('SELECT * FROM customers ORDER BY name ASC');
};

// Datetime LOKAL 'YYYY-MM-DD HH:MM:SS' (bukan UTC). Dipakai buat sale_date biar
// filter laporan (date(sale_date)) ga geser hari di WIB. created_at TETAP ISO
// karena hitungan shift (getShiftCashSales) banding string ISO.
const _pad2 = (n) => String(n).padStart(2, '0');
export const localDateTime = (d = new Date()) =>
  `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())} ${_pad2(d.getHours())}:${_pad2(d.getMinutes())}:${_pad2(d.getSeconds())}`;

export const saveOfflineTransaction = async (cart, total, paymentMethod = 'cash', paidAmount = 0, customerId = null, discountAmount = 0, discountPercent = 0, tax = 0, notes = '', status = 'pending_sync', meta = {}) => {
  const db = getDB();
  const transactionUuid = uuid.v4();
  const now = new Date().toISOString();     // created_at: ISO (dipakai shift math)
  const saleDate = localDateTime();         // sale_date: LOKAL (dipakai laporan)
  const isHold = status === 'hold';

  // Uang & status bayar. Non-tempo dijamin >= total dari PosScreen; tempo/bon bisa
  // kurang (bahkan 0). Hold belum jadi penjualan → paid/change/profit disimpen 0.
  const paid = Number(paidAmount) || 0;
  const change = Math.max(0, paid - total);
  let paymentStatus = 'paid';
  if (!isHold) paymentStatus = paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');

  // Invoice lokal: OFF-YYYYMMDD-HHMMSS-<4char uuid>. Prefix OFF biar kebedain dari
  // invoice server pas sync-back (Fase 5).
  const invoiceNumber = isHold
    ? null
    : `OFF-${saleDate.slice(0, 10).replace(/-/g, '')}-${saleDate.slice(11).replace(/:/g, '')}-${transactionUuid.slice(0, 4)}`;

  // Profit = SUM((harga_jual - modal) * qty) - diskon. item.price udah termasuk
  // modifier; cost_price ikut ke-spread dari product di cart (PosScreen).
  let profit = 0;
  for (const item of cart) {
    profit += (Number(item.price) - (Number(item.cost_price) || 0)) * item.qty;
  }
  if (!isHold) profit -= (Number(discountAmount) || 0);

  await db.withTransactionAsync(async () => {
    // 1. Header
    await db.runAsync(
      'INSERT INTO offline_transactions (uuid, invoice_number, total_amount, paid, change_amount, profit, payment_method, payment_status, customer_id, order_type, table_id, voucher_id, discount_amount, discount_percent, tax, notes, status, voided, sale_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
      [transactionUuid, invoiceNumber, total, isHold ? 0 : paid, isHold ? 0 : change, isHold ? 0 : profit, paymentMethod, paymentStatus, customerId, meta.order_type || 'dine_in', meta.table_id || null, meta.voucher_id || null, discountAmount, discountPercent, tax, notes, status, saleDate, now]
    );

    // 2. Items (+ cost_price buat laporan laba)
    for (const item of cart) {
      const pid = item.product_id || item.id;
      await db.runAsync(
        'INSERT INTO offline_transaction_items (transaction_uuid, product_id, variant_id, variant_name, qty, price, cost_price, modifiers, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [transactionUuid, pid, item.variant_id || null, item.variant_name || null, item.qty, item.price, Number(item.cost_price) || 0, item.modifiers ? JSON.stringify(item.modifiers) : null, item.item_notes || '']
      );

      // 3. Potong stok + catat pergerakan. Skip kalau HOLD (belum jadi penjualan)
      //    atau produk is_unlimited (stok ga dihitung, mis. menu cafe).
      if (!isHold) {
        const prod = await db.getAllAsync('SELECT stock, is_unlimited FROM products WHERE id = ?', [pid]);
        const p = prod[0];
        if (p && !p.is_unlimited) {
          const before = Number(p.stock) || 0;
          const after = before - item.qty;
          await db.runAsync('UPDATE products SET stock = ? WHERE id = ?', [after, pid]);
          await db.runAsync(
            'INSERT INTO stock_movements (product_id, variant_id, type, qty, stock_before, stock_after, note, ref_uuid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [pid, item.variant_id || null, 'sale', item.qty, before, after, 'Penjualan ' + (invoiceNumber || ''), transactionUuid, now]
          );
        }
      }
    }
  });

  return transactionUuid;
};

// ==================== RIWAYAT & LAPORAN (baca lokal, bentuk = server) ====================
// Semua helper di bawah baca dari SQLite lokal dan balikin objek yang BENTUKNYA
// sama kaya respons server lama, jadi layar (SalesScreen/Report/Dashboard) ga perlu
// tau datanya offline. Penjualan valid = voided=0 AND status!='hold'. Rentang tanggal
// difilter pake date(COALESCE(sale_date, created_at)) biar row lama (cuma punya
// created_at) tetep kebaca.

// Dipakai SalesScreen (list + filter) & ReportSalesScreen (rentang tanggal).
// filters: { search, payment_status, date_from, date_to }
export const getLocalSales = async (filters = {}) => {
  const db = getDB();
  const { search = '', payment_status = '', date_from = null, date_to = null } = filters;
  const where = ['t.voided = 0', "t.status != 'hold'"];
  const params = [];
  if (search) {
    where.push('(t.invoice_number LIKE ? OR c.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (payment_status) { where.push('t.payment_status = ?'); params.push(payment_status); }
  if (date_from) { where.push('date(COALESCE(t.sale_date, t.created_at)) >= date(?)'); params.push(date_from); }
  if (date_to) { where.push('date(COALESCE(t.sale_date, t.created_at)) <= date(?)'); params.push(date_to); }
  const whereSql = where.join(' AND ');

  const rows = await db.getAllAsync(
    `SELECT t.uuid, t.invoice_number, t.total_amount, t.profit, t.payment_status,
            COALESCE(t.sale_date, t.created_at) as sale_date, c.name as customer_name
     FROM offline_transactions t
     LEFT JOIN customers c ON t.customer_id = c.id
     WHERE ${whereSql}
     ORDER BY COALESCE(t.sale_date, t.created_at) DESC
     LIMIT 50`,
    params
  );
  const sales = rows.map((r) => ({
    id: r.uuid,
    invoice_number: r.invoice_number || '-',
    sale_date: r.sale_date,
    status: 'completed',
    payment_status: r.payment_status || 'paid',
    customer: r.customer_name ? { name: r.customer_name } : null,
    user: null,
    total: r.total_amount,
    profit: r.profit || 0,
  }));

  // Totals dihitung dari SEMUA yang lolos filter (tanpa LIMIT 50).
  const tot = await db.getAllAsync(
    `SELECT COUNT(*) as c, COALESCE(SUM(t.total_amount),0) as s, COALESCE(SUM(t.profit),0) as p
     FROM offline_transactions t
     LEFT JOIN customers c ON t.customer_id = c.id
     WHERE ${whereSql}`,
    params
  );
  const totals = {
    total_transactions: tot[0]?.c || 0,
    total_sales: tot[0]?.s || 0,
    total_profit: tot[0]?.p || 0,
  };
  return { sales, totals };
};

// Detail 1 transaksi buat modal struk SalesScreen. id yang masuk = uuid.
export const getLocalSaleDetail = async (saleUuid) => {
  const db = getDB();
  const rows = await db.getAllAsync(
    `SELECT t.*, c.name as customer_name
     FROM offline_transactions t
     LEFT JOIN customers c ON t.customer_id = c.id
     WHERE t.uuid = ?`,
    [saleUuid]
  );
  if (rows.length === 0) return null;
  const t = rows[0];
  const items = await db.getAllAsync(
    `SELECT i.qty, i.price, i.variant_name, p.name as product_name
     FROM offline_transaction_items i
     LEFT JOIN products p ON i.product_id = p.id
     WHERE i.transaction_uuid = ?`,
    [saleUuid]
  );
  return {
    id: t.uuid,
    invoice_number: t.invoice_number || '-',
    sale_date: t.sale_date || t.created_at,
    status: t.voided ? 'cancelled' : 'completed',
    user: null,
    customer: t.customer_name ? { name: t.customer_name } : null,
    total: t.total_amount,
    paid: t.paid || 0,
    change_amount: t.change_amount || 0,
    details: items.map((it) => ({
      product: { name: it.variant_name ? `${it.product_name || 'Item'} (${it.variant_name})` : (it.product_name || 'Item') },
      quantity: it.qty,
      unit_price: it.price,
      subtotal: (Number(it.price) || 0) * it.qty,
    })),
  };
};

// Laporan laba/rugi per produk (ReportItemsScreen).
export const getLocalSalesByItem = async (date_from = null, date_to = null) => {
  const db = getDB();
  const where = ['t.voided = 0', "t.status != 'hold'"];
  const params = [];
  if (date_from) { where.push('date(COALESCE(t.sale_date, t.created_at)) >= date(?)'); params.push(date_from); }
  if (date_to) { where.push('date(COALESCE(t.sale_date, t.created_at)) <= date(?)'); params.push(date_to); }
  const rows = await db.getAllAsync(
    `SELECT i.product_id,
            SUM(i.qty) as total_qty,
            SUM(i.price * i.qty) as total_sales,
            SUM((i.price - i.cost_price) * i.qty) as total_profit,
            p.name as product_name, p.code as product_code, p.barcode as product_barcode
     FROM offline_transaction_items i
     JOIN offline_transactions t ON i.transaction_uuid = t.uuid
     LEFT JOIN products p ON i.product_id = p.id
     WHERE ${where.join(' AND ')}
     GROUP BY i.product_id
     ORDER BY total_qty DESC`,
    params
  );
  const items = rows.map((r) => ({
    product_id: r.product_id,
    product: { name: r.product_name || 'Produk Dihapus', code: r.product_code, barcode: r.product_barcode },
    total_qty: r.total_qty || 0,
    total_sales: r.total_sales || 0,
    total_profit: r.total_profit || 0,
  }));
  return { items };
};

// Dashboard offline: rakit stats + grafik + semua list persis bentuk endpoint
// /dashboard lama. period: today | 7days | this_month | last_month | this_year.
export const getLocalDashboard = async (period = 'this_month') => {
  const db = getDB();
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let start, end, prevStart, prevEnd, graphMode; // graphMode: 'daily' | 'monthly'

  if (period === 'today') {
    start = new Date(today); end = new Date(today);
    prevStart = new Date(today); prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(prevStart); graphMode = 'daily';
  } else if (period === '7days') {
    start = new Date(today); start.setDate(start.getDate() - 6); end = new Date(today);
    prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 6); graphMode = 'daily';
  } else if (period === 'last_month') {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
    prevStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0); graphMode = 'daily';
  } else if (period === 'this_year') {
    start = new Date(today.getFullYear(), 0, 1);
    end = new Date(today.getFullYear(), 11, 31);
    prevStart = new Date(today.getFullYear() - 1, 0, 1);
    prevEnd = new Date(today.getFullYear() - 1, 11, 31); graphMode = 'monthly';
  } else { // this_month (default)
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    prevEnd = new Date(today.getFullYear(), today.getMonth(), 0); graphMode = 'daily';
  }

  const df = ymd(start), dt = ymd(end), pdf = ymd(prevStart), pdt = ymd(prevEnd);
  const OK = "voided = 0 AND status != 'hold'";
  const SD = 'date(COALESCE(sale_date, created_at))';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Ringkasan periode (buat stats + % perubahan vs periode sebelumnya)
  const summ = async (from, to) => {
    const r = await db.getAllAsync(
      `SELECT COUNT(*) as trx, COALESCE(SUM(total_amount),0) as sales, COALESCE(SUM(profit),0) as profit
       FROM offline_transactions WHERE ${OK} AND ${SD} BETWEEN date(?) AND date(?)`, [from, to]);
    const q = await db.getAllAsync(
      `SELECT COALESCE(SUM(i.qty),0) as qty FROM offline_transaction_items i
       JOIN offline_transactions t ON i.transaction_uuid = t.uuid
       WHERE t.voided = 0 AND t.status != 'hold' AND date(COALESCE(t.sale_date, t.created_at)) BETWEEN date(?) AND date(?)`, [from, to]);
    return { trx: r[0].trx, sales: r[0].sales, profit: r[0].profit, qty: q[0].qty };
  };
  const cur = await summ(df, dt);
  const prev = await summ(pdf, pdt);
  const pct = (c, p) => (p > 0 ? Math.round(((c - p) / p) * 1000) / 10 : (c > 0 ? 100 : 0));
  const custActive = await db.getAllAsync('SELECT COUNT(*) as c FROM customers WHERE is_active = 1');

  const stats = [
    { title: 'Total Item Terjual', value: cur.qty, type: 'number', change: pct(cur.qty, prev.qty) },
    { title: 'Total Transaksi', value: cur.trx, type: 'number', change: pct(cur.trx, prev.trx) },
    { title: 'Total Pendapatan', value: cur.sales, type: 'currency', change: pct(cur.sales, prev.sales) },
    { title: 'Total Pelanggan Aktif', value: custActive[0]?.c || 0, type: 'number', change: 0 },
  ];

  // Grafik penjualan
  let salesGraph = [];
  if (graphMode === 'daily') {
    const g = await db.getAllAsync(
      `SELECT ${SD} as d, COALESCE(SUM(total_amount),0) as total
       FROM offline_transactions WHERE ${OK} AND ${SD} BETWEEN date(?) AND date(?) GROUP BY d`, [df, dt]);
    const map = {}; g.forEach((r) => { map[r.d] = r.total; });
    const single = df === dt;
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = ymd(cursor);
      salesGraph.push({ label: single ? 'Hari Ini' : `${cursor.getDate()} ${MON[cursor.getMonth()]}`, total: map[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const g = await db.getAllAsync(
      `SELECT CAST(strftime('%m', COALESCE(sale_date, created_at)) AS INTEGER) as m, COALESCE(SUM(total_amount),0) as total
       FROM offline_transactions WHERE ${OK} AND ${SD} BETWEEN date(?) AND date(?) GROUP BY m`, [df, dt]);
    const map = {}; g.forEach((r) => { map[r.m] = r.total; });
    for (let i = 1; i <= 12; i++) salesGraph.push({ label: MON[i - 1], total: map[i] || 0 });
  }

  // Agregasi item dalam periode (produk & kategori)
  const itemWhere = `t.voided = 0 AND t.status != 'hold' AND date(COALESCE(t.sale_date, t.created_at)) BETWEEN date(?) AND date(?)`;
  const mostSold = await db.getAllAsync(
    `SELECT p.name as name, SUM(i.qty) as value
     FROM offline_transaction_items i JOIN offline_transactions t ON i.transaction_uuid = t.uuid
     LEFT JOIN products p ON i.product_id = p.id
     WHERE ${itemWhere} GROUP BY i.product_id ORDER BY value DESC LIMIT 5`, [df, dt]);
  const mostSoldPie = mostSold.map((r) => ({ name: r.name || 'N/A', value: Math.round(r.value || 0) }));

  const topSell = await db.getAllAsync(
    `SELECT p.name as name, SUM(i.qty) as total_qty, SUM(i.price * i.qty) as total_sales
     FROM offline_transaction_items i JOIN offline_transactions t ON i.transaction_uuid = t.uuid
     LEFT JOIN products p ON i.product_id = p.id
     WHERE ${itemWhere} GROUP BY i.product_id ORDER BY total_sales DESC LIMIT 5`, [df, dt]);
  const topSellingProducts = { data: topSell.map((r) => ({ product: { name: r.name || 'N/A' }, total_qty: r.total_qty || 0, total_sales: r.total_sales || 0 })) };

  const catWhere = `t.voided = 0 AND t.status != 'hold' AND date(COALESCE(t.sale_date, t.created_at)) BETWEEN date(?) AND date(?)`;
  const topCatQty = await db.getAllAsync(
    `SELECT COALESCE(cat.name,'Tanpa Kategori') as name, SUM(i.qty) as value
     FROM offline_transaction_items i JOIN offline_transactions t ON i.transaction_uuid = t.uuid
     LEFT JOIN products p ON i.product_id = p.id LEFT JOIN categories cat ON p.category_id = cat.id
     WHERE ${catWhere} GROUP BY p.category_id ORDER BY value DESC LIMIT 5`, [df, dt]);
  const topCategories = topCatQty.map((r) => ({ name: r.name, value: Math.round(r.value || 0) }));

  const topCatSales = await db.getAllAsync(
    `SELECT COALESCE(cat.name,'Tanpa Kategori') as name, SUM(i.price * i.qty) as value
     FROM offline_transaction_items i JOIN offline_transactions t ON i.transaction_uuid = t.uuid
     LEFT JOIN products p ON i.product_id = p.id LEFT JOIN categories cat ON p.category_id = cat.id
     WHERE ${catWhere} GROUP BY p.category_id ORDER BY value DESC LIMIT 5`, [df, dt]);
  const topCategorySales = topCatSales.map((r) => ({ name: r.name, value: r.value || 0 }));

  const topCust = await db.getAllAsync(
    `SELECT c.name as name, SUM(t.total_amount) as total
     FROM offline_transactions t JOIN customers c ON t.customer_id = c.id
     WHERE t.voided = 0 AND t.status != 'hold' AND date(COALESCE(t.sale_date, t.created_at)) BETWEEN date(?) AND date(?)
     GROUP BY t.customer_id ORDER BY total DESC LIMIT 5`, [df, dt]);
  const topCustomers = topCust.map((r) => ({ name: r.name, total: r.total || 0 }));

  // Piutang (tak terbatas periode — utang ya utang)
  const topRecv = await db.getAllAsync(
    `SELECT COALESCE(c.name,'Umum') as name, SUM(t.total_amount - t.paid) as total
     FROM offline_transactions t LEFT JOIN customers c ON t.customer_id = c.id
     WHERE t.voided = 0 AND t.status != 'hold' AND t.payment_status IN ('unpaid','partial')
     GROUP BY t.customer_id ORDER BY total DESC LIMIT 5`);
  const topReceivables = topRecv.filter((r) => (r.total || 0) > 0).map((r) => ({ name: r.name, total: r.total || 0 }));

  const overdue = await db.getAllAsync(
    `SELECT t.uuid as id, COALESCE(c.name,'Umum') as customer, COALESCE(t.sale_date, t.created_at) as date,
            (t.total_amount - t.paid) as remaining
     FROM offline_transactions t LEFT JOIN customers c ON t.customer_id = c.id
     WHERE t.voided = 0 AND t.status != 'hold' AND t.payment_status IN ('unpaid','partial')
       AND date(COALESCE(t.sale_date, t.created_at)) <= date('now','-30 days')
     ORDER BY date ASC LIMIT 10`);
  const overdueSales = { data: overdue.map((r) => ({ id: r.id, customer: r.customer, date: r.date, remaining: r.remaining || 0 })) };

  const latest = await db.getAllAsync('SELECT id, name, selling_price FROM products WHERE is_active = 1 ORDER BY created_at DESC, id DESC LIMIT 5');
  const latestProducts = latest.map((r) => ({ id: r.id, name: r.name, selling_price: r.selling_price || 0 }));

  const recent = await db.getAllAsync(
    `SELECT t.uuid as id, COALESCE(c.name,'Umum') as customer, COALESCE(t.sale_date, t.created_at) as date,
            t.total_amount as total, t.payment_status as status
     FROM offline_transactions t LEFT JOIN customers c ON t.customer_id = c.id
     WHERE t.voided = 0 AND t.status != 'hold'
     ORDER BY COALESCE(t.sale_date, t.created_at) DESC LIMIT 5`);
  const recentSales = { data: recent.map((r) => ({ id: r.id, customer: r.customer, date: r.date, total: r.total || 0, status: r.status === 'paid' ? 'paid' : 'unpaid' })) };

  // Stok (lintas periode — kondisi stok saat ini)
  const low = await db.getAllAsync(
    `SELECT p.id, p.name, p.stock as actual_stock, p.stock_minimum, COALESCE(cat.name,'Tanpa Kategori') as category
     FROM products p LEFT JOIN categories cat ON p.category_id = cat.id
     WHERE p.is_active = 1 AND p.is_unlimited = 0 AND p.stock < p.stock_minimum
     ORDER BY p.stock ASC LIMIT 20`);
  const lowStockAlerts = low.map((r) => ({ id: r.id, name: r.name, category: r.category, actual_stock: r.actual_stock || 0, stock_minimum: r.stock_minimum || 0 }));

  const sc = await db.getAllAsync(
    `SELECT SUM(CASE WHEN is_active = 1 AND is_unlimited = 0 AND stock < stock_minimum THEN 1 ELSE 0 END) as below,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as total FROM products`);
  const belowN = sc[0]?.below || 0; const totalN = sc[0]?.total || 0;
  const stockComposition = { below: belowN, above: Math.max(0, totalN - belowN) };

  return {
    stats, salesGraph, mostSoldPie, topCategories, topCategorySales,
    stockComposition, topReceivables, overdueSales, topSellingProducts,
    topCustomers, latestProducts, recentSales, lowStockAlerts, expiryAlerts: [],
  };
};

// Batalin penjualan (SalesScreen hapus). Server versi lama hard-delete + balikin
// stok; di sini kita tandain voided=1 (biar bisa disetor ke server nanti) lalu
// balikin stok + catat pergerakan 'void'. Row voided otomatis ilang dari semua
// list/laporan karena predikat voided=0.
export const voidLocalSale = async (saleUuid) => {
  const db = getDB();
  const rows = await db.getAllAsync('SELECT * FROM offline_transactions WHERE uuid = ?', [saleUuid]);
  if (rows.length === 0) return false;
  const t = rows[0];
  if (t.voided) return true; // udah dibatalin
  const items = await db.getAllAsync('SELECT * FROM offline_transaction_items WHERE transaction_uuid = ?', [saleUuid]);
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE offline_transactions SET voided = 1 WHERE uuid = ?', [saleUuid]);
    for (const it of items) {
      const prod = await db.getAllAsync('SELECT stock, is_unlimited FROM products WHERE id = ?', [it.product_id]);
      const p = prod[0];
      if (p && !p.is_unlimited) {
        const before = Number(p.stock) || 0;
        const after = before + it.qty;
        await db.runAsync('UPDATE products SET stock = ? WHERE id = ?', [after, it.product_id]);
        await db.runAsync(
          'INSERT INTO stock_movements (product_id, variant_id, type, qty, stock_before, stock_after, note, ref_uuid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [it.product_id, it.variant_id || null, 'void', it.qty, before, after, 'Pembatalan ' + (t.invoice_number || ''), saleUuid, now]
        );
      }
    }
  });
  // Setor pembatalan ke server pas idup (Fase 5). Kalau tx-nya belum pernah kesync
  // (masih pending_sync/hold), ga usah repot: sekalian batal push-nya nanti.
  await enqueueOutbox('sale_void', 'void', saleUuid, { uuid: saleUuid, invoice_number: t.invoice_number });
  return true;
};

export const getHoldTransactions = async () => {
  const db = getDB();
  return await db.getAllAsync('SELECT * FROM offline_transactions WHERE status = "hold" ORDER BY created_at DESC');
};

export const getLocalCategories = async () => {
  const db = getDB();
  return await db.getAllAsync('SELECT * FROM categories');
};

export const getTransactionItems = async (uuid) => {
  const db = getDB();
  return await db.getAllAsync(
    'SELECT t.product_id as id, t.variant_id, t.variant_name, t.qty, t.price, t.modifiers, t.notes, p.name, p.is_unlimited, p.stock FROM offline_transaction_items t LEFT JOIN products p ON t.product_id = p.id WHERE t.transaction_uuid = ?',
    [uuid]
  );
};

export const deleteHoldTransaction = async (uuid) => {
  const db = getDB();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM offline_transaction_items WHERE transaction_uuid = ?', [uuid]);
    await db.runAsync('DELETE FROM offline_transactions WHERE uuid = ?', [uuid]);
  });
};

// ==================== SHIFT (local, offline-first) ====================

export const getActiveShift = async () => {
  const db = getDB();
  const rows = await db.getAllAsync(
    "SELECT * FROM shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1"
  );
  return rows.length > 0 ? rows[0] : null;
};

export const openShift = async (startingCash = 0, cashierName = 'Kasir') => {
  const db = getDB();
  const shiftUuid = uuid.v4();
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO shifts (uuid, cashier_name, starting_cash, status, opened_at) VALUES (?, ?, ?, 'open', ?)",
    [shiftUuid, cashierName, parseFloat(startingCash) || 0, now]
  );
  return await getActiveShift();
};

// Sum of CASH sales since the shift opened (excludes holds; counts pending & synced).
export const getShiftCashSales = async (openedAt) => {
  const db = getDB();
  const rows = await db.getAllAsync(
    "SELECT COALESCE(SUM(total_amount), 0) as total FROM offline_transactions WHERE payment_method = 'cash' AND status != 'hold' AND created_at >= ?",
    [openedAt]
  );
  return rows.length > 0 ? (rows[0].total || 0) : 0;
};

export const closeShift = async (shiftUuid, { expected = 0, actual = 0, selisih = 0, notes = '' } = {}) => {
  const db = getDB();
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE shifts SET expected_cash = ?, actual_cash = ?, selisih = ?, notes = ?, status = 'closed', closed_at = ? WHERE uuid = ?",
    [expected, actual, selisih, notes || '', now, shiftUuid]
  );
  return true;
};

// ==================== OFFLINE SEED (server-down fallback) ====================
// Fills the local catalog with a realistic cafe menu so the POS is fully usable
// with NO server. Idempotent: only runs when the products table is empty, so a
// real sync from the server later (which does DELETE + re-insert) is never clobbered.
export const seedOfflineData = async () => {
  const db = getDB();
  const existing = await db.getAllAsync('SELECT COUNT(*) as c FROM products');
  if ((existing[0]?.c || 0) > 0) return { seeded: false, reason: 'catalog_not_empty' };

  const categories = [
    { id: 1, name: 'Kopi' },
    { id: 2, name: 'Non-Kopi' },
    { id: 3, name: 'Makanan' },
    { id: 4, name: 'Snack' },
  ];

  // Shared modifier templates. Option ids only need to be unique within a product,
  // and the cart id is prefixed by product.id, so reuse across products is safe.
  const gula = { id: 501, name: 'Level Gula', type: 'single', is_required: true, options: [
    { id: 5011, name: 'Normal', price: 0 }, { id: 5012, name: 'Sedikit', price: 0 }, { id: 5013, name: 'Tanpa Gula', price: 0 },
  ]};
  const extra = { id: 502, name: 'Tambahan', type: 'multiple', is_required: false, options: [
    { id: 5021, name: 'Extra Shot Espresso', price: 6000 }, { id: 5022, name: 'Extra Susu', price: 4000 },
  ]};
  const pedas = { id: 503, name: 'Level Pedas', type: 'single', is_required: true, options: [
    { id: 5031, name: 'Tidak Pedas', price: 0 }, { id: 5032, name: 'Normal', price: 0 }, { id: 5033, name: 'Pedas', price: 0 }, { id: 5034, name: 'Extra Pedas', price: 0 },
  ]};
  const topping = { id: 504, name: 'Topping', type: 'multiple', is_required: false, options: [
    { id: 5041, name: 'Telur', price: 5000 }, { id: 5042, name: 'Sosis', price: 7000 }, { id: 5043, name: 'Keju', price: 5000 },
  ]};
  const saus = { id: 505, name: 'Saus', type: 'multiple', is_required: false, options: [
    { id: 5051, name: 'Mayo', price: 0 }, { id: 5052, name: 'Saus Sambal', price: 0 }, { id: 5053, name: 'Saus BBQ', price: 3000 },
  ]};

  // Build a product-scoped variant id so cart ids never collide across products.
  const vr = (pid, n, name, price) => ({ id: pid * 100 + n, name, price });

  const products = [
    // --- Kopi (1) ---
    { id: 1, name: 'Espresso', price: 18000, category_id: 1 },
    { id: 2, name: 'Es Kopi Susu Gula Aren', price: 22000, category_id: 1,
      variants: [vr(2,1,'Regular',22000), vr(2,2,'Large',27000)], modifiers: [gula] },
    { id: 3, name: 'Cappuccino', price: 28000, category_id: 1,
      variants: [vr(3,1,'Panas',28000), vr(3,2,'Dingin',30000)], modifiers: [extra] },
    { id: 4, name: 'Caffe Latte', price: 30000, category_id: 1,
      variants: [vr(4,1,'Panas',30000), vr(4,2,'Dingin',32000)], modifiers: [extra] },
    { id: 5, name: 'Americano', price: 20000, category_id: 1,
      variants: [vr(5,1,'Panas',20000), vr(5,2,'Dingin',22000)] },
    // --- Non-Kopi (2) ---
    { id: 6, name: 'Matcha Latte', price: 30000, category_id: 2,
      variants: [vr(6,1,'Panas',30000), vr(6,2,'Dingin',32000)] },
    { id: 7, name: 'Cokelat', price: 26000, category_id: 2,
      variants: [vr(7,1,'Panas',26000), vr(7,2,'Dingin',28000)] },
    { id: 8, name: 'Teh Tarik', price: 18000, category_id: 2 },
    { id: 9, name: 'Lemon Tea', price: 18000, category_id: 2,
      variants: [vr(9,1,'Panas',18000), vr(9,2,'Dingin',20000)] },
    // --- Makanan (3) ---
    { id: 10, name: 'Nasi Goreng Spesial', price: 27000, category_id: 3, modifiers: [pedas, topping] },
    { id: 11, name: 'Mie Goreng', price: 25000, category_id: 3, modifiers: [pedas, topping] },
    { id: 12, name: 'French Fries', price: 20000, category_id: 3, modifiers: [saus] },
    { id: 13, name: 'Roti Bakar', price: 18000, category_id: 3,
      variants: [vr(13,1,'Cokelat',18000), vr(13,2,'Keju',20000), vr(13,3,'Cokelat Keju',22000)] },
    // --- Snack (4) ---
    { id: 14, name: 'Pisang Goreng Keju', price: 17000, category_id: 4 },
    { id: 15, name: 'Dimsum Ayam', price: 23000, category_id: 4 },
  ];

  await db.withTransactionAsync(async () => {
    for (const c of categories) {
      await db.runAsync('INSERT OR REPLACE INTO categories (id, name, description, is_active) VALUES (?, ?, ?, 1)', [c.id, c.name, '']);
    }
    // Meja 1-8 for dine-in.
    for (let i = 1; i <= 8; i++) {
      await db.runAsync('INSERT OR REPLACE INTO tables (id, name, capacity, status, is_active) VALUES (?, ?, ?, ?, 1)', [i, String(i), 4, 'available']);
    }
    // Metode bayar default biar POS bisa checkout tanpa server sama sekali.
    const seedPMs = ['Tunai', 'QRIS', 'Kartu Debit', 'Transfer Bank'];
    for (let i = 0; i < seedPMs.length; i++) {
      await db.runAsync('INSERT OR REPLACE INTO payment_methods (id, name, is_active) VALUES (?, ?, 1)', [i + 1, seedPMs[i]]);
    }
    for (const p of products) {
      await db.runAsync(
        'INSERT OR REPLACE INTO products (id, name, price, selling_price, cost_price, sku, code, barcode, stock, stock_minimum, unit, description, category_id, image, has_variants, variants, is_unlimited, modifiers, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
        [p.id, p.name, p.price, p.price, Math.round(p.price * 0.6), '', '', '', 0, 5, 'pcs', '', p.category_id, null, p.variants ? 1 : 0, p.variants ? JSON.stringify(p.variants) : null, 1, p.modifiers ? JSON.stringify(p.modifiers) : null]
      );
    }
  });

  return { seeded: true, products: products.length, categories: categories.length, tables: 8, paymentMethods: 4 };
};

export const getUnsyncedTransactions = async () => {
  const db = getDB();
  const txs = await db.getAllAsync('SELECT * FROM offline_transactions WHERE status = "pending_sync" ORDER BY created_at DESC');
  return txs;
};

export const pushOfflineTransactions = async () => {
  const db = getDB();
  
  // Get all pending transactions
  const txs = await getUnsyncedTransactions();
  if (txs.length === 0) return true;

  // Build payload
    const payloadTransactions = [];
    for (const tx of txs) {
      const itemsRaw = await db.getAllAsync(
        'SELECT product_id as id, variant_id, variant_name, qty, price, modifiers, notes FROM offline_transaction_items WHERE transaction_uuid = ?',
        [tx.uuid]
      );

      const items = itemsRaw.map(item => ({
        ...item,
        modifiers: item.modifiers ? JSON.parse(item.modifiers) : []
      }));

      payloadTransactions.push({
        local_id: tx.uuid,
        total: tx.total_amount,
        paid: tx.paid, // nominal bayar asli (Fase 1 udah nyimpen paid beneran)
        customer_id: tx.customer_id,
        order_type: tx.order_type,
        table_id: tx.table_id,
        voucher_id: tx.voucher_id,
        discount_amount: tx.discount_amount,
        discount_percent: tx.discount_percent,
        tax: tx.tax,
        notes: tx.notes,
        payment_type: tx.payment_method,
        created_at: tx.created_at,
        items: items
      });
    }

  try {
    const response = await api.post('/sync/push', { transactions: payloadTransactions });
    
    // Update synced transactions
    const syncedIds = response.data.data?.synced_ids || [];
    if (syncedIds.length > 0) {
      await db.withTransactionAsync(async () => {
        for (const uuid of syncedIds) {
          await db.runAsync('UPDATE offline_transactions SET status = "synced" WHERE uuid = ?', [uuid]);
        }
      });
    }

    return { success: true, count: syncedIds.length };
  } catch (error) {
    console.error('Failed to push transactions:', error);
    return { success: false, error: error.message };
  }
};

export const syncSuppliers = async () => {
  try {
    const db = getDB();
    const response = await api.get('/manage/suppliers');
    const suppliers = response.data.data || response.data;

    if (!suppliers || !Array.isArray(suppliers)) return false;

    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM suppliers;');
      for (const s of suppliers) {
        await db.runAsync(
          'INSERT INTO suppliers (id, name, company, email, phone, address, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            s.id,
            s.name,
            s.company || '',
            s.email || '',
            s.phone || '',
            s.address || '',
            s.is_active ? 1 : 0
          ]
        );
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to sync suppliers:', error);
    return false;
  }
};

export const getLocalSuppliers = async () => {
  try {
    const db = getDB();
    const results = await db.getAllAsync('SELECT * FROM suppliers ORDER BY name ASC');
    return results;
  } catch (err) {
    console.error('Failed to get local suppliers:', err);
    return [];
  }
};

export const syncTables = async () => {
  try {
    const db = getDB();
    const response = await api.get('/tables');
    const tables = response.data.data || response.data;
    
    if (!tables || !Array.isArray(tables)) return false;

    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM tables;');
      for (const t of tables) {
        await db.runAsync(
          'INSERT INTO tables (id, name, capacity, status, is_active) VALUES (?, ?, ?, ?, ?)',
          [t.id, t.name || '', t.capacity || 4, t.status || 'available', t.is_active ? 1 : 0]
        );
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to sync tables:', error);
    return false;
  }
};

export const syncVouchers = async () => {
  try {
    const db = getDB();
    const response = await api.get('/vouchers');
    const vouchers = response.data.data || response.data;
    
    if (!vouchers || !Array.isArray(vouchers)) return false;

    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM vouchers;');
      for (const v of vouchers) {
        await db.runAsync(
          'INSERT INTO vouchers (id, code, name, type, amount, min_purchase, max_discount, is_active, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [v.id, v.code || '', v.name || '', v.type || 'amount', v.amount || 0, v.min_purchase || 0, v.max_discount || null, v.is_active ? 1 : 0, v.valid_until || null]
        );
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to sync vouchers:', error);
    return false;
  }
};

export const getLocalTables = async () => {
  const db = getDB();
  return await db.getAllAsync('SELECT * FROM tables WHERE is_active = 1');
};

export const getLocalVouchers = async () => {
  const db = getDB();
  return await db.getAllAsync('SELECT * FROM vouchers WHERE is_active = 1');
};

// ==================== ID LOKAL SEMENTARA ====================
// Record yang dibuat OFFLINE belum punya id dari server. Kita kasih id NEGATIF
// (server selalu positif) biar dijamin ga nabrak, dan gampang dikenali pas sync
// buat ditukar sama id asli dari server.
export const makeLocalId = () => -(Date.now() * 1000 + Math.floor(Math.random() * 1000));

// ==================== OUTBOX (antrian perubahan offline) ====================
// Tiap create/update/delete master-data yang dilakukan offline dicatat di sini
// biar ga ilang. Proses SETOR ke server (drainOutbox) diaktifin di Fase 5 pas
// server idup. entity: product|category|customer|supplier|user|setting|
// payment_method|stock_adjust|sale_void. op: create|update|delete|adjust|void.
export const enqueueOutbox = async (entity, op, localRef, payload) => {
  const db = getDB();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO outbox (entity, op, local_ref, payload_json, status, tries, created_at) VALUES (?, ?, ?, ?, "pending", 0, ?)',
    [entity, op, localRef != null ? String(localRef) : null, payload ? JSON.stringify(payload) : null, now]
  );
};

export const getOutboxPending = async () => {
  const db = getDB();
  return await db.getAllAsync('SELECT * FROM outbox WHERE status = "pending" ORDER BY created_at ASC');
};

export const getOutboxCount = async () => {
  const db = getDB();
  const rows = await db.getAllAsync('SELECT COUNT(*) as c FROM outbox WHERE status = "pending"');
  return rows[0]?.c || 0;
};

export const markOutboxSynced = async (id) => {
  const db = getDB();
  await db.runAsync('UPDATE outbox SET status = "synced" WHERE id = ?', [id]);
};

export const markOutboxFailed = async (id, error) => {
  const db = getDB();
  await db.runAsync('UPDATE outbox SET tries = tries + 1, last_error = ? WHERE id = ?', [String(error || ''), id]);
};

// ==================== DRAIN OUTBOX (setor antrian ke server) — Fase 5 ====================
// Setor semua perubahan master-data yang kecatat offline ke server, reuse endpoint
// /manage/* & /settings/* yang udah ada (ga bikin endpoint baru). PRINSIP AMAN:
//   - Server mati? langsung balik, JANGAN error, JANGAN hapus antrian.
//   - Id lokal negatif belum ketuker id server? tunda baris itu (skip), coba lagi nanti.
//   - Delete yg 404 di server = anggap beres (emang udah ga ada).
//   - Gagal permanen (4xx) atau nyoba kebanyakan? pindah ke 'failed' (dead-letter)
//     biar ga muter selamanya — TAPI data lokal tetep aman, cuma berhenti disetor.
//   - sale_void di-SKIP: server butuh id sale yg kita ga punya offline.

// entity -> endpoint REST /manage/* & nama tabel lokal (buat reconcile id).
const OUTBOX_MAP = {
  customer: { base: '/manage/customers', table: 'customers' },
  supplier: { base: '/manage/suppliers', table: 'suppliers' },
  category: { base: '/manage/categories', table: 'categories' },
  product:  { base: '/manage/products',  table: 'products' },
  user:     { base: '/manage/users',     table: 'users' },
};

const OUTBOX_MAX_TRIES = 5; // lewat ini -> dead-letter (status 'failed'), stop nyoba

const _extractServerId = (resp) => {
  const d = resp?.data;
  return d?.data?.id ?? d?.id ?? d?.data?.data?.id ?? null;
};

// Tuker id lokal negatif (oldId) jadi id server (newId): di tabel entity-nya +
// semua baris outbox pending yang masih nunjuk id lama (lewat local_ref maupun
// yang nyempil di payload, mis. product_id di stock_adjust).
const _reconcileLocalId = async (db, entity, table, oldId, newId) => {
  if (oldId == null || newId == null || Number(oldId) >= 0) return;
  const oldS = String(oldId), newS = String(newId);
  try { await db.runAsync(`UPDATE ${table} SET id = ? WHERE id = ?`, [newId, oldId]); } catch (_) {}
  try { await db.runAsync('UPDATE outbox SET local_ref = ? WHERE local_ref = ? AND status = "pending"', [newS, oldS]); } catch (_) {}
  if (entity === 'product') {
    // id produk bisa nyempil di payload stock_adjust (product_id). Betulin biar
    // setoran stok berikutnya bawa id server, bukan id lokal negatif.
    let rows = [];
    try { rows = await db.getAllAsync('SELECT id, payload_json FROM outbox WHERE status = "pending" AND payload_json LIKE ?', [`%${oldS}%`]); } catch (_) {}
    for (const r of rows) {
      try {
        const p = JSON.parse(r.payload_json);
        if (p && Number(p.product_id) === Number(oldId)) {
          p.product_id = newId;
          await db.runAsync('UPDATE outbox SET payload_json = ? WHERE id = ?', [JSON.stringify(p), r.id]);
        }
      } catch (_) {}
    }
  }
};

// Setor 1 baris outbox. Balikin 'synced' | 'skip'. MELEMPAR kalau gagal beneran
// (biar caller yang catat error & atur retry/dead-letter).
const _drainOne = async (db, row) => {
  const { entity, op } = row;
  const ref = row.local_ref != null ? Number(row.local_ref) : null;
  let payload = {};
  try { payload = row.payload_json ? JSON.parse(row.payload_json) : {}; } catch (_) { payload = {}; }

  // sale_void butuh id sale di server yg ga kita punya offline -> tunda selamanya (aman).
  if (entity === 'sale_void') return 'skip';

  // ---- Metode pembayaran (/settings/payment-methods) ----
  if (entity === 'payment_method') {
    if (op === 'create') {
      const resp = await api.post('/settings/payment-methods', payload);
      const newId = _extractServerId(resp);
      if (newId != null) await _reconcileLocalId(db, 'payment_method', 'payment_methods', ref, newId);
      return 'synced';
    }
    if (op === 'update') { // toggle aktif/nonaktif
      if (ref == null || ref < 0) return 'skip';
      await api.post(`/settings/payment-methods/${ref}/toggle-active`);
      return 'synced';
    }
    if (op === 'delete') {
      if (ref == null) return 'skip';
      if (ref < 0) return 'synced';
      try { await api.delete(`/settings/payment-methods/${ref}`); }
      catch (e) { if (e?.response?.status !== 404) throw e; }
      return 'synced';
    }
    return 'skip';
  }

  // ---- Pengaturan toko (/settings) ----
  if (entity === 'setting') {
    await api.post('/settings', payload);
    return 'synced';
  }

  // ---- Penyesuaian stok (/manage/stocks/adjust) ----
  if (entity === 'stock_adjust') {
    if (Number(payload.product_id) < 0) return 'skip'; // produk baru belum kesetor
    await api.post('/manage/stocks/adjust', payload);
    return 'synced';
  }

  // ---- Master REST generik (customer/supplier/category/product/user) ----
  const map = OUTBOX_MAP[entity];
  if (!map) return 'skip'; // entity ga dikenal -> biarin pending
  const { base, table } = map;

  if (op === 'create') {
    const resp = await api.post(base, payload);
    const newId = _extractServerId(resp);
    if (newId != null) await _reconcileLocalId(db, entity, table, ref, newId);
    return 'synced';
  }

  if (op === 'update') {
    if (ref == null || ref < 0) return 'skip'; // create-nya belum kesetor -> tunda
    if (entity === 'user') {
      // Server toggle FLIP is_active (endpoint terpisah). Baris toggle = payload cuma
      // {id,is_active} tanpa name. Baris edit-profil = ada field lain -> PUT lengkap.
      if (payload.name === undefined && payload.is_active !== undefined) {
        await api.patch(`${base}/${ref}/toggle-active`);
        return 'synced';
      }
      // Server minta name+email+role_id lengkap -> ambil dari baris lokal (udah keupdate).
      const u = (await db.getAllAsync('SELECT name, email, role_id FROM users WHERE id = ?', [ref]))[0] || {};
      await api.put(`${base}/${ref}`, { name: u.name, email: u.email, role_id: u.role_id, ...payload });
      return 'synced';
    }
    await api.put(`${base}/${ref}`, payload);
    return 'synced';
  }

  if (op === 'delete') {
    if (ref == null) return 'skip';
    if (ref < 0) return 'synced'; // cuma pernah ada di lokal -> ga usah ke server
    try { await api.delete(`${base}/${ref}`); }
    catch (e) { if (e?.response?.status !== 404) throw e; }
    return 'synced';
  }

  return 'skip';
};

// Setor SEMUA antrian ke server. Aman dipanggil kapan aja (checkout, reconnect,
// tombol sync). TIDAK PERNAH melempar. Balikin ringkasan buat UI/log.
export const drainOutbox = async () => {
  try {
    const db = getDB();
    const pending = await getOutboxCount();
    if (pending === 0) return { drained: 0, failed: 0, skipped: 0, pending: 0, offline: false };

    // Cek server dulu (raw ping, ga lewat interceptor auth) — mati? balik diam-diam.
    const up = await pingServer();
    if (!up) return { drained: 0, failed: 0, skipped: 0, pending, offline: true };

    const rows = await db.getAllAsync('SELECT * FROM outbox WHERE status = "pending" ORDER BY created_at ASC, id ASC');
    let drained = 0, failed = 0, skipped = 0;

    for (const row of rows) {
      // Re-baca fresh: baris sebelumnya mungkin udah reconcile local_ref/payload row ini.
      let cur;
      try { cur = (await db.getAllAsync('SELECT * FROM outbox WHERE id = ?', [row.id]))[0]; } catch (_) { cur = row; }
      if (!cur || cur.status !== 'pending') continue;

      try {
        const result = await _drainOne(db, cur);
        if (result === 'synced') { await markOutboxSynced(cur.id); drained++; }
        else { skipped++; } // 'skip' -> tetep pending, coba ronde berikutnya
      } catch (e) {
        const status = e?.response?.status;
        const msg = e?.response?.data?.message || e?.message || 'unknown';
        await markOutboxFailed(cur.id, msg); // catat error + tries++
        const newTries = (cur.tries || 0) + 1;
        // Retryable: jaringan putus (no status), 5xx, atau 4xx yg emang sementara.
        const retryable = !status || status >= 500 || [401, 408, 409, 425, 429].includes(status);
        if (!retryable || newTries >= OUTBOX_MAX_TRIES) {
          await db.runAsync('UPDATE outbox SET status = "failed" WHERE id = ?', [cur.id]);
        }
        failed++;
      }
    }

    const stillPending = await getOutboxCount();
    return { drained, failed, skipped, pending: stillPending, offline: false };
  } catch (e) {
    // Apapun yg meleset, JANGAN sampai ngerusak alur pemanggil (checkout dll).
    return { drained: 0, failed: 0, skipped: 0, pending: -1, offline: false, error: e?.message };
  }
};

// ==================== PRODUK & STOK (tulis lokal + outbox) — Fase 2 ====================
// Semua CRUD produk & penyesuaian stok DITULIS ke SQLite lokal dulu (source of
// truth), lalu dicatat ke outbox biar disetor ke server pas idup (Fase 5).
// Produk baru dikasih id NEGATIF (makeLocalId) biar ga nabrak id server.

// Gambar offline ga bisa di-upload. Kalau URI lokal (file://) disimpen apa adanya;
// kalau path relatif dari server ('products/x.jpg') di-prefix /storage biar kebaca.
export const resolveProductImage = (image) => {
  if (!image) return null;
  const s = String(image);
  if (s.startsWith('file') || s.startsWith('http') || s.startsWith('content') || s.startsWith('data:')) return s;
  const base = (getBaseUrl() || '').replace(/\/api$/, '');
  return base ? `${base}/storage/${s}` : s;
};

// Baca produk BENTUK = server (buat ProductList/StockOpname/ProductForm). Nyintesis
// stocks:[{quantity}] dari kolom scalar `stock`, parse variants/modifiers JSON, join
// kategori. filters: { search, category, stock } (stock: low|empty|good).
export const getLocalProductsManage = async (filters = {}) => {
  const db = getDB();
  const { search = '', category = '', stock = '' } = filters;
  const where = [];
  const params = [];
  if (search) {
    where.push('(p.name LIKE ? OR p.barcode LIKE ? OR p.code LIKE ? OR p.sku LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  if (category) { where.push('p.category_id = ?'); params.push(category); }
  if (stock === 'empty') where.push('p.is_unlimited = 0 AND p.stock <= 0');
  else if (stock === 'low') where.push('p.is_unlimited = 0 AND p.stock > 0 AND p.stock <= p.stock_minimum');
  else if (stock === 'good') where.push('(p.is_unlimited = 1 OR p.stock > p.stock_minimum)');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await db.getAllAsync(
    `SELECT p.*, cat.name as category_name
     FROM products p LEFT JOIN categories cat ON p.category_id = cat.id
     ${whereSql}
     ORDER BY p.name ASC`,
    params
  );
  return rows.map((r) => {
    let variants = [];
    if (r.variants) { try { variants = JSON.parse(r.variants) || []; } catch (e) { variants = []; } }
    let modifiers = [];
    if (r.modifiers) { try { modifiers = JSON.parse(r.modifiers) || []; } catch (e) { modifiers = []; } }
    return {
      ...r,
      variants,
      modifiers,
      category: r.category_name ? { name: r.category_name } : null,
      // Layar warisan baca stocks[].quantity; sintesis dari scalar stock.
      stocks: [{ warehouse_id: 1, quantity: Number(r.stock) || 0 }],
    };
  });
};

// Susun nilai kolom produk dari state form (dipakai create & update).
const _productColsFromForm = (form) => {
  const hasVariants = form.has_variants ? 1 : 0;
  const isUnlimited = form.is_unlimited ? 1 : 0;
  const variantsArr = Array.isArray(form.variants) ? form.variants : [];
  // Stok scalar: unlimited=0, punya varian=jumlah stok tiap varian, selain itu stocks[0].
  let stock = 0;
  if (isUnlimited) stock = 0;
  else if (hasVariants) stock = variantsArr.reduce((s, v) => s + (parseInt(v?.stocks?.[0]?.quantity || 0) || 0), 0);
  else stock = parseInt(form.stocks?.[0]?.quantity || 0) || 0;
  const sellingPrice = parseFloat(form.selling_price) || 0;
  return {
    name: form.name || '',
    price: sellingPrice,             // price = selling_price (POS baca dua-duanya)
    selling_price: sellingPrice,
    cost_price: parseFloat(form.cost_price) || 0,
    sku: form.code || '',
    code: form.code || '',
    barcode: form.barcode || '',
    stock,
    stock_minimum: parseInt(form.stock_minimum || 5) || 5,
    unit: form.unit || 'pcs',
    description: form.description || '',
    category_id: form.category_id ? Number(form.category_id) : null,
    has_variants: hasVariants,
    variants: hasVariants && variantsArr.length ? JSON.stringify(variantsArr) : null,
    is_unlimited: isUnlimited,
    is_active: form.is_active ? 1 : 0,
    expiry_date: form.expiry_date || null,
  };
};

// Bikin produk baru OFFLINE (id negatif) + catat stok awal + antre ke outbox.
export const createLocalProduct = async (form, imageUri = null) => {
  const db = getDB();
  const id = makeLocalId();
  const now = new Date().toISOString();
  const c = _productColsFromForm(form);
  const image = imageUri || null;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO products (id, name, price, selling_price, cost_price, sku, code, barcode, stock, stock_minimum, unit, description, category_id, image, has_variants, variants, is_unlimited, modifiers, is_active, expiry_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      [id, c.name, c.price, c.selling_price, c.cost_price, c.sku, c.code, c.barcode, c.stock, c.stock_minimum, c.unit, c.description, c.category_id, image, c.has_variants, c.variants, c.is_unlimited, c.is_active, c.expiry_date, now]
    );
    // Stok awal (>0, bukan unlimited/varian) → catat pergerakan 'in'.
    if (!c.is_unlimited && !c.has_variants && c.stock > 0) {
      await db.runAsync(
        'INSERT INTO stock_movements (product_id, variant_id, type, qty, stock_before, stock_after, note, ref_uuid, created_at) VALUES (?, NULL, ?, ?, 0, ?, ?, NULL, ?)',
        [id, 'in', c.stock, c.stock, 'Stok awal produk baru', now]
      );
    }
  });
  await enqueueOutbox('product', 'create', id, { ...c, image_uri: image });
  return id;
};

// Update produk lokal. Gambar cuma ditimpa kalau user milih foto baru (imageUri!=null),
// biar foto lama ga kehapus pas edit tanpa ganti foto. Selisih stok dicatat 'adjust'.
export const updateLocalProduct = async (id, form, imageUri = null) => {
  const db = getDB();
  const now = new Date().toISOString();
  const c = _productColsFromForm(form);
  const prev = await db.getAllAsync('SELECT stock FROM products WHERE id = ?', [id]);
  const before = Number(prev[0]?.stock) || 0;
  await db.withTransactionAsync(async () => {
    if (imageUri) {
      await db.runAsync(
        `UPDATE products SET name=?, price=?, selling_price=?, cost_price=?, sku=?, code=?, barcode=?, stock=?, stock_minimum=?, unit=?, description=?, category_id=?, image=?, has_variants=?, variants=?, is_unlimited=?, is_active=?, expiry_date=? WHERE id=?`,
        [c.name, c.price, c.selling_price, c.cost_price, c.sku, c.code, c.barcode, c.stock, c.stock_minimum, c.unit, c.description, c.category_id, imageUri, c.has_variants, c.variants, c.is_unlimited, c.is_active, c.expiry_date, id]
      );
    } else {
      await db.runAsync(
        `UPDATE products SET name=?, price=?, selling_price=?, cost_price=?, sku=?, code=?, barcode=?, stock=?, stock_minimum=?, unit=?, description=?, category_id=?, has_variants=?, variants=?, is_unlimited=?, is_active=?, expiry_date=? WHERE id=?`,
        [c.name, c.price, c.selling_price, c.cost_price, c.sku, c.code, c.barcode, c.stock, c.stock_minimum, c.unit, c.description, c.category_id, c.has_variants, c.variants, c.is_unlimited, c.is_active, c.expiry_date, id]
      );
    }
    if (!c.is_unlimited && !c.has_variants && c.stock !== before) {
      await db.runAsync(
        'INSERT INTO stock_movements (product_id, variant_id, type, qty, stock_before, stock_after, note, ref_uuid, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?, NULL, ?)',
        [id, 'adjust', Math.abs(c.stock - before), before, c.stock, 'Edit produk', now]
      );
    }
  });
  const payload = { id, ...c };
  if (imageUri) payload.image_uri = imageUri;
  await enqueueOutbox('product', 'update', id, payload);
  return true;
};

// Hapus produk. Kalau produk lokal murni (id<0, belum pernah ke server) → buang juga
// jejak outbox-nya, ga usah nyetor create+delete. Kalau id server → antre delete.
export const deleteLocalProduct = async (id) => {
  const db = getDB();
  await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
  if (Number(id) < 0) {
    await db.runAsync('DELETE FROM outbox WHERE entity = ? AND local_ref = ? AND status = ?', ['product', String(id), 'pending']);
  } else {
    await enqueueOutbox('product', 'delete', id, { id });
  }
  return true;
};

// Penyesuaian stok (StockOpnameScreen). actualStock = stok fisik final. Update scalar
// stock + catat pergerakan 'adjust' + antre ke outbox. Return nilai stok akhir.
export const adjustLocalStock = async (productId, actualStock, notes = '') => {
  const db = getDB();
  const now = new Date().toISOString();
  const rows = await db.getAllAsync('SELECT stock, is_unlimited FROM products WHERE id = ?', [productId]);
  if (rows.length === 0) return false;
  if (rows[0].is_unlimited) return true; // stok ga dilacak
  const before = Number(rows[0].stock) || 0;
  const after = Math.max(0, parseInt(actualStock) || 0);
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE products SET stock = ? WHERE id = ?', [after, productId]);
    await db.runAsync(
      'INSERT INTO stock_movements (product_id, variant_id, type, qty, stock_before, stock_after, note, ref_uuid, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?, NULL, ?)',
      [productId, 'adjust', Math.abs(after - before), before, after, notes || 'Penyesuaian stok', now]
    );
  });
  await enqueueOutbox('stock_adjust', 'adjust', productId, { product_id: productId, actual_stock: after, notes });
  return after;
};

// Riwayat mutasi stok BENTUK = server (StockMovementScreen). Arah masuk/keluar dihitung
// dari stock_after vs stock_before biar robust; reference_type = label ramah dari type.
export const getLocalStockMovements = async (limit = 100) => {
  const db = getDB();
  const rows = await db.getAllAsync(
    `SELECT m.*, p.name as product_name
     FROM stock_movements m LEFT JOIN products p ON m.product_id = p.id
     ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
    [limit]
  );
  const refLabel = { sale: 'Penjualan', void: 'Pembatalan', adjust: 'Penyesuaian', in: 'Stok Masuk', purchase: 'Pembelian' };
  return rows.map((r) => {
    const before = Number(r.stock_before) || 0;
    const after = Number(r.stock_after) || 0;
    const isIn = after >= before;
    return {
      id: r.id,
      type: isIn ? 'in' : 'out',
      quantity: r.qty != null ? r.qty : Math.abs(after - before),
      balance_before: before,
      balance_after: after,
      description: r.note || '',
      reference_type: refLabel[r.type] || r.type || '-',
      created_at: r.created_at,
      product: { name: r.product_name || 'Produk Dihapus' },
      warehouse: { name: 'Gudang Utama' },
    };
  });
};


// ==================== MASTER DATA NON-PRODUK (tulis lokal + outbox) — Fase 3 ====================
// Pelanggan, supplier, kategori, settings, & metode bayar. Pola sama kaya produk:
// tulis SQLite dulu (source of truth), record baru offline dikasih id NEGATIF
// (makeLocalId), tiap perubahan diantre ke outbox buat disetor pas server idup (Fase 5).

// slug buat kode metode bayar (server bikin dari nama; kita samain di lokal).
const _slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Hapus master-data generik. Record lokal murni (id<0, belum pernah ke server) →
// buang jejak outbox-nya sekalian, ga usah nyetor create+delete. id server → antre delete.
const _deleteLocalEntity = async (table, entity, id) => {
  const db = getDB();
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
  if (Number(id) < 0) {
    await db.runAsync('DELETE FROM outbox WHERE entity = ? AND local_ref = ? AND status = ?', [entity, String(id), 'pending']);
  } else {
    await enqueueOutbox(entity, 'delete', id, { id });
  }
  return true;
};

// ---------- Pelanggan ----------
const _customerCols = (form) => ({
  name: form.name || '',
  phone: form.phone || '',
  email: form.email || '',
  address: form.address || '',
  type: form.type || 'umum',
  is_active: form.is_active ? 1 : 0,
});

export const createLocalCustomer = async (form) => {
  const db = getDB();
  const id = makeLocalId();
  const c = _customerCols(form);
  await db.runAsync(
    'INSERT INTO customers (id, name, phone, email, address, type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, c.name, c.phone, c.email, c.address, c.type, c.is_active]
  );
  await enqueueOutbox('customer', 'create', id, c);
  return id;
};

export const updateLocalCustomer = async (id, form) => {
  const db = getDB();
  const c = _customerCols(form);
  await db.runAsync(
    'UPDATE customers SET name=?, phone=?, email=?, address=?, type=?, is_active=? WHERE id=?',
    [c.name, c.phone, c.email, c.address, c.type, c.is_active, id]
  );
  await enqueueOutbox('customer', 'update', id, { id, ...c });
  return true;
};

export const deleteLocalCustomer = (id) => _deleteLocalEntity('customers', 'customer', id);

// ---------- Supplier ----------
const _supplierCols = (form) => ({
  name: form.name || '',
  company: form.company || '',
  email: form.email || '',
  phone: form.phone || '',
  address: form.address || '',
  is_active: form.is_active ? 1 : 0,
});

export const createLocalSupplier = async (form) => {
  const db = getDB();
  const id = makeLocalId();
  const c = _supplierCols(form);
  await db.runAsync(
    'INSERT INTO suppliers (id, name, company, email, phone, address, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, c.name, c.company, c.email, c.phone, c.address, c.is_active]
  );
  await enqueueOutbox('supplier', 'create', id, c);
  return id;
};

export const updateLocalSupplier = async (id, form) => {
  const db = getDB();
  const c = _supplierCols(form);
  await db.runAsync(
    'UPDATE suppliers SET name=?, company=?, email=?, phone=?, address=?, is_active=? WHERE id=?',
    [c.name, c.company, c.email, c.phone, c.address, c.is_active, id]
  );
  await enqueueOutbox('supplier', 'update', id, { id, ...c });
  return true;
};

export const deleteLocalSupplier = (id) => _deleteLocalEntity('suppliers', 'supplier', id);

// ---------- Kategori ----------
const _categoryCols = (form) => ({
  name: form.name || '',
  description: form.description || '',
  is_active: form.is_active === 0 || form.is_active === false ? 0 : 1,
});

export const createLocalCategory = async (form) => {
  const db = getDB();
  const id = makeLocalId();
  const c = _categoryCols(form);
  await db.runAsync(
    'INSERT INTO categories (id, name, description, is_active) VALUES (?, ?, ?, ?)',
    [id, c.name, c.description, c.is_active]
  );
  await enqueueOutbox('category', 'create', id, c);
  return id;
};

export const updateLocalCategory = async (id, form) => {
  const db = getDB();
  const c = _categoryCols(form);
  await db.runAsync(
    'UPDATE categories SET name=?, description=?, is_active=? WHERE id=?',
    [c.name, c.description, c.is_active, id]
  );
  await enqueueOutbox('category', 'update', id, { id, ...c });
  return true;
};

// Kategori yang masih dipakai produk ga boleh dihapus (samain proteksi server).
export const deleteLocalCategory = async (id) => {
  const db = getDB();
  const used = await db.getAllAsync('SELECT COUNT(*) as c FROM products WHERE category_id = ?', [id]);
  if ((used[0]?.c || 0) > 0) throw new Error('Kategori sedang dipakai produk, tidak bisa dihapus.');
  return _deleteLocalEntity('categories', 'category', id);
};

// ---------- Metode Pembayaran ----------
// `code` diturunin dari nama (server bikin slug); ga disimpen di tabel, dihitung ulang
// tiap baca biar selalu konsisten walau nama berubah.
export const getLocalPaymentMethods = async () => {
  const db = getDB();
  const rows = await db.getAllAsync('SELECT * FROM payment_methods ORDER BY id ASC');
  return rows.map((r) => ({ id: r.id, name: r.name, code: _slug(r.name), is_active: r.is_active ? 1 : 0 }));
};

export const createLocalPaymentMethod = async (name) => {
  const db = getDB();
  const id = makeLocalId();
  const nm = name || '';
  await db.runAsync('INSERT INTO payment_methods (id, name, is_active) VALUES (?, ?, 1)', [id, nm]);
  await enqueueOutbox('payment_method', 'create', id, { name: nm, code: _slug(nm), is_active: 1 });
  return { id, name: nm, code: _slug(nm), is_active: 1 };
};

export const toggleLocalPaymentMethod = async (id) => {
  const db = getDB();
  const rows = await db.getAllAsync('SELECT is_active FROM payment_methods WHERE id = ?', [id]);
  if (rows.length === 0) return false;
  const next = rows[0].is_active ? 0 : 1;
  await db.runAsync('UPDATE payment_methods SET is_active = ? WHERE id = ?', [next, id]);
  await enqueueOutbox('payment_method', 'update', id, { id, is_active: next });
  return next;
};

export const deleteLocalPaymentMethod = (id) => _deleteLocalEntity('payment_methods', 'payment_method', id);

// ---------- Settings (key/value) ----------
// Tabel settings cuma key/value. Peta key→group di bawah dipakai buat nyusun balikan
// BENTUK = server ({ settings: {group: {key: value}}, payment_methods: [...] }) biar
// SettingsScreen ga perlu berubah struktur. Key tak dikenal masuk group 'toko'.
const SETTING_GROUPS = {
  store_name: 'toko', store_address: 'toko', store_phone: 'toko', store_email: 'toko', store_tax_number: 'toko',
  enable_kds: 'toko', enable_kot: 'toko', enable_table_management: 'toko', enable_order_type: 'toko',
  enable_open_bill: 'toko', enable_variants: 'toko',
  enable_payment_gateway: 'transaksi', discount_format: 'transaksi', tax_format: 'transaksi', global_tax_value: 'transaksi',
  receipt_header: 'struk', receipt_footer: 'struk', receipt_show_logo: 'struk', receipt_paper_size: 'struk',
  printer_auto_print: 'printer', enable_bluetooth_printer: 'printer',
  printer_transport: 'printer', printer_device_id: 'printer', printer_device_name: 'printer',
  printer_ble_service: 'printer', printer_ble_char: 'printer',
  notif_low_stock: 'notifikasi', notif_low_stock_threshold: 'notifikasi',
  notif_due_payment: 'notifikasi', notif_due_days_before: 'notifikasi',
};

export const getLocalSettings = async () => {
  const db = getDB();
  const rows = await db.getAllAsync('SELECT key, value FROM settings');
  const grouped = {};
  for (const r of rows) {
    const group = SETTING_GROUPS[r.key] || 'toko';
    if (!grouped[group]) grouped[group] = {};
    grouped[group][r.key] = r.value;
  }
  const payment_methods = await getLocalPaymentMethods();
  return { settings: grouped, payment_methods };
};

// Simpan settings lokal (upsert per key, key = PRIMARY KEY jadi INSERT OR REPLACE aman)
// lalu antre 1 baris outbox berisi seluruh payload. payload = [{key, value, group}].
export const saveLocalSettings = async (payload = []) => {
  const db = getDB();
  await db.withTransactionAsync(async () => {
    for (const s of payload) {
      const val = s.value == null ? '' : String(s.value);
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [s.key, val]);
    }
  });
  await enqueueOutbox('setting', 'update', null, { settings: payload });
  return true;
};

// ==================== KARYAWAN & PERAN (User & Role) — Fase 4 ====================
// Manajemen karyawan ditulis ke SQLite lokal + outbox (entity 'user'). Password
// TIDAK disimpan di tabel users (ga ada kolomnya & ga aman plaintext lokal) —
// cuma dibawa di payload outbox buat disetor ke server nanti (Fase 5).
// NOTE: tabel users ini DATA MANAJEMEN (roster), TERPISAH dari auth login device
// (SecureStore authUser/authUsers di utils/auth.js). RBAC gate 'users.manage' di
// layar tetap dipakai; ini cuma CRUD daftar karyawan.

// Katalog peran default biar form tambah karyawan tetap punya pilihan role walau
// server ga pernah keporak (offline murni). Kalau server idup, syncRoles() nimpa
// pakai data server. Permission string diselaraskan sama can() di seluruh app.
const DEFAULT_ROLES = [
  {
    id: 1, name: 'admin', display_name: 'Administrator',
    permissions: [
      'products.view', 'products.manage', 'categories.manage', 'warehouses.manage',
      'sales.view', 'sales.manage', 'reports.view', 'customers.manage',
      'suppliers.manage', 'users.manage', 'settings.manage',
    ],
  },
  {
    id: 2, name: 'kasir', display_name: 'Kasir',
    permissions: ['products.view', 'sales.view', 'sales.manage'],
  },
];

// Isi peran default HANYA kalau tabel roles kosong (OR IGNORE biar ga nabrak /
// nimpa peran hasil sync server). Dipanggil lazily dari getLocalRoles().
const _seedDefaultRoles = async (db) => {
  for (const r of DEFAULT_ROLES) {
    await db.runAsync(
      'INSERT OR IGNORE INTO roles (id, name, display_name, permissions) VALUES (?, ?, ?, ?)',
      [r.id, r.name, r.display_name, JSON.stringify(r.permissions)]
    );
  }
};

// Baca peran (self-seed default kalau kosong). Bentuk server-shaped: {id, name,
// display_name, permissions[]} → layar pakai r.id & r.display_name.
export const getLocalRoles = async () => {
  const db = getDB();
  const cnt = await db.getAllAsync('SELECT COUNT(*) as c FROM roles');
  if ((cnt[0]?.c || 0) === 0) await _seedDefaultRoles(db);
  const rows = await db.getAllAsync('SELECT * FROM roles ORDER BY id ASC');
  return rows.map((r) => {
    let permissions = [];
    try { permissions = r.permissions ? JSON.parse(r.permissions) : []; } catch (_) { permissions = []; }
    return { id: r.id, name: r.name, display_name: r.display_name || r.name, permissions };
  });
};

// Terjemahin NAMA peran (dari cloud-auth Supabase) → daftar permission LOKAL.
// Cloud cuma nyimpen identitas + nama peran ('admin'/'kasir'); permission-nya
// tetep didefinisiin lokal di tabel roles (seeded). Jadi kalau aturan permission
// berubah, cukup update seed lokal — ga usah sentuh cloud.
export const getRolePermissions = async (roleName) => {
  const roles = await getLocalRoles();
  const r = roles.find((x) => x.name === roleName);
  return {
    permissions: r?.permissions || [],
    isAdmin: ['admin', 'superadmin'].includes(roleName) || ['admin', 'superadmin'].includes(r?.name),
    roleDisplay: r?.display_name || roleName || null,
  };
};

// Baca karyawan BENTUK = server (buat UserManagement). JOIN roles biar dapet
// display_name → layar render item.role?.display_name tanpa ubah apa-apa.
export const getLocalUsers = async () => {
  const db = getDB();
  const rows = await db.getAllAsync(
    `SELECT u.*, r.display_name AS role_display, r.name AS role_key
     FROM users u LEFT JOIN roles r ON r.id = u.role_id
     ORDER BY u.name ASC`
  );
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email || '',
    role_id: u.role_id,
    is_active: u.is_active ? 1 : 0,
    role: u.role_id
      ? { id: u.role_id, name: u.role_key, display_name: u.role_display || u.role_name || 'Tanpa Peran' }
      : null,
  }));
};

const _roleNameById = async (db, roleId) => {
  if (!roleId) return null;
  const rows = await db.getAllAsync('SELECT name FROM roles WHERE id = ?', [roleId]);
  return rows[0]?.name || null;
};

export const createLocalUser = async (form) => {
  const db = getDB();
  const id = makeLocalId();
  const roleId = form.role_id ? Number(form.role_id) : null;
  const roleName = await _roleNameById(db, roleId);
  const email = String(form.email || '').trim();
  // Hash password buat login kasir OFFLINE. Salt = EMAIL (lowercase) — stabil lintas
  // reconcile id & lintas pull server, beda sama id yg bisa berubah. Ini yang bikin
  // kasir bikinan owner bisa login tanpa server.
  const passwordHash = hashPassword(email.toLowerCase(), form.password);
  await db.runAsync(
    'INSERT INTO users (id, name, email, role_id, role_name, is_active, pending_op, password_hash) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
    [id, form.name || '', email, roleId, roleName, 'create', passwordHash]
  );
  await enqueueOutbox('user', 'create', id, {
    name: form.name || '',
    email: email,
    password: form.password || '',
    role_id: roleId,
  });
  return id;
};

export const updateLocalUser = async (id, form) => {
  const db = getDB();
  const roleId = form.role_id ? Number(form.role_id) : null;
  const roleName = await _roleNameById(db, roleId);
  const email = String(form.email || '').trim();
  if (form.password) {
    // Ganti password → update hash-nya juga (salt = EMAIL, konsisten sama createLocalUser).
    await db.runAsync(
      'UPDATE users SET name=?, email=?, role_id=?, role_name=?, password_hash=? WHERE id=?',
      [form.name || '', email, roleId, roleName, hashPassword(email.toLowerCase(), form.password), id]
    );
  } else {
    await db.runAsync(
      'UPDATE users SET name=?, email=?, role_id=?, role_name=? WHERE id=?',
      [form.name || '', email, roleId, roleName, id]
    );
  }
  const payload = { id, name: form.name || '', email: email, role_id: roleId };
  if (form.password) payload.password = form.password; // ganti password opsional
  await enqueueOutbox('user', 'update', id, payload);
  return true;
};

// Aktif/nonaktif karyawan. Return status baru (1/0) atau false kalau ga ketemu.
export const toggleLocalUser = async (id) => {
  const db = getDB();
  const rows = await db.getAllAsync('SELECT is_active FROM users WHERE id = ?', [id]);
  if (!rows.length) return false;
  const next = rows[0].is_active ? 0 : 1;
  await db.runAsync('UPDATE users SET is_active=? WHERE id=?', [next, id]);
  await enqueueOutbox('user', 'update', id, { id, is_active: next });
  return next;
};

export const deleteLocalUser = (id) => _deleteLocalEntity('users', 'user', id);

// Autentikasi kasir OFFLINE lawan tabel users lokal. Dipakai LoginScreen sebagai
// fallback saat Supabase nolak/ga kejangkau — karena kasir dibikin owner secara
// LOKAL (ga punya akun cloud). Balikin user siap-pakai {name,email,role,roleDisplay,
// permissions,isAdmin} atau null. Cuma user AKTIF yang boleh masuk. Peran & izin
// diambil dari tabel roles lokal (seeded) — konsisten sama jalur login Supabase.
export const verifyLocalUser = async (email, password) => {
  if (!email || !password) return null;
  const db = getDB();
  const key = String(email).trim().toLowerCase();
  const rows = await db.getAllAsync(
    'SELECT * FROM users WHERE lower(email) = ? AND is_active = 1',
    [key]
  );
  const u = rows[0];
  if (!u) return null;
  if (!verifyPassword(key, password, u.password_hash)) return null;
  const roleName = u.role_name || (await _roleNameById(db, u.role_id)) || 'kasir';
  const { permissions, isAdmin, roleDisplay } = await getRolePermissions(roleName);
  return {
    name: u.name || u.email || key,
    email: u.email || key,
    role: roleName,
    roleDisplay,
    permissions,
    isAdmin,
  };
};

// Dipanggil SETELAH login ONLINE sukses: simpen/utak kredensial LOKAL (hash SHA-256
// salt=email) biar user yg SAMA bisa login OFFLINE lain kali. Server (bcrypt) tetep
// otoritas password pas online; ini cuma cadangan offline. id/role dari payload /login.
export const rememberOnlineLogin = async ({ id, name, email, role_id, role_name, is_active, password }) => {
  const key = String(email || '').trim().toLowerCase();
  if (!key || !password) return;
  try {
    const db = getDB();
    const hash = hashPassword(key, password);
    const rid = role_id != null ? Number(role_id) : null;
    const rname = role_name || (await _roleNameById(db, rid));
    const active = is_active == null ? 1 : (is_active ? 1 : 0);
    if (id != null) {
      await db.runAsync(
        'INSERT OR REPLACE INTO users (id, name, email, role_id, role_name, is_active, pending_op, password_hash) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)',
        [id, name || key, key, rid, rname, active, hash]
      );
    } else {
      // tanpa id server → upsert by email (baris lokal yg udah ada, atau baru id lokal)
      const existing = (await db.getAllAsync('SELECT id FROM users WHERE lower(email)=?', [key]))[0];
      if (existing) {
        await db.runAsync(
          'UPDATE users SET name=?, role_id=?, role_name=?, is_active=?, password_hash=? WHERE id=?',
          [name || key, rid, rname, active, hash, existing.id]
        );
      } else {
        await db.runAsync(
          'INSERT INTO users (id, name, email, role_id, role_name, is_active, pending_op, password_hash) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)',
          [makeLocalId(), name || key, key, rid, rname, active, hash]
        );
      }
    }
  } catch (e) {
    // gagal simpen kredensial offline TIDAK fatal buat login online
    console.warn('rememberOnlineLogin failed:', e?.message);
  }
};

// Tarik peran & karyawan dari server (buat "both" — dipakai pas server idup).
// syncUsers PRESERVE baris id negatif (karyawan bikinan offline yg belum kesetor)
// biar antrian outbox ga ilang pas pull. Rekonsiliasi id nyusul di Fase 5.
export const syncRoles = async () => {
  try {
    const db = getDB();
    const response = await api.get('/manage/roles');
    const roles = response.data.data || response.data;
    if (!roles || !Array.isArray(roles)) throw new Error('Invalid role data from API');
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM roles;');
      for (const r of roles) {
        const perms = Array.isArray(r.permissions)
          ? r.permissions
          : (r.permissions ? Object.values(r.permissions) : []);
        await db.runAsync(
          'INSERT INTO roles (id, name, display_name, permissions) VALUES (?, ?, ?, ?)',
          [r.id, r.name || '', r.display_name || r.name || '', JSON.stringify(perms)]
        );
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to sync roles:', error);
    return false;
  }
};

export const syncUsers = async () => {
  try {
    const db = getDB();
    const response = await api.get('/manage/users');
    const users = response.data.data || response.data;
    if (!users || !Array.isArray(users)) throw new Error('Invalid user data from API');
    // Snapshot hash offline (by email, stabil) SEBELUM hapus — biar login offline user
    // yg udah pernah kesimpen ga keilangan pas pull. Server ga pernah kirim hash.
    const prior = await db.getAllAsync(
      "SELECT email, password_hash FROM users WHERE password_hash IS NOT NULL AND password_hash != ''"
    );
    const hashByEmail = {};
    for (const p of prior) if (p.email) hashByEmail[String(p.email).toLowerCase()] = p.password_hash;
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM users WHERE id > 0;'); // simpen yg offline (id negatif)
      for (const u of users) {
        const email = u.email || '';
        const keptHash = hashByEmail[String(email).toLowerCase()] || null;
        await db.runAsync(
          'INSERT OR REPLACE INTO users (id, name, email, role_id, role_name, is_active, pending_op, password_hash) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)',
          [
            u.id,
            u.name || '',
            email,
            u.role_id || u.role?.id || null,
            u.role_name || u.role?.name || null,
            u.is_active ? 1 : 0,
            keptHash,
          ]
        );
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to sync users:', error);
    return false;
  }
};


