import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Plus } from 'lucide-react';
import { createPortal } from 'react-dom';

const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select...",
    label,
    onAddNew,
    addNewLabel = "Add New"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 });
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Update position when opening or scrolling
    const updatePosition = () => {
        if (wrapperRef.current && isOpen) {
            const rect = wrapperRef.current.getBoundingClientRect();
            // Check if there's enough space below, otherwise show above
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const showAbove = spaceBelow < 200 && spaceAbove > 200;

            setDropdownPosition({
                top: showAbove ? rect.top - 250 : rect.bottom + 5, // Simple offset
                left: rect.left,
                width: rect.width,
                maxHeight: 250,
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                // Check if click is inside the portal dropdown
                const dropdown = document.getElementById('searchable-select-dropdown');
                if (dropdown && !dropdown.contains(event.target)) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Filter options
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleAddNew = () => {
        onAddNew();
        setIsOpen(false);
        setSearchTerm('');
    };

    const dropdownContent = (
        <div
            id="searchable-select-dropdown"
            className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl flex flex-col"
            style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                maxHeight: dropdownPosition.maxHeight,
            }}
        >
            <div className="p-2 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-md">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-1">
                {onAddNew && (
                    <div
                        className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer font-medium rounded-md flex items-center gap-2 mb-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddNew();
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        {addNewLabel}
                    </div>
                )}

                {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`px-3 py-2 text-sm cursor-pointer rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center ${option.value === value
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(option.value);
                            }}
                        >
                            <span>{option.label}</span>
                            {option.value === value && <Check className="h-4 w-4" />}
                        </div>
                    ))
                ) : (
                    <div className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                        No results found
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus-within:ring-2 focus-within:ring-blue-500 bg-white dark:bg-gray-700 cursor-pointer flex justify-between items-center"
                onClick={() => {
                    setIsOpen(!isOpen);
                }}
            >
                <span className={`text-sm truncate mr-2 ${selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </div>

            {isOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default SearchableSelect;
