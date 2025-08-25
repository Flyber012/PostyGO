import React, { useState, useRef, useEffect } from 'react';
import { Post, AnyElement, TextElement, BackgroundElement, ShapeElement, ForegroundElement } from '../types';
import { Plus, Trash2, Type, Image as ImageIcon, GitCommitHorizontal, Square, Circle, QrCode, Copy, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown } from 'lucide-react';

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
    onMoveElement: (elementId: string, direction: 'up' | 'down') => void;
    onRenameElement: (elementId: string, newName: string) => void;
}

const getElementDisplayName = (element: ForegroundElement): string => {
    if (element.name) return element.name;
    switch (element.type) {
        case 'text': {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = (element as TextElement).content;
            const text = (tempDiv.textContent || tempDiv.innerText || '').trim();
            return text.substring(0, 50) || 'Texto Vazio';
        }
        case 'image':
            return 'Imagem';
        case 'gradient':
            return 'Gradiente';
        case 'shape':
            return (element as ShapeElement).shape === 'circle' ? 'Círculo' : 'Retângulo';
        case 'qrcode':
            return 'QR Code';
        default: {
            const _: never = element;
            return 'Elemento Desconhecido';
        }
    }
};

const LayersPanel: React.FC<LayersPanelProps> = (props) => {
    const { 
        selectedPost, selectedElementId, onSelectElement, onAddElement, onRemoveElement, 
        onDuplicateElement, onToggleVisibility, onToggleLock, onReorderElements, onMoveElement, onRenameElement
    } = props;
    
    const [isAddMenuOpen, setAddMenuOpen] = useState(false);
    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [tempName, setTempName] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    
    useEffect(() => {
        if (editingElementId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [editingElementId]);

    const handleAddClick = (type: 'text' | 'image' | 'shape' | 'qrcode', options?: any) => {
        onAddElement(type, options);
        setAddMenuOpen(false);
    };

    const handleStartEditing = (element: ForegroundElement) => {
        setEditingElementId(element.id);
        setTempName(getElementDisplayName(element));
    };

    const handleConfirmEdit = () => {
        if (editingElementId && tempName.trim()) {
            onRenameElement(editingElementId, tempName.trim());
        }
        setEditingElementId(null);
        setTempName('');
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirmEdit();
        else if (e.key === 'Escape') setEditingElementId(null);
    };

    // --- D&D Handlers ---
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('application/posty-layer-id', id);
        e.dataTransfer.effectAllowed = 'move';
        // Timeout to allow the browser to start the drag operation before updating state
        setTimeout(() => {
            setDraggingId(id);
        }, 0);
    };
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // This is essential to allow a drop
    };
    
    const handleDrop = (e: React.DragEvent, dropOnId: string) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('application/posty-layer-id');
        if (draggedId && draggedId !== dropOnId) {
            onReorderElements(draggedId, dropOnId);
        }
        setDraggingId(null); // Clean up on drop
    };

    const handleDragEnd = () => {
        setDraggingId(null); // Always clean up when drag ends
    };

    if (!selectedPost) return <div className="p-4 text-sm text-zinc-500">Selecione um post para ver suas camadas.</div>;
    
    const foregroundElements = selectedPost.elements.filter((e): e is ForegroundElement => e.type !== 'background');

    const LayerItem: React.FC<{element: ForegroundElement, index: number, total: number}> = ({ element, index, total }) => (
        <li
            draggable={!element.locked && !editingElementId}
            onDragStart={(e) => handleDragStart(e, element.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, element.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelectElement(element.id)}
            onDoubleClick={() => handleStartEditing(element)}
            className={`flex items-center p-2 rounded text-sm transition-all duration-200 group 
                ${!element.locked ? 'cursor-grab' : 'cursor-default'} 
                ${selectedElementId === element.id ? 'animated-gradient-bg text-white' : 'bg-zinc-800/50 hover:bg-zinc-800'} 
                ${!element.visible ? 'opacity-50' : ''}
                ${draggingId === element.id ? 'opacity-30' : 'opacity-100'}
            `}
        >
            {editingElementId === element.id ? (
                <input
                    ref={renameInputRef}
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleConfirmEdit}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-zinc-900 text-white rounded px-1 -mx-1 ring-2 ring-purple-500 outline-none"
                />
            ) : (
                <span className="truncate flex-1">{getElementDisplayName(element)}</span>
            )}

            <div className={`flex items-center space-x-1 ml-2 transition-opacity ${editingElementId || draggingId ? 'opacity-0' : 'opacity-100 group-hover:opacity-100'}`}>
                {/* Move Up List (decrease index) -> 'down' in z-index */}
                <button onClick={(e) => { e.stopPropagation(); onMoveElement(element.id, 'down'); }} disabled={index === 0} className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp className="w-3 h-3"/></button>
                {/* Move Down List (increase index) -> 'up' in z-index */}
                <button onClick={(e) => { e.stopPropagation(); onMoveElement(element.id, 'up'); }} disabled={index === total - 1} className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown className="w-3 h-3"/></button>
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
                            <button onClick={() => handleAddClick('image')} className="w-full text-left flex items-center p-2 text-sm rounded hover:bg-zinc-700"><ImageIcon className="w-4 h-4 mr-2"/> Imagem</button>
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
                {foregroundElements.map((element, index) => (
                    <LayerItem key={element.id} element={element} index={index} total={foregroundElements.length} />
                ))}
            </ul>
        </div>
    );
};

export default LayersPanel;