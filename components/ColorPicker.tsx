

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { parseColor, rgbaToString, rgbToHex, rgbToHsv, hsvToRgb } from '../utils/color';
import { Pipette } from 'lucide-react';

// Extend the Window interface to include EyeDropper for TypeScript
declare global {
    interface Window {
      EyeDropper: new () => {
        open: () => Promise<{ sRGBHex: string }>;
      };
    }
}

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    onClose: () => void;
    palettes?: {
        post?: string[];
        custom?: string[];
    }
}

const DEFAULT_COLORS = [
    '#FFFFFF', '#C7C7C7', '#8F8F8F', '#565656', '#000000',
    '#EF4444', '#F97316', '#FBBF24', '#84CC16', '#22C55E',
    '#14B8A6', '#0EA5E9', '#3B82F6', '#8B5CF6', '#EC4899',
];

const PaletteGrid: React.FC<{title: string, colors: string[], onSelect: (color: string) => void}> = ({ title, colors, onSelect }) => (
    <div>
        <h4 className="text-xs font-semibold text-gray-300 mb-2">{title}</h4>
        <div className="grid grid-cols-5 gap-2">
            {colors.map((pColor, index) => (
                <button
                    key={`${title}-${index}`}
                    onClick={() => onSelect(pColor)}
                    className="w-full aspect-square rounded border border-white/10 transition-transform hover:scale-110"
                    style={{ backgroundColor: pColor }}
                    aria-label={`Select color ${pColor}`}
                />
            ))}
        </div>
    </div>
);


const AdvancedColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onClose, palettes }) => {
    const pickerRef = useRef<HTMLDivElement>(null);
    const satValRef = useRef<HTMLDivElement>(null);

    const initialRgba = parseColor(color || 'transparent');
    const initialHsv = rgbToHsv(initialRgba.r, initialRgba.g, initialRgba.b);
    
    const [hsv, setHsv] = useState(initialHsv);
    const [alpha, setAlpha] = useState(initialRgba.a);

    useEffect(() => {
        const newRgba = parseColor(color || 'transparent');
        setHsv(rgbToHsv(newRgba.r, newRgba.g, newRgba.b));
        setAlpha(newRgba.a);
    }, [color]);

    const handleHsvChange = (newHsv: { h: number, s: number, v: number }) => {
        setHsv(newHsv);
        const { r, g, b } = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
        onChange(rgbaToString({ r, g, b, a: alpha }));
    };

    const handleAlphaChange = (newAlpha: number) => {
        setAlpha(newAlpha);
        const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
        onChange(rgbaToString({ r, g, b, a: newAlpha }));
    };

    const handleSatValMouseDown = useCallback((e: React.MouseEvent) => {
        if (!satValRef.current) return;
        
        const rect = satValRef.current.getBoundingClientRect();
        
        const updateColor = (moveEvent: MouseEvent) => {
            let x = moveEvent.clientX - rect.left;
            let y = moveEvent.clientY - rect.top;
            x = Math.max(0, Math.min(x, rect.width));
            y = Math.max(0, Math.min(y, rect.height));
            
            const s = x / rect.width;
            const v = 1 - (y / rect.height);
            handleHsvChange({ ...hsv, s, v });
        };
        
        updateColor(e.nativeEvent);

        const onMouseMove = (moveEvent: MouseEvent) => updateColor(moveEvent);
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [hsv, handleHsvChange]);

    const handleEyedropper = async () => {
        if (!window.EyeDropper) {
            toast.error("Seu navegador não suporta a ferramenta de conta-gotas.");
            return;
        }
        const eyeDropper = new window.EyeDropper();
        try {
            const result = await eyeDropper.open();
            const newRgba = parseColor(result.sRGBHex);
            onChange(rgbaToString({ ...newRgba, a: alpha }));
        } catch (e) {
            console.log("Seleção do conta-gotas cancelada.");
        }
    };
    
    const currentRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const currentHex = rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
            <div 
                ref={pickerRef} 
                className="bg-zinc-800 p-4 rounded-lg shadow-2xl border border-zinc-700 w-64 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <div 
                    ref={satValRef}
                    className="w-full h-40 rounded-md cursor-pointer relative"
                    style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)`, backgroundSize: 'cover', backgroundImage: 'linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent)'}}
                    onMouseDown={handleSatValMouseDown}
                >
                    <div 
                        className="w-4 h-4 rounded-full border-2 border-white shadow-md absolute"
                        style={{
                            left: `${hsv.s * 100}%`,
                            top: `${(1 - hsv.v) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-300 block mb-1">Matiz</label>
                        <input type="range" min="0" max="360" value={hsv.h} onChange={e => handleHsvChange({...hsv, h: Number(e.target.value)})} className="w-full hue-slider"/>
                    </div>
                     <div>
                        <label className="text-xs text-gray-300 block mb-1">Transparência</label>
                        <input type="range" min="0" max="1" step="0.01" value={alpha} onChange={e => handleAlphaChange(Number(e.target.value))} className="w-full"/>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                     <div
                        className="w-8 h-8 rounded border-2 border-zinc-600"
                        style={{ backgroundColor: rgbaToString({ ...currentRgb, a: alpha }) }}
                    />
                    <div className="text-sm">
                        <input 
                            type="text" 
                            value={currentHex} 
                            onChange={e => {
                                const newRgba = parseColor(e.target.value);
                                onChange(rgbaToString({ ...newRgba, a: alpha }));
                            }}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-1"
                        />
                    </div>
                    <button onClick={handleEyedropper} className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded" aria-label="Usar Conta-gotas">
                        <Pipette className="w-4 h-4"/>
                    </button>
                </div>

                <div className="space-y-3 pt-3 border-t border-zinc-700">
                    {palettes?.post && palettes.post.length > 0 && (
                        <PaletteGrid title="Paleta do Post" colors={palettes.post} onSelect={(c) => onChange(rgbaToString({...parseColor(c), a: alpha}))} />
                    )}
                     {palettes?.custom && palettes.custom.length > 0 && (
                        <PaletteGrid title="Sua Paleta" colors={palettes.custom} onSelect={(c) => onChange(rgbaToString({...parseColor(c), a: alpha}))} />
                    )}
                    <PaletteGrid title="Cores Padrão" colors={DEFAULT_COLORS} onSelect={(c) => onChange(rgbaToString({...parseColor(c), a: alpha}))} />
                </div>
            </div>
             <style>{`
                .hue-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 10px;
                    border-radius: 5px;
                    background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
                    outline: none;
                    opacity: 0.9;
                    transition: opacity .2s;
                }
                .hue-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    border: 2px solid #555;
                }
            `}</style>
        </div>
    );
};

export default AdvancedColorPicker;