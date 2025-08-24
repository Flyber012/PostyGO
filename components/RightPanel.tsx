
import React, { useState } from 'react';
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

type ActiveTab = 'layers' | 'properties';

const RightPanel: React.FC<RightPanelProps> = (props) => {
    const { selectedPost, selectedElementId, onUpdateElement, availableFonts, onAddFont, onOpenColorPicker } = props;
    const [activeTab, setActiveTab] = useState<ActiveTab>('layers');

    const selectedElement = selectedPost?.elements.find(e => e.id === selectedElementId && e.type !== 'background') as Exclude<AnyElement, BackgroundElement> | undefined;

    // Automatically switch to properties tab when an element is selected
    React.useEffect(() => {
        if (selectedElementId && selectedPost?.elements.find(e => e.id === selectedElementId)?.type !== 'background') {
            setActiveTab('properties');
        }
    }, [selectedElementId, selectedPost]);

    return (
        <div className="w-full bg-zinc-900 flex flex-col h-full">
            <div className="flex-shrink-0 border-b border-zinc-800">
                <div className="flex items-center p-1 bg-zinc-950/50 m-2 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('layers')}
                        className={`flex-1 text-center text-sm py-1.5 rounded-md transition-colors ${activeTab === 'layers' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                    >
                        Camadas
                    </button>
                    <button 
                        onClick={() => setActiveTab('properties')}
                        className={`flex-1 text-center text-sm py-1.5 rounded-md transition-colors ${activeTab === 'properties' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                    >
                        Propriedades
                    </button>
                </div>
            </div>
            
            <div className="flex-grow min-h-0">
                {activeTab === 'layers' && <LayersPanel {...props} />}
                {activeTab === 'properties' && (
                    <PropertiesPanel 
                        selectedElement={selectedElement}
                        onUpdateElement={onUpdateElement}
                        availableFonts={availableFonts}
                        onAddFont={onAddFont}
                        onOpenColorPicker={onOpenColorPicker}
                    />
                )}
            </div>
        </div>
    );
};

export default RightPanel;
