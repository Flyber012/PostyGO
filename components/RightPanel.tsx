


import React, { useState, useRef, useCallback } from 'react';
import { Post, AnyElement, FontDefinition } from '../types';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';

interface RightPanelProps {
    selectedPost: Post | undefined;
    selectedElementId: string | null;
    onSelectElement: (id: string | null) => void;
    onUpdateElement: (elementId: string, updates: Partial<AnyElement>) => void;
    onAddElement: (type: 'text' | 'image' | 'gradient' | 'shape' | 'qrcode', options?: { src?: string; shape?: 'rectangle' | 'circle' }) => void;
    onRemoveElement: (elementId: string) => void;
    onDuplicateElement: (elementId: string) => void;
    onToggleVisibility: (elementId: string) => void;
    onToggleLock: (elementId: string) => void;
    onReorderElements: (sourceId: string, destinationId: string) => void;
    onRegenerateBackground: (elementId: string, prompt: string) => void;
    onUpdateBackgroundSrc: (elementId: string, src: string) => void;
    availableFonts: FontDefinition[];
    onAddFont: (font: FontDefinition) => void;
    onOpenColorPicker: (currentColor: string, onColorChange: (color: string) => void) => void;
    onUpdateTextProperty: (prop: string, value: any) => void;
    onToggleTextStyle: (style: 'bold' | 'italic' | 'underline') => void;
    selectionStyles: { color: string | null; bold: boolean; italic: boolean; underline: boolean; };
    isEditingText: boolean;
    onRenameElement: (elementId: string, newName: string) => void;
    onMoveElement: (elementId: string, direction: 'up' | 'down') => void;
    palettes: {
        post?: string[];
        custom?: string[];
    };
}

const RightPanel: React.FC<RightPanelProps> = (props) => {
    const { selectedPost, selectedElementId } = props;
    const [propertiesPanelHeight, setPropertiesPanelHeight] = useState(window.innerHeight * 0.45);
    const rightPanelRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startPos = e.clientY;
        const startHeight = propertiesPanelHeight;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!rightPanelRef.current) return;
            const dy = moveEvent.clientY - startPos;
            const newHeight = startHeight + dy;
            const containerHeight = rightPanelRef.current.clientHeight;
            
            const minHeight = 150;
            const maxHeight = containerHeight - 150;
            setPropertiesPanelHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [propertiesPanelHeight]);
    
    const element = selectedPost?.elements.find(e => e.id === selectedElementId);
    const selectedElement = (element && element.type !== 'background') ? element : undefined;

    return (
        <div ref={rightPanelRef} className="w-full bg-zinc-900 flex flex-col h-full">
            <div style={{ height: `${propertiesPanelHeight}px` }} className="flex-shrink-0 overflow-hidden">
                <PropertiesPanel {...props} selectedElement={selectedElement} />
            </div>
            <div
                onMouseDown={handleMouseDown}
                className="h-1.5 bg-zinc-800 hover:bg-purple-600 cursor-row-resize transition-colors flex-shrink-0"
            />
            <div className="flex-grow min-h-0 overflow-hidden">
                <LayersPanel {...props} />
            </div>
        </div>
    );
};

export default RightPanel;