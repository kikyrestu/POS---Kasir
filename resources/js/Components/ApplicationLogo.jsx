export default function ApplicationLogo({ className = '' }) {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <img 
                src="/images/logo.png" 
                alt="BuildyPOS Logo" 
                className="h-12 w-auto object-contain" 
            />
        </div>
    );
}
