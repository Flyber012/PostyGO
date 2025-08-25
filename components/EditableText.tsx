


import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { AnyElement, TextElement, ImageElement, GradientElement, ShapeElement, QRCodeElement, ForegroundElement } from '../types';
import QRCodeDisplay from './QRCodeDisplay';

interface EditableElementProps {
    element: ForegroundElement;
    onUpdate: (elementId: string, updates: Partial<AnyElement>) => void;
    isSelected: boolean;
    onSelect: (elementId: string | null) => void;
    onStartEditing: (id: string, node: HTMLDivElement) => void;
    onStopEditing: () => void;
    onSelectionUpdate: () => void;
}

const EditableText: React.FC<EditableElementProps> = ({ element, onUpdate, isSelected, onSelect, onStartEditing, onStopEditing, onSelectionUpdate }) => {
    const nodeRef = useRef(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);

    // This effect syncs the state (element.content) to the contentEditable div's innerHTML.
    // It's crucial that it ONLY runs when not in editing mode to prevent React from
    // overwriting the DOM and breaking user selection or cursor position.
    useEffect(() => {
        if (contentRef.current && element.type === 'text') {
            if (!isEditing && element.content !== contentRef.current.innerHTML) {
                contentRef.current.innerHTML = element.content;
            }
        }
    }, [element.type === 'text' ? element.content : null, isEditing]);
    
    useEffect(() => {
        if(isEditing && contentRef.current) {
            onStartEditing(element.id, contentRef.current);
            // Focus the element, but do not select all text, allowing for partial selection.
            contentRef.current.focus();
        } else {
            onStopEditing();
        }
    }, [isEditing, element.id, onStartEditing, onStopEditing]);


    if (!element.visible) {
        return null;
    }

    const handleDrag = (e: any, data: any) => {
        onUpdate(element.id, { x: data.x, y: data.y });
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = element.width;
        const startHeight = element.height;
    
        const doDrag = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + moveEvent.clientX - startX;
            const newHeight = startHeight + moveEvent.clientY - startY;
            onUpdate(element.id, { 
                width: Math.max(20, newWidth), 
                height: Math.max(20, newHeight) 
            });
        };
    
        const stopDrag = () => {
            window.removeEventListener('mousemove', doDrag);
            window.removeEventListener('mouseup', stopDrag);
        };
    
        window.addEventListener('mousemove', doDrag);
        window.addEventListener('mouseup', stopDrag);
    };

    const handleDoubleClick = () => {
        if (element.type === 'text' && !element.locked) {
            setIsEditing(true);
        }
    };
    
     const handleBlur = () => {
        if (contentRef.current && element.type === 'text') {
            const newContent = contentRef.current.innerHTML;
            if (newContent !== element.content) {
                onUpdate(element.id, { content: newContent });
            }
        }
        setIsEditing(false);
    };


    const containerStyles: React.CSSProperties = {
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation || 0}deg)`,
        opacity: element.opacity,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        mixBlendMode: 'blendMode' in element ? element.blendMode : 'normal',
        overflow: 'hidden',
    };
    
    const contentStyles: React.CSSProperties = {
        width: '100%',
        height: '100%',
        outline: 'none',
        pointerEvents: isEditing ? 'all' : 'none',
    };

    if (element.type === 'text') {
        containerStyles.color = element.color;
        containerStyles.fontFamily = `'${element.fontFamily}', sans-serif`;
        containerStyles.fontSize = `${element.fontSize}px`;
        containerStyles.fontWeight = element.fontWeight;
        containerStyles.fontStyle = element.fontStyle;
        containerStyles.textDecoration = element.textDecoration;
        containerStyles.textAlign = element.textAlign;
        containerStyles.letterSpacing = `${element.letterSpacing}px`;
        containerStyles.lineHeight = element.lineHeight;
        containerStyles.justifyContent =
            element.verticalAlign === 'top' ? 'flex-start' :
            element.verticalAlign === 'bottom' ? 'flex-end' :
            'center';
       
        containerStyles.backgroundColor = element.backgroundColor;
        containerStyles.padding = `${element.padding || 0}px`;
        containerStyles.borderRadius = `${element.borderRadius || 0}px`;
    }

    if (element.type === 'image') {
        const f = element.filters;
        containerStyles.filter = `brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturate}) blur(${f.blur}px) grayscale(${f.grayscale || 0}) sepia(${f.sepia || 0}) hue-rotate(${f.hueRotate || 0}deg) invert(${f.invert || 0})`;
    }
    
    if (element.type === 'image' || element.type === 'shape') {
        containerStyles.border = `${element.borderWidth || 0}px ${element.borderStyle || 'solid'} ${element.borderColor || 'transparent'}`;
    }

    const renderContent = () => {
        switch (element.type) {
            case 'text':
                // We no longer use dangerouslySetInnerHTML here. The useEffect handles content synchronization.
                return (
                    <div
                        ref={contentRef}
                        contentEditable={isEditing}
                        onBlur={handleBlur}
                        onKeyDown={(e) => e.stopPropagation()} // Prevent pan on space when editing
                        suppressContentEditableWarning={true}
                        style={{...contentStyles, whiteSpace: 'pre-wrap', overflowWrap: 'break-word'}}
                    />
                );
            case 'image':
                return <img src={element.src} style={{ ...contentStyles, objectFit: 'cover' }} alt="user content" />;
            case 'gradient':
                return <div style={{ ...contentStyles, background: `linear-gradient(${element.angle}deg, ${element.color1}, ${element.color2})` }} />;
            case 'shape':
                const shapeEl = element as ShapeElement;
                return <div style={{...contentStyles, backgroundColor: shapeEl.fillColor, borderRadius: shapeEl.shape === 'circle' ? '50%' : '0%'}} />;
            case 'qrcode':
                const qrEl = element as QRCodeElement;
                return <QRCodeDisplay url={qrEl.url} color={qrEl.color} backgroundColor={qrEl.backgroundColor} width={qrEl.width} />;
            default:
                return null;
        }
    };

    const isLocked = element.locked;

    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: element.x, y: element.y }}
            onDrag={handleDrag}
            handle={!isLocked && !isEditing ? ".handle" : undefined}
            onStart={() => onSelect(element.id)}
            disabled={isLocked || isEditing}
        >
            <div
                ref={nodeRef}
                className={`absolute group ${isSelected && !isLocked ? 'border-2 border-purple-500' : 'border-2 border-transparent hover:border-purple-500/30'} ${!isLocked && !isEditing ? 'handle cursor-move' : 'cursor-default'}`}
                style={containerStyles}
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if (!isEditing) {
                        onSelect(element.id);
                    }
                }}
                onDoubleClick={handleDoubleClick}
                onMouseUp={onSelectionUpdate}
            >
                {renderContent()}

                {isSelected && !isLocked && !isEditing && (
                    <div
                        onMouseDown={handleResizeMouseDown}
                        className="absolute -right-1 -bottom-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-gray-900 cursor-nwse-resize z-10"
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        </Draggable>
    );
};

export default EditableText;