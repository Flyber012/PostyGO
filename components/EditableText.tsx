import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { AnyElement, TextElement, ImageElement, GradientElement, ShapeElement, QRCodeElement } from '../types';
import QRCodeDisplay from './QRCodeDisplay';

interface EditableElementProps {
    element: AnyElement;
    onUpdate: (elementId: string, updates: Partial<AnyElement>) => void;
    isSelected: boolean;
    onSelect: (elementId: string | null) => void;
}

interface TextParserProps {
    content: string;
    highlightColor?: string;
    accentFontFamily?: string;
    baseFontFamily: string;
}

const TextParser: React.FC<TextParserProps> = ({ content, highlightColor, accentFontFamily, baseFontFamily }) => {
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

const renderContent = (element: AnyElement) => {
    const baseStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    };

    switch (element.type) {
        case 'text':
            const textEl = element as TextElement;
            // Note: No height: '100%' para permitir que o alinhamento vertical funcione
            return <div style={{width: '100%', pointerEvents: 'none'}}><TextParser content={textEl.content} highlightColor={textEl.highlightColor} accentFontFamily={textEl.accentFontFamily} baseFontFamily={textEl.fontFamily}/></div>;
        case 'image':
            return <img src={element.src} style={{ ...baseStyle, objectFit: 'cover' }} alt="user content" />;
        case 'gradient':
            return <div style={{ ...baseStyle, background: `linear-gradient(${element.angle}deg, ${element.color1}, ${element.color2})` }} />;
        case 'shape':
            const shapeEl = element as ShapeElement;
            const shapeStyle: React.CSSProperties = {
                ...baseStyle,
                backgroundColor: shapeEl.fillColor,
                borderRadius: shapeEl.shape === 'circle' ? '50%' : '0%',
            };
            return <div style={shapeStyle} />;
        case 'qrcode':
            const qrEl = element as QRCodeElement;
            return <QRCodeDisplay url={qrEl.url} color={qrEl.color} backgroundColor={qrEl.backgroundColor} width={qrEl.width} />;
        case 'background':
            return null;
        default:
            return null;
    }
};


const EditableText: React.FC<EditableElementProps> = ({ element, onUpdate, isSelected, onSelect }) => {
    const nodeRef = useRef(null);

    if (element.type === 'background' || !element.visible) {
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

    const styles: React.CSSProperties = {
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        opacity: element.opacity,
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        mixBlendMode: 'blendMode' in element ? element.blendMode : 'normal',
    };
    
    if (element.type === 'text') {
        styles.color = element.color;
        styles.fontFamily = `'${element.fontFamily}', sans-serif`;
        styles.fontSize = `${element.fontSize}px`;
        styles.textAlign = element.textAlign;
        styles.letterSpacing = `${element.letterSpacing}px`;
        styles.lineHeight = element.lineHeight;

        let combinedTextShadow = element.textShadow || '';
        if (element.strokeWidth && element.strokeColor && element.strokeColor !== 'transparent') {
            const { strokeWidth, strokeColor } = element;
            const strokeShadows = [
                `-${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}`, `${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}`,
                `-${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}`, `${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}`
            ].join(', ');
            combinedTextShadow = combinedTextShadow ? `${strokeShadows}, ${combinedTextShadow}` : strokeShadows;
        }
        styles.textShadow = combinedTextShadow;
        
        styles.justifyContent =
            element.verticalAlign === 'top' ? 'flex-start' :
            element.verticalAlign === 'bottom' ? 'flex-end' :
            'center';
       
        styles.backgroundColor = element.backgroundColor;
        styles.padding = `${element.padding || 0}px`;
        if (element.borderRadius) {
            styles.borderRadius = `${element.borderRadius}px`;
        }
        if (element.backdropFilters) {
            const bf = element.backdropFilters;
            styles.backdropFilter = `blur(${bf.blur || 0}px) brightness(${bf.brightness ?? 1}) contrast(${bf.contrast ?? 1}) saturate(${bf.saturate ?? 1})`;
        }
    }

    if (element.type === 'image') {
        const f = element.filters;
        styles.filter = `brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturate}) blur(${f.blur}px) grayscale(${f.grayscale || 0}) sepia(${f.sepia || 0}) hue-rotate(${f.hueRotate || 0}deg) invert(${f.invert || 0})`;
    }
    
    if (element.type === 'image' || element.type === 'shape') {
        styles.border = `${element.borderWidth || 0}px ${element.borderStyle || 'solid'} ${element.borderColor || 'transparent'}`;
    }

    const isLocked = element.locked;

    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: element.x, y: element.y }}
            onDrag={handleDrag}
            handle={!isLocked ? ".handle" : undefined}
            onStart={() => onSelect(element.id)}
            disabled={isLocked}
        >
            <div
                ref={nodeRef}
                className={`absolute group ${isSelected && !isLocked ? 'border-2 border-purple-500 border-dashed' : 'border-2 border-transparent hover:border-purple-500/30'} ${!isLocked ? 'handle cursor-move' : 'cursor-default'}`}
                style={styles}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(element.id)}
                }
            >
                {renderContent(element)}

                {isSelected && !isLocked && (
                    <div
                        onMouseDown={handleResizeMouseDown}
                        className="absolute -right-1 -bottom-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-gray-900 cursor-nwse-resize"
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        </Draggable>
    );
};

export default EditableText;