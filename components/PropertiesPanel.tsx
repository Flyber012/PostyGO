import React, { useState } from 'react';
import { AnyElement, TextElement, ImageElement, ShapeElement, QRCodeElement, FontDefinition, BlendMode, BackgroundElement } from '../types';
import { ChevronDown, FileUp } from 'lucide-react';
import FontSelector from './FontSelector';
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
        <button onMouseDown={e => e.preventDefault()} onClick={() => onOpenColorPicker(color, onChange)} className="w-full h-8 mt-1 rounded-md border border-gray-600" style={{backgroundColor: color}} />
    </div>
);

const SelectInput: React.FC<{label: string, value: string | number, onChange: (val: string) => void, children: React.ReactNode}> = ({label, value, onChange, children}) => (
    <div>
        <label className="block text-xs font-medium text-gray-400">{label}</label>
        <div className="relative" onMouseDown={e => e.preventDefault()}>
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
    onUpdateTextProperty: (prop: string, value: any) => void;
    onToggleTextStyle: (style: 'bold' | 'italic' | 'underline') => void;
    availableFonts: FontDefinition[];
    onLoadFont: (fontName: string) => Promise<void>;
    onOpenColorPicker: (currentColor: string, onColorChange: (color: string) => void) => void;
    selectionStyles: { color: string | null; bold: boolean; italic: boolean; underline: boolean; };
    isEditingText: boolean;
}

const blendModes: BlendMode[] = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 
    'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
];

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedElement, onUpdateElement, onUpdateTextProperty, onToggleTextStyle, availableFonts, onLoadFont, onOpenColorPicker, selectionStyles, isEditingText }) => {
    
    const handleInputChange = (key: string, value: any, subKey?: string) => {
        if (!selectedElement) return;
        if (subKey) {
            const currentSubObject = (selectedElement as any)[subKey] || {};
            onUpdateElement(selectedElement.id, { [subKey]: { ...currentSubObject, [key]: value } });
        } else {
            onUpdateElement(selectedElement.id, { [key]: value });
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-200 p-4 pb-2 flex-shrink-0">Propriedades</h2>
            <div className="flex-grow overflow-y-auto properties-scrollbar p-4 pt-2">
                {!selectedElement ? (
                    <div className="text-sm text-zinc-500">Selecione uma camada para ver suas propriedades.</div>
                ) : (
                    <div className="text-sm">
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
                                    {blendModes.map(mode => <option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</option>)}
                                </SelectInput>
                             )}
                             {(selectedElement.type === 'shape') && (
                                <ColorInput label="Preenchimento" color={(selectedElement as ShapeElement).fillColor} onChange={val => handleInputChange('fillColor', val)} onOpenColorPicker={onOpenColorPicker} />
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
                                <FontSelector 
                                    availableFonts={availableFonts}
                                    selectedFont={(selectedElement as TextElement).fontFamily}
                                    onSelectFont={(fontName) => {
                                        onLoadFont(fontName).catch(err => {
                                            console.error(`Font load failed: ${err}`);
                                            toast.error(`Falha ao carregar a fonte ${fontName}.`);
                                        });
                                        onUpdateTextProperty('fontFamily', fontName);
                                    }}
                                />
                                 <div className="grid grid-cols-2 gap-2">
                                    <NumberInput label="Tamanho" value={(selectedElement as TextElement).fontSize} onChange={val => onUpdateTextProperty('fontSize', parseInt(val, 10))} min={1} unit="px"/>
                                    <ColorInput label="Cor" color={(isEditingText && selectionStyles.color) ? selectionStyles.color : (selectedElement as TextElement).color} onChange={val => onUpdateTextProperty('color', val)} onOpenColorPicker={onOpenColorPicker} />
                                </div>
                                <div className="flex items-center space-x-1 p-1 bg-black/30 rounded-md">
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => onToggleTextStyle('bold')} className={`flex-1 text-center py-1 rounded text-xs transition-colors ${isEditingText ? (selectionStyles.bold ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-700 text-gray-300') : ((selectedElement as TextElement).fontWeight === 700 ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-700 text-gray-300')}`}><b className="font-sans">B</b></button>
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => onToggleTextStyle('italic')} className={`flex-1 text-center py-1 rounded text-xs transition-colors ${isEditingText ? (selectionStyles.italic ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-700 text-gray-300') : ((selectedElement as TextElement).fontStyle === 'italic' ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-700 text-gray-300')}`}><i>I</i></button>
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => onToggleTextStyle('underline')} className={`flex-1 text-center py-1 rounded text-xs transition-colors ${isEditingText ? (selectionStyles.underline ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-700 text-gray-300') : ((selectedElement as TextElement).textDecoration === 'underline' ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-700 text-gray-300')}`}><u>U</u></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                     <SelectInput label="Alinhamento" value={(selectedElement as TextElement).textAlign} onChange={val => handleInputChange('textAlign', val)}>
                                        <option value="left">Esquerda</option>
                                        <option value="center">Centro</option>
                                        <option value="right">Direita</option>
                                    </SelectInput>
                                     <SelectInput label="Alinh. Vertical" value={(selectedElement as TextElement).verticalAlign} onChange={val => handleInputChange('verticalAlign', val)}>
                                        <option value="top">Topo</option>
                                        <option value="middle">Meio</option>
                                        <option value="bottom">Fundo</option>
                                    </SelectInput>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <NumberInput label="Letra" value={(selectedElement as TextElement).letterSpacing} onChange={val => handleInputChange('letterSpacing', parseInt(val, 10))} unit="px" step={0.1}/>
                                    <NumberInput label="Linha" value={(selectedElement as TextElement).lineHeight} onChange={val => handleInputChange('lineHeight', parseFloat(val))} min={0} step={0.1}/>
                                </div>
                            </Accordion>
                        )}
                        
                        {selectedElement.type === 'text' && (
                            <Accordion title="Efeitos de Texto" defaultOpen={false}>
                                <div className="grid grid-cols-2 gap-2">
                                    <ColorInput label="Cor do Fundo" color={(selectedElement as TextElement).backgroundColor || 'transparent'} onChange={val => handleInputChange('backgroundColor', val)} onOpenColorPicker={onOpenColorPicker} />
                                    <NumberInput label="Borda Raio" value={(selectedElement as TextElement).borderRadius || 0} onChange={val => handleInputChange('borderRadius', parseInt(val,10))} min={0} unit="px"/>
                                    <NumberInput label="Preenchimento" value={(selectedElement as TextElement).padding || 0} onChange={val => handleInputChange('padding', parseInt(val,10))} min={0} unit="px"/>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <ColorInput label="Cor do Contorno" color={(selectedElement as TextElement).strokeColor || 'transparent'} onChange={val => handleInputChange('strokeColor', val)} onOpenColorPicker={onOpenColorPicker} />
                                    <NumberInput label="Largura Contorno" value={(selectedElement as TextElement).strokeWidth || 0} onChange={val => handleInputChange('strokeWidth', parseInt(val,10))} min={0} unit="px"/>
                                </div>
                                 <Accordion title="Filtros de Fundo">
                                     <RangeInput label="Blur" value={(selectedElement as TextElement).backdropFilters?.blur || 0} onChange={val => handleInputChange('blur', parseInt(val, 10), 'backdropFilters')} min={0} max={50}/>
                                     <RangeInput label="Brilho" value={((selectedElement as TextElement).backdropFilters?.brightness ?? 1) * 100} onChange={val => handleInputChange('brightness', parseInt(val, 10) / 100, 'backdropFilters')} min={0} max={200}/>
                                     <RangeInput label="Contraste" value={((selectedElement as TextElement).backdropFilters?.contrast ?? 1) * 100} onChange={val => handleInputChange('contrast', parseInt(val, 10) / 100, 'backdropFilters')} min={0} max={200}/>
                                     <RangeInput label="Saturação" value={((selectedElement as TextElement).backdropFilters?.saturate ?? 1) * 100} onChange={val => handleInputChange('saturate', parseInt(val, 10) / 100, 'backdropFilters')} min={0} max={200}/>
                                </Accordion>
                            </Accordion>
                        )}
            
                        {selectedElement.type === 'image' && (
                             <Accordion title="Filtros" defaultOpen={true}>
                                <RangeInput label="Brilho" value={(selectedElement as ImageElement).filters.brightness * 100} onChange={val => handleInputChange('brightness', parseInt(val, 10) / 100, 'filters')} min={0} max={200}/>
                                <RangeInput label="Contraste" value={(selectedElement as ImageElement).filters.contrast * 100} onChange={val => handleInputChange('contrast', parseInt(val, 10) / 100, 'filters')} min={0} max={200}/>
                                <RangeInput label="Saturação" value={(selectedElement as ImageElement).filters.saturate * 100} onChange={val => handleInputChange('saturate', parseInt(val, 10) / 100, 'filters')} min={0} max={200}/>
                                <RangeInput label="Blur" value={(selectedElement as ImageElement).filters.blur} onChange={val => handleInputChange('blur', parseInt(val, 10), 'filters')} min={0} max={50}/>
                                <RangeInput label="Grayscale" value={(selectedElement as ImageElement).filters.grayscale * 100} onChange={val => handleInputChange('grayscale', parseInt(val, 10) / 100, 'filters')} min={0} max={100}/>
                                <RangeInput label="Sepia" value={(selectedElement as ImageElement).filters.sepia * 100} onChange={val => handleInputChange('sepia', parseInt(val, 10) / 100, 'filters')} min={0} max={100}/>
                                <RangeInput label="Hue" value={(selectedElement as ImageElement).filters.hueRotate} onChange={val => handleInputChange('hueRotate', parseInt(val, 10), 'filters')} min={0} max={360}/>
                                <RangeInput label="Inverter" value={(selectedElement as ImageElement).filters.invert * 100} onChange={val => handleInputChange('invert', parseInt(val, 10) / 100, 'filters')} min={0} max={100}/>
                            </Accordion>
                        )}
            
                         {selectedElement.type === 'qrcode' && (
                            <Accordion title="QR Code" defaultOpen={true}>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400">URL</label>
                                    <input type="text" value={(selectedElement as QRCodeElement).url} onChange={e => handleInputChange('url', e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs" />
                                </div>
                                 <div className="grid grid-cols-2 gap-2">
                                    <ColorInput label="Cor" color={(selectedElement as QRCodeElement).color} onChange={val => handleInputChange('color', val)} onOpenColorPicker={onOpenColorPicker} />
                                    <ColorInput label="Fundo" color={(selectedElement as QRCodeElement).backgroundColor} onChange={val => handleInputChange('backgroundColor', val)} onOpenColorPicker={onOpenColorPicker} />
                                </div>
                            </Accordion>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertiesPanel;