export default function ApplicationLogo({ className = '' }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 01-8 0" />
                </svg>
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent tracking-tight">NEXAPOS</span>
        </div>
    );
}
