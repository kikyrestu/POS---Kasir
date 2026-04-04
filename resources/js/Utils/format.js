export function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatNumber(value) {
    return new Intl.NumberFormat('id-ID').format(value);
}

export function formatCompact(value) {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}K`;
    return `Rp ${value}`;
}
