import React from 'react';

export default function MembersSearch({ value, onChange, placeholder = 'Cerca membri...' }) {
    return (
        <div className="relative flex-1 ui-float">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange && onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:focus:ring-blue-400/60 focus:border-transparent transition-all"
            />
        </div>
    );
}

