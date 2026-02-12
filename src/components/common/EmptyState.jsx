import React from 'react';

export default function EmptyState({ 
    icon, 
    title = 'Nessun elemento', 
    message = 'Non ci sono elementi da mostrare.',
    action,
    className = '' 
}) {
    return (
        <div className={`text-center py-12 ${className}`}>
            {icon && (
                <div className="flex justify-center mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {message}
            </p>
            {action && (
                <div className="mt-6">
                    {action}
                </div>
            )}
        </div>
    );
}

