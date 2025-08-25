import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { FontDefinition } from '../types';
import { Search } from 'lucide-react';

interface FontSelectorProps {
    availableFonts: FontDefinition[];
    selectedFont: string;
    onSelectFont: (fontName: string) => void;
}

const FONT_PAGE_SIZE = 30;

const FontSelector: React.FC<FontSelectorProps> = ({ availableFonts, selectedFont, onSelectFont }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(FONT_PAGE_SIZE);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredFonts = useMemo(() => {
        if (!searchQuery) return availableFonts;
        return availableFonts.filter(font =>
            font.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, availableFonts]);
    
    const visibleFonts = useMemo(() => {
        return filteredFonts.slice(0, visibleCount);
    }, [filteredFonts, visibleCount]);

    const handleScroll = useCallback(() => {
        if (listRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = listRef.current;
            if (scrollHeight - scrollTop < clientHeight + 100 && visibleCount < filteredFonts.length) {
                setVisibleCount(prev => prev + FONT_PAGE_SIZE);
            }
        }
    }, [visibleCount, filteredFonts.length]);

    const handleSelect = (fontName: string) => {
        onSelectFont(fontName);
        setIsOpen(false);
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Reset state when opening
            setSearchQuery('');
            setVisibleCount(FONT_PAGE_SIZE);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
             <label className="block text-xs font-medium text-gray-400">Fonte</label>
            <button
                onClick={toggleOpen}
                className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-3 py-1.5 text-white text-left flex justify-between items-center"
            >
                <span style={{ fontFamily: `'${selectedFont}', sans-serif` }}>{selectedFont}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-60 flex flex-col">
                    <div className="p-2 border-b border-zinc-700 sticky top-0 bg-zinc-800">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500"/>
                            <input
                                type="text"
                                placeholder="Pesquisar fontes..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setVisibleCount(FONT_PAGE_SIZE); // Reset count on new search
                                }}
                                className="w-full bg-zinc-900 border border-zinc-600 rounded-md pl-8 pr-2 py-1 text-white text-sm"
                            />
                        </div>
                    </div>
                    <div ref={listRef} onScroll={handleScroll} className="overflow-y-auto flex-grow">
                        {visibleFonts.map(font => (
                            <button
                                key={font.name}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelect(font.name)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 ${selectedFont === font.name ? 'text-purple-400' : 'text-white'}`}
                                style={{ fontFamily: `'${font.name}', sans-serif` }}
                            >
                                {font.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FontSelector;
