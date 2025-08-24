

import React from 'react';
import { Post, AnyElement, FontDefinition, BackgroundElement } from '../types';
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
    palettes: {
        post?: string[];
        custom?: string[];
    };
}

const RightPanel: React.FC<RightPanelProps> = (props) => {
    const { selectedPost, selectedElementId, onUpdateElement, availableFonts, onAddFont, onOpenColorPicker } = props;

    const selectedElement = selectedPost?.elements.find(e => e.id === selectedElementId && e.type !== 'background') as Exclude<AnyElement, BackgroundElement> | undefined;

    return (
        <div className="w-full bg-zinc-900 flex flex-col h-full overflow-y-auto">
            {/* Properties Panel always on top */}
            <div className="flex-shrink-0 border-b border-zinc-800">
                <h2 className="text-lg font-semibold text-gray-200 p-4">Propriedades</h2>
                <PropertiesPanel 
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                    availableFonts={availableFonts}
                    onAddFont={onAddFont}
                    onOpenColorPicker={onOpenColorPicker}
                />
            </div>
            
            {/* Layers Panel at the bottom */}
            <div className="flex-grow min-h-0 border-t border-zinc-800">
                 <LayersPanel {...props} />
            </div>
        </div>
    );
};

export default RightPanel;
