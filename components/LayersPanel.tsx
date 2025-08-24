

import React, { useState, useRef } from 'react';
import { Post, AnyElement, TextElement, BackgroundElement } from '../types';
import { Plus, Trash2, Type, Image as ImageIcon, GitCommitHorizontal, Square, Circle, QrCode, Copy, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

interface LayersPanelProps {
    selectedPost: Post | undefined;
    selectedElementId: string | null;
    onSelectElement: (id: string | null) => void;
    onUpdateElement: (elementId: string, updates: Partial<AnyElement>) => void;
    onAddElement: (type: 'text' | 'image' | 'gradient' | 'shape' | 'qrcode', options?: { src?: string; shape?: 'rectangle' | 'circle' }) => void;
    onRemoveElement: (elementId:string) => void;
    onDuplicateElement: (elementId:string) => void;
    onToggleVisibility: (elementId:string) => void;
    onToggleLock: (elementId:string) => void;
    onReorderElements: (sourceId: string, destinationId: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = (props) => {
    const { 
        selectedPost, selectedElementId, onSelectElement, onAddElement, onRemoveElement, 
        onDuplicateElement, onToggleVisibility, onToggleLock, onReorderElements,
    } = props;
    
    const [isAddMenuOpen, setAddMenuOpen] = useState(false);
    const dragItem = useRef<string | null>(null);
    const dragOverItem = useRef<string | null>(null);

    const handleAddClick = (type: 'text' | 'shape' | 'qrcode', options?: any) => {
        onAddElement(type, options);
        setAddMenuOpen(false);
    };

    if (!selectedPost) return <div className="p-4 text-sm text-zinc-500">Selecione um post para ver suas camadas.</div>;

    
    const LayerItem: React.FC<{element: Exclude<AnyElement, BackgroundElement>}> = ({ element }) => (
        <li
            draggable={!element.locked}
            onDragStart={() => dragItem.current = element.id}
            onDragEnter={() => dragOverItem.current = element.id}
            onDragEnd={() => {
                if(dragItem.current && dragOverItem.current && dragItem.current !== dragOverItem.current) {
                    onReorderElements(dragItem.current, dragOverItem.current);
                }
                dragItem.current = null; dragOverItem.current = null;
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => onSelectElement(element.id)}
            className={`flex items-center p-2 rounded text-sm transition-all duration-200 ${!element.locked ? 'cursor-pointer' : 'cursor-default'} ${selectedElementId === element.id ? 'animated-gradient-bg text-white' : 'bg-zinc-800/50 hover:bg-zinc-800'} ${!element.visible ? 'opacity-50' : ''}`}
        >
            <span className="truncate flex-1">{element.type === 'text' ? (element as TextElement).content : `Camada ${element.type.charAt(0).toUpperCase() + element.type.slice(1)}`}</span>
            <div className="flex items-center space-x-1 ml-2">
                <button onClick={(e) => { e.stopPropagation(); onDuplicateElement(element.id); }} className="p-1 hover:bg-white/20 rounded"><Copy className="w-3 h-3"/></button>
                <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }} className="p-1 hover:bg-white/20 rounded">{element.visible ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}</button>
                <button onClick={(e) => { e.stopPropagation(); onToggleLock(element.id); }} className="p-1 hover:bg-white/20 rounded">{element.locked ? <Lock className="w-3 h-3"/> : <Unlock className="w-3 h-3"/>}</button>
                <button onClick={(e) => { e.stopPropagation(); onRemoveElement(element.id); }} className="p-1 hover:bg-red-500/50 rounded"><Trash2 className="w-3 h-3"/></button>
            </div>
        </li>
    );

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-200">Camadas</h2>
                <div className="relative">
                    <button onClick={() => setAddMenuOpen(!isAddMenuOpen)} className="p-1 hover:bg-zinc-700 rounded"><Plus className="w-5 h-5" /></button>
                    {isAddMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-zinc-800 rounded-md shadow-lg z-20 border border-zinc-700 p-1">
                            <button onClick={() => handleAddClick('text')} className="w-full text-left flex items-center p-2 text-sm rounded hover:bg-zinc-700"><Type className="w-4 h-4 mr-2"/> Texto</button>
                            <button onClick={() => handleAddClick('shape', {shape: 'rectangle'})} className="w-full text-left flex items-center p-2 text-sm rounded hover:bg-zinc-700"><Square className="w-4 h-4 mr-2"/> Retângulo</button>
                            <button onClick={() => handleAddClick('shape', {shape: 'circle'})} className="w-full text-left flex items-center p-2 text-sm rounded hover:bg-zinc-700"><Circle className="w-4 h-4 mr-2"/> Círculo</button>
                            <button onClick={() => handleAddClick('qrcode')} className="w-full text-left flex items-center p-2 text-sm rounded hover:bg-zinc-700"><QrCode className="w-4 h-4 mr-2"/> QR Code</button>
                        </div>
                    )}
                </div>
            </div>
            <ul className="space-y-1 flex-grow overflow-y-auto layers-scrollbar pr-2">
                 {selectedPost.elements.find(e => e.type === 'background') && (
                    <li onClick={() => onSelectElement(selectedPost.elements.find(e => e.type === 'background')!.id)} className={`flex justify-between items-center p-2 rounded text-sm cursor-pointer ${selectedElementId === selectedPost.elements.find(e => e.type === 'background')!.id ? 'animated-gradient-bg text-white' : 'bg-zinc-800/50 hover:bg-zinc-800'}`}>
                        Fundo
                    </li>
                 )}
                {[...selectedPost.elements].reverse().map(element => (
                    element.type !== 'background' ? <LayerItem key={element.id} element={element as Exclude<AnyElement, BackgroundElement>} /> : null
                ))}
            </ul>
        </div>
    );
};

export default LayersPanel;