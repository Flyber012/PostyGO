
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Post, BrandKit, PostSize, AnyElement, TextElement, ImageElement, BackgroundElement, FontDefinition, LayoutTemplate, BrandAsset, TextStyle, Project, AIGeneratedTextElement, ShapeElement, QRCodeElement } from './types';
import { POST_SIZES, INITIAL_FONTS, PRESET_BRAND_KITS } from './constants';
import * as geminiService from './services/geminiService';
import * as freepikService from './services/freepikService';
import CreationPanel from './components/ControlPanel';
import CanvasEditor from './components/CanvasEditor';
import TimelineGallery from './components/PostGallery';
import RightPanel from './components/RightPanel';
import Header from './components/Header';
import { GenerationWizard } from './components/GenerationWizard';
import { BrandKitPanel } from './components/BrandKitPanel';
import saveAs from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import { ZoomIn, ZoomOut, Maximize, PanelLeft, PanelRight, Package } from 'lucide-react';
import AdvancedColorPicker from './components/ColorPicker';

// --- HELPERS ---
const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const convertAILayoutToElements = (aiLayout: AIGeneratedTextElement[], postSize: PostSize, postId: string): TextElement[] => {
    return aiLayout.map((aiEl, index) => {
        const { width: postWidth, height: postHeight } = postSize;
        const fontSizeMapping = {
            large: postWidth * 0.08,
            medium: postWidth * 0.04,
            small: postWidth * 0.025,
            cta: postWidth * 0.035,
        };
        const fontSize = Math.round(fontSizeMapping[aiEl.fontSize] || fontSizeMapping.medium);
        const element: TextElement = {
            id: `${postId}-text-${index}`,
            type: 'text',
            content: aiEl.content,
            x: (aiEl.x / 100) * postWidth,
            y: (aiEl.y / 100) * postHeight,
            width: (aiEl.width / 100) * postWidth,
            height: (aiEl.height / 100) * postHeight,
            fontSize,
            fontFamily: aiEl.fontFamily || 'Poppins',
            color: aiEl.color || (aiEl.backgroundTone === 'dark' ? '#FFFFFF' : '#0F172A'),
            textAlign: aiEl.textAlign,
            verticalAlign: 'middle',
            rotation: aiEl.rotation || 0,
            opacity: 1, locked: false, visible: true,
            letterSpacing: 0, lineHeight: aiEl.lineHeight || 1.4,
            highlightColor: aiEl.highlightColor, accentFontFamily: aiEl.accentFontFamily,
            backgroundColor: aiEl.backgroundColor,
            padding: aiEl.fontSize === 'cta' ? fontSize * 0.5 : 0,
            borderRadius: aiEl.fontSize === 'cta' ? 8 : 0,
        };
        return element;
    });
};


const WelcomeScreen: React.FC<{ onNewProject: () => void; onOpenProject: () => void; }> = ({ onNewProject, onOpenProject }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-300 bg-black/30 p-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 animated-gradient-text">Bem-vindo(a) ao Posty</h1>
        <p className="text-base md:text-lg text-gray-400 mb-8">Sua ferramenta de IA para criar posts incríveis.</p>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
                onClick={onNewProject}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
                Novo Projeto
            </button>
            <button
                onClick={onOpenProject}
                className="bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
                Abrir Projeto
            </button>
        </div>
    </div>
);

const EmptyPanelPlaceholder: React.FC<{text: string}> = ({ text }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 text-zinc-500">
        <Package className="w-12 h-12 mb-4"/>
        <p className="text-sm font-medium">{text}</p>
    </div>
);


const App: React.FC = () => {
    // Project State
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isLeftPanelOpen, setLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setRightPanelOpen] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [isWizardOpen, setWizardOpen] = useState(false);
    const [isBrandKitPanelOpen, setBrandKitPanelOpen] = useState(false);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 1024);
    const [colorPickerState, setColorPickerState] = useState<{ isOpen: boolean, color: string, onChange: (color: string) => void }>({ isOpen: false, color: '#FFFFFF', onChange: () => {} });

    // Generation Settings (persist across projects for convenience)
    const [topic, setTopic] = useState('Productivity Hacks');
    const [contentLevel, setContentLevel] = useState<'mínimo' | 'médio' | 'detalhado'>('médio');
    const [generationType, setGenerationType] = useState<'post' | 'carousel'>('post');
    const [textStyle, setTextStyle] = useState<TextStyle>('padrão');
    const [backgroundSource, setBackgroundSource] = useState<'upload' | 'ai'>('upload');
    const [aiProvider, setAiProvider] = useState<'gemini' | 'freepik'>('gemini');
    const [aiPostCount, setAiPostCount] = useState(4);
    const [customBackgrounds, setCustomBackgrounds] = useState<string[]>([]);
    const [styleImages, setStyleImages] = useState<string[]>([]);
    
    // BrandKit & Style State
    const [brandKits, setBrandKits] = useState<BrandKit[]>(PRESET_BRAND_KITS);
    const [styleGuide, setStyleGuide] = useState<string | null>(null);
    const [useStyleGuide, setUseStyleGuide] = useState<boolean>(false);
    const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
    const [useLayoutToFill, setUseLayoutToFill] = useState<boolean>(false);
    const [colorMode, setColorMode] = useState<'default' | 'custom' | 'extract'>('default');
    const [customPalette, setCustomPalette] = useState<string[]>(['#FFFFFF', '#000000', '#FBBF24', '#3B82F6']);
    const [availableFonts, setAvailableFonts] = useState<FontDefinition[]>(INITIAL_FONTS);
    
    // Refs
    const editorRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLElement>(null);
    const openProjectInputRef = useRef<HTMLInputElement>(null);
    const importKitRef = useRef<HTMLInputElement>(null);

    // Derived State
    const posts = currentProject?.posts || [];
    const postSize = currentProject?.postSize || POST_SIZES[0];
    const activeBrandKitId = currentProject?.activeBrandKitId || null;
    const selectedPost = posts.find(p => p.id === selectedPostId);
    const activeBrandKit = brandKits.find(k => k.id === activeBrandKitId);

    // --- RESPONSIVE & UI LOGIC ---
     useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobileView(mobile);
            if (!mobile) {
                setLeftPanelOpen(true);
                setRightPanelOpen(true);
            } else {
                setLeftPanelOpen(false);
                setRightPanelOpen(false);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- PROJECT MANAGEMENT ---
    const createNewProject = (name: string, size: PostSize): Project => ({
        id: uuidv4(),
        name,
        posts: [],
        postSize: size,
        activeBrandKitId: null,
        topic: 'New Project Topic',
    });

    const handleNewProject = (size = POST_SIZES[0]) => {
        const newProj = createNewProject(`Untitled Project ${new Date().toLocaleTimeString()}`, size);
        setCurrentProject(newProj);
        setSelectedPostId(null);
        setSelectedElementId(null);
    };

    const handleSaveProject = () => {
        if (!currentProject) {
            toast.error("Nenhum projeto ativo para salvar.");
            return;
        }
        localStorage.setItem(`posty_project_${currentProject.id}`, JSON.stringify(currentProject));
        localStorage.setItem('posty_last_project_id', currentProject.id);
        toast.success(`Projeto "${currentProject.name}" salvo!`);
    };
    
    const handleSaveAsProject = () => {
        if (!currentProject) return;
        const projectJson = JSON.stringify(currentProject, null, 2);
        const blob = new Blob([projectJson], { type: 'application/json' });
        saveAs(blob, `${currentProject.name.replace(/ /g, '_')}.posty`);
        toast.success("Projeto exportado!");
    };

    const handleOpenProjectClick = () => {
        openProjectInputRef.current?.click();
    };

    const handleOpenProjectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const importedProject = JSON.parse(text) as Project;
                if (importedProject && importedProject.id && importedProject.name && Array.isArray(importedProject.posts)) {
                    setCurrentProject(importedProject);
                    setSelectedPostId(importedProject.posts[0]?.id || null);
                    setSelectedElementId(null);
                    toast.success(`Projeto "${importedProject.name}" carregado!`);
                } else {
                    throw new Error("Arquivo de projeto inválido.");
                }
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Falha ao abrir projeto.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    useEffect(() => {
        const lastProjectId = localStorage.getItem('posty_last_project_id');
        if (lastProjectId) {
            const savedProjectJson = localStorage.getItem(`posty_project_${lastProjectId}`);
            if (savedProjectJson) {
                const savedProject: Project = JSON.parse(savedProjectJson);
                setCurrentProject(savedProject);
                setSelectedPostId(savedProject.posts[0]?.id || null);
            }
        }
    }, []);


    // --- CORE APP LOGIC ---
    const setPosts = (newPosts: Post[] | ((prevPosts: Post[]) => Post[])) => {
        setCurrentProject(proj => {
            if (!proj) return null;
            const updatedPosts = typeof newPosts === 'function' ? newPosts(proj.posts) : newPosts;
            return { ...proj, posts: updatedPosts };
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'background' | 'style') => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        const targetStateUpdater = type === 'background' ? setCustomBackgrounds : setStyleImages;
        const currentState = type === 'background' ? customBackgrounds : styleImages;
        if (currentState.length + files.length > 10) {
            toast.error(`Você só pode enviar até 10 imagens.`);
            return;
        }
        const toastId = toast.loading('Carregando imagens...');
        try {
            const base64Results = await Promise.all(files.map(file => readFileAsBase64(file)));
            targetStateUpdater(prev => [...prev, ...base64Results]);
            toast.success('Imagens carregadas!', { id: toastId });
        } catch (error) {
            toast.error('Falha ao carregar uma ou mais imagens.', { id: toastId });
        } finally {
            event.target.value = '';
        }
    };

    const handleRemoveImage = (index: number, type: 'background' | 'style') => {
        const updater = type === 'background' ? setCustomBackgrounds : setStyleImages;
        updater(prev => prev.filter((_, i) => i !== index));
    };

    const handleAnalyzeStyle = async () => {
        if (styleImages.length === 0) {
            toast.error("Por favor, envie suas imagens de exemplo primeiro.");
            return;
        }
        const toastId = toast.loading('Analisando seu estilo...');
        try {
            const analysis = await geminiService.analyzeStyleFromImages(styleImages);
            setStyleGuide(analysis);
            setUseStyleGuide(true);
            toast.success('Guia de Estilo criado com sucesso!', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Falha ao analisar o estilo.', { id: toastId });
        }
    };

    const handleGeneratePosts = async (
        genTopic: string, count: number, genType: 'post' | 'carousel', genContentLevel: 'mínimo' | 'médio' | 'detalhado',
        genBackgroundSource: 'upload' | 'ai', genAiProvider: 'gemini' | 'freepik', genTextStyle: TextStyle
    ) => {
        if (!currentProject || !postSize) {
            toast.error("Por favor, crie ou abra um projeto primeiro.");
            return;
        }
        
        setIsLoading(true);
        setPosts([]);
        setSelectedPostId(null);
        setSelectedElementId(null);
        const toastId = toast.loading('Iniciando geração...');
        const activeKit = useStyleGuide ? brandKits.find(k => k.id === activeBrandKitId) : null;
        const activeStyleGuide = useStyleGuide ? styleGuide : null;
        
        try {
             if (useLayoutToFill && selectedLayoutId && activeBrandKitId) {
                const kit = brandKits.find(k => k.id === activeBrandKitId);
                const layout = kit?.layouts.find(l => l.id === selectedLayoutId);

                if (!kit || !layout) throw new Error("Layout ou Brand Kit selecionado não foi encontrado.");
                if (customBackgrounds.length === 0) throw new Error("Por favor, envie as imagens de fundo que você deseja usar com este layout.");
                
                const backgroundSources = customBackgrounds.map(src => ({ src }));
                setLoadingMessage(`Preenchendo seu layout com conteúdo...`);
                toast.loading(`Preenchendo seu layout...`, { id: toastId });

                const newPosts: Post[] = [];
                const textElementsToFill = layout.elements.filter(el => el.type === 'text').map(el => {
                    const textEl = el as TextElement;
                    let description = textEl.fontSize > 48 ? 'título principal' : textEl.fontSize < 20 ? 'texto de rodapé' : 'corpo de texto';
                    return { id: el.id, description, exampleContent: textEl.content };
                });

                for (let i = 0; i < backgroundSources.length; i++) {
                    setLoadingMessage(`Gerando texto para o post ${i + 1}/${backgroundSources.length}...`);
                    const newContentMap = await geminiService.generateTextForLayout(textElementsToFill, genTopic, genContentLevel, activeStyleGuide, undefined, genTextStyle);
                    const newPostId = uuidv4();
                    const backgroundElement: BackgroundElement = { id: `${newPostId}-background`, type: 'background', src: backgroundSources[i].src };
                    const newElements: AnyElement[] = JSON.parse(JSON.stringify(layout.elements.filter(el => el.type !== 'background'))).map((el: AnyElement) => {
                        const newEl = { ...el, id: `${newPostId}-${el.id}` };
                        if (newEl.type === 'text' && newContentMap[el.id]) (newEl as TextElement).content = newContentMap[el.id];
                        return newEl;
                    });
                    newPosts.push({ id: newPostId, elements: [backgroundElement, ...newElements] });
                }
                setPosts(newPosts);
                if (newPosts.length > 0) setSelectedPostId(newPosts[0].id);
                toast.success(`${newPosts.length} posts criados com seu layout!`, { id: toastId });
            } else { 
                let backgroundSources: { src: string; prompt?: string; provider?: 'gemini' | 'freepik' }[] = [];
                if (genBackgroundSource === 'ai') {
                    setLoadingMessage('Gerando prompts de imagem...');
                    toast.loading('Gerando prompts de imagem...', { id: toastId });
                    const imagePrompts = await geminiService.generateImagePrompts(genTopic, count, activeStyleGuide);
                    setLoadingMessage(`Gerando ${imagePrompts.length} imagens...`);
                    toast.loading(`Gerando ${imagePrompts.length} imagens...`, { id: toastId });
                    const imageGenerator = genAiProvider === 'freepik' ? freepikService.generateBackgroundImages : geminiService.generateBackgroundImages;
                    const generatedImages = await imageGenerator(imagePrompts, postSize);
                    backgroundSources = generatedImages.map((src, i) => ({ src: `data:image/png;base64,${src}`, prompt: imagePrompts[i], provider: genAiProvider }));
                } else {
                    if (customBackgrounds.length === 0) throw new Error("Nenhuma imagem de fundo foi enviada.");
                    backgroundSources = customBackgrounds.map(src => ({ src }));
                }

                setLoadingMessage('Criando layouts inteligentes...');
                toast.loading('Criando layouts inteligentes...', { id: toastId });
                const layoutPromises = backgroundSources.map(bg => geminiService.generateLayoutAndContentForImage(bg.src, genTopic, genContentLevel, activeKit, undefined, genTextStyle));
                const allLayouts = await Promise.all(layoutPromises);

                const newPosts: Post[] = [];
                const carouselId = genType === 'carousel' ? uuidv4() : undefined;
                for (let i = 0; i < backgroundSources.length; i++) {
                    const bgData = backgroundSources[i];
                    const layout = allLayouts[i];
                    const newPostId = uuidv4();
                    setLoadingMessage(`Montando post ${i + 1}/${backgroundSources.length}...`);
                    const backgroundElement: BackgroundElement = { id: `${newPostId}-background`, type: 'background', src: bgData.src, prompt: bgData.prompt, provider: bgData.provider };
                    const textElements = convertAILayoutToElements(layout, postSize, newPostId);
                    newPosts.push({ id: newPostId, elements: [backgroundElement, ...textElements], carouselId: carouselId, slideIndex: carouselId ? i : undefined });
                }
                setPosts(newPosts);
                if (newPosts.length > 0) setSelectedPostId(newPosts[0].id);
                toast.success('Posts criados com sucesso!', { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Falha ao gerar conteúdo.', { id: toastId, duration: 6000 });
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    // --- ELEMENT & POST MANIPULATION HANDLERS ---
    const updatePostElement = useCallback((elementId: string, updates: Partial<AnyElement>) => {
        if (!selectedPostId) return;
        setPosts(prevPosts =>
            prevPosts.map(post =>
                post.id === selectedPostId
                    ? { ...post, elements: post.elements.map(el => el.id === elementId ? { ...el, ...updates } as AnyElement : el) }
                    : post
            )
        );
    }, [selectedPostId]);

    const handleAddElement = (type: 'text' | 'image' | 'gradient' | 'shape' | 'qrcode', options?: { src?: string, shape?: 'rectangle' | 'circle' }) => {
        if (!selectedPostId || !postSize) return;
        const newId = `${selectedPostId}-${uuidv4()}`;
        const baseElement = { id: newId, x: postSize.width/2 - 150, y: postSize.height/2 - 50, width: 300, height: 100, rotation: 0, opacity: 1, locked: false, visible: true };
        let newElement: AnyElement | null = null;
        if (type === 'text') newElement = { ...baseElement, type, content: 'Texto Editável', fontSize: 48, fontFamily: 'Roboto', color: '#FFFFFF', textAlign: 'center', verticalAlign: 'middle', letterSpacing: 0, lineHeight: 1.2 };
        if (type === 'shape') newElement = { ...baseElement, type, width: 150, height: 150, shape: options?.shape || 'rectangle', fillColor: '#3B82F6' };
        if (type === 'qrcode') newElement = { ...baseElement, type, width: 150, height: 150, url: 'https://posty.app', color: '#000000', backgroundColor: '#FFFFFF' };
        
        if (newElement) {
             setPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, elements: [...p.elements, newElement!] } : p));
             setSelectedElementId(newId);
        }
    };

    const removeElement = (elementId: string) => {
        if (!selectedPostId) return;
        setPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, elements: p.elements.filter(el => el.id !== elementId) } : p));
        if (selectedElementId === elementId) setSelectedElementId(null);
    };

    const duplicateElement = (elementId: string) => {
        if (!selectedPostId) return;
        setPosts(prev => prev.map(p => {
            if (p.id !== selectedPostId) return p;
            const elToDup = p.elements.find(el => el.id === elementId);
            if (!elToDup || elToDup.type === 'background') return p;
            const newEl = { ...elToDup, id: `${p.id}-${uuidv4()}`, x: elToDup.x + 20, y: elToDup.y + 20 };
            const originalIndex = p.elements.findIndex(el => el.id === elementId);
            const newElements = [...p.elements];
            newElements.splice(originalIndex + 1, 0, newEl);
            return { ...p, elements: newElements };
        }));
    };
    
    const toggleElementProperty = (elementId: string, prop: 'visible' | 'locked') => updatePostElement(elementId, { [prop]: !selectedPost?.elements.find(e => e.id === elementId)?.[prop] });
    
    const reorderElements = (sourceId: string, destinationId: string) => {
        if (!selectedPostId) return;
        setPosts(prev => prev.map(p => {
            if (p.id !== selectedPostId) return p;
            const elements = p.elements.filter(el => el.type !== 'background');
            const background = p.elements.find(el => el.type === 'background');
            const sourceIndex = elements.findIndex(el => el.id === sourceId);
            const destIndex = elements.findIndex(el => el.id === destinationId);
            if (sourceIndex === -1 || destIndex === -1) return p;
            const [removed] = elements.splice(sourceIndex, 1);
            elements.splice(destIndex, 0, removed);
            return { ...p, elements: background ? [background, ...elements] : elements };
        }));
    };

    const addPost = () => {
        if (!currentProject) return;
        const newPostId = uuidv4();
        const newPost: Post = { id: newPostId, elements: [{ id: `${newPostId}-background`, type: 'background', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=' }] };
        setPosts(prev => [...prev, newPost]);
        setSelectedPostId(newPostId);
    };

    const deletePost = ({ postId, carouselId }: { postId?: string, carouselId?: string }) => {
        let remainingPosts: Post[];
        if (carouselId) remainingPosts = posts.filter(p => p.carouselId !== carouselId);
        else if (postId) remainingPosts = posts.filter(p => p.id !== postId);
        else return;
        setPosts(remainingPosts);
        if (selectedPostId === postId || posts.find(p => p.id === selectedPostId)?.carouselId === carouselId) {
            setSelectedPostId(remainingPosts[0]?.id || null);
        }
    };
    
    // --- BRANDKIT & FONT HANDLERS ---
    const handleAddFont = (font: FontDefinition) => setAvailableFonts(prev => [...prev, font]);
    const handleOpenColorPicker = (color: string, onChange: (newColor: string) => void) => setColorPickerState({ isOpen: true, color, onChange });
    
    const handleSaveBrandKit = (name: string) => {
        if (!selectedPost) {
            toast.error("Nenhum post selecionado para criar um kit.");
            return;
        }
        const newKit: BrandKit = { id: uuidv4(), name, styleGuide: styleGuide, fonts: [], palette: customPalette, layouts: [{ id: uuidv4(), name: 'Layout Padrão', elements: selectedPost.elements }], assets: [] };
        setBrandKits(prev => [...prev, newKit]);
        toast.success(`Brand Kit "${name}" salvo!`);
    };

    const handleAddLayoutToActiveKit = () => {
        if (!selectedPost || !activeBrandKitId) return;
        const newLayout: LayoutTemplate = { id: uuidv4(), name: `Layout ${new Date().toLocaleTimeString()}`, elements: JSON.parse(JSON.stringify(selectedPost.elements)) };
        setBrandKits(prev => prev.map(k => k.id === activeBrandKitId ? { ...k, layouts: [...k.layouts, newLayout] } : k));
        toast.success("Layout adicionado ao kit!");
    };
    
    // ... Other BrandKit handlers ...

    const handleFitToScreen = useCallback(() => {
        if (!viewportRef.current || !postSize) return;
        const { width: vw, height: vh } = viewportRef.current.getBoundingClientRect();
        const { width: cw, height: ch } = postSize;
        const newZoom = Math.min(vw / cw, vh / ch) * 0.9;
        setZoom(newZoom);
    }, [postSize]);

    useEffect(() => {
        handleFitToScreen();
        window.addEventListener('resize', handleFitToScreen);
        return () => window.removeEventListener('resize', handleFitToScreen);
    }, [handleFitToScreen, selectedPostId, postSize]);

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            {colorPickerState.isOpen && <AdvancedColorPicker color={colorPickerState.color} onChange={colorPickerState.onChange} onClose={() => setColorPickerState(s => ({...s, isOpen: false}))} palettes={{post: selectedPost?.palette, custom: customPalette}}/>}
            {(isLeftPanelOpen || isRightPanelOpen) && isMobileView && (
                <div className="mobile-backdrop" onClick={() => { setLeftPanelOpen(false); setRightPanelOpen(false); }} />
            )}
            
            <input type="file" ref={openProjectInputRef} onChange={handleOpenProjectFile} accept=".posty" className="hidden" />
            <input type="file" ref={importKitRef} onChange={() => {}} accept=".json" className="hidden" />

            <div className={`app-layout font-sans bg-gray-950 text-gray-100 ${isLeftPanelOpen ? 'left-panel-open' : ''} ${isRightPanelOpen ? 'right-panel-open' : ''}`}>
                <Header 
                    onNewProject={handleNewProject}
                    onSaveProject={handleSaveProject}
                    onSaveAsProject={handleSaveAsProject}
                    onOpenProject={handleOpenProjectClick}
                    hasProject={!!currentProject}
                />

                <aside className={`left-panel ${isMobileView && isLeftPanelOpen ? 'mobile-panel-open' : ''}`}>
                    {currentProject ? (
                        <CreationPanel
                            isLoading={isLoading}
                            onGenerate={handleGeneratePosts}
                            brandKits={brandKits}
                            activeBrandKit={activeBrandKit}
                            postSize={postSize}
                            setPostSize={(size) => setCurrentProject(p => p ? { ...p, postSize: size } : null)}
                            hasPosts={posts.length > 0}
                            customBackgrounds={customBackgrounds}
                            styleImages={styleImages}
                            onFileChange={handleFileChange}
                            onRemoveImage={handleRemoveImage}
                            colorMode={colorMode} setColorMode={setColorMode}
                            customPalette={customPalette} setCustomPalette={setCustomPalette}
                            styleGuide={styleGuide} useStyleGuide={useStyleGuide}
                            setUseStyleGuide={setUseStyleGuide} onAnalyzeStyle={handleAnalyzeStyle}
                            useLayoutToFill={useLayoutToFill} setUseLayoutToFill={setUseLayoutToFill}
                            topic={topic} setTopic={setTopic}
                            contentLevel={contentLevel} setContentLevel={setContentLevel}
                            generationType={generationType} setGenerationType={setGenerationType}
                            textStyle={textStyle} setTextStyle={setTextStyle}
                            backgroundSource={backgroundSource} setBackgroundSource={setBackgroundSource}
                            aiPostCount={aiPostCount} setAiPostCount={setAiPostCount}
                            aiProvider={aiProvider} setAiProvider={setAiProvider}
                            onSaveBrandKit={handleSaveBrandKit}
                            onAddLayoutToActiveKit={handleAddLayoutToActiveKit}
                            onImportBrandKit={() => {}}
                            onExportBrandKit={() => {}}
                            onDeleteBrandKit={(kitId) => setBrandKits(prev => prev.filter(k => k.id !== kitId))}
                            onApplyBrandKit={(kitId) => setCurrentProject(p => p ? { ...p, activeBrandKitId: kitId } : null)}
                            onAddPostFromLayout={() => {}}
                            onUpdateLayoutName={() => {}}
                            onDeleteLayoutFromKit={() => {}}
                            selectedLayoutId={selectedLayoutId}
                            setSelectedLayoutId={setSelectedLayoutId}
                        />
                    ) : (
                         <EmptyPanelPlaceholder text="Crie ou abra um projeto para começar."/>
                    )}
                </aside>

                <main className="main-content" ref={viewportRef}>
                    {!currentProject ? (
                        <WelcomeScreen onNewProject={handleNewProject} onOpenProject={handleOpenProjectClick} />
                    ) : isLoading ? (
                        <div className="flex flex-col items-center justify-center text-center h-full">
                            <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-xl font-semibold text-gray-300">{loadingMessage}</p>
                            <p className="text-gray-400">Aguarde, a mágica está acontecendo...</p>
                        </div>
                    ) : selectedPost ? (
                        <div className="flex items-center justify-center h-full w-full">
                            <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}>
                                <CanvasEditor
                                    ref={editorRef}
                                    post={selectedPost}
                                    postSize={postSize}
                                    onUpdateElement={updatePostElement}
                                    selectedElementId={selectedElementId}
                                    onSelectElement={setSelectedElementId}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 p-4">
                            <h2 className="text-2xl font-bold mb-2">Projeto Vazio</h2>
                            <p>Use o painel à esquerda para gerar seu primeiro conteúdo.</p>
                        </div>
                    )}

                    <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
                        <button onClick={() => setLeftPanelOpen(!isLeftPanelOpen)} className="p-2 bg-zinc-900/70 backdrop-blur-sm rounded-lg shadow-lg hover:bg-zinc-800 transition-colors">
                            <PanelLeft className="w-5 h-5"/>
                        </button>
                    </div>
                     <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
                        <button onClick={() => setRightPanelOpen(!isRightPanelOpen)} className="p-2 bg-zinc-900/70 backdrop-blur-sm rounded-lg shadow-lg hover:bg-zinc-800 transition-colors">
                            <PanelRight className="w-5 h-5"/>
                        </button>
                    </div>
                    
                    {currentProject && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-zinc-900/70 backdrop-blur-sm p-2 rounded-lg shadow-lg z-10">
                            <button onClick={() => setZoom(z => Math.max(z / 1.25, 0.1))} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Zoom Out"><ZoomOut className="w-5 h-5"/></button>
                            <span className="text-sm font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(z * 1.25, 5))} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Zoom In"><ZoomIn className="w-5 h-5"/></button>
                            <button onClick={handleFitToScreen} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Fit to Screen"><Maximize className="w-5 h-5"/></button>
                        </div>
                    )}
                </main>

                <aside className={`right-panel ${isMobileView && isRightPanelOpen ? 'mobile-panel-open' : ''}`}>
                    {currentProject ? (
                       <RightPanel
                            selectedPost={selectedPost}
                            selectedElementId={selectedElementId}
                            onSelectElement={setSelectedElementId}
                            onUpdateElement={updatePostElement}
                            onAddElement={handleAddElement}
                            onRemoveElement={removeElement}
                            onDuplicateElement={duplicateElement}
                            onToggleVisibility={(id) => toggleElementProperty(id, 'visible')}
                            onToggleLock={(id) => toggleElementProperty(id, 'locked')}
                            onReorderElements={reorderElements}
                            onRegenerateBackground={() => {}}
                            onUpdateBackgroundSrc={() => {}}
                            availableFonts={availableFonts}
                            onAddFont={handleAddFont}
                            onOpenColorPicker={handleOpenColorPicker}
                            palettes={{ post: selectedPost?.palette, custom: customPalette }}
                        />
                    ) : (
                        <EmptyPanelPlaceholder text="Selecione um post para ver suas camadas e propriedades."/>
                    )}
                </aside>

                <footer className="footer-gallery">
                    {currentProject && posts.length > 0 && (
                        <TimelineGallery
                            posts={posts}
                            selectedPostId={selectedPostId}
                            onSelectPost={setSelectedPostId}
                            onAddPost={addPost}
                            onDeletePost={deletePost}
                        />
                    )}
                </footer>
            </div>
        </>
    );
};

export default App;
