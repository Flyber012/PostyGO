import React, { useState, useEffect, useRef } from 'react';
import { User, PostSize, BrandKit, ToneOfVoice } from '../types';
import { POST_SIZES } from '../constants';
import { Sparkles, BrainCircuit, Upload, ChevronLeft, X, File, Files, AlertCircle, Coins, LayoutTemplate as LayoutIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Re-usable component from ControlPanel
const ImageUploader: React.FC<{
    title: string;
    images: string[];
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (index: number) => void;
    limit: number;
    idPrefix: string;
}> = ({ title, images, onFileChange, onRemove, limit, idPrefix }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-300">{title} ({images.length}/{limit})</h3>
            <div className="grid grid-cols-4 gap-2 bg-black/30 p-2 rounded-md min-h-[6rem]">
                {images.map((img, index) => (
                    <div key={`${idPrefix}-${index}`} className="relative group aspect-square">
                        <img src={img} alt={`upload preview ${index + 1}`} className="w-full h-full object-cover rounded" />
                        <button 
                            onClick={() => onRemove(index)} 
                            className="absolute top-0 right-0 m-1 bg-red-600/80 hover:bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove image"
                        >
                            <X className="h-3 w-3 text-white" />
                        </button>
                    </div>
                ))}
                {images.length < limit && (
                    <button 
                        onClick={() => inputRef.current?.click()}
                        className="flex items-center justify-center w-full h-full border-2 border-dashed border-gray-600 hover:border-gray-500 rounded text-gray-400 hover:text-white transition-colors aspect-square"
                    >
                        <Upload className="h-6 w-6" />
                    </button>
                )}
            </div>
            <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp"
                ref={inputRef}
                onChange={onFileChange}
                className="hidden"
            />
        </div>
    );
};


interface GenerationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (topic: string, count: number, type: 'post' | 'carousel', contentLevel: 'mínimo' | 'médio' | 'detalhado', backgroundSource: 'upload' | 'ai', aiProvider: 'gemini' | 'freepik', toneOfVoice: ToneOfVoice) => void;
    isLoading: boolean;
    // States from App.tsx
    topic: string; setTopic: (s: string) => void;
    contentLevel: 'mínimo' | 'médio' | 'detalhado'; setContentLevel: (s: 'mínimo' | 'médio' | 'detalhado') => void;
    generationType: 'post' | 'carousel'; setGenerationType: (s: 'post' | 'carousel') => void;
    toneOfVoice: ToneOfVoice; setToneOfVoice: (t: ToneOfVoice) => void;
    postSize: PostSize; setPostSize: (ps: PostSize) => void;
    backgroundSource: 'upload' | 'ai'; setBackgroundSource: (s: 'upload' | 'ai') => void;
    aiPostCount: number; setAiPostCount: (n: number) => void;
    aiProvider: 'gemini' | 'freepik'; setAiProvider: (s: 'gemini' | 'freepik') => void;
    customBackgrounds: string[];
    styleImages: string[];
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>, type: 'background' | 'style') => void;
    onRemoveImage: (index: number, type: 'background' | 'style') => void;
    styleGuide: string | null;
    useStyleGuide: boolean;
    setUseStyleGuide: (use: boolean) => void;
    onAnalyzeStyle: () => void;
    selectedLayoutId: string | null;
    setSelectedLayoutId: (id: string | null) => void;
    useLayoutToFill: boolean;
    setUseLayoutToFill: (use: boolean) => void;
    user: User | null;
    activeBrandKit: BrandKit | undefined;
    onBuyCredits: () => void;
}

const steps = ["Estilo", "Conteúdo", "Fundos", "Formato"];

export const GenerationWizard: React.FC<GenerationWizardProps> = (props) => {
    const { isOpen, onClose, onGenerate, isLoading, user, activeBrandKit, onBuyCredits } = props;
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleNext = () => {
        if(currentStep === 1 && props.useLayoutToFill && !props.selectedLayoutId) {
            toast.error("Por favor, selecione um layout do kit ativo para preencher.");
            return;
        }
        setCurrentStep(s => Math.min(s + 1, steps.length - 1));
    }
    const handleBack = () => setCurrentStep(s => Math.max(s - 1, 0));

    const handleGenerateClick = () => {
        if (!props.topic.trim()) {
            toast.error("Por favor, insira um tópico.");
            return;
        }
    
        const finalCount = props.backgroundSource === 'upload' ? props.customBackgrounds.length : props.aiPostCount;
        
        if (props.backgroundSource === 'upload' && finalCount === 0) {
            toast.error("Por favor, suba suas imagens de fundo antes de gerar.");
            return;
        }
    
        if (finalCount <= 0) {
            toast.error("Por favor, defina um número de posts maior que zero.");
            return;
        }
        
        onGenerate(props.topic, finalCount, props.generationType, props.contentLevel, props.backgroundSource, props.aiProvider, props.toneOfVoice);
    };

    let canGenerate = !isLoading;
    let generateButtonTooltip = '';
    if (!user) {
        canGenerate = false;
        generateButtonTooltip = 'Faça login para gerar conteúdo.';
    } else if (props.backgroundSource === 'ai') {
        const creditsNeeded = props.aiPostCount;
        if ((user.credits || 0) < creditsNeeded) {
            generateButtonTooltip = `Créditos insuficientes. Você precisa de ${creditsNeeded}.`;
            canGenerate = false;
        }
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Estilo
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Envie seus designs para a IA aprender sua identidade visual, ou pule esta etapa.</p>
                        <ImageUploader 
                            title="Seus Designs de Exemplo"
                            images={props.styleImages}
                            onFileChange={(e) => props.onFileChange(e, 'style')}
                            onRemove={(index) => props.onRemoveImage(index, 'style')}
                            limit={10}
                            idPrefix="wiz-style"
                        />
                        <button onClick={props.onAnalyzeStyle} disabled={isLoading || props.styleImages.length === 0} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <BrainCircuit className="mr-2 h-4 w-4"/> {isLoading ? 'Analisando...' : 'Analisar Estilo'}
                        </button>
                        {props.styleGuide && (
                            <div className="space-y-2 pt-2 border-t border-zinc-700/50">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="use-style-guide" className="text-sm font-medium text-gray-300">Usar Guia de Estilo na Geração</label>
                                    <button
                                        role="switch"
                                        aria-checked={props.useStyleGuide}
                                        onClick={() => props.setUseStyleGuide(!props.useStyleGuide)}
                                        className={`${props.useStyleGuide ? 'bg-green-500' : 'bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                    >
                                        <span className={`${props.useStyleGuide ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 1: // Conteúdo
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="wiz-topic" className="block text-sm font-medium text-gray-300 mb-1">Tópico</label>
                            <input type="text" id="wiz-topic" value={props.topic} onChange={(e) => props.setTopic(e.target.value)} className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nível de Conteúdo</label>
                            <div className="flex bg-zinc-900/70 p-1 rounded-lg">
                                <button onClick={() => props.setContentLevel('mínimo')} className={`flex-1 text-center text-xs py-1.5 rounded-md transition-all duration-300 ${props.contentLevel === 'mínimo' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Mínimo</button>
                                <button onClick={() => props.setContentLevel('médio')} className={`flex-1 text-center text-xs py-1.5 rounded-md transition-all duration-300 ${props.contentLevel === 'médio' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Médio</button>
                                <button onClick={() => props.setContentLevel('detalhado')} className={`flex-1 text-center text-xs py-1.5 rounded-md transition-all duration-300 ${props.contentLevel === 'detalhado' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Detalhado</button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="wiz-tone-of-voice" className="block text-sm font-medium text-gray-300 mb-1">Tom de Voz</label>
                            <select id="wiz-tone-of-voice" value={props.toneOfVoice} onChange={(e) => props.setToneOfVoice(e.target.value as ToneOfVoice)} className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none">
                                <option value="padrão">Padrão (Neutro)</option>
                                <option value="profissional">Profissional</option>
                                <option value="amigável">Amigável</option>
                                <option value="inspirador">Inspirador</option>
                                <option value="divertido">Divertido</option>
                            </select>
                        </div>

                        { activeBrandKit && activeBrandKit.layouts.length > 0 && (
                             <div className="space-y-2 p-3 bg-black/20 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-200">Preencher Layout do Kit</label>
                                    <button role="switch" aria-checked={props.useLayoutToFill} onClick={() => props.setUseLayoutToFill(!props.useLayoutToFill)} className={`${props.useLayoutToFill ? 'bg-green-500' : 'bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                                        <span className={`${props.useLayoutToFill ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                                    </button>
                                </div>
                                {props.useLayoutToFill && (
                                    <div className="space-y-2 pt-2 border-t border-zinc-600">
                                        <p className="text-xs text-zinc-400">Selecione um layout para a IA preencher com conteúdo novo sobre seu tópico.</p>
                                        <select
                                            value={props.selectedLayoutId || ''}
                                            onChange={(e) => props.setSelectedLayoutId(e.target.value || null)}
                                            className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none"
                                        >
                                            <option value="">Selecione um layout</option>
                                            {activeBrandKit.layouts.map(layout => (
                                                <option key={layout.id} value={layout.id}>{layout.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                             </div>
                        )}
                    </div>
                );
            case 2: // Fundos
                return (
                    <div className="space-y-4">
                        <div className="flex bg-zinc-900/70 p-1 rounded-lg text-sm">
                            <button onClick={() => props.setBackgroundSource('upload')} className={`flex-1 flex items-center justify-center text-center py-1.5 rounded-md transition-all duration-300 ${props.backgroundSource === 'upload' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>
                                <Upload className="w-4 h-4 mr-2"/> Meus Fundos
                            </button>
                            <button onClick={() => props.setBackgroundSource('ai')} className={`flex-1 flex items-center justify-center text-center py-1.5 rounded-md transition-all duration-300 ${props.backgroundSource === 'ai' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`} disabled={!user}>
                                <Sparkles className="w-4 h-4 mr-2"/> Gerar com IA
                            </button>
                        </div>
                        {props.backgroundSource === 'upload' ? (
                            <ImageUploader 
                                title="Seus Fundos"
                                images={props.customBackgrounds}
                                onFileChange={(e) => props.onFileChange(e, 'background')}
                                onRemove={(index) => props.onRemoveImage(index, 'background')}
                                limit={10}
                                idPrefix="wiz-bg"
                            />
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Provedor de IA</label>
                                    <div className="flex bg-zinc-900/70 p-1 rounded-lg text-sm">
                                        <button onClick={() => props.setAiProvider('gemini')} className={`flex-1 text-center py-1.5 rounded-md transition-all duration-300 ${props.aiProvider === 'gemini' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Google Gemini</button>
                                        <button onClick={() => props.setAiProvider('freepik')} className={`flex-1 text-center py-1.5 rounded-md transition-all duration-300 ${props.aiProvider === 'freepik' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Freepik</button>
                                    </div>
                                </div>
                                <label htmlFor="wiz-post-count-ai" className="block text-sm font-medium text-gray-300 mb-1">Número de Posts</label>
                                <input type="number" id="wiz-post-count-ai" value={props.aiPostCount} onChange={e => props.setAiPostCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} min="1" max="10" className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white" />
                            </div>
                        )}
                    </div>
                );
            case 3: // Formato
                return (
                    <div className="space-y-4">
                        {user && (
                            <div className="space-y-2 p-3 bg-black/20 rounded-lg">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center font-medium text-gray-300">
                                        <Coins className="w-4 h-4 mr-2 text-yellow-400"/>
                                        <span>Créditos de Imagem</span>
                                    </div>
                                    <span className="font-semibold text-gray-200">{user.credits || 0}</span>
                                </div>
                                <button onClick={onBuyCredits} className="w-full text-center text-xs bg-green-600/20 text-green-300 hover:bg-green-600/40 font-semibold py-1 rounded-md">
                                    Comprar mais créditos
                                </button>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => props.setGenerationType('post')} className={`flex items-center justify-center p-2 rounded-md transition-colors ${props.generationType === 'post' ? 'bg-purple-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
                                <File className="w-4 h-4 mr-2"/> Post Único
                            </button>
                            <button onClick={() => props.setGenerationType('carousel')} className={`flex items-center justify-center p-2 rounded-md transition-colors ${props.generationType === 'carousel' ? 'bg-purple-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
                                <Files className="w-4 h-4 mr-2"/> Carrossel
                            </button>
                        </div>
                        <div>
                            <label htmlFor="wiz-post-size" className="block text-sm font-medium text-gray-300 mb-1">Tamanho do Post</label>
                            <select id="wiz-post-size" value={props.postSize.name} onChange={(e) => props.setPostSize(POST_SIZES.find(s => s.name === e.target.value) || POST_SIZES[0])} className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none">
                                {POST_SIZES.map(s => <option key={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        {!user && (
                            <div className="flex items-center justify-center text-center p-2 bg-yellow-900/30 rounded-lg">
                               <AlertCircle className="w-4 h-4 mr-2 text-yellow-400 shrink-0" />
                               <p className="text-xs text-yellow-300">Por favor, faça login para gerar conteúdo.</p>
                            </div>
                        )}
                    </div>
                );
            default: return null;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm lg:items-center" onClick={onClose}>
            <div className="bg-zinc-900 rounded-t-lg lg:rounded-lg shadow-2xl border-t lg:border border-zinc-700 w-full max-w-md p-6 animate-slide-up lg:animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                        {currentStep > 0 && (
                            <button onClick={handleBack} className="p-2 mr-2 text-zinc-400 hover:text-white rounded-full"><ChevronLeft className="w-5 h-5"/></button>
                        )}
                        <h2 className="text-xl font-bold text-white">{steps[currentStep]}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full"><X className="w-5 h-5"/></button>
                </div>

                <div className="w-full bg-zinc-700 rounded-full h-1.5 mb-6">
                    <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
                </div>

                <div className="min-h-[250px]">{renderStepContent()}</div>

                <div className="mt-6">
                    {currentStep < steps.length - 1 ? (
                        <button onClick={handleNext} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-md transition-colors">
                            Próximo
                        </button>
                    ) : (
                        <div title={generateButtonTooltip}>
                            <button 
                                onClick={handleGenerateClick}
                                disabled={!canGenerate}
                                className="w-full flex items-center justify-center animated-gradient-bg text-white font-bold py-3 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles className="w-5 h-5 mr-2"/>
                                {isLoading ? 'Gerando...' : 'Gerar Conteúdo'}
                            </button>
                        </div>
                    )}
                </div>

            </div>
            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out forwards;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .lg\\:animate-fade-in {
                    @media (min-width: 1024px) {
                        animation: fade-in 0.2s ease-out forwards;
                    }
                }
            `}</style>
        </div>
    );
};