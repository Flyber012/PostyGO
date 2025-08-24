

import React, { useState, useEffect, useRef } from 'react';
import { AnyElement, TextElement, ImageElement, GradientElement, ShapeElement, QRCodeElement, FontDefinition, BlendMode, BackgroundElement } from '../types';
import { Plus, ChevronDown, ArrowUpFromLine, GripVertical, ArrowDownFromLine, FileUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Reusable input components
const NumberInput: React.FC<{label: string, value: number, onChange: (val: string) => void, min?: number, max?: number, step?: number, unit?: string}> = 
({label, value, onChange, min, max, step, unit}) => (
    <div>
        <label className="block text-xs font-medium text-gray-400">{label} {unit && `(${unit})`}</label>
        <input type="number" value={value} onChange={e => onChange(e.target.value)} min={min} max={max} step={step} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs" />
    </div>
);

const RangeInput: React.FC<{label: string, value: number, onChange: (val: string) => void, min?: number, max?: number, step?: number}> = 
({label, value, onChange, min, max, step}) => (
    <div>
        <label className="block text-xs font-medium text-gray-400">{label}</label>
        <div className="flex items-center space-x-2">
            <input type="range" value={value} onChange={e => onChange(e.target.value)} min={min} max={max} step={step} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            <input type="number" value={value} onChange={e => onChange(e.target.value)} min={min} max={max} step={step} className="w-16 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs" />
        </div>
    </div>
);

const ColorInput: React.FC<{label: string, color: string, onChange: (color: string) => void, onOpenColorPicker: (currentColor: string, onColorChange: (color: string) => void) => void}> = 
({ label, color, onChange, onOpenColorPicker }) => (
    <div>
        <label className="block text-xs font-medium text-gray-400">{label}</label>
        <button onClick={() => onOpenColorPicker(color, onChange)} className="w-full h-8 mt-1 rounded-md border border-gray-600" style={{backgroundColor: color}} />
    </div>
);

const SelectInput: React.FC<{label: string, value: string | number, onChange: (val: string) => void, children: React.ReactNode}> = ({label, value, onChange, children}) => (
    <div>
        <label className="block text-xs font-medium text-gray-400">{label}</label>
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1.5 text-white text-xs appearance-none">
                {children}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"/>
        </div>
    </div>
);


const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-zinc-800">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-2 hover:bg-zinc-800/50">
                <div className="text-sm font-semibold text-gray-300">{title}</div>
                <ChevronDown className={`w-4 h-4 transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-2 space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
};

interface PropertiesPanelProps {
    selectedElement: Exclude<AnyElement, BackgroundElement> | undefined;
    onUpdateElement: (elementId: string, updates: Partial<AnyElement>) => void;
    availableFonts: FontDefinition[];
    onAddFont: (font: FontDefinition) => void;
    onOpenColorPicker: (currentColor: string, onColorChange: (color: string) => void) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedElement, onUpdateElement, availableFonts, onAddFont, onOpenColorPicker }) => {
    
    const fontInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (key: string, value: any, subKey?: string) => {
        if (!selectedElement) return;
        if (subKey) {
            const currentSubObject = (selectedElement as any)[subKey] || {};
            onUpdateElement(selectedElement.id, { [subKey]: { ...currentSubObject, [key]: value } });
        } else {
            onUpdateElement(selectedElement.id, { [key]: value });
        }
    };

    const handleFontUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const fontName = file.name.split('.')[0];
                const dataUrl = e.target?.result as string;
                const newFont: FontDefinition = { name: fontName, dataUrl };
                onAddFont(newFont);
                handleInputChange('fontFamily', fontName);
                toast.success(`Fonte "${fontName}" adicionada!`);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!selectedElement) {
        return <div className="p-4 text-sm text-zinc-500">Selecione uma camada para ver suas propriedades.</div>;
    }

    const blendModes: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
    
    const textEl = selectedElement as TextElement;
    const imageEl = selectedElement as ImageElement;
    const shapeEl = selectedElement as ShapeElement;
    const qrEl = selectedElement as QRCodeElement;


    return (
        <div className="text-sm p-2">
            <Accordion title="Transformar" defaultOpen={true}>
                 <div className="grid grid-cols-2 gap-2">
                    <NumberInput label="X" value={Math.round(selectedElement.x)} onChange={val => handleInputChange('x', parseInt(val, 10) || 0)} unit="px" />
                    <NumberInput label="Y" value={Math.round(selectedElement.y)} onChange={val => handleInputChange('y', parseInt(val, 10) || 0)} unit="px" />
                    <NumberInput label="Largura" value={Math.round(selectedElement.width)} onChange={val => handleInputChange('width', parseInt(val, 10) || 1)} min={1} unit="px" />
                    <NumberInput label="Altura" value={Math.round(selectedElement.height)} onChange={val => handleInputChange('height', parseInt(val, 10) || 1)} min={1} unit="px" />
                </div>
                <RangeInput label="Rotação" value={selectedElement.rotation} onChange={val => handleInputChange('rotation', parseInt(val, 10))} min={-180} max={180} />
            </Accordion>

            <Accordion title="Estilo" defaultOpen={true}>
                 <RangeInput label="Opacidade" value={selectedElement.opacity * 100} onChange={val => handleInputChange('opacity', parseInt(val, 10) / 100)} min={0} max={100} />
                 {('blendMode' in selectedElement) && (
                    <SelectInput label="Modo de Mesclagem" value={selectedElement.blendMode || 'normal'} onChange={val => handleInputChange('blendMode', val)}>
                        {blendModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                    </SelectInput>
                 )}
                 {selectedElement.type === 'shape' && (
                    <ColorInput label="Preenchimento" color={shapeEl.fillColor} onChange={val => handleInputChange('fillColor', val)} onOpenColorPicker={onOpenColorPicker} />
                 )}
            </Accordion>
            
            {(selectedElement.type === 'image' || selectedElement.type === 'shape') && (
                <Accordion title="Borda" defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput label="Largura" value={selectedElement.borderWidth || 0} onChange={val => handleInputChange('borderWidth', parseInt(val, 10))} min={0} unit="px"/>
                        <ColorInput label="Cor" color={selectedElement.borderColor || 'transparent'} onChange={val => handleInputChange('borderColor', val)} onOpenColorPicker={onOpenColorPicker} />
                    </div>
                     <SelectInput label="Estilo" value={selectedElement.borderStyle || 'solid'} onChange={val => handleInputChange('borderStyle', val)}>
                        <option value="solid">Sólida</option>
                        <option value="dashed">Tracejada</option>
                        <option value="dotted">Pontilhada</option>
                    </SelectInput>
                </Accordion>
            )}

            {selectedElement.type === 'text' && (
                <Accordion title="Texto" defaultOpen={true}>
                    <div>
                        <label className="block text-xs font-medium text-gray-400">Conteúdo</label>
                        <textarea 
                            value={textEl.content}
                            onChange={e => handleInputChange('content', e.target.value)}
                            className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs"
                            rows={3}
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-400">Fonte</label>
                        <div className="flex space-x-2 mt-1">
                            <SelectInput label="" value={textEl.fontFamily} onChange={val => handleInputChange('fontFamily', val)}>
                                {availableFonts.map(font => <option key={font.name} value={font.name}>{font.name}</option>)}
                            </SelectInput>
                            <button onClick={() => fontInputRef.current?.click()} className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-md" title="Carregar fonte">
                                <FileUp className="w-3 h-3" />
                            </button>
                            <input type="file" ref={fontInputRef} onChange={handleFontUpload} accept=".ttf, .otf, .woff, .woff2" className="hidden" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        <NumberInput label="Tamanho" value={textEl.fontSize} onChange={val => handleInputChange('fontSize', parseInt(val, 10))} min={1} unit="px"/>
                        <ColorInput label="Cor" color={textEl.color} onChange={val => handleInputChange('color', val)} onOpenColorPicker={onOpenColorPicker} />
                    </div>
                    <div className="flex items-center space-x-1 p-1 bg-black/30 rounded-md">
                        <button onClick={() => handleInputChange('fontWeight', textEl.fontWeight === 700 ? 400 : 700)} className={`flex-1 text-center py-1 rounded text-xs transition-colors ${textEl.fontWeight === 700 ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-700 text-gray-300'}`}><b className="font-sans">B</b></button>
                        <button onClick={() => handleInputChange('fontStyle', textEl.fontStyle === 'italic' ? 'normal' : 'italic')} className={`flex-1 text-center py-1 rounded text-xs transition-colors ${textEl.fontStyle === 'italic' ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-700 text-gray-300'}`}><i>I</i></button>
                        <button onClick={() => handleInputChange('textDecoration', textEl.textDecoration === 'underline' ? 'none' : 'underline')} className={`flex-1 text-center py-1 rounded text-xs transition-colors ${textEl.textDecoration === 'underline' ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-700 text-gray-300'}`}><u>U</u></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <SelectInput label="Alinhamento" value={textEl.textAlign} onChange={val => handleInputChange('textAlign', val)}>
                            <option value="left">Esquerda</option>
                            <option value="center">Centro</option>
                            <option value="right">Direita</option>
                        </SelectInput>
                         <SelectInput label="Alinh. Vertical" value={textEl.verticalAlign} onChange={val => handleInputChange('verticalAlign', val)}>
                            <option value="top">Topo</option>
                            <option value="middle">Meio</option>
                            <option value="bottom">Fundo</option>
                        </SelectInput>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput label="Letra" value={textEl.letterSpacing} onChange={val => handleInputChange('letterSpacing', parseInt(val, 10))} unit="px" step={0.1}/>
                        <NumberInput label="Linha" value={textEl.lineHeight} onChange={val => handleInputChange('lineHeight', parseFloat(val))} min={0} step={0.1}/>
                    </div>
                </Accordion>
            )}
            
            {selectedElement.type === 'text' && (
                <Accordion title="Efeitos de Texto" defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-2">
                        <ColorInput label="Cor do Fundo" color={textEl.backgroundColor || 'transparent'} onChange={val => handleInputChange('backgroundColor', val)} onOpenColorPicker={onOpenColorPicker} />
                        <NumberInput label="Borda Raio" value={textEl.borderRadius || 0} onChange={val => handleInputChange('borderRadius', parseInt(val,10))} min={0} unit="px"/>
                        <NumberInput label="Preenchimento" value={textEl.padding || 0} onChange={val => handleInputChange('padding', parseInt(val,10))} min={0} unit="px"/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <ColorInput label="Cor do Contorno" color={textEl.strokeColor || 'transparent'} onChange={val => handleInputChange('strokeColor', val)} onOpenColorPicker={onOpenColorPicker} />
                        <NumberInput label="Largura Contorno" value={textEl.strokeWidth || 0} onChange={val => handleInputChange('strokeWidth', parseInt(val,10))} min={0} unit="px"/>
                    </div>
                     <Accordion title="Filtros de Fundo">
                         <RangeInput label="Blur" value={textEl.backdropFilters?.blur || 0} onChange={val => handleInputChange('blur', parseInt(val, 10), 'backdropFilters')} min={0} max={50}/>
                         <RangeInput label="Brilho" value={(textEl.backdropFilters?.brightness ?? 1) * 100} onChange={val => handleInputChange('brightness', parseInt(val, 10) / 100, 'backdropFilters')} min={0} max={200}/>
                         <RangeInput label="Contraste" value={(textEl.backdropFilters?.contrast ?? 1) * 100} onChange={val => handleInputChange('contrast', parseInt(val, 10) / 100, 'backdropFilters')} min={0} max={200}/>
                         <RangeInput label="Saturação" value={(textEl.backdropFilters?.saturate ?? 1) * 100} onChange={val => handleInputChange('saturate', parseInt(val, 10) / 100, 'backdropFilters')} min={0} max={200}/>
                    </Accordion>
                </Accordion>
            )}

            {selectedElement.type === 'image' && (
                 <Accordion title="Filtros" defaultOpen={true}>
                    <RangeInput label="Brilho" value={imageEl.filters.brightness * 100} onChange={val => handleInputChange('brightness', parseInt(val, 10) / 100, 'filters')} min={0} max={200}/>
                    <RangeInput label="Contraste" value={imageEl.filters.contrast * 100} onChange={val => handleInputChange('contrast', parseInt(val, 10) / 100, 'filters')} min={0} max={200}/>
                    <RangeInput label="Saturação" value={imageEl.filters.saturate * 100} onChange={val => handleInputChange('saturate', parseInt(val, 10) / 100, 'filters')} min={0} max={200}/>
                    <RangeInput label="Blur" value={imageEl.filters.blur} onChange={val => handleInputChange('blur', parseInt(val, 10), 'filters')} min={0} max={50}/>
                    <RangeInput label="Grayscale" value={imageEl.filters.grayscale * 100} onChange={val => handleInputChange('grayscale', parseInt(val, 10) / 100, 'filters')} min={0} max={100}/>
                    <RangeInput label="Sepia" value={imageEl.filters.sepia * 100} onChange={val => handleInputChange('sepia', parseInt(val, 10) / 100, 'filters')} min={0} max={100}/>
                    <RangeInput label="Hue" value={imageEl.filters.hueRotate} onChange={val => handleInputChange('hueRotate', parseInt(val, 10), 'filters')} min={0} max={360}/>
                    <RangeInput label="Inverter" value={imageEl.filters.invert * 100} onChange={val => handleInputChange('invert', parseInt(val, 10) / 100, 'filters')} min={0} max={100}/>
                </Accordion>
            )}

             {selectedElement.type === 'qrcode' && (
                <Accordion title="QR Code" defaultOpen={true}>
                    <div>
                        <label className="block text-xs font-medium text-gray-400">URL</label>
                        <input type="text" value={qrEl.url} onChange={e => handleInputChange('url', e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs" />
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        <ColorInput label="Cor" color={qrEl.color} onChange={val => handleInputChange('color', val)} onOpenColorPicker={onOpenColorPicker} />
                        <ColorInput label="Fundo" color={qrEl.backgroundColor} onChange={val => handleInputChange('backgroundColor', val)} onOpenColorPicker={onOpenColorPicker} />
                    </div>
                </Accordion>
             )}

        </div>
    );
};

export default PropertiesPanel;
