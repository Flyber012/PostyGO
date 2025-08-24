
import React, { useState, useRef, useEffect } from 'react';
import { PostSize, BrandKit, User, TextStyle } from '../types';
import { POST_SIZES } from '../constants';
import { Upload, X, Sparkles, BrainCircuit, Coins, AlertCircle, Package, ChevronDown, File as FileIcon, Files } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BrandKitManagement } from './BrandKitManagement';

interface ImageUploaderProps {
    title: string;
    images: string[];
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (index: number) => void;
    limit: number;
    idPrefix: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ title, images, onFileChange, onRemove, limit, idPrefix }) => {
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
}

const Accordion: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-zinc-800/50 rounded-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4">
                <div className="text-lg font-semibold text-gray-200 flex items-center">{title}</div>
                <ChevronDown className={`w-5 h-5 transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-zinc-700/50 pt-4">
                    {children}
                </div>
            )}
        </div>
    );
};

interface CreationPanelProps {
    isLoading: boolean;
    onGenerate: (topic: string, count: number, type: 'post' | 'carousel', contentLevel: 'mínimo' | 'médio' | 'detalhado', backgroundSource: 'upload' | 'ai', aiProvider: 'gemini' | 'freepik', textStyle: TextStyle) => void;
    brandKits: BrandKit[];
    activeBrandKit: BrandKit | undefined;
    postSize: PostSize;
    setPostSize: (size: PostSize) => void;
    hasPosts: boolean;
    customBackgrounds: string[];
    styleImages: string[];
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>, type: 'background' | 'style') => void;
    onRemoveImage: (index: number, type: 'background' | 'style') => void;
    colorMode: 'default' | 'custom' | 'extract';
    setColorMode: (mode: 'default' | 'custom' | 'extract') => void;
    customPalette: string[];
    setCustomPalette: (palette: string[]) => void;
    styleGuide: string | null;
    useStyleGuide: boolean;
    setUseStyleGuide: (use: boolean) => void;
    onAnalyzeStyle: () => void;
    useLayoutToFill: boolean;
    setUseLayoutToFill: (use: boolean) => void;
    user: User | null;
    onBuyCredits: () => void;
    topic: string; setTopic: (s: string) => void;
    contentLevel: 'mínimo' | 'médio' | 'detalhado'; setContentLevel: (s: 'mínimo' | 'médio' | 'detalhado') => void;
    generationType: 'post' | 'carousel'; setGenerationType: (s: 'post' | 'carousel') => void;
    textStyle: TextStyle; setTextStyle: (t: TextStyle) => void;
    backgroundSource: 'upload' | 'ai'; setBackgroundSource: (s: 'upload' | 'ai') => void;
    aiPostCount: number; setAiPostCount: (n: number) => void;
    aiProvider: 'gemini' | 'freepik'; setAiProvider: (s: 'gemini' | 'freepik') => void;
    onSaveBrandKit: (name: string) => void;
    onAddLayoutToActiveKit: () => void;
    onImportBrandKit: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onExportBrandKit: (kitId: string) => void;
    onDeleteBrandKit: (kitId: string) => void;
    onApplyBrandKit: (kitId: string) => void;
    onAddPostFromLayout: (layoutId: string) => void;
    onUpdateLayoutName: (layoutId: string, newName: string) => void;
    onDeleteLayoutFromKit: (layoutId: string) => void;
    selectedLayoutId: string | null;
    setSelectedLayoutId: (id: string | null) => void;
}

const CreationPanel: React.FC<CreationPanelProps> = (props) => {
    const { 
        isLoading, onGenerate, brandKits, activeBrandKit,
        postSize, setPostSize, customBackgrounds, styleImages,
        onFileChange, onRemoveImage, styleGuide, useStyleGuide, setUseStyleGuide, onAnalyzeStyle,
        useLayoutToFill, setUseLayoutToFill, user, onBuyCredits,
        topic, setTopic, contentLevel, setContentLevel, generationType, setGenerationType,
        textStyle, setTextStyle, backgroundSource, setBackgroundSource, aiPostCount, setAiPostCount, 
        aiProvider, setAiProvider, onSaveBrandKit, onAddLayoutToActiveKit, onImportBrandKit, 
        onExportBrandKit, onDeleteBrandKit, onApplyBrandKit, onAddPostFromLayout, 
        onUpdateLayoutName, onDeleteLayoutFromKit, selectedLayoutId, setSelectedLayoutId
     } = props;
    
    useEffect(() => {
        if (useLayoutToFill && (!activeBrandKit || !activeBrandKit.layouts.some(l => l.id === selectedLayoutId))) {
            setUseLayoutToFill(false);
            setSelectedLayoutId(null);
        }
    }, [activeBrandKit, selectedLayoutId, useLayoutToFill, setUseLayoutToFill, setSelectedLayoutId]);

    const handleGenerateClick = () => {
        if (!topic.trim()) {
            toast.error("Por favor, insira um tópico.");
            return;
        }
        const finalCount = backgroundSource === 'upload' ? customBackgrounds.length : aiPostCount;
        if (backgroundSource === 'upload' && finalCount === 0) {
            toast.error("Por favor, suba suas imagens de fundo antes de gerar.");
            return;
        }
        if (finalCount <= 0) {
            toast.error("Por favor, defina um número de posts maior que zero.");
            return;
        }
        onGenerate(topic, finalCount, generationType, contentLevel, backgroundSource, aiProvider, textStyle);
    };
    
    let canGenerate = !isLoading;
    let generateButtonTooltip = '';
    if (!user) {
        canGenerate = false;
        generateButtonTooltip = 'Faça login para gerar conteúdo.';
    } else if (backgroundSource === 'ai') {
        const creditsNeeded = aiPostCount;
        if ((user.credits || 0) < creditsNeeded) {
            generateButtonTooltip = `Créditos insuficientes. Você precisa de ${creditsNeeded}.`;
            canGenerate = false;
        }
    }

    return (
        <div className="w-full bg-zinc-900 p-4 flex flex-col h-full overflow-y-auto">
            <div className="flex-grow space-y-4">
                <Accordion title={<>1. Estilo e Inspiração</>} defaultOpen>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Envie seus designs para a IA aprender sua identidade visual, ou use um Brand Kit.</p>
                        <ImageUploader 
                            title="Seus Designs de Exemplo"
                            images={styleImages}
                            onFileChange={(e) => onFileChange(e, 'style')}
                            onRemove={(index) => onRemoveImage(index, 'style')}
                            limit={10}
                            idPrefix="cp-style"
                        />
                        <button onClick={onAnalyzeStyle} disabled={isLoading || styleImages.length === 0} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <BrainCircuit className="mr-2 h-4 w-4"/> {isLoading ? 'Analisando...' : 'Analisar Estilo'}
                        </button>
                        {styleGuide && (
                            <div className="space-y-2 pt-2 border-t border-zinc-700/50">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="use-style-guide-cp" className="text-sm font-medium text-gray-300">Usar Guia de Estilo na Geração</label>
                                    <button
                                        role="switch"
                                        aria-checked={useStyleGuide}
                                        onClick={() => setUseStyleGuide(!useStyleGuide)}
                                        className={`${useStyleGuide ? 'bg-green-500' : 'bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                    >
                                        <span className={`${useStyleGuide ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Accordion>
                
                <Accordion title={<>2. Conteúdo e Layout</>} defaultOpen>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="cp-topic" className="block text-sm font-medium text-gray-300 mb-1">Tópico</label>
                            <input type="text" id="cp-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nível de Conteúdo</label>
                            <div className="flex bg-zinc-900/70 p-1 rounded-lg">
                                <button onClick={() => setContentLevel('mínimo')} className={`flex-1 text-center text-xs py-1.5 rounded-md transition-all duration-300 ${contentLevel === 'mínimo' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Mínimo</button>
                                <button onClick={() => setContentLevel('médio')} className={`flex-1 text-center text-xs py-1.5 rounded-md transition-all duration-300 ${contentLevel === 'médio' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Médio</button>
                                <button onClick={() => setContentLevel('detalhado')} className={`flex-1 text-center text-xs py-1.5 rounded-md transition-all duration-300 ${contentLevel === 'detalhado' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Detalhado</button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="cp-text-style" className="block text-sm font-medium text-gray-300 mb-1">Estilo do Texto</label>
                            <select id="cp-text-style" value={textStyle} onChange={(e) => setTextStyle(e.target.value as TextStyle)} className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none">
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
                                    <button role="switch" aria-checked={useLayoutToFill} onClick={() => setUseLayoutToFill(!useLayoutToFill)} className={`${useLayoutToFill ? 'bg-green-500' : 'bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                                        <span className={`${useLayoutToFill ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                                    </button>
                                </div>
                                {useLayoutToFill && (
                                    <div className="space-y-2 pt-2 border-t border-zinc-600">
                                        <p className="text-xs text-zinc-400">Selecione um layout para a IA preencher com conteúdo novo sobre seu tópico.</p>
                                        <select
                                            value={selectedLayoutId || ''}
                                            onChange={(e) => setSelectedLayoutId(e.target.value || null)}
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
                </Accordion>
                
                <Accordion title={<>3. Fundos e Formato</>} defaultOpen>
                    <div className="space-y-4">
                        <div className="flex bg-zinc-900/70 p-1 rounded-lg text-sm">
                            <button onClick={() => setBackgroundSource('upload')} className={`flex-1 flex items-center justify-center text-center py-1.5 rounded-md transition-all duration-300 ${backgroundSource === 'upload' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>
                                <Upload className="w-4 h-4 mr-2"/> Meus Fundos
                            </button>
                            <button onClick={() => setBackgroundSource('ai')} className={`flex-1 flex items-center justify-center text-center py-1.5 rounded-md transition-all duration-300 ${backgroundSource === 'ai' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`} disabled={!user}>
                                <Sparkles className="w-4 h-4 mr-2"/> Gerar com IA
                            </button>
                        </div>
                        {backgroundSource === 'upload' ? (
                            <ImageUploader 
                                title="Seus Fundos"
                                images={customBackgrounds}
                                onFileChange={(e) => onFileChange(e, 'background')}
                                onRemove={(index) => onRemoveImage(index, 'background')}
                                limit={10}
                                idPrefix="cp-bg"
                            />
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Provedor de IA</label>
                                    <div className="flex bg-zinc-900/70 p-1 rounded-lg text-sm">
                                        <button onClick={() => setAiProvider('gemini')} className={`flex-1 text-center py-1.5 rounded-md transition-all duration-300 ${aiProvider === 'gemini' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Google Gemini</button>
                                        <button onClick={() => setAiProvider('freepik')} className={`flex-1 text-center py-1.5 rounded-md transition-all duration-300 ${aiProvider === 'freepik' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}>Freepik</button>
                                    </div>
                                </div>
                                <label htmlFor="cp-post-count-ai" className="block text-sm font-medium text-gray-300 mb-1">Número de Posts</label>
                                <input type="number" id="cp-post-count-ai" value={aiPostCount} onChange={e => setAiPostCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} min="1" max="10" className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white" />
                            </div>
                        )}
                         <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setGenerationType('post')} className={`flex items-center justify-center p-2 rounded-md transition-colors ${generationType === 'post' ? 'bg-purple-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
                                <FileIcon className="w-4 h-4 mr-2"/> Post Único
                            </button>
                            <button onClick={() => setGenerationType('carousel')} className={`flex items-center justify-center p-2 rounded-md transition-colors ${generationType === 'carousel' ? 'bg-purple-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
                                <Files className="w-4 h-4 mr-2"/> Carrossel
                            </button>
                        </div>
                        <div>
                            <label htmlFor="cp-post-size" className="block text-sm font-medium text-gray-300 mb-1">Tamanho do Post</label>
                            <select id="cp-post-size" value={postSize.name} onChange={(e) => setPostSize(POST_SIZES.find(s => s.name === e.target.value) || POST_SIZES[0])} className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none">
                                {POST_SIZES.map(s => <option key={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </Accordion>

                <Accordion title={<><Package className="mr-2 h-5 w-5 text-purple-400"/> Brand Kits</>}>
                    <BrandKitManagement 
                        user={user}
                        hasPosts={props.hasPosts}
                        brandKits={brandKits}
                        activeBrandKit={activeBrandKit}
                        onSaveBrandKit={onSaveBrandKit}
                        onAddLayoutToActiveKit={onAddLayoutToActiveKit}
                        onImportBrandKit={onImportBrandKit}
                        onExportBrandKit={onExportBrandKit}
                        onDeleteBrandKit={onDeleteBrandKit}
                        onApplyBrandKit={onApplyBrandKit}
                        onAddPostFromLayout={onAddPostFromLayout}
                        onUpdateLayoutName={onUpdateLayoutName}
                        onDeleteLayoutFromKit={onDeleteLayoutFromKit}
                        selectedLayoutId={selectedLayoutId}
                        setSelectedLayoutId={setSelectedLayoutId}
                    />
                </Accordion>
            </div>
            
            <div className="mt-4 pt-4 border-t border-zinc-700">
                <div title={generateButtonTooltip}>
                    <button onClick={handleGenerateClick} disabled={!canGenerate} className="w-full flex items-center justify-center animated-gradient-bg text-white font-bold py-3 px-4 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Sparkles className="w-5 h-5 mr-2"/>
                        {isLoading ? 'Gerando...' : 'Gerar Conteúdo'}
                    </button>
                </div>
                 {!user && (
                    <div className="flex items-center justify-center text-center p-2 bg-yellow-900/30 rounded-lg mt-2">
                       <AlertCircle className="w-4 h-4 mr-2 text-yellow-400 shrink-0" />
                       <p className="text-xs text-yellow-300">Faça login para gerar conteúdo.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreationPanel;
