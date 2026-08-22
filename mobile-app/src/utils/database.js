import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Skema FINAL (untuk install baru). Buat install lama, kolom baru ditambah lewat
// MIGRATIONS di bawah (ALTER TABLE, dibungkus try/catch biar aman kalau udah ada).
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    selling_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    sku TEXT,
    code TEXT,
    barcode TEXT,
    stock INTEGER DEFAULT 0,
    stock_minimum INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'pcs',
    description TEXT,
    category_id INTEGER,
    image TEXT,
    has_variants INTEGER DEFAULT 0,
    variants TEXT,
    is_unlimited INTEGER DEFAULT 0,
    modifiers TEXT,
    is_active INTEGER DEFAULT 1,
    expiry_date TEXT,
    pending_op TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    pending_op TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    type TEXT DEFAULT 'retail',
    is_active INTEGER DEFAULT 1,
    pending_op TEXT
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active INTEGER DEFAULT 1,
    pending_op TEXT
  );

  CREATE TABLE IF NOT EXISTS offline_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    invoice_number TEXT,
    total_amount REAL NOT NULL,
    paid REAL DEFAULT 0,
    change_amount REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'paid',
    customer_id INTEGER,
    order_type TEXT DEFAULT 'dine_in',
    table_id INTEGER,
    voucher_id INTEGER,
    discount_amount REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'pending_sync',
    voided INTEGER DEFAULT 0,
    sale_date TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS offline_transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_uuid TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    variant_name TEXT,
    qty INTEGER NOT NULL,
    price REAL NOT NULL,
    cost_price REAL DEFAULT 0,
    modifiers TEXT,
    notes TEXT,
    FOREIGN KEY (transaction_uuid) REFERENCES offline_transactions(uuid)
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    type TEXT NOT NULL,
    qty INTEGER NOT NULL,
    stock_before INTEGER,
    stock_after INTEGER,
    note TEXT,
    ref_uuid TEXT,
    created_at TEXT NOT NULL,
    pending_op TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    pending_op TEXT
  );

  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT,
    display_name TEXT,
    permissions TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    role_id INTEGER,
    role_name TEXT,
    is_active INTEGER DEFAULT 1,
    pending_op TEXT,
    password_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    op TEXT NOT NULL,
    local_ref TEXT,
    payload_json TEXT,
    status TEXT DEFAULT 'pending',
    tries INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 4,
    status TEXT DEFAULT 'available',
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    min_purchase REAL DEFAULT 0,
    max_discount REAL,
    is_active INTEGER DEFAULT 1,
    valid_until TEXT
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    cashier_name TEXT,
    starting_cash REAL DEFAULT 0,
    expected_cash REAL,
    actual_cash REAL,
    selisih REAL,
    notes TEXT,
    status TEXT DEFAULT 'open',
    opened_at TEXT NOT NULL,
    closed_at TEXT
  );
`;

// Migrasi kolom untuk install LAMA (tabel udah ada, cuma kurang kolom baru).
// Tiap statement dijalanin dalam try/catch: kalau kolom udah ada, SQLite lempar
// error "duplicate column" dan kita abaikan. Tabel BARU ga perlu di sini karena
// udah ke-handle CREATE TABLE IF NOT EXISTS di atas.
const MIGRATIONS = [
  // customers / suppliers (dari rilis sebelumnya)
  "ALTER TABLE customers ADD COLUMN is_active INTEGER DEFAULT 1;",
  "ALTER TABLE customers ADD COLUMN pending_op TEXT;",
  "ALTER TABLE suppliers ADD COLUMN pending_op TEXT;",
  // products: kolom baru buat CRUD + profit + alert stok
  "ALTER TABLE products ADD COLUMN selling_price REAL DEFAULT 0;",
  "ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0;",
  "ALTER TABLE products ADD COLUMN code TEXT;",
  "ALTER TABLE products ADD COLUMN stock_minimum INTEGER DEFAULT 5;",
  "ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'pcs';",
  "ALTER TABLE products ADD COLUMN description TEXT;",
  "ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1;",
  "ALTER TABLE products ADD COLUMN expiry_date TEXT;",
  "ALTER TABLE products ADD COLUMN pending_op TEXT;",
  // categories
  "ALTER TABLE categories ADD COLUMN pending_op TEXT;",
  // offline_transactions: kolom biar riwayat & laporan lokal sepadan server
  "ALTER TABLE offline_transactions ADD COLUMN invoice_number TEXT;",
  "ALTER TABLE offline_transactions ADD COLUMN paid REAL DEFAULT 0;",
  "ALTER TABLE offline_transactions ADD COLUMN change_amount REAL DEFAULT 0;",
  "ALTER TABLE offline_transactions ADD COLUMN profit REAL DEFAULT 0;",
  "ALTER TABLE offline_transactions ADD COLUMN payment_status TEXT DEFAULT 'paid';",
  "ALTER TABLE offline_transactions ADD COLUMN voided INTEGER DEFAULT 0;",
  "ALTER TABLE offline_transactions ADD COLUMN sale_date TEXT;",
  // offline_transaction_items: cost_price buat hitung profit lokal
  "ALTER TABLE offline_transaction_items ADD COLUMN cost_price REAL DEFAULT 0;",

  // Login kasir offline: password kasir disimpan ter-hash di tabel users lokal
  // (lihat utils/hash.js + verifyLocalUser di SyncService). DB lama belum punya
  // kolom ini → tambah di sini (try/catch di initDB nelen error kalau sudah ada).
  "ALTER TABLE users ADD COLUMN password_hash TEXT;",
];

// On native: open sync, on web: will be set async via initDB()
let db = Platform.OS !== 'web' ? SQLite.openDatabaseSync('pos_offline_v2.db') : null;

export const initDB = async () => {
  if (Platform.OS === 'web') {
    // Web requires async open to avoid SharedArrayBuffer issues
    db = await SQLite.openDatabaseAsync('pos_offline_v2.db');
    await db.execAsync(CREATE_TABLES_SQL);
    for (const sql of MIGRATIONS) {
      try { await db.execAsync(sql); } catch (e) { /* kolom udah ada */ }
    }
  } else {
    db.execSync(CREATE_TABLES_SQL);
    for (const sql of MIGRATIONS) {
      try { db.execSync(sql); } catch (e) { /* kolom udah ada */ }
    }
  }
};

export const getDB = () => db;
