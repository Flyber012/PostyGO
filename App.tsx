

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
import { ZoomIn, ZoomOut, Maximize, PanelLeft, PanelRight, PanelLeftClose, PanelRightClose, Package, Image as ImageIcon, FileText, X, LayoutTemplate as LayoutTemplateIcon, Plus } from 'lucide-react';
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
            fontWeight: 400,
            fontStyle: 'normal',
            textDecoration: 'none',
            color: aiEl.color || (aiEl.backgroundTone === 'dark' ? '#FFFFFF' : '#0F172A'),
            textAlign: aiEl.textAlign,
            verticalAlign: 'middle',
            rotation: aiEl.rotation || 0,
            opacity: 1, locked: false, visible: true,
            letterSpacing: 0, lineHeight: aiEl.lineHeight || 1,
            highlightColor: aiEl.highlightColor, accentFontFamily: aiEl.accentFontFamily,
            backgroundColor: aiEl.backgroundColor,
            padding: aiEl.fontSize === 'cta' ? fontSize * 0.5 : 0,
            borderRadius: aiEl.fontSize === 'cta' ? 8 : 0,
        };
        return element;
    });
};


const WelcomeScreen: React.FC<{ onNewProject: (size: PostSize) => void; onOpenProject: () => void; onOpenRecent: (project: Project) => void; }> = ({ onNewProject, onOpenProject, onOpenRecent }) => {
    const [recentProjects, setRecentProjects] = useState<Project[]>([]);

    useEffect(() => {
        try {
            const recentIds: string[] = JSON.parse(localStorage.getItem('posty_recent_project_ids') || '[]');
            const loadedProjects: Project[] = recentIds.map(id => {
                const projectJson = localStorage.getItem(`posty_project_${id}`);
                return projectJson ? JSON.parse(projectJson) : null;
            }).filter((p): p is Project => p !== null);
            setRecentProjects(loadedProjects);
        } catch (error) {
            console.error("Failed to load recent projects:", error);
            localStorage.removeItem('posty_recent_project_ids');
        }
    }, []);

    return (
        <div className="flex h-full w-full bg-zinc-900 text-gray-300">
            <aside className="w-64 bg-zinc-950/50 p-4 flex flex-col">
                <div className="flex items-center space-x-3 px-2 pt-2 mb-6">
                    <LayoutTemplateIcon className="w-9 h-9 text-white" />
                    <h1 className="text-3xl font-bold">
                        <span className="text-white">Po</span><span className="text-purple-400">sty</span>
                    </h1>
                </div>
                <div className="space-y-3">
                    <button
                        onClick={() => onNewProject(POST_SIZES[0])}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-left"
                    >
                        Novo Projeto...
                    </button>
                    <button
                        onClick={onOpenProject}
                        className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-left"
                    >
                        Abrir...
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto">
                 <h2 className="text-xl font-semibold mb-4 text-gray-200">Comece com um Template</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                    {POST_SIZES.map(size => (
                        <button key={size.name} onClick={() => onNewProject(size)} className="bg-zinc-800 rounded-lg p-4 text-center hover:bg-zinc-700/80 transition-all group border border-transparent hover:border-purple-500">
                            <ImageIcon className="w-12 h-12 mx-auto text-zinc-500 group-hover:text-purple-400 transition-colors" />
                            <p className="font-semibold mt-2 text-white">{size.name}</p>
                            <p className="text-xs text-zinc-400">{size.width} x {size.height} px</p>
                        </button>
                    ))}
                </div>
                {recentProjects.length > 0 && (
                     <>
                        <h2 className="text-xl font-semibold mb-4 text-gray-200">Recentes</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {recentProjects.map(p => (
                                <button key={p.id} onClick={() => onOpenRecent(p)} className="bg-zinc-800 rounded-lg p-4 text-left hover:bg-zinc-700/80 transition-all group border border-transparent hover:border-purple-500 overflow-hidden">
                                    <div className="w-full aspect-square bg-zinc-700 rounded-md mb-3 flex items-center justify-center">
                                        <FileText className="w-10 h-10 text-zinc-500" />
                                    </div>
                                    <p className="font-semibold text-sm text-white truncate">{p.name}</p>
                                    <p className="text-xs text-zinc-400">{p.postSize.name}</p>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};


const EmptyPanelPlaceholder: React.FC<{text: string}> = ({ text }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 text-zinc-500">
        <Package className="w-12 h-12 mb-4"/>
        <p className="text-sm font-medium">{text}</p>
    </div>
);

const ProjectTabs: React.FC<{
    projects: Project[];
    currentProjectId: string | null;
    onSelect: (id: string) => void;
    onClose: (id: string) => void;
    onNew: () => void;
}> = ({ projects, currentProjectId, onSelect, onClose, onNew }) => (
    <div className="flex-shrink-0 bg-zinc-950/50 h-10 flex items-end">
        <nav className="flex items-center space-x-1 h-full overflow-x-auto pl-2">
            {projects.map(p => (
                 <button 
                    key={p.id} 
                    onClick={() => onSelect(p.id)}
                    className={`flex items-center h-full px-4 text-sm rounded-t-md border-b-2 ${
                        p.id === currentProjectId 
                        ? 'bg-zinc-800 border-purple-500 text-white' 
                        : 'bg-zinc-900 border-transparent text-gray-400 hover:bg-zinc-800/70'
                    }`}
                >
                    <span>{p.name}</span>
                    <X onClick={(e) => { e.stopPropagation(); onClose(p.id); }} className="w-4 h-4 ml-3 rounded-full p-0.5 hover:bg-white/20"/>
                 </button>
            ))}
        </nav>
        <button
            onClick={onNew}
            className="ml-1 mb-1 flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-800/70 text-gray-400 hover:text-white transition-colors"
            title="Novo projeto"
        >
            <Plus className="w-4 h-4" />
        </button>
        <div className="flex-grow h-full"></div>
    </div>
);


const App: React.FC = () => {
    // Project State
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isLeftPanelOpen, setLeftPanelOpen] = useState(false);
    const [isRightPanelOpen, setRightPanelOpen] = useState(false);
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

    // --- DERIVED STATE ---
    const currentProject = projects.find(p => p.id === currentProjectId) || null;
    const selectedPostId = currentProject?.selectedPostId;
    const selectedElementId = currentProject?.selectedElementId;
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
            if (mobile) {
                setLeftPanelOpen(false);
                setRightPanelOpen(false);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- PROJECT & STATE MANAGEMENT ---
    const updateCurrentProject = (updates: Partial<Project>) => {
        if (!currentProjectId) return;
        setProjects(prevProjects => prevProjects.map(p => p.id === currentProjectId ? { ...p, ...updates } : p));
    };

    const setSelectedPostId = (id: string | null) => updateCurrentProject({ selectedPostId: id, selectedElementId: null });
    const setSelectedElementId = (id: string | null) => updateCurrentProject({ selectedElementId: id });
    const setPostSizeForCurrentProject = (size: PostSize) => updateCurrentProject({ postSize: size });

    const createNewProject = (name: string, size: PostSize): Project => ({
        id: uuidv4(), name, posts: [], postSize: size, activeBrandKitId: null, topic: 'New Project Topic', selectedPostId: null, selectedElementId: null,
    });
    
    const handleNewProject = (size = POST_SIZES[0]) => {
        const newProj = createNewProject(`Untitled Project ${projects.length + 1}`, size);
        setProjects(prev => [...prev, newProj]);
        setCurrentProjectId(newProj.id);
        if (!isMobileView) {
            setLeftPanelOpen(true);
            setRightPanelOpen(true);
        }
    };

    const handleSaveProject = () => {
        if (!currentProject) { toast.error("Nenhum projeto ativo para salvar."); return; }
        localStorage.setItem(`posty_project_${currentProject.id}`, JSON.stringify(currentProject));
        const recentIds = JSON.parse(localStorage.getItem('posty_recent_project_ids') || '[]');
        const updatedRecents = [currentProject.id, ...recentIds.filter((id: string) => id !== currentProject.id)].slice(0, 8);
        localStorage.setItem('posty_recent_project_ids', JSON.stringify(updatedRecents));
        toast.success(`Projeto "${currentProject.name}" salvo!`);
    };
    
    const handleSaveAsProject = () => {
        if (!currentProject) return;
        const projectJson = JSON.stringify(currentProject, null, 2);
        const blob = new Blob([projectJson], { type: 'application/json' });
        saveAs(blob, `${currentProject.name.replace(/ /g, '_')}.posty`);
        toast.success("Projeto exportado!");
    };

    const handleOpenProjectClick = () => openProjectInputRef.current?.click();
    
    const handleOpenProject = (project: Project) => {
        if (projects.some(p => p.id === project.id)) { setCurrentProjectId(project.id); return; }
        setProjects(prev => [...prev, project]);
        setCurrentProjectId(project.id);
        const recentIds = JSON.parse(localStorage.getItem('posty_recent_project_ids') || '[]');
        const updatedRecents = [project.id, ...recentIds.filter((id: string) => id !== project.id)].slice(0, 8);
        localStorage.setItem('posty_recent_project_ids', JSON.stringify(updatedRecents));
        if (!isMobileView) {
            setLeftPanelOpen(true);
            setRightPanelOpen(true);
        }
    };

    const handleOpenProjectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedProject = JSON.parse(e.target?.result as string) as Project;
                if (importedProject?.id && importedProject.name) {
                    handleOpenProject(importedProject);
                    toast.success(`Projeto "${importedProject.name}" carregado!`);
                } else { throw new Error("Arquivo de projeto inválido."); }
            } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao abrir projeto."); }
        };
        reader.readAsText(file);
        event.target.value = '';
    };
    
    const handleCloseProject = (projectIdToClose: string) => {
        const projectIndex = projects.findIndex(p => p.id === projectIdToClose);
        if (projectIndex === -1) return;
        const newProjects = projects.filter(p => p.id !== projectIdToClose);
        setProjects(newProjects);
        if (currentProjectId === projectIdToClose) {
            if (newProjects.length === 0) {
                setCurrentProjectId(null);
                setLeftPanelOpen(false);
                setRightPanelOpen(false);
            } 
            else { setCurrentProjectId(newProjects[Math.max(0, projectIndex - 1)].id); }
        }
    };

    // --- CORE APP LOGIC ---
    const setPosts = (newPosts: Post[] | ((prevPosts: Post[]) => Post[])) => {
        if (!currentProjectId) return;
        setProjects(projs => projs.map(p => {
            if (p.id !== currentProjectId) return p;
            const updatedPosts = typeof newPosts === 'function' ? newPosts(p.posts) : newPosts;
            return { ...p, posts: updatedPosts };
        }));
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
        if (!currentProject || !postSize) { toast.error("Por favor, crie ou abra um projeto primeiro."); return; }
        
        setIsLoading(true);
        setPosts([]);
        setSelectedPostId(null);
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
                    setLoadingMessage('Gerando prompts de imagem...'); toast.loading('Gerando prompts de imagem...', { id: toastId });
                    const imagePrompts = await geminiService.generateImagePrompts(genTopic, count, activeStyleGuide);
                    setLoadingMessage(`Gerando ${imagePrompts.length} imagens...`); toast.loading(`Gerando ${imagePrompts.length} imagens...`, { id: toastId });
                    const imageGenerator = genAiProvider === 'freepik' ? freepikService.generateBackgroundImages : geminiService.generateBackgroundImages;
                    const generatedImages = await imageGenerator(imagePrompts, postSize);
                    backgroundSources = generatedImages.map((src, i) => ({ src: `data:image/png;base64,${src}`, prompt: imagePrompts[i], provider: genAiProvider }));
                } else {
                    if (customBackgrounds.length === 0) throw new Error("Nenhuma imagem de fundo foi enviada.");
                    backgroundSources = customBackgrounds.map(src => ({ src }));
                }
                setLoadingMessage('Criando layouts inteligentes...'); toast.loading('Criando layouts inteligentes...', { id: toastId });
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
        if (type === 'text') newElement = { ...baseElement, type, content: 'Texto Editável', fontSize: 48, fontFamily: 'Roboto', color: '#FFFFFF', textAlign: 'center', verticalAlign: 'middle', letterSpacing: 0, lineHeight: 1.2, fontWeight: 400, fontStyle: 'normal', textDecoration: 'none' };
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
        if (!selectedPost) { toast.error("Nenhum post selecionado para criar um kit."); return; }
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

    const handleFitToScreen = useCallback(() => {
        if (!viewportRef.current || !postSize) return;
        const { width: vw, height: vh } = viewportRef.current.getBoundingClientRect();
        const { width: cw, height: ch } = postSize;
        const newZoom = Math.min(vw / cw, vh / ch) * 0.9;
        setZoom(newZoom);
    }, [postSize]);

    useEffect(() => { handleFitToScreen(); }, [handleFitToScreen, selectedPostId, postSize, isLeftPanelOpen, isRightPanelOpen]);
    useEffect(() => { window.addEventListener('resize', handleFitToScreen); return () => window.removeEventListener('resize', handleFitToScreen); }, [handleFitToScreen]);

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            {colorPickerState.isOpen && <AdvancedColorPicker color={colorPickerState.color} onChange={colorPickerState.onChange} onClose={() => setColorPickerState(s => ({...s, isOpen: false}))} palettes={{post: selectedPost?.palette, custom: customPalette}}/>}
            {(isLeftPanelOpen || isRightPanelOpen) && isMobileView && <div className="mobile-backdrop" onClick={() => { setLeftPanelOpen(false); setRightPanelOpen(false); }} />}
            
            <input type="file" ref={openProjectInputRef} onChange={handleOpenProjectFile} accept=".posty" className="hidden" />
            <input type="file" ref={importKitRef} onChange={() => {}} accept=".json" className="hidden" />

            <div className={`app-layout font-sans bg-gray-950 text-gray-100 ${projects.length > 0 && isLeftPanelOpen ? 'left-panel-open' : ''} ${projects.length > 0 && isRightPanelOpen ? 'right-panel-open' : ''}`}>
                <Header onNewProject={handleNewProject} onSaveProject={handleSaveProject} onSaveAsProject={handleSaveAsProject} onOpenProject={handleOpenProjectClick} hasProject={projects.length > 0} />

                <aside className={`left-panel ${isMobileView && isLeftPanelOpen ? 'mobile-panel-open' : ''}`}>
                    {projects.length > 0 ? (
                        <CreationPanel
                            isLoading={isLoading} onGenerate={handleGeneratePosts} brandKits={brandKits} activeBrandKit={activeBrandKit} postSize={postSize}
                            setPostSize={setPostSizeForCurrentProject} hasPosts={posts.length > 0} customBackgrounds={customBackgrounds} styleImages={styleImages}
                            onFileChange={handleFileChange} onRemoveImage={handleRemoveImage} colorMode={colorMode} setColorMode={setColorMode}
                            customPalette={customPalette} setCustomPalette={setCustomPalette} styleGuide={styleGuide} useStyleGuide={useStyleGuide}
                            setUseStyleGuide={setUseStyleGuide} onAnalyzeStyle={handleAnalyzeStyle} useLayoutToFill={useLayoutToFill} setUseLayoutToFill={setUseLayoutToFill}
                            topic={topic} setTopic={setTopic} contentLevel={contentLevel} setContentLevel={setContentLevel} generationType={generationType}
                            setGenerationType={setGenerationType} textStyle={textStyle} setTextStyle={setTextStyle} backgroundSource={backgroundSource}
                            setBackgroundSource={setBackgroundSource} aiPostCount={aiPostCount} setAiPostCount={setAiPostCount} aiProvider={aiProvider}
                            setAiProvider={setAiProvider} onSaveBrandKit={handleSaveBrandKit} onAddLayoutToActiveKit={handleAddLayoutToActiveKit}
                            onImportBrandKit={() => {}} onExportBrandKit={() => {}} onDeleteBrandKit={(kitId) => setBrandKits(prev => prev.filter(k => k.id !== kitId))}
                            onApplyBrandKit={(kitId) => updateCurrentProject({ activeBrandKitId: kitId })} onAddPostFromLayout={() => {}} onUpdateLayoutName={() => {}}
                            onDeleteLayoutFromKit={() => {}} selectedLayoutId={selectedLayoutId} setSelectedLayoutId={setSelectedLayoutId}
                        />
                    ) : <EmptyPanelPlaceholder text="Crie ou abra um projeto para começar."/>}
                </aside>

                <main className="main-content" ref={viewportRef}>
                    {projects.length === 0 ? (
                        <WelcomeScreen onNewProject={handleNewProject} onOpenProject={handleOpenProjectClick} onOpenRecent={handleOpenProject} />
                    ) : (
                         <div className="flex flex-col h-full w-full bg-zinc-800">
                             <ProjectTabs projects={projects} currentProjectId={currentProjectId} onSelect={setCurrentProjectId} onClose={handleCloseProject} onNew={handleNewProject} />
                            <div className="flex-grow relative flex items-center justify-center p-4 overflow-auto">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center text-center h-full">
                                        <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p className="mt-4 text-xl font-semibold text-gray-300">{loadingMessage}</p>
                                        <p className="text-gray-400">Aguarde, a mágica está acontecendo...</p>
                                    </div>
                                ) : selectedPost ? (
                                    <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}>
                                        <CanvasEditor ref={editorRef} post={selectedPost} postSize={postSize} onUpdateElement={updatePostElement} selectedElementId={selectedElementId} onSelectElement={setSelectedElementId} />
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 p-4">
                                        <h2 className="text-2xl font-bold mb-2">Projeto Vazio</h2>
                                        <p>Use o painel à esquerda para gerar seu primeiro conteúdo.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {projects.length > 0 && (
                        <>
                            <button 
                                onClick={() => setLeftPanelOpen(!isLeftPanelOpen)} 
                                className="absolute top-1/2 -translate-y-1/2 left-3 z-20 p-1.5 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-md transition-all backdrop-blur-sm shadow-lg"
                                aria-label={isLeftPanelOpen ? "Fechar painel esquerdo" : "Abrir painel esquerdo"}
                            >
                                {isLeftPanelOpen ? <PanelLeftClose className="w-4 h-4"/> : <PanelLeft className="w-4 h-4"/>}
                            </button>
                            <button 
                                onClick={() => setRightPanelOpen(!isRightPanelOpen)} 
                                className="absolute top-1/2 -translate-y-1/2 right-3 z-20 p-1.5 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-md transition-all backdrop-blur-sm shadow-lg"
                                aria-label={isRightPanelOpen ? "Fechar painel direito" : "Abrir painel direito"}
                            >
                                {isRightPanelOpen ? <PanelRightClose className="w-4 h-4"/> : <PanelRight className="w-4 h-4"/>}
                            </button>
                        </>
                    )}
                    
                    {projects.length > 0 && (
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
                            selectedPost={selectedPost} selectedElementId={selectedElementId} onSelectElement={setSelectedElementId} onUpdateElement={updatePostElement}
                            onAddElement={handleAddElement} onRemoveElement={removeElement} onDuplicateElement={duplicateElement} onToggleVisibility={(id) => toggleElementProperty(id, 'visible')}
                            onToggleLock={(id) => toggleElementProperty(id, 'locked')} onReorderElements={reorderElements} onRegenerateBackground={() => {}} onUpdateBackgroundSrc={() => {}}
                            availableFonts={availableFonts} onAddFont={handleAddFont} onOpenColorPicker={handleOpenColorPicker} palettes={{ post: selectedPost?.palette, custom: customPalette }}
                        />
                    ) : <EmptyPanelPlaceholder text="Selecione um post para ver suas camadas e propriedades."/>}
                </aside>

                <footer className="footer-gallery">
                    {currentProject && posts.length > 0 && (
                        <TimelineGallery posts={posts} selectedPostId={selectedPostId} onSelectPost={setSelectedPostId} onAddPost={addPost} onDeletePost={deletePost} />
                    )}
                </footer>
            </div>
        </>
    );
};

export default App;
