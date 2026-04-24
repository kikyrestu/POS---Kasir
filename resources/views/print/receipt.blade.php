<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Struk {{ $sale->invoice_number }}</title>
    <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 0; width: 58mm; color: #000; }
        @media print {
            body { width: 58mm; margin: 0; padding: 0; }
            @page { margin: 0; }
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .border-top { border-top: 1px dashed #000; }
        .border-bottom { border-bottom: 1px dashed #000; }
        .mb-1 { margin-bottom: 5px; }
        .font-bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 2px 0; }
        .store-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    </style>
</head>
<body onload="window.print()">
    <div class="text-center border-bottom mb-1" style="padding-bottom: 5px; margin-top: 10px;">
        <div class="store-name">{{ $store['store_name'] ?? 'NEXAPOS' }}</div>
        <div>{{ $store['store_address'] ?? '' }}</div>
        <div>{{ $store['store_phone'] ?? '' }}</div>
    </div>
    
    <div class="mb-1">
        <div>No: {{ $sale->invoice_number }}</div>
        <div>Tgl: {{ $sale->created_at->format('d/m/Y H:i') }}</div>
        <div>Kasir: {{ $sale->user->name ?? '-' }}</div>
        <div>Plg: {{ $sale->customer->name ?? 'Umum' }}</div>
    </div>

    <table class="border-top border-bottom mb-1" style="padding: 5px 0;">
        @foreach($sale->details as $item)
        <tr>
            <td colspan="3">{{ $item->product->name ?? 'Item' }}</td>
        </tr>
        <tr>
            <td>{{ $item->quantity }} x</td>
            <td>{{ number_format($item->unit_price, 0, ',', '.') }}</td>
            <td class="text-right">{{ number_format($item->subtotal, 0, ',', '.') }}</td>
        </tr>
        @endforeach
    </table>

    <table class="mb-1">
        <tr>
            <td>Total</td>
            <td class="text-right">{{ number_format($sale->total, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td>Bayar</td>
            <td class="text-right">{{ number_format($sale->paid, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td>Kembali</td>
            <td class="text-right">{{ number_format($sale->change_amount, 0, ',', '.') }}</td>
        </tr>
    </table>

    <div class="text-center border-top" style="padding-top: 5px;">
        <div>{{ $store['receipt_footer'] ?? 'Terima kasih atas kunjungan Anda' }}</div>
    </div>
</body>
</html>
