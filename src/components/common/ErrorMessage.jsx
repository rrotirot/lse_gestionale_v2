import React from 'react';

export default function ErrorMessage({ error, onRetry, className = '' }) {
    if (!error) return null;

    return (
        <div className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 ${className}`}>
            <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        {error}
                    </p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                        >
                            Riprova
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

