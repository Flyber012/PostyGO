import React from 'react';
import { Post, PostSize, AnyElement, TextElement, ImageElement, GradientElement, BackgroundElement, ShapeElement, QRCodeElement } from '../types';
import QRCodeDisplay from './QRCodeDisplay';

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

interface StaticPostProps {
  post: Post;
  postSize: PostSize;
}

const renderElement = (element: AnyElement) => {
    if (!('visible' in element && !element.visible)) {
        switch(element.type) {
            case 'text':
                const textEl = element as TextElement;
                // Envolver em um div para atuar como um único item flexível para alinhamento
                return <div><TextParser content={textEl.content} highlightColor={textEl.highlightColor} accentFontFamily={textEl.accentFontFamily} baseFontFamily={textEl.fontFamily} /></div>;
            case 'image':
                return <img src={element.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />;
            case 'gradient':
                 return <div style={{ width: '100%', height: '100%', background: `linear-gradient(${element.angle}deg, ${element.color1}, ${element.color2})` }} />;
            case 'shape':
                return <div style={{ width: '100%', height: '100%' }} />; // The styling is handled by getElementStyles
            case 'qrcode':
                const qrEl = element as QRCodeElement;
                return <QRCodeDisplay url={qrEl.url} color={qrEl.color} backgroundColor={qrEl.backgroundColor} width={qrEl.width} />;
            default:
                return null;
        }
    }
    return null;
};

const getElementStyles = (element: AnyElement): React.CSSProperties => {
    if (element.type === 'background' || ('visible' in element && !element.visible)) {
        return { display: 'none' };
    }

    const baseStyles: React.CSSProperties = {
        position: 'absolute',
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        opacity: element.opacity,
        transform: `rotate(${element.rotation}deg)`,
        mixBlendMode: 'blendMode' in element ? element.blendMode : 'normal',
    };

    if (element.type === 'text') {
        const textStyles: React.CSSProperties = {
            color: element.color,
            fontFamily: `'${element.fontFamily}', sans-serif`,
            fontSize: `${element.fontSize}px`,
            textAlign: element.textAlign,
            letterSpacing: `${element.letterSpacing}px`,
            lineHeight: element.lineHeight,
            backgroundColor: element.backgroundColor,
            padding: `${element.padding || 0}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: element.verticalAlign === 'top' ? 'flex-start' :
                            element.verticalAlign === 'bottom' ? 'flex-end' :
                            'center',
            borderRadius: `${element.borderRadius || 0}px`,
        };
        
        let combinedTextShadow = element.textShadow || '';
        if (element.strokeWidth && element.strokeColor && element.strokeColor !== 'transparent') {
            const { strokeWidth, strokeColor } = element;
            const strokeShadows = [
                `-${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}`, `${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}`,
                `-${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}`, `${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}`
            ].join(', ');
            combinedTextShadow = combinedTextShadow ? `${strokeShadows}, ${combinedTextShadow}` : strokeShadows;
        }
        textStyles.textShadow = combinedTextShadow;

        if (element.backdropFilters) {
            const bf = element.backdropFilters;
            (textStyles as any).backdropFilter = `blur(${bf.blur || 0}px) brightness(${bf.brightness ?? 1}) contrast(${bf.contrast ?? 1}) saturate(${bf.saturate ?? 1})`;
        }
        return { ...baseStyles, ...textStyles };
    }
    
    if (element.type === 'image') {
        const imgEl = element as ImageElement;
        const f = imgEl.filters;
        const filterStyle = `brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturate}) blur(${f.blur}px) grayscale(${f.grayscale || 0}) sepia(${f.sepia || 0}) hue-rotate(${f.hueRotate || 0}deg) invert(${f.invert || 0})`;
        const borderStyle = `${imgEl.borderWidth || 0}px ${imgEl.borderStyle || 'solid'} ${imgEl.borderColor || 'transparent'}`;
        return { ...baseStyles, filter: filterStyle, border: borderStyle };
    }

    if (element.type === 'shape') {
        const shapeEl = element as ShapeElement;
        const shapeStyles: React.CSSProperties = {
            backgroundColor: shapeEl.fillColor,
            borderRadius: shapeEl.shape === 'circle' ? '50%' : '0%',
            border: `${shapeEl.borderWidth || 0}px ${shapeEl.borderStyle || 'solid'} ${shapeEl.borderColor || 'transparent'}`,
        };
        return { ...baseStyles, ...shapeStyles };
    }

    return baseStyles;
};


const StaticPost: React.FC<StaticPostProps> = ({ post, postSize }) => {
  const backgroundElement = post.elements.find(el => el.type === 'background') as BackgroundElement | undefined;
  const foregroundElements = post.elements.filter(el => el.type !== 'background');

  return (
    <div
      className="relative overflow-hidden bg-gray-950"
      style={{
        width: postSize.width,
        height: postSize.height,
        backgroundImage: backgroundElement ? `url(${backgroundElement.src})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {[...foregroundElements].reverse().map((element: AnyElement) => (
        <div
          key={element.id}
          style={getElementStyles(element)}
        >
          {renderElement(element)}
        </div>
      ))}
    </div>
  );
};

export default StaticPost;