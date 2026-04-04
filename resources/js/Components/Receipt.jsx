import { forwardRef } from 'react';
import { formatCurrency } from '@/Utils/format';

const Receipt = forwardRef(({ sale, store = {}, cashier = '' }, ref) => {
    const storeName = store.store_name || 'NEXAPOS';
    const storeAddress = store.store_address || '';
    const storePhone = store.store_phone || '';
    const receiptHeader = store.receipt_header || '';
    const receiptFooter = store.receipt_footer || 'Terima kasih atas kunjungan Anda!';

    const paymentLabel = {
        cash: 'Tunai',
        transfer: 'Transfer',
        tempo: 'Tempo',
    };

    return (
        <div ref={ref} className="receipt-content">
            <style>{`
                .receipt-content {
                    width: 80mm;
                    max-width: 100%;
                    margin: 0 auto;
                    padding: 8px 12px;
                    font-family: 'Courier New', 'Lucida Console', monospace;
                    font-size: 12px;
                    color: #000;
                    background: #fff;
                    line-height: 1.4;
                }
                .receipt-content .receipt-center { text-align: center; }
                .receipt-content .receipt-right { text-align: right; }
                .receipt-content .receipt-bold { font-weight: bold; }
                .receipt-content .receipt-store-name {
                    font-size: 18px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 2px;
                }
                .receipt-content .receipt-store-info {
                    text-align: center;
                    font-size: 11px;
                    color: #333;
                    margin-bottom: 4px;
                }
                .receipt-content .receipt-divider {
                    border: none;
                    border-top: 1px dashed #000;
                    margin: 6px 0;
                }
                .receipt-content .receipt-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                }
                .receipt-content .receipt-row .receipt-label {
                    flex-shrink: 0;
                }
                .receipt-content .receipt-row .receipt-value {
                    text-align: right;
                    flex-shrink: 0;
                }
                .receipt-content .receipt-item-name {
                    font-weight: bold;
                    margin-bottom: 0;
                }
                .receipt-content .receipt-item-detail {
                    display: flex;
                    justify-content: space-between;
                    padding-left: 8px;
                    font-size: 11px;
                }
                .receipt-content .receipt-total-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 16px;
                    font-weight: bold;
                    padding: 4px 0;
                }
                .receipt-content .receipt-footer {
                    text-align: center;
                    font-size: 11px;
                    margin-top: 8px;
                    color: #333;
                }
            `}</style>

            {/* Store Header */}
            <div className="receipt-store-name">{storeName}</div>
            {storeAddress && <div className="receipt-store-info">{storeAddress}</div>}
            {storePhone && <div className="receipt-store-info">Telp: {storePhone}</div>}
            {receiptHeader && <div className="receipt-store-info">{receiptHeader}</div>}

            <hr className="receipt-divider" />

            {/* Transaction Info */}
            <div className="receipt-row"><span>No</span><span>{sale.invoice_number}</span></div>
            <div className="receipt-row"><span>Tgl</span><span>{sale.sale_date || new Date().toLocaleDateString('id-ID')}</span></div>
            <div className="receipt-row"><span>Kasir</span><span>{cashier || sale.user?.name || '-'}</span></div>
            <div className="receipt-row"><span>Pelanggan</span><span>{sale.customer?.name || 'Umum'}</span></div>

            <hr className="receipt-divider" />

            {/* Items */}
            {sale.details?.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                    <div className="receipt-item-name">{item.product?.name}</div>
                    <div className="receipt-item-detail">
                        <span>{item.quantity} x {formatCurrency(item.unit_price)}{item.discount > 0 ? ` - Disk ${formatCurrency(item.discount)}` : ''}</span>
                        <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                </div>
            ))}

            <hr className="receipt-divider" />

            {/* Totals */}
            <div className="receipt-row"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
            {sale.discount_amount > 0 && (
                <div className="receipt-row"><span>Diskon{sale.discount_percent > 0 ? ` (${sale.discount_percent}%)` : ''}</span><span>-{formatCurrency(sale.discount_amount)}</span></div>
            )}
            {sale.tax > 0 && (
                <div className="receipt-row"><span>Pajak</span><span>+{formatCurrency(sale.tax)}</span></div>
            )}

            <hr className="receipt-divider" />

            <div className="receipt-total-row"><span>TOTAL</span><span>{formatCurrency(sale.total)}</span></div>

            <div className="receipt-row"><span>Bayar ({paymentLabel[sale.payment_type] || sale.payment_type})</span><span>{formatCurrency(sale.paid)}</span></div>
            {sale.change_amount > 0 && (
                <div className="receipt-row receipt-bold"><span>Kembali</span><span>{formatCurrency(sale.change_amount)}</span></div>
            )}
            {sale.payment_type === 'tempo' && sale.due_date && (
                <div className="receipt-row"><span>Jatuh Tempo</span><span>{sale.due_date}</span></div>
            )}

            <hr className="receipt-divider" />

            {/* Footer */}
            {sale.notes && <div className="receipt-footer" style={{ fontStyle: 'italic' }}>Catatan: {sale.notes}</div>}
            <div className="receipt-footer">{receiptFooter}</div>
            <div className="receipt-footer" style={{ marginTop: '4px', fontSize: '10px' }}>
                Dicetak: {new Date().toLocaleString('id-ID')}
            </div>
        </div>
    );
});

Receipt.displayName = 'Receipt';

export default Receipt;
