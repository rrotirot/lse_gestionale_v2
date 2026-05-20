import React, { useState, useRef, useEffect } from 'react';

export default function MembersFilters({ 
    filterValue, 
    onFilterChange, 
    filterOptions = [] 
}) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Trova l'opzione selezionata
    const selectedOption = filterOptions.find(opt => opt.value === filterValue) || filterOptions[0];

    // Chiudi dropdown quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const handleOptionSelect = (value) => {
        if (onFilterChange) {
            onFilterChange(value);
        }
        setIsDropdownOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative ui-float flex items-center gap-2 pl-10 pr-10 py-2.5 rounded-lg border border-white/10 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:focus:ring-blue-400/60 focus:border-transparent transition-all cursor-pointer min-w-[200px] text-left"
            >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                </div>
                <span className="flex-1 truncate">{selectedOption?.label || 'Seleziona filtro'}</span>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg 
                        className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-lg ui-float bg-[#0f131a] border border-white/10 shadow-xl overflow-hidden transform transition-all duration-200 ease-out origin-top">
                    <div 
                        className="max-h-64 overflow-y-auto"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgb(75 85 99) transparent'
                        }}
                    >
                        {filterOptions.map((option, index) => {
                            // Gestisci separatori
                            if (option.type === 'separator') {
                                return (
                                    <div
                                        key={index}
                                        className="px-4 py-2 text-xs text-gray-300/80 font-medium text-center bg-white/5 border-t border-white/10"
                                    >
                                        {option.label}
                                    </div>
                                );
                            }

                            const isSelected = option.value === filterValue;
                            return (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleOptionSelect(option.value)}
                                    className={`w-full px-4 py-3 text-left text-sm transition-colors duration-150 ${
                                        isSelected
                                            ? 'bg-blue-500/15 text-blue-200 font-medium'
                                            : 'text-gray-100 hover:bg-white/5'
                                    } ${index === 0 ? 'rounded-t-lg' : ''} ${index === filterOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{option.label}</span>
                                        {isSelected && (
                                            <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

