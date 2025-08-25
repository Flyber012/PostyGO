

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
    onReorderElements: (sourceId: string, destinationId: string, position: 'before' | 'after') => void;
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
            // This should never be reached if all element types are handled
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

    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ targetId: string; position: 'before' | 'after' } | null>(null);
    
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

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('application/posty-layer-id', id);
        e.dataTransfer.effectAllowed = 'move';
        // Use a timeout to allow the browser to render the drag image before updating state
        setTimeout(() => {
            setDraggedId(id);
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) {
            setDropIndicator(null);
            return;
        };

        const rect = (e.currentTarget as HTMLLIElement).getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position = e.clientY < midpoint ? 'before' : 'after';

        if (dropIndicator?.targetId !== targetId || dropIndicator?.position !== position) {
            setDropIndicator({ targetId, position });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('application/posty-layer-id');
        if (sourceId && dropIndicator) {
            // Because the visual list is reversed from the z-index array,
            // dropping 'before' an item visually means placing it at a higher z-index,
            // which corresponds to 'after' it in the array's order.
            const finalPosition = dropIndicator.position === 'before' ? 'after' : 'before';
            onReorderElements(sourceId, dropIndicator.targetId, finalPosition);
        }
        setDraggedId(null);
        setDropIndicator(null);
    };
    
    const handleDragEnd = () => {
        setDraggedId(null);
        setDropIndicator(null);
    };

    if (!selectedPost) return <div className="p-4 text-sm text-zinc-500">Selecione um post para ver suas camadas.</div>;
    
    const foregroundElements = selectedPost.elements.filter((e): e is ForegroundElement => e.type !== 'background');
    // Render layers in reverse z-index order (item at index 0 is bottom-most, rendered last in the list)
    // This is the standard for layer panels (Photoshop, Figma, etc.)
    const visualElements = [...foregroundElements].reverse();

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
            <ul 
                className="space-y-1 flex-grow overflow-y-auto layers-scrollbar pr-2"
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()} // Allow dropping on the container itself
                onDragLeave={() => setDropIndicator(null)}
            >
                {/* Render layers: Top-most layer (highest z-index) appears at the top of the list */}
                {visualElements.map((element, visualIndex) => {
                     const isDragged = draggedId === element.id;
                     const isDropTargetBefore = dropIndicator?.targetId === element.id && dropIndicator.position === 'before';
                     const isDropTargetAfter = dropIndicator?.targetId === element.id && dropIndicator.position === 'after';

                    return (
                        <li
                            key={element.id}
                            draggable={!element.locked && !editingElementId}
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={(e) => handleDragOver(e, element.id)}
                            onClick={() => onSelectElement(element.id)}
                            onDoubleClick={() => handleStartEditing(element)}
                            className={`relative flex items-center p-2 rounded text-sm transition-all duration-150 group 
                                ${!element.locked && !editingElementId ? 'cursor-grab' : 'cursor-default'} 
                                ${selectedElementId === element.id ? 'animated-gradient-bg text-white' : 'bg-zinc-800/50 hover:bg-zinc-800'} 
                                ${!element.visible ? 'opacity-50' : ''}
                                ${isDragged ? 'opacity-40' : ''}
                            `}
                        >
                            {isDropTargetBefore && <div className="absolute top-[-2px] left-0 right-0 h-1 bg-purple-500 rounded-full z-10" />}
                            
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
                
                            <div className={`flex items-center space-x-1 ml-2 transition-opacity ${editingElementId || isDragged ? 'opacity-0' : 'opacity-100 group-hover:opacity-100'}`}>
                                <button onClick={(e) => { e.stopPropagation(); onMoveElement(element.id, 'up'); }} disabled={visualIndex === 0} className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp className="w-3 h-3"/></button>
                                <button onClick={(e) => { e.stopPropagation(); onMoveElement(element.id, 'down'); }} disabled={visualIndex === visualElements.length - 1} className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown className="w-3 h-3"/></button>
                                <button onClick={(e) => { e.stopPropagation(); onDuplicateElement(element.id); }} className="p-1 hover:bg-white/20 rounded"><Copy className="w-3 h-3"/></button>
                                <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }} className="p-1 hover:bg-white/20 rounded">{element.visible ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}</button>
                                <button onClick={(e) => { e.stopPropagation(); onToggleLock(element.id); }} className="p-1 hover:bg-white/20 rounded">{element.locked ? <Lock className="w-3 h-3"/> : <Unlock className="w-3 h-3"/>}</button>
                                <button onClick={(e) => { e.stopPropagation(); onRemoveElement(element.id); }} className="p-1 hover:bg-red-500/50 rounded"><Trash2 className="w-3 h-3"/></button>
                            </div>

                            {isDropTargetAfter && <div className="absolute bottom-[-2px] left-0 right-0 h-1 bg-purple-500 rounded-full z-10" />}
                        </li>
                    )
                })}

                {/* Background Layer */}
                {selectedPost.elements.find(e => e.type === 'background') && (
                    <li onClick={() => onSelectElement(selectedPost.elements.find(e => e.type === 'background')!.id)} className={`flex justify-between items-center p-2 rounded text-sm cursor-pointer ${selectedElementId === selectedPost.elements.find(e => e.type === 'background')!.id ? 'animated-gradient-bg text-white' : 'bg-zinc-800/50 hover:bg-zinc-800'}`}>
                        Fundo
                        <Lock className="w-3 h-3 text-zinc-400" />
                    </li>
                 )}
            </ul>
        </div>
    );
};

export default LayersPanel;