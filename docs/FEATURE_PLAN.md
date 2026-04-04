# NEXAPOS — Feature Implementation Plan

> Dokumen ini berisi rencana implementasi fitur-fitur yang belum ada di NEXAPOS,
> berdasarkan studi terhadap demo POS dari jagowebdev.com (codeliro.com/demo/pos).
>
> **Stack**: Laravel 11 + Inertia.js + React + Tailwind CSS
> **Database**: MySQL (Laragon)
> **Tanggal**: 2 April 2026

---

## Daftar Isi

1. [Status Fitur Saat Ini](#1-status-fitur-saat-ini)
2. [Modul 1 — Supplier (Pemasok)](#2-modul-1--supplier-pemasok)
3. [Modul 2 — Gudang (Warehouse)](#3-modul-2--gudang-warehouse)
4. [Modul 3 — Retur Penjualan](#4-modul-3--retur-penjualan)
5. [Modul 4 — Retur Pembelian](#5-modul-4--retur-pembelian)
6. [Modul 5 — Transfer Barang](#6-modul-5--transfer-barang)
7. [Modul 6 — Cetak Barcode](#7-modul-6--cetak-barcode)
8. [Modul 7 — Penjualan Tempo (Piutang)](#8-modul-7--penjualan-tempo-piutang)
9. [Modul 8 — Settings](#9-modul-8--settings)
10. [Modul 9 — User Management](#10-modul-9--user-management)
11. [Modul 10 — Notifikasi](#11-modul-10--notifikasi)
12. [Modul 11 — Laporan Pembelian Per Invoice](#12-modul-11--laporan-pembelian-per-invoice)
13. [Update Sidebar & Navigasi](#13-update-sidebar--navigasi)
14. [Permissions Baru](#14-permissions-baru)
15. [Urutan Eksekusi](#15-urutan-eksekusi)

---

## 1. Status Fitur Saat Ini

### ✅ Sudah Diimplementasi

| # | Modul | Controller | Page(s) | Route |
|---|-------|------------|---------|-------|
| 1 | Dashboard | `DashboardController` | `Dashboard.jsx` | `GET /dashboard` |
| 2 | POS Kasir | `PosController` | `Pos/Index.jsx` | `GET/POST /pos` |
| 3 | Daftar Produk | `ProductController` | `Products/Index.jsx`, `Products/Form.jsx` | resource `/products` |
| 4 | Kategori | `CategoryController` | `Categories/Index.jsx` | resource `/categories` |
| 5 | Pelanggan | `CustomerController` | `Customers/Index.jsx` | resource `/customers` |
| 6 | Penjualan | `SaleController` | `Sales/Index.jsx`, `Sales/Show.jsx` | resource `/sales` |
| 7 | Pembelian | `PurchaseController` | `Purchases/Index.jsx`, `Purchases/Form.jsx`, `Purchases/Show.jsx` | resource `/purchases` |
| 8 | Laporan Per Invoice | `ReportController` | `Reports/SalesByInvoice.jsx` | `GET /reports/sales-by-invoice` |
| 9 | Laporan Per Item | `ReportController` | `Reports/SalesByItem.jsx` | `GET /reports/sales-by-item` |
| 10 | Profil | `ProfileController` | `Profile/Edit.jsx` | `GET/PATCH/DELETE /profile` |

### ❌ Belum Diimplementasi (Target)

| # | Modul | Migration | Model | Controller | Page |
|---|-------|:---------:|:-----:|:----------:|:----:|
| 1 | Supplier | ✅ | ✅ | ❌ | ❌ |
| 2 | Gudang | ✅ | ✅ | ❌ | ❌ |
| 3 | Retur Penjualan | ✅ | ✅ | ❌ | ❌ |
| 4 | Retur Pembelian | ✅ | ❌ | ❌ | ❌ |
| 5 | Transfer Barang | ✅ | ✅ | ❌ | ❌ |
| 6 | Cetak Barcode | — | — | ❌ | ❌ |
| 7 | Penjualan Tempo | ✅ (kolom di sales) | ✅ | ❌ | ❌ |
| 8 | Settings | ✅ | ❌ | ❌ | ❌ |
| 9 | User Management | ✅ | ✅ (User, Role, Permission) | ❌ | ❌ |
| 10 | Notifikasi | — | — | ❌ | ❌ |
| 11 | Laporan Pembelian | — | — | ❌ | ❌ |

---

## 2. Modul 1 — Supplier (Pemasok)

### Database (SUDAH ADA)

**Tabel `suppliers`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | Auto increment |
| name | string | Nama supplier |
| company | string (nullable) | Nama perusahaan |
| email | string (nullable) | Email |
| phone | string (nullable) | No HP/ Telepon |
| address | text (nullable) | Alamat |
| is_active | boolean (default true) | Status aktif |
| created_at / updated_at | timestamps | |

**Model `Supplier` (SUDAH ADA):**
- fillable: `name`, `company`, `email`, `phone`, `address`, `is_active`
- relations: `purchases()` → HasMany Purchase

### Yang Perlu Dibuat

#### A. Controller: `SupplierController.php`

```
app/Http/Controllers/SupplierController.php
```

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /suppliers` | List supplier + search + filter aktif/nonaktif |
| `store(Request)` | `POST /suppliers` | Tambah supplier baru |
| `update(Request, Supplier)` | `PUT /suppliers/{supplier}` | Edit supplier |
| `destroy(Supplier)` | `DELETE /suppliers/{supplier}` | Hapus supplier (cek relasi pembelian) |

**Validasi `store/update`:**
```php
'name'    => 'required|string|max:255',
'company' => 'nullable|string|max:255',
'email'   => 'nullable|email|max:255',
'phone'   => 'nullable|string|max:20',
'address' => 'nullable|string|max:1000',
```

#### B. Route

```php
Route::resource('suppliers', SupplierController::class)->except(['show', 'create', 'edit']);
```

#### C. Page: `Suppliers/Index.jsx`

**Layout:** Tabel data dengan inline modal create/edit (mirip `Customers/Index.jsx`).

**Kolom tabel:**

| # | Kolom | Sortable |
|---|-------|----------|
| 1 | No | — |
| 2 | Nama Supplier | ✅ |
| 3 | Perusahaan | ✅ |
| 4 | Telepon | — |
| 5 | Email | — |
| 6 | Alamat | — |
| 7 | Status | ✅ |
| 8 | Aksi (Edit, Hapus) | — |

**Fitur halaman:**
- Search bar (cari nama/company/phone)
- Tombol "Tambah Supplier" → buka modal
- Modal form: name, company, email, phone, address
- Konfirmasi delete
- Pagination
- Flash message sukses/error

---

## 3. Modul 2 — Gudang (Warehouse)

### Database (SUDAH ADA)

**Tabel `warehouses`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | Auto increment |
| name | string | Nama gudang |
| address | text (nullable) | Alamat |
| phone | string (nullable) | Telepon |
| is_default | boolean (default false) | Gudang default |
| is_active | boolean (default true) | Status aktif |
| created_at / updated_at | timestamps | |

**Model `Warehouse` (SUDAH ADA):**
- fillable: `name`, `address`, `phone`, `is_default`, `is_active`
- relations: `productStocks()` → HasMany ProductStock

### Yang Perlu Dibuat

#### A. Controller: `WarehouseController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /warehouses` | List gudang |
| `store(Request)` | `POST /warehouses` | Tambah gudang |
| `update(Request, Warehouse)` | `PUT /warehouses/{warehouse}` | Edit gudang |
| `destroy(Warehouse)` | `DELETE /warehouses/{warehouse}` | Hapus (cek ada stok/tidak) |

**Validasi:**
```php
'name'    => 'required|string|max:255',
'address' => 'nullable|string|max:1000',
'phone'   => 'nullable|string|max:20',
'is_default' => 'boolean',
```

**Logika khusus:**
- Jika `is_default = true`, unset semua gudang lain yang default
- Tidak bisa hapus gudang yang masih punya stok barang
- Tidak bisa hapus gudang default

#### B. Route

```php
Route::resource('warehouses', WarehouseController::class)->except(['show', 'create', 'edit']);
```

#### C. Page: `Warehouses/Index.jsx`

**Layout:** Card grid (mirip `Categories/Index.jsx`) atau tabel.

**Info per gudang:**
- Nama gudang
- Alamat
- Telepon
- Badge "Default" jika is_default
- Badge "Aktif" / "Nonaktif"
- Total jenis barang di gudang ini
- Total stok item di gudang ini
- Tombol Edit / Hapus

---

## 4. Modul 3 — Retur Penjualan

### Database (SUDAH ADA)

**Tabel `sale_returns`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| return_number | string (unique) | Nomor nota retur |
| sale_id | FK → sales (cascadeOnDelete) | Invoice penjualan yang diretur |
| user_id | FK → users | User yang memproses |
| return_date | date | Tanggal retur |
| total | decimal(15,2) default 0 | Total nilai retur |
| notes | text (nullable) | Catatan |
| created_at / updated_at | timestamps | |

**Tabel `sale_return_details`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| sale_return_id | FK → sale_returns (cascadeOnDelete) | |
| sale_detail_id | FK → sale_details (restrictOnDelete) | Item penjualan yang diretur |
| product_id | FK → products | Produk |
| quantity | integer | Jumlah diretur |
| unit_price | decimal(15,2) | Harga satuan saat dijual |
| subtotal | decimal(15,2) | quantity × unit_price |
| created_at / updated_at | timestamps | |

**Model `SaleReturn` (SUDAH ADA):**
- fillable: `return_number`, `sale_id`, `user_id`, `return_date`, `total`, `notes`
- relations: `sale()`, `user()`, `details()`

**Model `SaleReturnDetail` (SUDAH ADA):**
- fillable: `sale_return_id`, `sale_detail_id`, `product_id`, `quantity`, `unit_price`, `subtotal`
- relations: `saleReturn()`, `product()`

### Yang Perlu Dibuat

#### A. Controller: `SaleReturnController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /sale-returns` | List retur penjualan + filter tanggal |
| `create()` | `GET /sale-returns/create?sale_id=X` | Form retur (pilih invoice) |
| `store(Request)` | `POST /sale-returns` | Simpan retur + update stok |
| `show(SaleReturn)` | `GET /sale-returns/{id}` | Detail nota retur |
| `destroy(SaleReturn)` | `DELETE /sale-returns/{id}` | Hapus retur + rollback stok |

**Logika bisnis:**
1. Pilih invoice penjualan → tampilkan item-item yang bisa diretur
2. Qty retur ≤ qty yang dijual dikurangi qty yang sudah pernah diretur
3. Saat simpan: kembalikan stok ke gudang yang bersangkutan
4. Saat hapus: kurangi stok kembali
5. Generate `return_number` otomatis: format `RTJ{Ymd}{0001}`

**Validasi:**
```php
'sale_id'              => 'required|exists:sales,id',
'return_date'          => 'required|date',
'notes'                => 'nullable|string',
'items'                => 'required|array|min:1',
'items.*.sale_detail_id' => 'required|exists:sale_details,id',
'items.*.product_id'   => 'required|exists:products,id',
'items.*.quantity'     => 'required|integer|min:1',
'items.*.unit_price'   => 'required|numeric|min:0',
```

#### B. Routes

```php
Route::resource('sale-returns', SaleReturnController::class)->except(['edit', 'update']);
```

#### C. Pages

1. **`SaleReturns/Index.jsx`** — List retur penjualan
   - Kolom: No, No. Retur, No. Invoice, Tanggal, Total, User, Aksi
   - Filter: rentang tanggal
   - Pagination
   - Link ke detail

2. **`SaleReturns/Create.jsx`** — Form input retur
   - Pilih invoice (dropdown/search)
   - Load detail item dari invoice
   - Input qty retur per item (validasi max qty)
   - Isian tanggal retur, catatan
   - Preview total nilai retur

3. **`SaleReturns/Show.jsx`** — Detail nota retur
   - Info header: no retur, no invoice, tanggal, user
   - Tabel item: nama barang, qty retur, harga, subtotal
   - Total retur
   - Tombol cetak / hapus

---

## 5. Modul 4 — Retur Pembelian

### Database (SUDAH ADA)

**Tabel `purchase_returns`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| return_number | string (unique) | Nomor nota retur |
| purchase_id | FK → purchases (cascadeOnDelete) | Invoice pembelian |
| user_id | FK → users | |
| return_date | date | |
| total | decimal(15,2) default 0 | |
| notes | text (nullable) | |
| created_at / updated_at | timestamps | |

**Tabel `purchase_return_details`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| purchase_return_id | FK → purchase_returns (cascadeOnDelete) | |
| purchase_detail_id | FK → purchase_details (restrictOnDelete) | |
| product_id | FK → products | |
| quantity | integer | |
| unit_price | decimal(15,2) | |
| subtotal | decimal(15,2) | |
| created_at / updated_at | timestamps | |

### Yang Perlu Dibuat

#### A. Model: `PurchaseReturn.php` & `PurchaseReturnDetail.php`

**`PurchaseReturn`:**
- fillable: `return_number`, `purchase_id`, `user_id`, `return_date`, `total`, `notes`
- casts: `return_date` → date, `total` → decimal:2
- relations: `purchase()`, `user()`, `details()`

**`PurchaseReturnDetail`:**
- fillable: `purchase_return_id`, `purchase_detail_id`, `product_id`, `quantity`, `unit_price`, `subtotal`
- casts: `unit_price` → decimal:2, `subtotal` → decimal:2
- relations: `purchaseReturn()`, `product()`

#### B. Controller: `PurchaseReturnController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /purchase-returns` | List retur pembelian |
| `create()` | `GET /purchase-returns/create?purchase_id=X` | Form retur |
| `store(Request)` | `POST /purchase-returns` | Simpan + kurangi stok |
| `show(PurchaseReturn)` | `GET /purchase-returns/{id}` | Detail |
| `destroy(PurchaseReturn)` | `DELETE /purchase-returns/{id}` | Hapus + rollback stok |

**Logika bisnis:**
1. Pilih invoice pembelian → tampilkan item
2. Qty retur ≤ qty pembelian minus qty sudah diretur
3. Saat simpan: kurangi stok dari gudang pembelian
4. Generate `return_number`: format `RTB{Ymd}{0001}`

#### C. Routes

```php
Route::resource('purchase-returns', PurchaseReturnController::class)->except(['edit', 'update']);
```

#### D. Pages

1. **`PurchaseReturns/Index.jsx`** — List
2. **`PurchaseReturns/Create.jsx`** — Form input
3. **`PurchaseReturns/Show.jsx`** — Detail nota retur

---

## 6. Modul 5 — Transfer Barang

### Database (SUDAH ADA)

**Tabel `stock_transfers`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| transfer_number | string (unique) | Nomor transfer |
| from_warehouse_id | FK → warehouses | Gudang asal |
| to_warehouse_id | FK → warehouses | Gudang tujuan |
| user_id | FK → users | |
| transfer_date | date | |
| status | enum('completed','pending','cancelled') default 'pending' | |
| notes | text (nullable) | |
| created_at / updated_at | timestamps | |

**Tabel `stock_transfer_details`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| stock_transfer_id | FK → stock_transfers (cascadeOnDelete) | |
| product_id | FK → products | |
| quantity | integer | Jumlah transfer |
| created_at / updated_at | timestamps | |

**Model `StockTransfer` (SUDAH ADA):**
- fillable: `transfer_number`, `from_warehouse_id`, `to_warehouse_id`, `user_id`, `transfer_date`, `status`, `notes`
- relations: `fromWarehouse()`, `toWarehouse()`, `user()`, `details()`

**Model `StockTransferDetail` (SUDAH ADA):**
- fillable: `stock_transfer_id`, `product_id`, `quantity`
- relations: `stockTransfer()`, `product()`

### Yang Perlu Dibuat

#### A. Controller: `StockTransferController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /stock-transfers` | List transfer |
| `create()` | `GET /stock-transfers/create` | Form transfer |
| `store(Request)` | `POST /stock-transfers` | Simpan + pindah stok |
| `show(StockTransfer)` | `GET /stock-transfers/{id}` | Detail nota transfer |
| `destroy(StockTransfer)` | `DELETE /stock-transfers/{id}` | Hapus + rollback stok |

**Logika bisnis:**
1. Pilih gudang asal dan gudang tujuan (tidak boleh sama)
2. Pilih barang + qty (validasi ≤ stok di gudang asal)
3. Saat simpan (status = completed):
   - Kurangi `product_stocks` di `from_warehouse_id`
   - Tambah `product_stocks` di `to_warehouse_id` (create if not exists)
4. Generate `transfer_number`: format `TRF{Ymd}{0001}`

**Validasi:**
```php
'from_warehouse_id' => 'required|exists:warehouses,id|different:to_warehouse_id',
'to_warehouse_id'   => 'required|exists:warehouses,id',
'transfer_date'     => 'required|date',
'notes'             => 'nullable|string',
'items'             => 'required|array|min:1',
'items.*.product_id' => 'required|exists:products,id',
'items.*.quantity'   => 'required|integer|min:1',
```

#### B. Routes

```php
Route::resource('stock-transfers', StockTransferController::class)->except(['edit', 'update']);
```

#### C. Pages

1. **`StockTransfers/Index.jsx`** — List transfer
   - Kolom: No, No. Transfer, Gudang Asal, Gudang Tujuan, Tanggal, Status, Jumlah Item, Aksi
   - Filter: status, rentang tanggal
   - Pagination

2. **`StockTransfers/Create.jsx`** — Form transfer
   - Pilih gudang asal (dropdown)
   - Pilih gudang tujuan (dropdown, exclude gudang asal)
   - Tabel item: search produk → qty (max = stok di gudang asal)
   - Tanggal, catatan
   - Tombol Simpan

3. **`StockTransfers/Show.jsx`** — Detail nota transfer
   - Header: no transfer, gudang asal→tujuan, tanggal, status, user
   - Tabel: nama barang, qty
   - Tombol cetak / hapus

---

## 7. Modul 6 — Cetak Barcode

### Database

Tidak perlu tabel baru. Menggunakan data dari tabel `products` (kolom `barcode`).

### Yang Perlu Dibuat

#### A. Controller: `BarcodeController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /barcodes` | Halaman cetak barcode |
| `generate(Request)` | `POST /barcodes/generate` | Generate data barcode untuk preview |
| `print(Request)` | `GET /barcodes/print` | Halaman print barcode |

**Logika:**
1. User pilih produk (search by nama/kode/barcode)
2. Input jumlah barcode yang ingin dicetak per produk
3. Preview barcode (menggunakan library JS, misalnya `jsbarcode`)
4. Print langsung ke browser / ekspor

#### B. Routes

```php
Route::get('/barcodes', [BarcodeController::class, 'index'])->name('barcodes.index');
Route::post('/barcodes/generate', [BarcodeController::class, 'generate'])->name('barcodes.generate');
Route::get('/barcodes/print', [BarcodeController::class, 'print'])->name('barcodes.print');
```

#### C. npm Package

```bash
npm install jsbarcode --legacy-peer-deps
```

#### D. Page: `Barcodes/Index.jsx`

**Layout:**
1. **Area pilih produk:**
   - Search produk (autocomplete)
   - Tabel: nama barang, kode, barcode, jumlah cetak (input number)
   - Tombol Tambah / Hapus dari list
2. **Pengaturan cetak:**
   - Ukuran label (pilihan: kecil/sedang/besar)
   - Tampilkan nama barang (checkbox)
   - Tampilkan harga (checkbox)
   - Margin (input number)
3. **Preview area:**
   - Tampilkan barcode dengan JsBarcode (EAN-13)
   - Layout grid sesuai pengaturan
4. **Tombol aksi:**
   - Cetak (window.print)
   - Preview full page

---

## 8. Modul 7 — Penjualan Tempo (Piutang)

### Database (SUDAH ADA — Kolom di tabel `sales`)

Kolom yang relevan di tabel `sales`:
- `payment_type` — enum: `cash`, `transfer`, `tempo`
- `payment_status` — enum: `paid`, `partial`, `unpaid`
- `due_date` — date (nullable) → tanggal jatuh tempo
- `paid` — decimal → jumlah yang sudah dibayar
- `total` — decimal → total tagihan

Tabel `sale_payments` sudah mendukung pembayaran bertahap/cicilan.

### Yang Perlu Dibuat

#### A. Controller: `SaleTempoController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /sales-tempo` | List penjualan tempo/piutang |
| `show(Sale)` | `GET /sales-tempo/{sale}` | Detail + riwayat pembayaran |
| `addPayment(Request, Sale)` | `POST /sales-tempo/{sale}/payments` | Tambah pembayaran cicilan |

**Logika bisnis:**
1. Filter penjualan yang `payment_type = 'tempo'`
2. Filter status: semua / belum lunas / sudah jatuh tempo / akan jatuh tempo
3. Saat tambah pembayaran:
   - Update `paid` di sales
   - Jika `paid >= total` → update `payment_status = 'paid'`
   - Jika `paid > 0 && paid < total` → `payment_status = 'partial'`
4. Hitung sisa tagihan = `total - paid`

**Validasi `addPayment`:**
```php
'amount'       => 'required|numeric|min:1',
'method'       => 'required|in:cash,transfer,ewallet,qris',
'payment_date' => 'required|date',
'notes'        => 'nullable|string',
```

#### B. Routes

```php
Route::get('/sales-tempo', [SaleTempoController::class, 'index'])->name('sales-tempo.index');
Route::get('/sales-tempo/{sale}', [SaleTempoController::class, 'show'])->name('sales-tempo.show');
Route::post('/sales-tempo/{sale}/payments', [SaleTempoController::class, 'addPayment'])->name('sales-tempo.add-payment');
```

#### C. Pages

1. **`SalesTempo/Index.jsx`** — List piutang
   - Kolom: No, No. Invoice, Pelanggan, Tanggal, Jatuh Tempo, Total, Dibayar, Sisa, Status
   - Badge warna:
     - Merah: sudah lewat jatuh tempo
     - Kuning: mendekati jatuh tempo (≤7 hari)
     - Hijau: masih jauh dari jatuh tempo
     - Abu: lunas
   - Filter: status (semua/belum lunas/jatuh tempo/akan jatuh tempo), customer, rentang tanggal
   - Pagination

2. **`SalesTempo/Show.jsx`** — Detail piutang
   - Info invoice, customer, tanggal, jatuh tempo
   - Tabel item penjualan
   - Progress bar: paid/total
   - Riwayat pembayaran (tabel)
   - Form tambah pembayaran (inline)

---

## 9. Modul 8 — Settings

### Database (SUDAH ADA)

**Tabel `settings`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | bigint PK | |
| key | string (unique) | Kunci setting |
| value | text (nullable) | Nilai |
| group | string (default 'general') | Grup setting |
| created_at / updated_at | timestamps | |

### Yang Perlu Dibuat

#### A. Model: `Setting.php`

```php
fillable: ['key', 'value', 'group']
// Static helper methods:
// Setting::get($key, $default)
// Setting::set($key, $value, $group)
```

#### B. Controller: `SettingController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /settings` | Halaman setting |
| `update(Request)` | `PUT /settings` | Simpan semua setting |

#### C. Grup Setting

##### 1. `general` — Umum
| Key | Label | Tipe | Default |
|-----|-------|------|---------|
| `app_name` | Nama Aplikasi | text | NEXAPOS |
| `app_logo` | Logo | file (image) | null |
| `company_name` | Nama Perusahaan | text | — |
| `company_address` | Alamat | textarea | — |
| `company_phone` | Telepon | text | — |
| `company_email` | Email | text | — |

##### 2. `invoice` — Dokumen Transaksi
| Key | Label | Tipe | Default |
|-----|-------|------|---------|
| `invoice_prefix` | Prefix Invoice | text | INV |
| `invoice_logo` | Logo Invoice | file | null |
| `invoice_footer` | Footer Invoice | textarea | — |
| `return_prefix` | Prefix Nota Retur | text | RTJ |
| `purchase_return_prefix` | Prefix Retur Pembelian | text | RTB |
| `transfer_prefix` | Prefix Transfer | text | TRF |

##### 3. `pos` — Kasir
| Key | Label | Tipe | Default |
|-----|-------|------|---------|
| `pos_default_customer` | Pelanggan Default | select | 1 (Pelanggan Umum) |
| `pos_default_warehouse` | Gudang Default | select | 1 (Gudang Utama) |
| `pos_clear_after_save` | Bersihkan Form Setelah Simpan | toggle | true |
| `pos_show_grid` | Tampilan Grid | toggle | true |
| `pos_sound_enabled` | Suara Saat Tambah Barang | toggle | true |

##### 4. `tax` — Pajak
| Key | Label | Tipe | Default |
|-----|-------|------|---------|
| `tax_enabled` | Aktifkan Pajak | toggle | false |
| `tax_name` | Nama Pajak | text | PPN |
| `tax_percentage` | Persentase (%) | number | 11 |

##### 5. `piutang` — Notifikasi Piutang
| Key | Label | Tipe | Default |
|-----|-------|------|---------|
| `piutang_enabled` | Aktifkan Notifikasi Piutang | toggle | true |
| `piutang_default_due_days` | Jatuh Tempo Default (hari) | number | 30 |
| `piutang_warning_days` | Peringatan Sebelum Jatuh Tempo (hari) | number | 7 |

##### 6. `stock` — Notifikasi Stok
| Key | Label | Tipe | Default |
|-----|-------|------|---------|
| `stock_notification_enabled` | Aktifkan Notifikasi Stok | toggle | true |
| `stock_notification_threshold` | Threshold Stok Minimum | number | 10 |

#### D. Routes

```php
Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
Route::put('/settings', [SettingController::class, 'update'])->name('settings.update');
```

#### E. Page: `Settings/Index.jsx`

**Layout:** Tab-based form (6 tab sesuai grup).
- Setiap tab menampilkan setting sesuai grup
- Tombol Simpan per tab atau satu tombol simpan global
- Preview logo jika di-upload

#### F. Seeder: Tambah default settings

Tambahkan seed data ke `DatabaseSeeder.php` untuk semua key di atas.

---

## 10. Modul 9 — User Management

### Database (SUDAH ADA)

**Tabel `users`:** id, role_id (FK), name, avatar, email, password, is_active
**Tabel `roles`:** id, name, display_name, description
**Tabel `permissions`:** id, name, display_name, module
**Tabel `role_permissions`:** role_id, permission_id (pivot)

**Model sudah ada:** `User`, `Role`, `Permission`

### Yang Perlu Dibuat

#### A. Controller: `UserManagementController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /users` | List user |
| `store(Request)` | `POST /users` | Tambah user |
| `update(Request, User)` | `PUT /users/{user}` | Edit user |
| `destroy(User)` | `DELETE /users/{user}` | Hapus user (tidak bisa hapus diri sendiri) |
| `toggleActive(User)` | `PATCH /users/{user}/toggle-active` | Aktifkan/nonaktifkan user |

**Validasi `store`:**
```php
'name'     => 'required|string|max:255',
'email'    => 'required|email|unique:users,email',
'password' => 'required|string|min:8|confirmed',
'role_id'  => 'required|exists:roles,id',
```

**Validasi `update`:**
```php
'name'     => 'required|string|max:255',
'email'    => 'required|email|unique:users,email,' . $user->id,
'password' => 'nullable|string|min:8|confirmed',
'role_id'  => 'required|exists:roles,id',
```

#### B. Controller: `RoleController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `index()` | `GET /roles` | List role + permissions |
| `store(Request)` | `POST /roles` | Tambah role |
| `update(Request, Role)` | `PUT /roles/{role}` | Edit role + sync permissions |
| `destroy(Role)` | `DELETE /roles/{role}` | Hapus role (cek ada user/tidak) |

#### C. Routes

```php
Route::resource('users', UserManagementController::class)->except(['show', 'create', 'edit']);
Route::patch('/users/{user}/toggle-active', [UserManagementController::class, 'toggleActive'])->name('users.toggle-active');
Route::resource('roles', RoleController::class)->except(['show', 'create', 'edit']);
```

#### D. Pages

1. **`Users/Index.jsx`** — List user
   - Kolom: No, Nama, Email, Role, Status, Aksi
   - Modal tambah/edit user
   - Dropdown role
   - Toggle aktif/nonaktif
   - Tidak bisa hapus/nonaktifkan diri sendiri

2. **`Roles/Index.jsx`** — List role + permission assignment
   - Kolom: No, Nama Role, Jumlah User, Jumlah Permission, Aksi
   - Modal tambah/edit role
   - Checkbox grid permissions per module
   - Tidak bisa hapus role yang masih ada usernya

---

## 11. Modul 10 — Notifikasi

### Database

Tidak perlu tabel baru. Mengambil data dari:
- `sales` (piutang jatuh tempo)
- `product_stocks` + `products.stock_minimum` (stok rendah)

### Yang Perlu Dibuat

#### A. Tambahan di `HandleInertiaRequests.php`

Tambahkan data notifikasi ke shared props:

```php
'notifications' => [
    'piutang_count'    => // jumlah piutang jatuh tempo + akan jatuh tempo
    'piutang_overdue'  => // jumlah sudah jatuh tempo
    'piutang_upcoming' => // jumlah akan jatuh tempo (≤7 hari)
    'low_stock_count'  => // jumlah produk dengan stok ≤ stock_minimum
],
```

#### B. Update `AppLayout.jsx`

Tambahkan icon Bell di header bar dengan badge:
- Badge merah: jumlah total notifikasi
- Dropdown saat diklik:
  - Section "Piutang": X piutang jatuh tempo, Y akan jatuh tempo → link ke `/sales-tempo`
  - Section "Stok": Z produk stok rendah → link ke `/products?filter=low-stock`

---

## 12. Modul 11 — Laporan Pembelian Per Invoice

### Yang Perlu Dibuat

#### A. Tambahan di `ReportController.php`

| Method | Route | Fungsi |
|--------|-------|--------|
| `purchasesByInvoice()` | `GET /reports/purchases-by-invoice` | Laporan pembelian per invoice |

**Logika:**
- Filter: rentang tanggal, supplier
- Data: No, No. Invoice, Supplier, Tanggal, Subtotal, Diskon, Pajak, Total, Status
- Summary: Total pembelian, total item

#### B. Routes

```php
Route::get('/reports/purchases-by-invoice', [ReportController::class, 'purchasesByInvoice'])->name('reports.purchases-by-invoice');
```

#### C. Page: `Reports/PurchasesByInvoice.jsx`

- Filter tanggal, supplier
- Tabel data pembelian
- Summary total
- Pagination

---

## 13. Update Sidebar & Navigasi

### Struktur Menu Baru (NAV_ITEMS)

```javascript
const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', route: 'dashboard' },
    { icon: ShoppingBag, label: 'POS Kasir', route: 'pos.index' },
    {
        icon: Package, label: 'Produk', children: [
            { label: 'Daftar Produk', route: 'products.index' },
            { label: 'Kategori', route: 'categories.index' },
            { label: 'Cetak Barcode', route: 'barcodes.index' },
        ]
    },
    {
        icon: Warehouse, label: 'Gudang', children: [
            { label: 'Daftar Gudang', route: 'warehouses.index' },
            { label: 'Transfer Barang', route: 'stock-transfers.index' },
        ]
    },
    { icon: TruckIcon, label: 'Supplier', route: 'suppliers.index' },
    { icon: Users, label: 'Pelanggan', route: 'customers.index' },
    {
        icon: CreditCard, label: 'Penjualan', children: [
            { label: 'Daftar Penjualan', route: 'sales.index' },
            { label: 'Penjualan Tempo', route: 'sales-tempo.index' },
            { label: 'Retur Penjualan', route: 'sale-returns.index' },
        ]
    },
    {
        icon: Box, label: 'Pembelian', children: [
            { label: 'Daftar Pembelian', route: 'purchases.index' },
            { label: 'Retur Pembelian', route: 'purchase-returns.index' },
        ]
    },
    {
        icon: BarChart3, label: 'Laporan', children: [
            { label: 'Penjualan Per Invoice', route: 'reports.sales-by-invoice' },
            { label: 'Penjualan Per Item', route: 'reports.sales-by-item' },
            { label: 'Pembelian Per Invoice', route: 'reports.purchases-by-invoice' },
        ]
    },
    {
        icon: Settings, label: 'Setting', children: [
            { label: 'Pengaturan', route: 'settings.index' },
            { label: 'User', route: 'users.index' },
            { label: 'Role & Permission', route: 'roles.index' },
        ]
    },
];
```

---

## 14. Permissions Baru

Tambahkan permissions berikut ke seeder:

| Permission Name | Module | Display Name |
|----------------|--------|-------------|
| `suppliers.view` | suppliers | Suppliers View |
| `suppliers.manage` | suppliers | Suppliers Manage |
| `warehouses.view` | warehouses | Warehouses View |
| `warehouses.manage` | warehouses | Warehouses Manage |
| `sale-returns.view` | sale-returns | Sale Returns View |
| `sale-returns.manage` | sale-returns | Sale Returns Manage |
| `purchase-returns.view` | purchase-returns | Purchase Returns View |
| `purchase-returns.manage` | purchase-returns | Purchase Returns Manage |
| `stock-transfers.view` | stock-transfers | Stock Transfers View |
| `stock-transfers.manage` | stock-transfers | Stock Transfers Manage |
| `barcodes.view` | barcodes | Barcodes View |
| `users.view` | users | Users View |
| `users.manage` | users | Users Manage |
| `roles.manage` | roles | Roles Manage |

---

## 15. Urutan Eksekusi

Implementasi dilakukan secara berurutan berdasarkan dependensi:

| Fase | Modul | Alasan Urutan |
|------|-------|---------------|
| **1** | Setting + Model Setting | Fondasi konfigurasi, dipakai modul lain |
| **2** | Supplier | Simple CRUD, tidak ada dependensi |
| **3** | Gudang (Warehouse) | Simple CRUD, dibutuhkan Transfer Barang |
| **4** | Transfer Barang | Butuh Gudang |
| **5** | Retur Penjualan | Butuh Sale yang sudah ada |
| **6** | Retur Pembelian | Butuh Purchase + model baru |
| **7** | Penjualan Tempo | Butuh Sale yang sudah ada |
| **8** | User Management | Butuh Role/Permission yang sudah ada |
| **9** | Cetak Barcode | Butuh Product yang sudah ada + npm package |
| **10** | Laporan Pembelian | Butuh Purchase yang sudah ada |
| **11** | Notifikasi | Butuh data Piutang + Stok |
| **12** | Update Sidebar | Setelah semua route terdaftar |

### Estimasi File Yang Dibuat

| Kategori | Jumlah File |
|----------|-------------|
| Models baru | 3 (Setting, PurchaseReturn, PurchaseReturnDetail) |
| Controllers baru | 8 |
| React Pages baru | 14 |
| Route updates | 1 (web.php) |
| Middleware updates | 1 (HandleInertiaRequests.php) |
| Seeder updates | 1 (DatabaseSeeder.php) |
| Layout updates | 1 (AppLayout.jsx) |
| **Total** | **~29 file** |

---

## Catatan Teknis

1. **Tidak perlu migration baru** — Semua tabel sudah ada di migration yang existing
2. **Tidak perlu npm package baru** kecuali `jsbarcode` untuk modul Cetak Barcode
3. **Design system** tetap menggunakan Web3-style light theme, glassmorphism, blue-teal gradient
4. **Komponen UI** yang sudah ada: Modal, Button, Input, Select, Card, Badge, Pagination (di `resources/js/Components/`)
5. **Format currency** sudah ada di `resources/js/utils/format.js`
6. **Semua page** menggunakan `AppLayout` sebagai layout wrapper
