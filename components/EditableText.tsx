

import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { AnyElement, TextElement, ImageElement, GradientElement, ShapeElement, QRCodeElement, ForegroundElement } from '../types';
import QRCodeDisplay from './QRCodeDisplay';

interface EditableElementProps {
    element: ForegroundElement;
    onUpdate: (elementId: string, updates: Partial<AnyElement>) => void;
    isSelected: boolean;
    onSelect: (elementId: string | null) => void;
}

interface TextParserProps {
    content: string;
    highlightColor?: string;
    accentFontFamily?: string;
}

const TextParser: React.FC<TextParserProps> = ({ content, highlightColor, accentFontFamily }) => {
    const parts = content.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const fontFamily = accentFontFamily ? `'${accentFontFamily}', sans-serif` : 'inherit';
                    return <span key={index} style={{ color: highlightColor || '#FBBF24', fontFamily }}>{part.slice(2, -2)}</span>;
                }
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
};

const EditableText: React.FC<EditableElementProps> = ({ element, onUpdate, isSelected, onSelect }) => {
    const nodeRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(element.type === 'text' ? element.content : '');

    useEffect(() => {
        if (element.type === 'text') {
            setEditText(element.content);
        }
    }, [element.type === 'text' && element.content]);


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
    
    const handleTextBlur = () => {
        onUpdate(element.id, { content: editText });
        setIsEditing(false);
    };

    const styles: React.CSSProperties = {
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        opacity: element.opacity,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        mixBlendMode: 'blendMode' in element ? element.blendMode : 'normal',
        overflow: 'hidden', // Clip content that overflows the box
    };
    
    if (element.type === 'text') {
        styles.color = element.color;
        styles.fontFamily = `'${element.fontFamily}', sans-serif`;
        styles.fontSize = `${element.fontSize}px`;
        styles.fontWeight = element.fontWeight;
        styles.fontStyle = element.fontStyle;
        styles.textDecoration = element.textDecoration;
        styles.textAlign = element.textAlign;
        styles.letterSpacing = `${element.letterSpacing}px`;
        styles.lineHeight = element.lineHeight;
        styles.justifyContent =
            element.verticalAlign === 'top' ? 'flex-start' :
            element.verticalAlign === 'bottom' ? 'flex-end' :
            'center';
       
        styles.backgroundColor = element.backgroundColor;
        styles.padding = `${element.padding || 0}px`;
        styles.borderRadius = `${element.borderRadius || 0}px`;
    }

    if (element.type === 'image') {
        const f = element.filters;
        styles.filter = `brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturate}) blur(${f.blur}px) grayscale(${f.grayscale || 0}) sepia(${f.sepia || 0}) hue-rotate(${f.hueRotate || 0}deg) invert(${f.invert || 0})`;
    }
    
    if (element.type === 'image' || element.type === 'shape') {
        styles.border = `${element.borderWidth || 0}px ${element.borderStyle || 'solid'} ${element.borderColor || 'transparent'}`;
    }

    const renderContent = () => {
        if (element.type === 'text' && isEditing) {
            return (
                <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleTextBlur}
                    autoFocus
                    onKeyDown={(e) => e.stopPropagation()} // Prevent pan on space
                    style={{
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        outline: 'none',
                        resize: 'none',
                        border: 'none',
                        color: 'inherit',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        fontStyle: 'inherit',
                        textAlign: 'inherit',
                        letterSpacing: 'inherit',
                        lineHeight: 'inherit',
                        padding: 0, // Padding is on the parent
                        margin: 0,
                        overflowWrap: 'break-word',
                    }}
                />
            );
        }
        
        const baseStyle: React.CSSProperties = { width: '100%', height: '100%', pointerEvents: 'none' };

        switch (element.type) {
            case 'text':
                // The text content itself should wrap and align based on its own properties
                const textInnerStyle: React.CSSProperties = {
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                    textAlign: element.textAlign,
                };
                return (
                    <div style={textInnerStyle}>
                        <TextParser content={element.content} highlightColor={element.highlightColor} accentFontFamily={element.accentFontFamily}/>
                    </div>
                );
            case 'image':
                return <img src={element.src} style={{ ...baseStyle, objectFit: 'cover' }} alt="user content" />;
            case 'gradient':
                return <div style={{ ...baseStyle, background: `linear-gradient(${element.angle}deg, ${element.color1}, ${element.color2})` }} />;
            case 'shape':
                const shapeEl = element as ShapeElement;
                return <div style={{...baseStyle, backgroundColor: shapeEl.fillColor, borderRadius: shapeEl.shape === 'circle' ? '50%' : '0%'}} />;
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
                style={styles}
                onClick={(e) => { e.stopPropagation(); onSelect(element.id); }}
                onDoubleClick={handleDoubleClick}
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
