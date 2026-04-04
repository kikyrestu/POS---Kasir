import { useState } from 'react';
import { X } from 'lucide-react';

export function Modal({ show, onClose, title, children, maxWidth = 'md' }) {
    if (!show) return null;

    const widthClass = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    }[maxWidth];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative bg-white rounded-2xl shadow-xl w-full ${widthClass} mx-4 max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
        danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
        ghost: 'hover:bg-slate-100 text-slate-600',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
            {children}
        </button>
    );
}

export function Input({ label, error, className = '', ...props }) {
    return (
        <div className={className}>
            {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
            <input
                className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-400 shadow-sm ${error ? 'border-red-300' : 'border-slate-200'}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

export function Select({ label, error, children, className = '', ...props }) {
    return (
        <div className={className}>
            {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
            <select
                className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all shadow-sm ${error ? 'border-red-300' : 'border-slate-200'}`}
                {...props}
            >
                {children}
            </select>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

export function Card({ children, className = '' }) {
    return (
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.02)] ${className}`}>
            {children}
        </div>
    );
}

export function Badge({ children, variant = 'default' }) {
    const variants = {
        default: 'bg-slate-100 text-slate-600 border-slate-200',
        success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        warning: 'bg-amber-50 text-amber-600 border-amber-200',
        danger: 'bg-red-50 text-red-600 border-red-200',
        info: 'bg-blue-50 text-blue-600 border-blue-200',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${variants[variant]}`}>
            {children}
        </span>
    );
}

export function Pagination({ links }) {
    if (!links || links.length <= 3) return null;

    return (
        <div className="flex items-center justify-center gap-1 mt-6">
            {links.map((link, i) => (
                <a
                    key={i}
                    href={link.url}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        link.active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : link.url
                            ? 'text-slate-600 hover:bg-slate-100'
                            : 'text-slate-300 cursor-not-allowed'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}
