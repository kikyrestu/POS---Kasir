import React, { useState, useMemo } from 'react';
import * as icons from 'lucide-react';
import { Modal, Input } from '@/Components/UI';

export default function IconSelector({ show, onClose, onSelect }) {
    const [search, setSearch] = useState('');
    
    const CURATED_ICONS = [
        // Toko & Penjualan
        'Box', 'Package', 'Archive', 'ShoppingCart', 'ShoppingBag', 'ShoppingBasket', 'Store', 'Tag', 'Tags', 'Barcode', 'QrCode', 'Receipt', 'Ticket', 'Coins', 'Wallet', 'Banknote', 'CreditCard', 'BadgePercent', 'Percent', 'DollarSign',
        // Makanan & Minuman
        'Coffee', 'CupSoda', 'Wine', 'Beer', 'Pizza', 'Fish', 'Beef', 'Carrot', 'Apple', 'Banana', 'Cherry', 'Croissant', 'Egg', 'Milk', 'Wheat', 'Drumstick', 'Sandwich', 'Cake', 'Cookie', 'Candy', 'Soup', 'Bowl', 'IceCream', 'GlassWater', 'ChefHat', 'Utensils',
        // Pakaian & Aksesoris
        'Shirt', 'Briefcase', 'Glasses', 'Watch', 'Umbrella', 
        // Kesehatan & Kebersihan
        'Scissors', 'SprayCan', 'Bath', 'Thermometer', 'Pill', 'Syringe', 'Droplet',
        // Elektronik
        'Smartphone', 'Laptop', 'Tv', 'Monitor', 'Speaker', 'Headphones', 'Camera', 'Battery', 'Cpu', 'Plug', 'Mouse', 'Keyboard',
        // Rumah Tangga & Perkakas
        'Bed', 'Sofa', 'Home', 'Hammer', 'Wrench', 'Screwdriver', 'Paintbrush', 'HardHat',
        // Lain-lain
        'Gift', 'Heart', 'Star', 'Car', 'Bike', 'Truck', 'Book', 'Newspaper', 'Pen', 'Music', 'Gamepad', 'Flower', 'Leaf', 'Tree', 'Baby', 'Palette', 'Flame', 'Zap'
    ];
    
    const iconNames = useMemo(() => {
        return CURATED_ICONS.filter(key => 
            icons[key] && 
            (typeof icons[key] === 'function' || typeof icons[key] === 'object')
        );
    }, []);

    const filteredIcons = useMemo(() => {
        if (!search) return iconNames; 
        return iconNames
            .filter(name => name.toLowerCase().includes(search.toLowerCase()));
    }, [search, iconNames]);

    return (
        <Modal show={show} onClose={onClose} title="Pilih Icon Kategori" maxWidth="xl">
            <div className="space-y-4">
                <Input 
                    placeholder="Cari icon (misal: box, tag, shopping)..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    autoFocus
                />
                
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 h-[400px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                    {filteredIcons.map(name => {
                        const Icon = icons[name];
                        return (
                            <button
                                key={name}
                                type="button"
                                onClick={() => { onSelect(name); onClose(); }}
                                className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-slate-500 border border-transparent hover:border-blue-100 hover:shadow-sm transition-all"
                                title={name}
                            >
                                <Icon className="w-6 h-6" />
                            </button>
                        );
                    })}
                    {filteredIcons.length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-400">
                            <p>Icon tidak ditemukan</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
