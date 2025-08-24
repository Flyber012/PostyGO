



import React, { useState, useRef, useEffect } from 'react';
import { Post, AnyElement, TextElement, ImageElement, GradientElement, BackgroundElement, ShapeElement, BlendMode, QRCodeElement, FontDefinition } from '../types';
import { Plus, Trash2, Type, Image as ImageIcon, GitCommitHorizontal, RefreshCw, Upload, FileUp, Copy, Eye, EyeOff, Lock, Unlock, Square, Circle, QrCode, ChevronDown, ArrowUpFromLine, GripVertical, ArrowDownFromLine } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Accordion Component for collapsible sections
const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="py-3 px-4 border-b border-zinc-800">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="mt-3 space-y-3">{children}</div>
            )}
        </div>
    );
};


interface LayersPanelProps {
    selectedPost: Post | undefined;
    selectedElementId: string | null;
    onSelectElement: (id: string | null) => void;
    onUpdateElement: (elementId: string, updates: Partial<AnyElement>) => void;
    onAddElement: (type: 'text' | 'image' | 'gradient' | 'shape' | 'qrcode', options?: { src?: string; shape?: 'rectangle' | 'circle' }) => void;
    onRemoveElement: (elementId:string) => void;
    onDuplicateElement: (elementId:string) => void;
    onToggleVisibility: (elementId:string) => void;
    onToggleLock: (elementId:string) => void;
    onReorderElements: (sourceId: string, destinationId: string) => void;
    onRegenerateBackground: (elementId: string, prompt: string) => void;
    onUpdateBackgroundSrc: (elementId: string, src: string) => void;
    availableFonts: FontDefinition[];
    onAddFont: (font: FontDefinition) => void;
    onOpenColorPicker: (currentColor: string, onColorChange: (color: string) => void) => void;
    palettes: {
        post?: string[];
        custom?: string[];
    }
}

const LayersPanel: React.FC<LayersPanelProps> = (props) => {
    const { 
        selectedPost, selectedElementId, onSelectElement, onUpdateElement, onAddElement, onRemoveElement, 
        onDuplicateElement, onToggleVisibility, onToggleLock, onReorderElements,
        onRegenerateBackground, onUpdateBackgroundSrc, availableFonts, onAddFont, onOpenColorPicker
    } = props;
    
    const [isAddMenuOpen, setAddMenuOpen] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const dragItem = useRef<string | null>(null);
    const dragOverItem = useRef<string | null>(null);

    if (!selectedPost) return null;

    const selectedElement = selectedPost.elements.find(e => e.id === selectedElementId) as Exclude<AnyElement, BackgroundElement> | undefined;

    const handleInputChange = (key: string, value: any, subKey?: string) => {
        if (!selectedElementId) return;

        let finalValue = value;
        const numericKeys: string[] = ['fontSize', 'width', 'height', 'padding', 'x', 'y', 'opacity', 'angle', 'borderRadius', 'rotation', 'strokeWidth', 'letterSpacing', 'lineHeight', 'borderWidth'];
        
        if (numericKeys.includes(key as any) || subKey) {
            finalValue = parseFloat(value);
            if (isNaN(finalValue)) finalValue = 0;
        }

        if (subKey && selectedElement) {
             const currentSubObject = (selectedElement as any)[key] || {};
             const updatedSubObject = { ...currentSubObject, [subKey]: finalValue };
             onUpdateElement(selectedElementId, { [key]: updatedSubObject } as Partial<AnyElement>);
        } else {
            onUpdateElement(selectedElementId, { [key]: finalValue } as Partial<AnyElement>);
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, isBackground: boolean) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    const src = e.target.result as string;
                    if (isBackground && selectedElementId) {
                        onUpdateBackgroundSrc(selectedElementId, src);
                    } else if (!isBackground) {
                        onAddElement('image', { src });
                    }
                } else {
                    toast.error("Não foi possível ler o arquivo de imagem.");
                }
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    };
    
    const handleFontUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                const fontDataUrl = e.target.result as string;
                const fontName = file.name.split('.').slice(0, -1).join('.');

                const newStyle = document.createElement('style');
                newStyle.setAttribute('data-custom-font', 'true');
                newStyle.innerHTML = `
                    @font-face {
                        font-family: "${fontName}";
                        src: url(${fontDataUrl});
                    }
                `;
                document.head.appendChild(newStyle);
                const newFont: FontDefinition = { name: fontName, dataUrl: fontDataUrl };
                onAddFont(newFont);
                if (selectedElement?.type === 'text') {
                    onUpdateElement(selectedElement.id, { fontFamily: fontName });
                }
                toast.success(`Fonte "${fontName}" adicionada!`);
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };
    
    const NumberInput: React.FC<{label: string, value: number, onChange: (val: string) => void, min?: number, max?: number, step?: number, unit?: string}> = 
    ({label, value, onChange, min, max, step, unit}) => (
        <div>
            <label className="block text-xs font-medium text-gray-400">{label} {unit && `(${unit})`}</label>
            <input type="number" value={value} onChange={e => onChange(e.target.value)} min={min} max={max} step={step} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs" />
        </div>
    );

    const RangeInput: React.FC<{label: string, value: number, onChange: (val: string) => void, min?: number, max?: number, step?: number}> = 
    ({label, value, onChange, min, max, step}) => {
        const [internalValue, setInternalValue] = useState(String(value));

        useEffect(() => {
            setInternalValue(String(value));
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setInternalValue(e.target.value);
            onChange(e.target.value);
        };

        return (
            <div>
                <label className="block text-xs font-medium text-gray-400">{label}</label>
                <input type="range" value={internalValue} onChange={handleChange} min={min} max={max} step={step} className="w-full mt-1" />
            </div>
        );
    };
    
    const ColorInput: React.FC<{label: string, color: string, onChange: (color: string) => void}> = ({ label, color, onChange }) => (
        <div>
            <label className="block text-xs font-medium text-gray-400">{label}</label>
            <button onClick={() => onOpenColorPicker(color, onChange)} className="w-full h-8 mt-1 rounded-md border border-gray-600" style={{backgroundColor: color}} />
        </div>
    );

    const BlendModeSelector: React.FC<{ value: BlendMode | undefined, onChange: (val: string) => void }> = ({ value, onChange }) => {
        const blendModes: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
        return (
            <div>
                <label className="block text-xs font-medium text-gray-400">Modo de Mesclagem</label>
                <select value={value || 'normal'} onChange={e => onChange(e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs appearance-none capitalize">
                    {blendModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                </select>
            </div>
        )
    };

    const renderEditor = () => {
        const bgElement = selectedPost.elements.find(e => e.id === selectedElementId && e.type === 'background');
        if (!selectedElementId || !selectedPost) return <div className="text-center text-gray-400 text-sm p-4">Selecione uma camada para editar.</div>;

        if(bgElement) {
            return (
                 <div className="p-4 space-y-4 text-sm">
                    <h3 className="font-semibold text-white">Editar Fundo</h3>
                    <button onClick={() => backgroundInputRef.current?.click()} className="w-full flex items-center justify-center bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-4 rounded-md transition-all duration-200">
                        <Upload className="mr-2 h-4 w-4"/> Substituir Imagem
                    </button>
                    <input type="file" ref={backgroundInputRef} onChange={(e) => handleImageUpload(e, true)} accept="image/*" className="hidden" />
                    {(bgElement as BackgroundElement).prompt && (
                        <button onClick={() => onRegenerateBackground(bgElement.id, (bgElement as BackgroundElement).prompt!)} className="w-full flex items-center justify-center animated-gradient-bg text-white font-bold py-2 px-4 rounded-md transition-all duration-200">
                            <RefreshCw className="mr-2 h-4 w-4"/> Gerar Novo Fundo
                        </button>
                    )}
                 </div>
            );
        }

        if(!selectedElement) return null;

        return (
            <div className="text-sm">
                <Accordion title="Transformar" defaultOpen={true}>
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput label="Largura" unit="px" value={selectedElement.width} onChange={v => handleInputChange('width', v)} />
                        <NumberInput label="Altura" unit="px" value={selectedElement.height} onChange={v => handleInputChange('height', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput label="Posição X" unit="px" value={selectedElement.x} onChange={v => handleInputChange('x', v)} />
                        <NumberInput label="Posição Y" unit="px" value={selectedElement.y} onChange={v => handleInputChange('y', v)} />
                    </div>
                    <RangeInput label={`Rotação: ${Math.round(selectedElement.rotation)}°`} value={selectedElement.rotation} onChange={v => handleInputChange('rotation', v)} min={-180} max={180} />
                </Accordion>

                <Accordion title="Estilo" defaultOpen={true}>
                     <RangeInput label={`Opacidade: ${Math.round(selectedElement.opacity * 100)}%`} value={selectedElement.opacity} onChange={v => handleInputChange('opacity', v)} min={0} max={1} step={0.01} />
                     { (selectedElement.type === 'image' || selectedElement.type === 'shape' || selectedElement.type === 'gradient' || selectedElement.type === 'qrcode') &&
                        <BlendModeSelector value={(selectedElement as ImageElement).blendMode} onChange={v => handleInputChange('blendMode', v)} />
                     }

                    {selectedElement.type === 'text' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400">Conteúdo</label>
                                <textarea value={(selectedElement as TextElement).content} onChange={(e) => handleInputChange('content', e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs" rows={3}/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400">Fonte Principal</label>
                                <div className="flex items-center space-x-2 mt-1">
                                    <select value={(selectedElement as TextElement).fontFamily} onChange={e => handleInputChange('fontFamily', e.target.value)} className="w-full bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs appearance-none">
                                        {availableFonts.map(font => <option key={font.name} value={font.name}>{font.name}</option>)}
                                    </select>
                                    <button onClick={() => fontInputRef.current?.click()} className="p-2 bg-zinc-600 hover:bg-zinc-500 rounded-md" title="Carregar Fonte"><FileUp className="h-4 w-4" /></button>
                                    <input type="file" ref={fontInputRef} onChange={handleFontUpload} accept=".ttf,.otf,.woff,.woff2" className="hidden" />
                                </div>
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-400">Fonte de Destaque (para **texto**)</label>
                                <select value={(selectedElement as TextElement).accentFontFamily || ''} onChange={e => handleInputChange('accentFontFamily', e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs appearance-none">
                                     <option value="">(Usar Fonte Principal)</option>
                                    {availableFonts.map(font => <option key={font.name} value={font.name}>{font.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <NumberInput label="Tamanho" unit="px" value={(selectedElement as TextElement).fontSize} onChange={v => handleInputChange('fontSize', v)} />
                                <NumberInput label="Esp. Letras" unit="px" value={(selectedElement as TextElement).letterSpacing} onChange={v => handleInputChange('letterSpacing', v)} />
                                <NumberInput label="Alt. Linha" unit="%" value={(selectedElement as TextElement).lineHeight} onChange={v => handleInputChange('lineHeight', v)} step={0.1}/>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400">Alinhar Horizontal</label>
                                    <select value={(selectedElement as TextElement).textAlign} onChange={e => handleInputChange('textAlign', e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs appearance-none">
                                        <option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400">Alinhar Vertical</label>
                                    <div className="flex items-center space-x-1 mt-1">
                                        {(['top', 'middle', 'bottom'] as const).map((align) => {
                                            const icons = { top: <ArrowUpFromLine className="w-4 h-4"/>, middle: <GripVertical className="w-4 h-4"/>, bottom: <ArrowDownFromLine className="w-4 h-4"/> };
                                            const isActive = (selectedElement as TextElement).verticalAlign === align;
                                            return (
                                                <button 
                                                    key={align} 
                                                    onClick={() => handleInputChange('verticalAlign', align)} 
                                                    className={`flex-1 p-1 rounded-md transition-colors ${isActive ? 'bg-purple-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                                                    aria-label={`Align ${align}`}
                                                >
                                                    {icons[align]}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <ColorInput label="Cor" color={(selectedElement as TextElement).color} onChange={c => handleInputChange('color', c)} />
                                <ColorInput label="Destaque" color={(selectedElement as TextElement).highlightColor || '#FBBF24'} onChange={c => handleInputChange('highlightColor', c)} />
                            </div>
                            <div><label className="block text-xs font-medium text-gray-400">Sombra</label><input type="text" placeholder="ex: 2px 2px 4px #000" value={(selectedElement as TextElement).textShadow || ''} onChange={e => handleInputChange('textShadow', e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs" /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <ColorInput label="Cor Contorno" color={(selectedElement as TextElement).strokeColor || 'transparent'} onChange={c => handleInputChange('strokeColor', c)} />
                                <NumberInput label="Largura" unit="px" value={(selectedElement as TextElement).strokeWidth || 0} onChange={v => handleInputChange('strokeWidth', v)} />
                            </div>
                             <div className="space-y-3 pt-3 border-t border-zinc-700">
                                <h4 className="text-xs font-semibold text-gray-300">Fundo</h4>
                                <ColorInput label="Cor do Fundo" color={(selectedElement as TextElement).backgroundColor || 'transparent'} onChange={c => handleInputChange('backgroundColor', c)} />
                                <div className="grid grid-cols-2 gap-2">
                                    <NumberInput label="Padding" unit="px" value={(selectedElement as TextElement).padding || 0} onChange={v => handleInputChange('padding', v)} min={0} />
                                    <NumberInput label="Raio da Borda" unit="px" value={(selectedElement as TextElement).borderRadius || 0} onChange={v => handleInputChange('borderRadius', v)} min={0} />
                                </div>
                            </div>
                        </div>
                    )}
                    {(selectedElement.type === 'image' || selectedElement.type === 'shape') && (
                        <div className="space-y-3">
                             <h4 className="text-xs font-semibold text-gray-300 pt-2">Borda</h4>
                             <div className="grid grid-cols-3 gap-2 items-end">
                                <div className="col-span-1"><NumberInput label="Largura" unit="px" value={selectedElement.borderWidth || 0} onChange={v => handleInputChange('borderWidth', v)} /></div>
                                <div className="col-span-2"><ColorInput label="Cor" color={selectedElement.borderColor || 'transparent'} onChange={c => handleInputChange('borderColor', c)} /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400">Estilo</label>
                                <select value={selectedElement.borderStyle || 'solid'} onChange={e => handleInputChange('borderStyle', e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs appearance-none">
                                    <option value="solid">Sólida</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {selectedElement.type === 'gradient' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <ColorInput label="Cor 1" color={(selectedElement as GradientElement).color1} onChange={c => handleInputChange('color1', c)} />
                                <ColorInput label="Cor 2" color={(selectedElement as GradientElement).color2} onChange={c => handleInputChange('color2', c)} />
                            </div>
                            <RangeInput label={`Ângulo: ${Math.round((selectedElement as GradientElement).angle)}°`} value={(selectedElement as GradientElement).angle} onChange={v => handleInputChange('angle', v)} min={0} max={360} />
                        </div>
                    )}
                     {selectedElement.type === 'shape' && (
                        <div className="space-y-3">
                             <ColorInput label="Preenchimento" color={(selectedElement as ShapeElement).fillColor} onChange={c => handleInputChange('fillColor', c)} />
                        </div>
                    )}
                    {selectedElement.type === 'qrcode' && (
                        <div className="space-y-3">
                             <div><label className="block text-xs font-medium text-gray-400">URL</label><input type="text" value={(selectedElement as QRCodeElement).url} onChange={e => handleInputChange('url', e.target.value)} className="w-full mt-1 bg-black/50 border border-zinc-600 rounded-md px-2 py-1 text-white text-xs" /></div>
                             <div className="grid grid-cols-2 gap-2">
                                <ColorInput label="Cor do Código" color={(selectedElement as QRCodeElement).color} onChange={c => handleInputChange('color', c)} />
                                <ColorInput label="Cor do Fundo" color={(selectedElement as QRCodeElement).backgroundColor} onChange={c => handleInputChange('backgroundColor', c)} />
                            </div>
                        </div>
                    )}
                </Accordion>
                
                {selectedElement.type === 'text' && (
                    <Accordion title="Efeitos de Fundo">
                        {(selectedElement as TextElement).backdropFilters ? (
                             <div className="space-y-3">
                                <p className="text-xs text-zinc-400 -mt-2">Funciona melhor com uma cor de fundo transparente.</p>
                                <RangeInput label={`Desfoque: ${Math.round((selectedElement as TextElement).backdropFilters?.blur || 0)}px`} value={(selectedElement as TextElement).backdropFilters?.blur || 0} onChange={v => handleInputChange('backdropFilters', v, 'blur')} min={0} max={40} step={0.5} />
                                <RangeInput label={`Brilho: ${Math.round(((selectedElement as TextElement).backdropFilters?.brightness ?? 1) * 100)}%`} value={(selectedElement as TextElement).backdropFilters?.brightness ?? 1} onChange={v => handleInputChange('backdropFilters', v, 'brightness')} min={0} max={2} step={0.01} />
                                <RangeInput label={`Contraste: ${Math.round(((selectedElement as TextElement).backdropFilters?.contrast ?? 1) * 100)}%`} value={(selectedElement as TextElement).backdropFilters?.contrast ?? 1} onChange={v => handleInputChange('backdropFilters', v, 'contrast')} min={0} max={2} step={0.01} />
                                <RangeInput label={`Saturação: ${Math.round(((selectedElement as TextElement).backdropFilters?.saturate ?? 1) * 100)}%`} value={(selectedElement as TextElement).backdropFilters?.saturate ?? 1} onChange={v => handleInputChange('backdropFilters', v, 'saturate')} min={0} max={2} step={0.01} />
                                <button
                                    onClick={() => onUpdateElement(selectedElementId, { backdropFilters: undefined })}
                                    className="w-full text-center text-xs text-red-400 hover:text-red-300 py-1"
                                >
                                    Remover Efeitos de Fundo
                                </button>
                             </div>
                        ) : (
                            <button
                                onClick={() => onUpdateElement(selectedElementId, { backdropFilters: { blur: 10, brightness: 1, contrast: 1, saturate: 1 } })}
                                className="w-full flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-3 rounded-md transition-all duration-200 text-xs"
                            >
                                <Plus className="mr-2 h-3 w-3"/> Adicionar Efeitos de Fundo
                            </button>
                        )}
                    </Accordion>
                )}

                {selectedElement.type === 'image' && (
                     <Accordion title="Filtros">
                        <RangeInput label={`Brilho: ${Math.round(((selectedElement as ImageElement).filters.brightness || 1) * 100)}%`} value={(selectedElement as ImageElement).filters.brightness || 1} onChange={v => handleInputChange('filters', v, 'brightness')} min={0} max={2} step={0.01} />
                        <RangeInput label={`Contraste: ${Math.round(((selectedElement as ImageElement).filters.contrast || 1) * 100)}%`} value={(selectedElement as ImageElement).filters.contrast || 1} onChange={v => handleInputChange('filters', v, 'contrast')} min={0} max={2} step={0.01} />
                        <RangeInput label={`Saturação: ${Math.round(((selectedElement as ImageElement).filters.saturate || 1) * 100)}%`} value={(selectedElement as ImageElement).filters.saturate || 1} onChange={v => handleInputChange('filters', v, 'saturate')} min={0} max={2} step={0.01} />
                        <RangeInput label={`Desfoque: ${((selectedElement as ImageElement).filters.blur || 0)}px`} value={(selectedElement as ImageElement).filters.blur || 0} onChange={v => handleInputChange('filters', v, 'blur')} min={0} max={20} step={0.1} />
                        <RangeInput label={`Escala de Cinza: ${Math.round(((selectedElement as ImageElement).filters.grayscale || 0) * 100)}%`} value={(selectedElement as ImageElement).filters.grayscale || 0} onChange={v => handleInputChange('filters', v, 'grayscale')} min={0} max={1} step={0.01} />
                        <RangeInput label={`Sépia: ${Math.round(((selectedElement as ImageElement).filters.sepia || 0) * 100)}%`} value={(selectedElement as ImageElement).filters.sepia || 0} onChange={v => handleInputChange('filters', v, 'sepia')} min={0} max={1} step={0.01} />
                        <RangeInput label={`Girar Matiz: ${Math.round((selectedElement as ImageElement).filters.hueRotate || 0)}°`} value={(selectedElement as ImageElement).filters.hueRotate || 0} onChange={v => handleInputChange('filters', v, 'hueRotate')} min={0} max={360} step={1} />
                        <RangeInput label={`Inverter: ${Math.round(((selectedElement as ImageElement).filters.invert || 0) * 100)}%`} value={(selectedElement as ImageElement).filters.invert || 0} onChange={v => handleInputChange('filters', v, 'invert')} min={0} max={1} step={0.01} />
                    </Accordion>
                )}

            </div>
        );
    };

    const LayerItem: React.FC<{element: Exclude<AnyElement, BackgroundElement>}> = ({ element }) => (
        <li
            draggable={!element.locked}
            onDragStart={() => dragItem.current = element.id}
            onDragEnter={() => dragOverItem.current = element.id}
            onDragEnd={() => {
                if(dragItem.current && dragOverItem.current && dragItem.current !== dragOverItem.current) {
                    onReorderElements(dragItem.current, dragOverItem.current);
                }
                dragItem.current = null; dragOverItem.current = null;
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => onSelectElement(element.id)}
            className={`flex items-center p-2 rounded text-sm transition-all duration-200 ${!element.locked ? 'cursor-pointer' : 'cursor-default'} ${selectedElementId === element.id ? 'animated-gradient-bg text-white' : 'bg-zinc-800/50 hover:bg-zinc-800'} ${!element.visible ? 'opacity-50' : ''}`}
        >
            <span className="truncate flex-1">{element.type === 'text' ? (element as TextElement).content : `Camada ${element.type.charAt(0).toUpperCase() + element.type.slice(1)}`}</span>
            <div className="flex items-center space-x-1 ml-2">
                <button onClick={(e) => { e.stopPropagation(); onDuplicateElement(element.id); }} className="p-1 hover:bg-white/20 rounded"><Copy className="w-3 h-3"/></button>
                <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }} className="p-1 hover:bg-white/20 rounded">{element.visible ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}</button>
                <button onClick={(e) => { e.stopPropagation(); onToggleLock(element.id); }} className="p-1 hover:bg-white/20 rounded">{element.locked ? <Lock className="w-3 h-3"/> : <Unlock className="w-3 h-3"/>}</button>
                <button onClick={(e) => { e.stopPropagation(); onRemoveElement(element.id); }} className="p-1 hover:bg-red-500/50 rounded"><Trash2 className="w-3 h-3"/></button>
            </div>
        </li>
    );

    return (
        <div className="flex flex-col flex-grow min-h-0 bg-zinc-900 border-t border-zinc-700">
            <div className="p-4 border-b border-zinc-700">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold text-gray-200">Camadas</h2>
                    <div className="relative">
                        <button onClick={() => setAddMenuOpen(!isAddMenuOpen)} className="p-1 hover:bg-zinc-700 rounded"><Plus className="w-5 h-5" /></button>
                        {isAddMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-zinc-800 rounded-md shadow-lg z-10 border border-zinc-700">
                                <button onClick={() => { onAddElement('text'); setAddMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700"><Type className="w-4 h-4 mr-2"/> Texto</button>
                                <button onClick={() => { imageInputRef.current?.click(); setAddMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700"><ImageIcon className="w-4 h-4 mr-2"/> Imagem</button>
                                <button onClick={() => { onAddElement('qrcode'); setAddMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700"><QrCode className="w-4 h-4 mr-2"/> QR Code</button>
                                <button onClick={() => { onAddElement('shape', {shape: 'rectangle'}); setAddMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700"><Square className="w-4 h-4 mr-2"/> Retângulo</button>
                                <button onClick={() => { onAddElement('shape', {shape: 'circle'}); setAddMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700"><Circle className="w-4 h-4 mr-2"/> Círculo</button>
                                <button onClick={() => { onAddElement('gradient'); setAddMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700"><GitCommitHorizontal className="w-4 h-4 mr-2"/> Gradiente</button>
                            </div>
                        )}
                         <input type="file" ref={imageInputRef} onChange={(e) => handleImageUpload(e, false)} accept="image/*" className="hidden" />
                    </div>
                </div>
                <ul className="space-y-1 max-h-36 overflow-y-auto">
                     {selectedPost.elements.find(e => e.type === 'background') && (
                        <li onClick={() => onSelectElement(selectedPost.elements.find(e => e.type === 'background')!.id)} className={`flex justify-between items-center p-2 rounded text-sm cursor-pointer ${selectedElementId === selectedPost.elements.find(e => e.type === 'background')!.id ? 'animated-gradient-bg text-white' : 'bg-zinc-800/50 hover:bg-zinc-800'}`}>
                            Fundo
                        </li>
                     )}
                    {[...selectedPost.elements].reverse().map(element => (
                        element.type !== 'background' ? <LayerItem key={element.id} element={element as Exclude<AnyElement, BackgroundElement>} /> : null
                    ))}
                </ul>
            </div>
            
            <div className="flex-grow overflow-y-auto">
                {renderEditor()}
            </div>
        </div>
    );
};

export default LayersPanel;