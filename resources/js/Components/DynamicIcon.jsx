import React from 'react';
import * as icons from 'lucide-react';

export default function DynamicIcon({ name, className = "w-5 h-5", fallback = "Tag" }) {
    if (!name) {
        const FallbackIcon = icons[fallback];
        return FallbackIcon ? <FallbackIcon className={className} /> : null;
    }

    // capitalize the first letter to match lucide-react naming if needed, though they are usually PascalCase
    const IconComponent = icons[name] || icons[fallback] || icons['Tag'];
    
    if (!IconComponent) return null;
    return <IconComponent className={className} />;
}
