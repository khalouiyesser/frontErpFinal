import React from 'react';
import { cn } from '../../utils';

interface ClientAvatarProps {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
};

export const ClientAvatar: React.FC<ClientAvatarProps> = ({ name, size = 'md', className }) => (
    <div className={cn(
        'rounded-xl bg-gradient-to-br from-blue-500 to-blue-600',
        'flex items-center justify-center shrink-0 shadow-sm',
        sizeMap[size],
        className,
    )}>
    <span className="text-white font-bold leading-none">
      {(name || '?').charAt(0).toUpperCase()}
    </span>
    </div>
);