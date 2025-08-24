
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Post, BrandKit, PostSize, AnyElement, TextElement, ImageElement, BackgroundElement, FontDefinition, LayoutTemplate, BrandAsset, User, TextStyle, Project } from './types';
import { POST_SIZES, INITIAL_FONTS, PRESET_BRAND_KITS } from './constants';
import * as geminiService from './services/geminiService';
import * as freepikService from './services/freepikService';
import CreationPanel from './components/ControlPanel';
import CanvasEditor from './components/CanvasEditor';
import TimelineGallery from './components/PostGallery';
import RightPanel from './components/RightPanel';
import Header from './components/Header';
import AccountManagerModal from './components/AccountManagerModal';
import BuyCreditsModal from './components/BuyCreditsModal';
import { GenerationWizard } from './components/GenerationWizard';
import { BrandKitPanel } from './components/BrandKitPanel';
import saveAs from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import { ZoomIn, ZoomOut, Maximize, PanelLeft, PanelRight } from 'lucide-react';

declare global {
    const google: any;
}

const DAILY_GENERATION_LIMIT = 10;

const WelcomeScreen: React.FC<{ onNewProject: () => void; onOpenProject: () => void; }> = ({ onNewProject, onOpenProject }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-300 bg-black/30">
        <h1 className="text-4xl font-bold mb-2 animated-gradient-text">Bem-vindo(a) ao Posty</h1>
        <p className="text-lg text-gray-400 mb-8">Sua ferramenta de IA para criar posts incríveis.</p>
        <div className="flex space-x-4">
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


const App: React.FC = () => {
    // Auth & Modals
    const [user, setUser] = useState<User | null>(null);
    const [isAccountModalOpen, setAccountModalOpen] = useState(false);
    const [isBuyCreditsModalOpen, setBuyCreditsModalOpen] = useState(false);

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
    const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
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

    // Derived State
    const posts = currentProject?.posts || [];
    const postSize = currentProject?.postSize || POST_SIZES[0];
    const activeBrandKitId = currentProject?.activeBrandKitId || null;
    const selectedPost = posts.find(p => p.id === selectedPostId);
    const activeBrandKit = brandKits.find(k => k.id === activeBrandKitId);

    // --- USER AUTH & DATA ---
    const updateUser = (updatedUser: User | null) => {
        setUser(updatedUser);
        if (updatedUser) {
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
            localStorage.removeItem('user');
        }
    };
    const handleLogin = useCallback((response: any) => { /* ... ( unchanged ) ... */ }, []);
    const handleLogout = () => { /* ... ( unchanged ) ... */ };

    // Restore user from localStorage
    useEffect(() => {
        const savedUserJson = localStorage.getItem('user');
        if (savedUserJson) { /* ... ( unchanged logic ) ... */ }
    }, []);

    // Google Identity Services
    useEffect(() => { /* ... ( unchanged logic ) ... */ }, [user, handleLogin]);

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
        event.target.value = ''; // Reset input
    };

    // Auto-load last project on startup
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

    const handleGeneratePosts = async (
        genTopic: string, count: number, genType: 'post' | 'carousel', genContentLevel: 'mínimo' | 'médio' | 'detalhado',
        genBackgroundSource: 'upload' | 'ai', genAiProvider: 'gemini' | 'freepik', genTextStyle: TextStyle
    ) => {
        if (!user) { /* ... (user check unchanged) ... */ }
        if (!currentProject) {
            toast.error("Por favor, crie ou abra um projeto primeiro.");
            return;
        }
        
        const userApiKey = user.linkedAccounts?.google?.apiKey;
        const isFreeTierUser = !userApiKey;

        // ... (generation limit and credits checks unchanged) ...
        
        setIsLoading(true);
        setPosts([]); // Clear posts within the current project
        setSelectedPostId(null);
        setSelectedElementId(null);
    
        const toastId = toast.loading('Iniciando geração...');
        
        const activeKit = useStyleGuide ? brandKits.find(k => k.id === activeBrandKitId) : null;
        const activeStyleGuide = useStyleGuide ? styleGuide : null;
        
        try {
            // ... (The entire generation logic from the previous version fits here, with one change)
            // Instead of setPosts(newPosts), update the project state:
            // The final step in generation logic should be:
            // setCurrentProject(proj => proj ? { ...proj, posts: newPosts } : null);
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
                    let description = 'corpo de texto ou subtítulo';
                    if (textEl.fontSize > 48) description = 'título principal';
                    else if (textEl.fontSize < 20) description = 'texto de rodapé ou detalhe';
                    const lowerContent = textEl.content.toLowerCase();
                    if (lowerContent.includes('comprar') || lowerContent.includes('saiba mais') || lowerContent.includes('arraste')) description = 'chamada para ação (CTA)';
                    return { id: el.id, description, exampleContent: textEl.content };
                });

                for (let i = 0; i < backgroundSources.length; i++) {
                    const bgData = backgroundSources[i];
                    
                    let newContentMap: Record<string, string> = {};
                    if (textElementsToFill.length > 0) {
                        setLoadingMessage(`Gerando texto para o post ${i + 1}/${backgroundSources.length}...`);
                        newContentMap = await geminiService.generateTextForLayout(textElementsToFill, genTopic, genContentLevel, activeStyleGuide, userApiKey, genTextStyle);
                    }
                    
                    const newPostId = uuidv4();
                    const backgroundElement: BackgroundElement = { id: `${newPostId}-background`, type: 'background', src: bgData.src };
                    const clonedForegroundElements: AnyElement[] = JSON.parse(JSON.stringify(layout.elements.filter(el => el.type !== 'background')));
                    const newElements: AnyElement[] = clonedForegroundElements.map(el => {
                        const newEl = { ...el, id: `${newPostId}-${el.id}` };
                        if (newEl.type === 'text' && newContentMap[el.id]) (newEl as TextElement).content = newContentMap[el.id];
                        if (newEl.type === 'image' && newEl.assetId) {
                            const asset = kit.assets.find(a => a.id === newEl.assetId);
                            if (asset) newEl.src = asset.dataUrl;
                        }
                        return newEl as AnyElement;
                    });
                    newPosts.push({ id: newPostId, elements: [backgroundElement, ...newElements] });
                }

                setPosts(newPosts);
                if (newPosts.length > 0) setSelectedPostId(newPosts[0].id);
                toast.success(`${newPosts.length} posts criados com seu layout!`, { id: toastId });

            } else { 
                let backgroundSources: { src: string; prompt?: string; provider?: 'gemini' | 'freepik' }[] = [];

                if (genBackgroundSource === 'ai') {
                    // ... AI background generation logic
                } else {
                    if (customBackgrounds.length === 0) throw new Error("Nenhuma imagem de fundo foi enviada.");
                    backgroundSources = customBackgrounds.map(src => ({ src }));
                }

                setLoadingMessage('Criando layouts inteligentes...');
                toast.loading('Criando layouts inteligentes...', { id: toastId });

                const layoutPromises = backgroundSources.map(bg => geminiService.generateLayoutAndContentForImage(bg.src, genTopic, genContentLevel, activeKit, userApiKey, genTextStyle));
                const allLayouts = await Promise.all(layoutPromises);

                const newPosts: Post[] = [];
                const carouselId = genType === 'carousel' ? uuidv4() : undefined;

                for (let i = 0; i < backgroundSources.length; i++) {
                    // ... post creation loop
                }
    
                setPosts(newPosts);
                if (newPosts.length > 0) setSelectedPostId(newPosts[0].id);
                toast.success('Posts criados com sucesso!', { id: toastId });
            }
             if (isFreeTierUser && genBackgroundSource !== 'ai') { /* ... (unchanged) ... */ }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Falha ao gerar conteúdo.', { id: toastId, duration: 6000 });
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const setPosts = (newPosts: Post[] | ((prevPosts: Post[]) => Post[])) => {
        setCurrentProject(proj => {
            if (!proj) return null;
            const updatedPosts = typeof newPosts === 'function' ? newPosts(proj.posts) : newPosts;
            return { ...proj, posts: updatedPosts };
        });
    };

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
        if (!selectedPostId) return;
        const newId = `${selectedPostId}-${uuidv4()}`;
        // ... (unchanged element creation logic)
    };
    
    // ... (All other handler functions: handleRemoveElement, handleDuplicateElement, etc., are largely unchanged, but they now operate on `posts` derived from `currentProject`)

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
            {/* ... (Modals are unchanged) ... */}
            
            <input type="file" ref={openProjectInputRef} onChange={handleOpenProjectFile} accept=".posty" className="hidden" />

            <div className={`app-layout font-sans bg-gray-950 text-gray-100 ${isLeftPanelOpen ? 'left-panel-open' : ''} ${isRightPanelOpen ? 'right-panel-open' : ''}`}>
                <Header 
                    user={user}
                    onLogout={handleLogout}
                    onManageAccounts={() => setAccountModalOpen(true)}
                    onBuyCredits={() => setBuyCreditsModalOpen(true)}
                    onNewProject={handleNewProject}
                    onSaveProject={handleSaveProject}
                    onSaveAsProject={handleSaveAsProject}
                    onOpenProject={handleOpenProjectClick}
                    hasProject={!!currentProject}
                />

                <aside className="left-panel">
                    {currentProject && (
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
                            onFileChange={(e, type) => { /* unchanged */ }}
                            onRemoveImage={(index, type) => { /* unchanged */ }}
                            colorMode={colorMode}
                            setColorMode={setColorMode}
                            customPalette={customPalette}
                            setCustomPalette={setCustomPalette}
                            styleGuide={styleGuide}
                            useStyleGuide={useStyleGuide}
                            setUseStyleGuide={setUseStyleGuide}
                            onAnalyzeStyle={() => { /* unchanged */ }}
                            useLayoutToFill={useLayoutToFill}
                            setUseLayoutToFill={setUseLayoutToFill}
                            user={user}
                            onBuyCredits={() => setBuyCreditsModalOpen(true)}
                            topic={topic} setTopic={setTopic}
                            contentLevel={contentLevel} setContentLevel={setContentLevel}
                            generationType={generationType} setGenerationType={setGenerationType}
                            textStyle={textStyle} setTextStyle={setTextStyle}
                            backgroundSource={backgroundSource} setBackgroundSource={setBackgroundSource}
                            aiPostCount={aiPostCount} setAiPostCount={setAiPostCount}
                            aiProvider={aiProvider} setAiProvider={setAiProvider}
                            onSaveBrandKit={() => { /* unchanged */ }}
                            onAddLayoutToActiveKit={() => { /* unchanged */ }}
                            onImportBrandKit={() => { /* unchanged */ }}
                            onExportBrandKit={() => { /* unchanged */ }}
                            onDeleteBrandKit={() => { /* unchanged */ }}
                            onApplyBrandKit={(kitId) => setCurrentProject(p => p ? { ...p, activeBrandKitId: kitId } : null)}
                            onAddPostFromLayout={() => { /* unchanged */ }}
                            onUpdateLayoutName={() => { /* unchanged */ }}
                            onDeleteLayoutFromKit={() => { /* unchanged */ }}
                            selectedLayoutId={selectedLayoutId}
                            setSelectedLayoutId={setSelectedLayoutId}
                        />
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
                        <div className="text-center text-gray-400">
                            <h2 className="text-2xl font-bold mb-2">Projeto Vazio</h2>
                            <p>Use o painel à esquerda para gerar seu primeiro conteúdo.</p>
                        </div>
                    )}

                    <div className="absolute top-4 left-4 flex flex-col space-y-2">
                        <button onClick={() => setLeftPanelOpen(!isLeftPanelOpen)} className="p-2 bg-zinc-900/70 backdrop-blur-sm rounded-lg shadow-lg hover:bg-zinc-800 transition-colors">
                            <PanelLeft className="w-5 h-5"/>
                        </button>
                    </div>
                     <div className="absolute top-4 right-4 flex flex-col space-y-2">
                        <button onClick={() => setRightPanelOpen(!isRightPanelOpen)} className="p-2 bg-zinc-900/70 backdrop-blur-sm rounded-lg shadow-lg hover:bg-zinc-800 transition-colors">
                            <PanelRight className="w-5 h-5"/>
                        </button>
                    </div>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-zinc-900/70 backdrop-blur-sm p-2 rounded-lg shadow-lg">
                        <button onClick={() => setZoom(z => Math.max(z / 1.25, 0.1))} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Zoom Out"><ZoomOut className="w-5 h-5"/></button>
                        <span className="text-sm font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(z * 1.25, 5))} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Zoom In"><ZoomIn className="w-5 h-5"/></button>
                        <button onClick={handleFitToScreen} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Fit to Screen"><Maximize className="w-5 h-5"/></button>
                    </div>
                </main>

                <aside className="right-panel">
                    {currentProject && (
                       <RightPanel
                            selectedPost={selectedPost}
                            selectedElementId={selectedElementId}
                            onSelectElement={setSelectedElementId}
                            onUpdateElement={updatePostElement}
                            onAddElement={() => {}}
                            onRemoveElement={() => {}}
                            onDuplicateElement={() => {}}
                            onToggleVisibility={() => {}}
                            onToggleLock={() => {}}
                            onReorderElements={() => {}}
                            onRegenerateBackground={() => {}}
                            onUpdateBackgroundSrc={() => {}}
                            availableFonts={availableFonts}
                            onAddFont={() => {}}
                            onOpenColorPicker={() => {}}
                            palettes={{ post: selectedPost?.palette, custom: customPalette }}
                        />
                    )}
                </aside>

                <footer className="footer-gallery">
                    {currentProject && posts.length > 0 && (
                        <TimelineGallery
                            posts={posts}
                            selectedPostId={selectedPostId}
                            onSelectPost={setSelectedPostId}
                            onAddPost={() => { /* unchanged */ }}
                            onDeletePost={() => { /* unchanged */ }}
                        />
                    )}
                </footer>
            </div>
        </>
    );
};

export default App;
