

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
import { ZoomIn, ZoomOut, Maximize, Package, Image as ImageIcon, FileText, X, LayoutTemplate as LayoutTemplateIcon, Plus, Layers, AlignHorizontalJustifyCenter, AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Bold, Italic, Underline, Wand2, RefreshCcw } from 'lucide-react';
import AdvancedColorPicker from './components/ColorPicker';
import { parseColor, rgbToHex } from './utils/color';
import ExportModal from './components/ExportModal';
import StaticPost from './components/StaticPost';


// --- HELPERS ---
const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const convertMarkdownToHtml = (text: string, highlightColor?: string, accentFontFamily?: string): string => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            let style = 'font-weight: 700;';
            if (highlightColor) style += `color: ${highlightColor};`;
            if (accentFontFamily) style += `font-family: '${accentFontFamily}', sans-serif;`;
            // Using a span with styles is more flexible for AI output and editing than a simple <strong> tag.
            return `<span style="${style}">${part.slice(2, -2)}</span>`;
        }
        // Basic escaping for security, can be improved if needed
        return part.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }).join('');
};

const convertAILayoutToElements = (aiLayout: AIGeneratedTextElement[], postSize: PostSize, postId: string): TextElement[] => {
    return aiLayout.map((aiEl, index) => {
        const { width: postWidth, height: postHeight } = postSize;

        // New logic for font sizes with variability within user-defined limits.
        const fontSizeRanges = {
            large: { min: 38, max: 50 },   // Títulos
            medium: { min: 24, max: 30 },  // Descrições/Corpo
            small: { min: 18, max: 22 },   // Rodapés/Texto pequeno
            cta: { min: 26, max: 32 },     // Call-to-actions
        };
        
        const category = aiEl.fontSize || 'medium';
        const range = fontSizeRanges[category];
        // Creates a pseudo-random but deterministic size based on element properties
        const hash = (aiEl.content.length + aiEl.x + aiEl.y * 2) % 101 / 100; // Use 101 (prime) for better distribution
        const fontSize = Math.round(range.min + (range.max - range.min) * hash);

        const element: TextElement = {
            id: `${postId}-text-${index}`,
            type: 'text',
            content: convertMarkdownToHtml(aiEl.content, aiEl.highlightColor, aiEl.accentFontFamily),
            x: (aiEl.x / 100) * postWidth,
            y: (aiEl.y / 100) * postHeight,
            width: Math.max(100, (aiEl.width / 100) * postWidth), // Ensure a minimum width
            height: (aiEl.height / 100) * postHeight, // Use AI height without autosize
            fontSize,
            fontFamily: aiEl.fontFamily || 'Poppins',
            fontWeight: 400,
            fontStyle: 'normal',
            textDecoration: 'none',
            color: aiEl.color || (aiEl.backgroundTone === 'dark' ? '#FFFFFF' : '#0F172A'),
            textAlign: aiEl.textAlign,
            verticalAlign: 'middle',
            rotation: aiEl.rotation || 0,
            opacity: 1, locked: false, visible: true, letterSpacing: 0,
            lineHeight: aiEl.lineHeight || 1.3,
            backgroundColor: aiEl.backgroundColor,
            padding: category === 'cta' ? fontSize * 0.5 : 0,
            borderRadius: category === 'cta' ? 8 : 0,
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
        <div className="flex flex-col lg:flex-row h-full w-full bg-zinc-900 text-gray-300">
            <aside className="w-full lg:w-64 bg-zinc-950/50 p-4 flex flex-col">
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
            <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
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
    onRename: (id: string, newName: string) => void;
}> = ({ projects, currentProjectId, onSelect, onClose, onNew, onRename }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    const handleStartEditing = (project: Project) => {
        setEditingId(project.id);
        setEditingName(project.name);
    };

    const handleFinishEditing = () => {
        if (editingId && editingName.trim()) {
            onRename(editingId, editingName.trim());
        }
        setEditingId(null);
        setEditingName('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleFinishEditing();
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setEditingName('');
        }
    };
    
    return (
        <div className="flex-shrink-0 bg-zinc-950/50 h-10 flex items-center">
            <nav className="flex items-center h-full overflow-x-auto pl-2">
                {projects.map(p => (
                     <div 
                        key={p.id} 
                        onClick={() => onSelect(p.id)}
                        onDoubleClick={() => handleStartEditing(p)}
                        className={`flex items-center h-full px-4 text-sm rounded-t-md border-b-2 cursor-pointer ${
                            p.id === currentProjectId 
                            ? 'bg-zinc-800 border-purple-500 text-white' 
                            : 'bg-zinc-900 border-transparent text-gray-400 hover:bg-zinc-800/70'
                        }`}
                    >
                        {editingId === p.id ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={handleFinishEditing}
                                onKeyDown={handleKeyDown}
                                className="bg-transparent outline-none ring-2 ring-purple-500 rounded px-1 -mx-1"
                                style={{ width: `${Math.max(8, editingName.length)}ch` }}
                            />
                        ) : (
                             <span>{p.name}</span>
                        )}
                        <X onClick={(e) => { e.stopPropagation(); onClose(p.id); }} className="w-4 h-4 ml-3 rounded-full p-0.5 hover:bg-white/20"/>
                     </div>
                ))}
                 <button
                    onClick={onNew}
                    className="ml-1 h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-zinc-800/70 text-gray-400 hover:text-white transition-colors"
                    title="Novo projeto"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </nav>
            <div className="flex-grow h-full"></div>
        </div>
    );
};


// Hidden container used for rendering posts for export
const StaticPostRenderer: React.FC<{ post: Post; postSize: PostSize; ref: React.Ref<HTMLDivElement> }> = React.forwardRef(({ post, postSize }, ref) => (
    <div ref={ref} className="absolute -left-[9999px] -top-[9999px]">
      <StaticPost post={post} postSize={postSize} />
    </div>
));


const App: React.FC = () => {
    // Project State
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isLeftPanelOpen, setLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setRightPanelOpen] = useState(true);
    const [isWizardOpen, setWizardOpen] = useState(false);
    const [isBrandKitPanelOpen, setBrandKitPanelOpen] = useState(false);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 1024);
    const [colorPickerState, setColorPickerState] = useState<{ isOpen: boolean, color: string, onChange: (color: string) => void }>({ isOpen: false, color: '#FFFFFF', onChange: () => {} });
    
    // Canvas View State
    const [viewState, setViewState] = useState({ zoom: 1, offset: { x: 0, y: 0 } });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef<{x: number, y: number, ox: number, oy: number} | null>(null);

    // Rich Text Editing State
    const activeEditorRef = useRef<{ id: string, node: HTMLDivElement } | null>(null);
    const [selectionStyles, setSelectionStyles] = useState<{ color: string | null; bold: boolean; italic: boolean; underline: boolean; }>({ color: null, bold: false, italic: false, underline: false });


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
    const viewportRef = useRef<HTMLDivElement>(null);
    const openProjectInputRef = useRef<HTMLInputElement>(null);
    const importKitRef = useRef<HTMLInputElement>(null);
    const imageUploadRef = useRef<HTMLInputElement>(null);
    const staticPostRef = useRef<HTMLDivElement>(null);

    // --- DERIVED STATE ---
    const currentProject = projects.find(p => p.id === currentProjectId) || null;
    const selectedPostId = currentProject?.selectedPostId;
    const selectedElementId = currentProject?.selectedElementId;
    const posts = currentProject?.posts || [];
    const postSize = currentProject?.postSize || POST_SIZES[0];
    const activeBrandKitId = currentProject?.activeBrandKitId || null;
    const selectedPost = posts.find(p => p.id === selectedPostId);
    const selectedElement = selectedPost?.elements.find(el => el.id === selectedElementId);
    const activeBrandKit = brandKits.find(k => k.id === activeBrandKitId);
    const isEditingText = !!(activeEditorRef.current && activeEditorRef.current.id === selectedElementId);

    // --- RESPONSIVE & UI LOGIC ---
     useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobileView(mobile);
            if (mobile) {
                setLeftPanelOpen(false);
                setRightPanelOpen(false);
            } else {
                 if (projects.length > 0) {
                    setLeftPanelOpen(true);
                    setRightPanelOpen(true);
                 }
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [projects.length]);

    // --- PROJECT & STATE MANAGEMENT ---
    const updateCurrentProject = (updates: Partial<Project>) => {
        if (!currentProjectId) return;
        setProjects(prevProjects => prevProjects.map(p => p.id === currentProjectId ? { ...p, ...updates } : p));
    };

    const setSelectedPostId = (id: string | null) => updateCurrentProject({ selectedPostId: id, selectedElementId: null });
    const setSelectedElementId = (id: string | null) => updateCurrentProject({ selectedElementId: id });
    const setPostSizeForCurrentProject = (size: PostSize) => {
        updateCurrentProject({ postSize: size });
        handleFitToScreen(); // Recalculate zoom when size changes
    };

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
        } else {
            setLeftPanelOpen(true);
            setRightPanelOpen(false);
        }
    };
    
    const saveProjectToLocalStorage = (project: Project) => {
        localStorage.setItem(`posty_project_${project.id}`, JSON.stringify(project));
        const recentIds = JSON.parse(localStorage.getItem('posty_recent_project_ids') || '[]');
        const updatedRecents = [project.id, ...recentIds.filter((id: string) => id !== project.id)].slice(0, 8);
        localStorage.setItem('posty_recent_project_ids', JSON.stringify(updatedRecents));
        toast.success(`Projeto "${project.name}" salvo!`);
    };

    const handleSaveProject = () => {
        if (!currentProject) { toast.error("Nenhum projeto ativo para salvar."); return; }
        
        const saveAction = (projectToSave: Project) => {
             // Update state first to reflect name change immediately in the UI
            setProjects(projects.map(p => p.id === projectToSave.id ? projectToSave : p));
            saveProjectToLocalStorage(projectToSave);
        };

        if (currentProject.name.startsWith('Untitled Project')) {
            const newName = prompt('Dê um nome ao seu projeto:', currentProject.name);
            if (newName && newName.trim() !== '') {
                saveAction({ ...currentProject, name: newName.trim() });
            } else {
                toast('Salvamento cancelado.');
            }
        } else {
            saveAction(currentProject);
        }
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
    
    const handleRenameProject = (projectId: string, newName: string) => {
        if (!newName.trim()) return;
        setProjects(projs => projs.map(p => (p.id === projectId ? { ...p, name: newName.trim() } : p)));
        toast.success("Projeto renomeado!");
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

        if (type === 'image') {
            imageUploadRef.current?.click();
            return;
        }

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

    const handleImageUploadForElement = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedPostId || !postSize) return;

        const toastId = toast.loading('Carregando imagem...');
        try {
            const src = await readFileAsBase64(file);
            const newId = `${selectedPostId}-${uuidv4()}`;
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                let width = 300;
                let height = width / aspectRatio;

                const newElement: ImageElement = {
                    id: newId, type: 'image', src,
                    x: postSize.width / 2 - width / 2, y: postSize.height / 2 - height / 2,
                    width, height, rotation: 0, opacity: 1, locked: false, visible: true,
                    filters: { brightness: 1, contrast: 1, saturate: 1, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, invert: 0 }
                };
                setPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, elements: [...p.elements, newElement] } : p));
                setSelectedElementId(newId);
                toast.success('Imagem adicionada!', { id: toastId });
            };
            img.src = src;

        } catch (error) {
            toast.error('Falha ao carregar imagem.', { id: toastId });
        } finally {
            event.target.value = ''; // Reset input
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
    
    // --- CANVAS INTERACTION & ALIGNMENT ---
    const handleFitToScreen = useCallback(() => {
        if (!viewportRef.current || !postSize) return;
        const { width: vw, height: vh } = viewportRef.current.getBoundingClientRect();
        const { width: cw, height: ch } = postSize;
        const zoom = Math.min(vw / cw, vh / ch) * 0.9;
        const offset = {
            x: (vw - cw * zoom) / 2,
            y: (vh - ch * zoom) / 2,
        };
        setViewState({ zoom, offset });
    }, [postSize]);
    
    const handleWheel = (e: React.WheelEvent) => {
        if (!viewportRef.current) return;
        e.preventDefault();
        const rect = viewportRef.current.getBoundingClientRect();        
        const viewportCenter = { x: rect.width / 2, y: rect.height / 2 };

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.max(0.1, Math.min(viewState.zoom * zoomFactor, 5));
        
        const centerBeforeZoom = {
            x: (viewportCenter.x - viewState.offset.x) / viewState.zoom,
            y: (viewportCenter.y - viewState.offset.y) / viewState.zoom
        };
        
        const newOffset = {
            x: viewportCenter.x - centerBeforeZoom.x * newZoom,
            y: viewportCenter.y - centerBeforeZoom.y * newZoom
        };
        
        setViewState({ zoom: newZoom, offset: newOffset });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isPanning && viewportRef.current) {
            e.preventDefault();
            panStart.current = { x: e.clientX, y: e.clientY, ox: viewState.offset.x, oy: viewState.offset.y };
            viewportRef.current.style.cursor = 'grabbing';
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning && panStart.current && viewportRef.current) {
            const dx = e.clientX - panStart.current.x;
            const dy = e.clientY - panStart.current.y;
            setViewState(prev => ({ ...prev, offset: { x: panStart.current!.ox + dx, y: panStart.current!.oy + dy }}));
        }
    };
    
    const handleMouseUp = () => {
        if (panStart.current) {
            panStart.current = null;
        }
        if (viewportRef.current) {
            viewportRef.current.style.cursor = isPanning ? 'grab' : 'default';
        }
    };

    const handleAlignElement = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        if (!selectedElement || !postSize || selectedElement.type === 'background') return;
        const { width: elW, height: elH } = selectedElement;
        const { width: pW, height: pH } = postSize;
        let newX = selectedElement.x;
        let newY = selectedElement.y;

        switch(alignment) {
            case 'left': newX = 0; break;
            case 'center': newX = (pW - elW) / 2; break;
            case 'right': newX = pW - elW; break;
            case 'top': newY = 0; break;
            case 'middle': newY = (pH - elH) / 2; break;
            case 'bottom': newY = pH - elH; break;
        }
        updatePostElement(selectedElement.id, { x: newX, y: newY });
    };

     const handleStartEditing = (id: string, node: HTMLDivElement) => {
        activeEditorRef.current = { id, node };
    };
    const handleStopEditing = () => {
        activeEditorRef.current = null;
        setSelectionStyles({ color: null, bold: false, italic: false, underline: false });
    };

    const handleToggleTextStyle = (style: 'bold' | 'italic' | 'underline') => {
        if (!selectedElement || selectedElement.type !== 'text') return;

        if (activeEditorRef.current && activeEditorRef.current.id === selectedElement.id) {
            document.execCommand(style);
            const newContent = activeEditorRef.current.node.innerHTML;
            updatePostElement(selectedElement.id, { content: newContent });
            activeEditorRef.current.node.focus();
            handleSelectionUpdate();
        } else {
            const propMap = { bold: 'fontWeight', italic: 'fontStyle', underline: 'textDecoration' };
            const prop = propMap[style];
            let newValue: any;
            switch(prop) {
                case 'fontWeight': newValue = selectedElement.fontWeight === 700 ? 400 : 700; break;
                case 'fontStyle': newValue = selectedElement.fontStyle === 'italic' ? 'normal' : 'italic'; break;
                case 'textDecoration': newValue = selectedElement.textDecoration === 'underline' ? 'none' : 'underline'; break;
            }
            updatePostElement(selectedElement.id, { [prop]: newValue });
        }
    };
    
    const handleUpdateTextProperty = (prop: string, value: any) => {
        if (!selectedElement || selectedElement.type !== 'text') return;
        
        if (activeEditorRef.current && activeEditorRef.current.id === selectedElement.id) {
            const commandMap: Record<string, string> = {
                fontFamily: 'fontName',
                color: 'foreColor'
            };
            const command = commandMap[prop];
            if (command) {
                document.execCommand(command, false, value);
                const newContent = activeEditorRef.current.node.innerHTML;
                updatePostElement(selectedElement.id, { content: newContent });
                activeEditorRef.current.node.focus();
                handleSelectionUpdate();
            } else {
                 updatePostElement(selectedElement.id, { [prop]: value });
            }
        } else {
            updatePostElement(selectedElement.id, { [prop]: value });
        }
    };


    const handleRemoveBg = () => toast("Remoção de fundo com IA em breve!");
    const handleGenerateVariation = () => toast("Geração de variação com IA em breve!");


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) {
                e.preventDefault();
                setIsPanning(true);
                if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsPanning(false);
                if (viewportRef.current) viewportRef.current.style.cursor = 'default';
                panStart.current = null;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        // Delay the fit-to-screen to allow for panel animation (300ms transition)
        const timer = setTimeout(() => {
            handleFitToScreen();
        }, 350); 
    
        window.addEventListener('resize', handleFitToScreen);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleFitToScreen);
        };
    }, [handleFitToScreen, selectedPostId, postSize, isLeftPanelOpen, isRightPanelOpen]);
    
    const handleSelectionUpdate = () => {
        if (activeEditorRef.current) {
            const colorStr = document.queryCommandValue('foreColor');
            const isBold = document.queryCommandState('bold');
            const isItalic = document.queryCommandState('italic');
            const isUnderline = document.queryCommandState('underline');
            let hexColor: string | null = null;

            if (colorStr) {
                const parsed = parseColor(colorStr);
                hexColor = rgbToHex(parsed.r, parsed.g, parsed.b).toUpperCase();
            }
            setSelectionStyles({ color: hexColor, bold: isBold, italic: isItalic, underline: isUnderline });
        } else {
             setSelectionStyles({ color: null, bold: false, italic: false, underline: false });
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

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            {colorPickerState.isOpen && <AdvancedColorPicker color={colorPickerState.color} onChange={colorPickerState.onChange} onClose={() => setColorPickerState(s => ({...s, isOpen: false}))} palettes={{post: selectedPost?.palette, custom: customPalette}}/>}
            {(isLeftPanelOpen || isRightPanelOpen) && isMobileView && <div className="mobile-backdrop" onClick={() => { setLeftPanelOpen(false); setRightPanelOpen(false); }} />}
            
            <input type="file" ref={openProjectInputRef} onChange={handleOpenProjectFile} accept=".posty" className="hidden" />
            <input type="file" ref={importKitRef} onChange={() => {}} accept=".json" className="hidden" />
            <input type="file" ref={imageUploadRef} onChange={handleImageUploadForElement} accept="image/*" className="hidden" />
            
            {/* Hidden renderer for exports */}
            <div ref={staticPostRef} className="absolute -left-[9999px] -top-[9999px]"/>


            <div className={`app-layout font-sans bg-gray-950 text-gray-100 ${projects.length > 0 && isLeftPanelOpen ? 'left-panel-open' : ''} ${projects.length > 0 && isRightPanelOpen ? 'right-panel-open' : ''}`}>
                 <ExportModal 
                    isOpen={isExportModalOpen}
                    onClose={() => setExportModalOpen(false)}
                    posts={posts}
                    postSize={postSize}
                    selectedPost={selectedPost}
                    project={currentProject}
                    staticPostRendererRef={staticPostRef}
                 />
                <Header 
                    onNewProject={handleNewProject} 
                    onSaveProject={handleSaveProject} 
                    onSaveAsProject={handleSaveAsProject} 
                    onOpenProject={handleOpenProjectClick} 
                    onExport={() => setExportModalOpen(true)}
                    hasProject={projects.length > 0} 
                    isMobileView={isMobileView}
                    onToggleLeftPanel={() => setLeftPanelOpen(!isLeftPanelOpen)}
                    onToggleRightPanel={() => setRightPanelOpen(!isRightPanelOpen)}
                />

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

                <main 
                    className="main-content" 
                    ref={viewportRef} 
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {projects.length === 0 ? (
                        <WelcomeScreen onNewProject={handleNewProject} onOpenProject={handleOpenProjectClick} onOpenRecent={handleOpenProject} />
                    ) : (
                         <div className="flex flex-col h-full w-full bg-zinc-800">
                             <ProjectTabs projects={projects} currentProjectId={currentProjectId} onSelect={setCurrentProjectId} onClose={handleCloseProject} onNew={() => handleNewProject(postSize)} onRename={handleRenameProject} />
                            <div className="flex-grow relative overflow-hidden">
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
                                    <div style={{
                                        transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
                                        transformOrigin: 'top left'
                                    }}>
                                        <CanvasEditor 
                                            post={selectedPost} 
                                            postSize={postSize} 
                                            onUpdateElement={updatePostElement} 
                                            selectedElementId={selectedElementId} 
                                            onSelectElement={setSelectedElementId}
                                            onStartEditing={handleStartEditing}
                                            onStopEditing={handleStopEditing}
                                            onSelectionUpdate={handleSelectionUpdate}
                                        />
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
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-zinc-900/70 backdrop-blur-sm p-2 rounded-lg shadow-lg z-10">
                            {selectedElement && selectedElement.type !== 'background' && (
                                <>
                                <div className="flex items-center space-x-1">
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => handleAlignElement('left')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Alinhar à Esquerda"><AlignHorizontalJustifyStart className="w-5 h-5"/></button>
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => handleAlignElement('center')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Centralizar Horizontalmente"><AlignHorizontalJustifyCenter className="w-5 h-5"/></button>
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => handleAlignElement('right')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Alinhar à Direita"><AlignHorizontalJustifyEnd className="w-5 h-5"/></button>
                                </div>
                                 <div className="w-px h-5 bg-zinc-700 mx-1"></div>
                                 <div className="flex items-center space-x-1">
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => handleAlignElement('top')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Alinhar ao Topo"><AlignVerticalJustifyStart className="w-5 h-5"/></button>
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => handleAlignElement('middle')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Centralizar Verticalmente"><AlignVerticalJustifyCenter className="w-5 h-5"/></button>
                                    <button onMouseDown={e => e.preventDefault()} onClick={() => handleAlignElement('bottom')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Alinhar à Base"><AlignVerticalJustifyEnd className="w-5 h-5"/></button>
                                 </div>
                                 <div className="w-px h-5 bg-zinc-700 mx-1"></div>
                                </>
                             )}
                              {selectedElement?.type === 'text' && (
                                <>
                                <div className="flex items-center space-x-1">
                                     <button onMouseDown={e => e.preventDefault()} onClick={() => handleToggleTextStyle('bold')} className={`p-2 hover:bg-zinc-700 rounded-md ${
                                        (isEditingText) ? (selectionStyles.bold ? 'text-purple-400' : '') : (selectedElement.fontWeight === 700 ? 'text-purple-400' : '')
                                     }`}><Bold className="w-5 h-5"/></button>
                                     <button onMouseDown={e => e.preventDefault()} onClick={() => handleToggleTextStyle('italic')} className={`p-2 hover:bg-zinc-700 rounded-md ${
                                        (isEditingText) ? (selectionStyles.italic ? 'text-purple-400' : '') : (selectedElement.fontStyle === 'italic' ? 'text-purple-400' : '')
                                     }`}><Italic className="w-5 h-5"/></button>
                                     <button onMouseDown={e => e.preventDefault()} onClick={() => handleToggleTextStyle('underline')} className={`p-2 hover:bg-zinc-700 rounded-md ${
                                        (isEditingText) ? (selectionStyles.underline ? 'text-purple-400' : '') : (selectedElement.textDecoration === 'underline' ? 'text-purple-400' : '')
                                     }`}><Underline className="w-5 h-5"/></button>
                                </div>
                                <div className="w-px h-5 bg-zinc-700 mx-1"></div>
                                <button
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => handleOpenColorPicker(
                                        (isEditingText && selectionStyles.color) ? selectionStyles.color : (selectedElement as TextElement).color,
                                        (newColor) => handleUpdateTextProperty('color', newColor)
                                    )}
                                    className="w-6 h-6 rounded-md border border-zinc-600"
                                    style={{ backgroundColor: (isEditingText && selectionStyles.color) ? selectionStyles.color : (selectedElement as TextElement).color }}
                                    aria-label="Change text color"
                                />
                                <div className="w-px h-5 bg-zinc-700 mx-1"></div>
                                </>
                            )}
                             {selectedElement?.type === 'image' && (
                                <>
                                <div className="flex items-center space-x-1">
                                    <button onClick={handleRemoveBg} className="p-2 hover:bg-zinc-700 rounded-md" title="Remover Fundo (Em Breve)"><Wand2 className="w-5 h-5"/></button>
                                    <button onClick={handleGenerateVariation} className="p-2 hover:bg-zinc-700 rounded-md" title="Gerar Variação (Em Breve)"><RefreshCcw className="w-5 h-5"/></button>
                                </div>
                                <div className="w-px h-5 bg-zinc-700 mx-1"></div>
                                </>
                            )}
                            <button onClick={() => setViewState(s => ({...s, zoom: Math.max(s.zoom / 1.25, 0.1)}))} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Zoom Out"><ZoomOut className="w-5 h-5"/></button>
                            <span className="text-sm font-mono w-16 text-center">{Math.round(viewState.zoom * 100)}%</span>
                            <button onClick={() => setViewState(s => ({...s, zoom: Math.min(s.zoom * 1.25, 5)}))} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Zoom In"><ZoomIn className="w-5 h-5"/></button>
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
                            onUpdateTextProperty={handleUpdateTextProperty}
                            onToggleTextStyle={handleToggleTextStyle}
                            selectionStyles={selectionStyles}
                            isEditingText={isEditingText}
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