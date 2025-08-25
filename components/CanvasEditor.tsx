

import React from 'react';
import { Post, AnyElement, PostSize, BackgroundElement, ForegroundElement } from '../types';
import EditableText from './EditableText';

interface CanvasEditorProps {
    post: Post;
    postSize: PostSize;
    onUpdateElement: (elementId: string, updates: Partial<AnyElement>) => void;
    selectedElementId: string | null;
    onSelectElement: (id: string | null) => void;
    onStartEditing: (id: string, node: HTMLDivElement) => void;
    onStopEditing: () => void;
    onSelectionUpdate: () => void;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({ post, postSize, onUpdateElement, selectedElementId, onSelectElement, onStartEditing, onStopEditing, onSelectionUpdate }) => {

    const deselectElement = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onSelectElement(null);
        }
    };
    
    const backgroundElement = post.elements.find(el => el.type === 'background') as BackgroundElement | undefined;
    const foregroundElements = post.elements.filter((el): el is ForegroundElement => el.type !== 'background');

    return (
        <div 
            className="shadow-lg rounded-lg overflow-hidden relative"
            style={{
                width: postSize.width,
                height: postSize.height,
                backgroundColor: backgroundElement?.backgroundColor || '#18181b',
            }}
            onClick={deselectElement}
        >
            {backgroundElement?.src && (
                <img
                    src={backgroundElement.src}
                    alt="Post background"
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    onClick={(e) => {
                         e.stopPropagation();
                         onSelectElement(backgroundElement.id);
                    }}
                />
            )}
            
            {/* Render elements in reverse order so the first in array is on top */}
            {[...foregroundElements].reverse().map(element => (
                <EditableText
                    key={element.id}
                    element={element}
                    onUpdate={onUpdateElement}
                    isSelected={selectedElementId === element.id}
                    onSelect={onSelectElement}
                    onStartEditing={onStartEditing}
                    onStopEditing={onStopEditing}
                    onSelectionUpdate={onSelectionUpdate}
                />
            ))}
        </div>
    );
};

export default CanvasEditor;