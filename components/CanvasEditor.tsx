
import React, { forwardRef } from 'react';
import { Post, AnyElement, PostSize, BackgroundElement } from '../types';
import EditableText from './EditableText';

interface CanvasEditorProps {
    post: Post;
    postSize: PostSize;
    onUpdateElement: (elementId: string, updates: Partial<AnyElement>) => void;
    selectedElementId: string | null;
    onSelectElement: (id: string | null) => void;
}

const CanvasEditor = forwardRef<HTMLDivElement, CanvasEditorProps>(({ post, postSize, onUpdateElement, selectedElementId, onSelectElement }, ref) => {

    const deselectElement = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onSelectElement(null);
        }
    };
    
    const backgroundElement = post.elements.find(el => el.type === 'background') as BackgroundElement | undefined;
    const foregroundElements = post.elements.filter(el => el.type !== 'background');

    return (
        <div 
            ref={ref}
            className="shadow-lg rounded-lg overflow-hidden relative bg-gray-700"
            style={{
                width: postSize.width,
                height: postSize.height,
            }}
            onClick={deselectElement}
        >
            {backgroundElement && (
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
                />
            ))}
        </div>
    );
});

export default CanvasEditor;
