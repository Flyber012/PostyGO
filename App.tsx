
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { createRoot } from 'react-dom/client';
import { Post, BrandKit, PostSize, AnyElement, TextElement, ImageElement, GradientElement, BackgroundElement, ShapeElement, QRCodeElement, FontDefinition, LayoutTemplate, BrandAsset, User } from './types';
import { POST_SIZES, INITIAL_FONTS, PRESET_BRAND_KITS } from './constants';
import * as geminiService from './services/geminiService';
import * as freepikService from './services/freepikService';
import ControlPanel from './components/ControlPanel';
import CanvasEditor from './components/CanvasEditor';
import PostGallery from './components/PostGallery';
import LayersPanel from './components/LayersPanel';
import StaticPost from './components/StaticPost';
import UserProfile from './components/UserProfile';
import AccountManagerModal from './components/AccountManagerModal';
import saveAs from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { ZoomIn, ZoomOut, Maximize, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Copy, Trash2, ChevronLeft, ChevronRight, Eye, EyeOff, Lock, Unlock, X } from 'lucide-react';


declare global {
    interface Window {
        google: any;
    }
}

interface DecodedJwt {
    sub: string;
    name: string;
    email: string;
    picture: string;
}

function decodeJwtResponse(token: string): DecodedJwt {
     try {
        const base64Url = token.split('.')[1];
        if (!base64Url) throw new Error("Invalid JWT token");
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT", e);
        throw new Error("Could not decode JWT");
    }
}

const AddLayoutModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    postToPreview: Post | undefined;
    postSize: PostSize;
}> = ({ isOpen, onClose, onSave, postToPreview, postSize }) => {
    const [layoutName, setLayoutName] = useState('Novo Layout');

    useEffect(() => {
        if (isOpen) {
            setLayoutName(`Layout ${new Date().toLocaleTimeString()}`);
        }
    }, [isOpen]);

    if (!isOpen || !postToPreview) return null;

    const handleSave = () => {
        if (layoutName.trim()) {
            onSave(layoutName.trim());
        } else {
            toast.error("O nome do layout não pode ser vazio.");
        }
    };

    const previewContainerSize = 392; 
    const scale = Math.min(
        previewContainerSize / postSize.width,
        previewContainerSize / postSize.height
    ) * 0.95;

    const modalContent = (
        <div className="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-md p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Salvar Layout no Brand Kit</h2>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="layout-name-modal" className="block text-sm font-medium text-gray-300 mb-1">Nome do Layout</label>
                    <input 
                        id="layout-name-modal"
                        type="text" 
                        value={layoutName} 
                        onChange={(e) => setLayoutName(e.target.value)} 
                        className="w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Prévia</label>
                    <div className="bg-black/20 p-2 rounded-md flex items-center justify-center overflow-hidden aspect-square relative">
                        <div style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center',
                            width: postSize.width,
                            height: postSize.height
                        }}>
                            <StaticPost post={postToPreview} postSize={postSize} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-md transition-colors">
                    Cancelar
                </button>
                <button onClick={handleSave} disabled={!layoutName.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50">
                    Salvar Layout
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            {modalContent}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};


const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
    const [activeBrandKitId, setActiveBrandKitId] = useState<string | null>(null);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [postSize, setPostSize] = useState<PostSize>(POST_SIZES[0]);
    const [imageGenerationProvider, setImageGenerationProvider] = useState<'google' | 'freepik'>('google');
    
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [customBackgrounds, setCustomBackgrounds] = useState<string[]>([]);
    const [styleImages, setStyleImages] = useState<string[]>([]);
    const [styleGuide, setStyleGuide] = useState<string | null>(null);
    const [useStyleGuide, setUseStyleGuide] = useState<boolean>(false);
    const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
    const [useLayoutToFill, setUseLayoutToFill] = useState<boolean>(false);

    const [colorMode, setColorMode] = useState<'default' | 'custom' | 'extract'>('default');
    const [customPalette, setCustomPalette] = useState<string[]>(['#FFFFFF', '#000000', '#FBBF24', '#3B82F6']);
    const [availableFonts, setAvailableFonts] = useState<FontDefinition[]>(INITIAL_FONTS);

    const [zoom, setZoom] = useState(1);
    const [isAddLayoutModalOpen, setAddLayoutModalOpen] = useState(false);
    const [isAccountModalOpen, setAccountModalOpen] = useState(false);


    const editorRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLElement>(null);

    // --- User Authentication and Data Management ---
    useEffect(() => {
        // Check for a logged-in user in localStorage on initial load
        const savedUser = localStorage.getItem('postyUser');
        if (savedUser) {
            const user = JSON.parse(savedUser) as User;
            setCurrentUser(user);
            // Load user-specific brand kits
            const savedKits = localStorage.getItem(`brandKits_${user.id}`);
            setBrandKits(savedKits ? JSON.parse(savedKits) : PRESET_BRAND_KITS);
        }
    }, []);
    
    const handleCredentialResponse = useCallback((response: any /* CredentialResponse */) => {
        if (!response.credential) {
            console.error("Google Sign-In failed: No credential returned.");
            toast.error("Falha no login com Google. Tente novamente.");
            return;
        }
        
        try {
            const decoded: DecodedJwt = decodeJwtResponse(response.credential);
            
            const realUser: User = {
                id: decoded.sub,
                name: decoded.name,
                email: decoded.email,
                avatar: decoded.picture,
                linkedAccounts: {},
            };
    
            // Check for previously saved profile data (like linked API keys)
            const userProfile = localStorage.getItem(`user_profile_${realUser.id}`);
            if (userProfile) {
                realUser.linkedAccounts = JSON.parse(userProfile).linkedAccounts || {};
            }
    
            localStorage.setItem('postyUser', JSON.stringify(realUser));
            
            const savedKits = localStorage.getItem(`brandKits_${realUser.id}`);
            setBrandKits(savedKits ? JSON.parse(savedKits) : PRESET_BRAND_KITS);
            if (!savedKits) {
                 localStorage.setItem(`brandKits_${realUser.id}`, JSON.stringify(PRESET_BRAND_KITS));
            }
            
            setCurrentUser(realUser);
            toast.success(`Bem-vindo, ${realUser.name.split(' ')[0]}!`);
        } catch (error) {
            console.error("Error processing Google login:", error);
            toast.error("Ocorreu um erro ao processar seu login.");
        }
    }, []);

    useEffect(() => {
        // Initialize Google Identity Services
        if (window.google) {
            window.google.accounts.id.initialize({
                client_id: '730562602445-6a2gav1iki25ppretrf8da1p95esm5ra.apps.googleusercontent.com',
                callback: handleCredentialResponse
            });
        } else {
            console.warn("Google Identity Services script not loaded yet.");
        }
    }, [handleCredentialResponse]);


    const handleLogin = () => {
        if (!window.google) {
            toast.error("Serviço de login do Google não está disponível. Tente recarregar a página.");
            return;
        }
        // Triggers the Google One Tap prompt
        window.google.accounts.id.prompt();
    };

    const handleLogout = () => {
        if (window.google) {
            window.google.accounts.id.disableAutoSelect();
        }
        localStorage.removeItem('postyUser');
        setCurrentUser(null);
        setPosts([]);
        setBrandKits([]);
        setActiveBrandKitId(null);
        toast('Você saiu.', { icon: '👋' });
    };

    const handleLinkAccount = (service: 'google' | 'freepik' | 'envato' | 'chatgpt', apiKey: string) => {
        if (!currentUser) return;
        const updatedUser: User = {
            ...currentUser,
            linkedAccounts: {
                ...currentUser.linkedAccounts,
                [service]: { apiKey, status: 'connected' }
            }
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('postyUser', JSON.stringify(updatedUser));
        // Persist linked accounts separately to survive logouts
        localStorage.setItem(`user_profile_${updatedUser.id}`, JSON.stringify({ linkedAccounts: updatedUser.linkedAccounts }));
        toast.success(`Conta ${service.charAt(0).toUpperCase() + service.slice(1)} conectada!`);
    };
    
    const handleUnlinkAccount = (service: 'google' | 'freepik' | 'envato' | 'chatgpt') => {
        if (!currentUser) return;
        const { [service]: _, ...remainingAccounts } = currentUser.linkedAccounts;
        const updatedUser: User = {
            ...currentUser,
            linkedAccounts: remainingAccounts
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('postyUser', JSON.stringify(updatedUser));
        // Persist linked accounts separately to survive logouts
        localStorage.setItem(`user_profile_${updatedUser.id}`, JSON.stringify({ linkedAccounts: updatedUser.linkedAccounts }));
        toast.success(`Conta ${service.charAt(0).toUpperCase() + service.slice(1)} desconectada.`);
    };

    // --- END User ---

    const handleAddFont = (font: FontDefinition) => {
        if (!availableFonts.some(f => f.name === font.name)) {
            setAvailableFonts(prev => [...prev, font]);
        }
    };

    const handleSelectPost = (postId: string) => {
        setSelectedPostId(postId);
        setSelectedElementId(null); // Deselect element when changing post
    };

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>,
        type: 'reference' | 'background' | 'style'
    ) => {
        const files = event.target.files;
        if (!files) return;

        let setState: React.Dispatch<React.SetStateAction<string[]>>;
        let currentState: string[];

        switch (type) {
            case 'reference':
                setState = setReferenceImages;
                currentState = referenceImages;
                break;
            case 'background':
                setState = setCustomBackgrounds;
                currentState = customBackgrounds;
                break;
            case 'style':
                setState = setStyleImages;
                currentState = styleImages;
                break;
        }
    
        if (currentState.length + files.length > 10) {
            toast.error(`Você pode enviar um máximo de 10 imagens de ${type}.`);
            return;
        }
    
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setState(prev => [...prev, e.target.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    
        // Clear the input value to allow re-uploading the same file
        event.target.value = '';
    };

    const handleRemoveImage = (indexToRemove: number, type: 'reference' | 'background' | 'style') => {
        switch (type) {
            case 'reference': setReferenceImages(prev => prev.filter((_, index) => index !== indexToRemove)); break;
            case 'background': setCustomBackgrounds(prev => prev.filter((_, index) => index !== indexToRemove)); break;
            case 'style': setStyleImages(prev => prev.filter((_, index) => index !== indexToRemove)); break;
        }
    };

    const handleAnalyzeStyle = async () => {
        const apiKey = currentUser?.linkedAccounts.google?.apiKey;
        if (!apiKey) {
            toast.error("Por favor, conecte sua chave de API do Google Gemini em 'Gerenciar Contas'.");
            setAccountModalOpen(true);
            return;
        }
        if (styleImages.length === 0) {
            toast.error("Por favor, envie pelo menos uma imagem de design para análise.");
            return;
        }
        setIsLoading(true);
        const toastId = toast.loading("Analisando seu estilo...");
        setLoadingMessage("IA está estudando seus designs...");
        try {
            const generatedGuide = await geminiService.analyzeStyleFromImages(apiKey, styleImages);
            setStyleGuide(generatedGuide);
            setUseStyleGuide(true); // Automatically enable it after generation
            toast.success("Guia de Estilo criado e ativado!", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Falha ao analisar estilo.', { id: toastId });
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };


    const handleGeneratePosts = async (topic: string, count: number, type: 'post' | 'carousel', useUploadedBgs: boolean, contentLevel: 'mínimo' | 'médio' | 'detalhado') => {
        if (!currentUser) {
            toast.error("Faça login para gerar conteúdo.");
            return;
        }

        // Check for required API keys based on generation source
        if (!useUploadedBgs) { // AI is generating backgrounds
            if (imageGenerationProvider === 'google' && !currentUser.linkedAccounts.google?.apiKey) {
                toast.error("Conecte sua chave de API do Google Gemini para gerar imagens.");
                setAccountModalOpen(true);
                return;
            }
            if (imageGenerationProvider === 'freepik' && !currentUser.linkedAccounts.freepik?.apiKey) {
                toast.error("Conecte sua chave de API do Freepik para gerar imagens.");
                setAccountModalOpen(true);
                return;
            }
        }
        // Always check for Google API key for text generation
        const googleApiKey = currentUser.linkedAccounts.google?.apiKey;
        if (!googleApiKey) {
            toast.error("Conecte sua chave de API do Google Gemini para gerar conteúdo de texto.");
            setAccountModalOpen(true);
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
            // NEW: Combined "Fill Layout" workflow
            if (useLayoutToFill && selectedLayoutId && activeBrandKitId) {
                const kit = brandKits.find(k => k.id === activeBrandKitId);
                const layout = kit?.layouts.find(l => l.id === selectedLayoutId);

                if (!kit || !layout) {
                    throw new Error("Layout ou Brand Kit selecionado não foi encontrado.");
                }

                // Step 1: Get the backgrounds from the chosen source
                let backgroundSources: { src: string, prompt?: string }[] = [];
                if (useUploadedBgs) {
                    if (customBackgrounds.length === 0) {
                        throw new Error("Por favor, envie as imagens de fundo que você deseja usar com este layout.");
                    }
                    backgroundSources = customBackgrounds.map(src => ({ src }));
                } else {
                    setLoadingMessage('Gerando novos fundos para seu layout...');
                    toast.loading('Gerando novos fundos...', { id: toastId });
                    const backgroundPrompts = await geminiService.generateImagePrompts(googleApiKey, topic, count, referenceImages, activeStyleGuide);
                    
                    let aiBackgroundData: string[];
                    if (imageGenerationProvider === 'freepik') {
                        const freepikApiKey = currentUser.linkedAccounts.freepik!.apiKey;
                        aiBackgroundData = await freepikService.generateBackgroundImages(freepikApiKey, backgroundPrompts);
                    } else {
                        aiBackgroundData = await geminiService.generateBackgroundImages(googleApiKey, backgroundPrompts);
                    }

                    backgroundSources = aiBackgroundData.map((data, i) => ({
                        src: `data:image/png;base64,${data}`,
                        prompt: backgroundPrompts[i]
                    }));
                }
                
                // Step 2: Prepare for content generation
                setLoadingMessage(`Preenchendo seu layout com conteúdo...`);
                toast.loading(`Preenchendo seu layout...`, { id: toastId });

                const newPosts: Post[] = [];
                const textElementsToFill = layout.elements
                    .filter(el => el.type === 'text')
                    .map(el => {
                        const textEl = el as TextElement;
                        let description = 'corpo de texto ou subtítulo';
                        if (textEl.fontSize > 48) description = 'título principal';
                        else if (textEl.fontSize < 20) description = 'texto de rodapé ou detalhe';
                        const lowerContent = textEl.content.toLowerCase();
                        if (lowerContent.includes('comprar') || lowerContent.includes('saiba mais') || lowerContent.includes('arraste')) {
                             description = 'chamada para ação (CTA)';
                        }
                        return { id: el.id, description, exampleContent: textEl.content };
                    });

                // Step 3: Loop through backgrounds and create each post
                for (let i = 0; i < backgroundSources.length; i++) {
                    const bgData = backgroundSources[i];
                    
                    let newContentMap: Record<string, string> = {};
                    if (textElementsToFill.length > 0) {
                        setLoadingMessage(`Gerando texto para o post ${i + 1}/${backgroundSources.length}...`);
                        newContentMap = await geminiService.generateTextForLayout(googleApiKey, textElementsToFill, topic, contentLevel, activeStyleGuide);
                    }
                    
                    const newPostId = uuidv4();
                    
                    const backgroundElement: BackgroundElement = {
                        id: `${newPostId}-background`, type: 'background', src: bgData.src, prompt: bgData.prompt,
                        provider: useUploadedBgs ? undefined : imageGenerationProvider,
                    };

                    const clonedForegroundElements: AnyElement[] = JSON.parse(JSON.stringify(
                        layout.elements.filter(el => el.type !== 'background')
                    ));

                    const newElements: AnyElement[] = clonedForegroundElements.map(el => {
                        const newEl = { ...el, id: `${newPostId}-${el.id}` };
                        if (newEl.type === 'text' && newContentMap[el.id]) {
                            (newEl as TextElement).content = newContentMap[el.id];
                        }
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

            } else if (useUploadedBgs) { // Existing "Use My Images" Mode (without a layout)
                setLoadingMessage('Analisando suas imagens...');
                toast.loading('Analisando suas imagens...', { id: toastId });

                if (customBackgrounds.length === 0) {
                    throw new Error("Nenhuma imagem de fundo foi enviada.");
                }

                setLoadingMessage('Criando layouts inteligentes...');
                toast.loading('Criando layouts inteligentes...', { id: toastId });

                const layoutPromises = customBackgrounds.map(bgSrc => 
                    geminiService.generateLayoutAndContentForImage(googleApiKey, bgSrc, topic, contentLevel, activeKit)
                );
                const allLayouts = await Promise.all(layoutPromises);

                const newPosts: Post[] = [];
                const carouselId = type === 'carousel' ? uuidv4() : undefined;

                for (let i = 0; i < customBackgrounds.length; i++) {
                    const bgSrc = customBackgrounds[i];
                    const layoutData = allLayouts[i];
                    const postId = uuidv4();
                    
                    const backgroundElement: BackgroundElement = {
                        id: `${postId}-background`,
                        type: 'background',
                        src: bgSrc,
                        provider: undefined, // User provided
                    };

                    const fontSizeMap: Record<string, number> = { large: 48, medium: 28, small: 18, cta: 22 };

                    const textElements: TextElement[] = layoutData.map(aiEl => {
                        const textColor = aiEl.backgroundTone === 'dark' ? '#FFFFFF' : '#0F172A';
                        const newElement: TextElement = {
                            id: `${postId}-${uuidv4()}`,
                            type: 'text',
                            content: aiEl.content,
                            x: (aiEl.x / 100) * postSize.width,
                            y: (aiEl.y / 100) * postSize.height,
                            width: (aiEl.width / 100) * postSize.width,
                            height: (aiEl.height / 100) * postSize.height,
                            rotation: aiEl.rotation || 0, opacity: 1, locked: false, visible: true,
                            fontSize: fontSizeMap[aiEl.fontSize] || 24,
                            fontFamily: aiEl.fontFamily || 'Poppins', accentFontFamily: aiEl.accentFontFamily,
                            color: aiEl.color || textColor, textAlign: aiEl.textAlign, verticalAlign: 'middle',
                            letterSpacing: 0, lineHeight: aiEl.lineHeight || 1.4,
                            highlightColor: aiEl.highlightColor, backgroundColor: aiEl.backgroundColor,
                        };
                        if (aiEl.fontSize === 'cta' && aiEl.backgroundColor) {
                            newElement.padding = 10;
                            newElement.borderRadius = 8;
                        }
                        return newElement;
                    });
                    
                    const post: Post = {
                        id: postId,
                        elements: [backgroundElement, ...textElements],
                    };
                    
                    if (carouselId) {
                        post.carouselId = carouselId;
                        post.slideIndex = i;
                    }
    
                    newPosts.push(post);
                }
    
                setPosts(newPosts);
                if (newPosts.length > 0) setSelectedPostId(newPosts[0].id);
                toast.success('Posts criados com sucesso!', { id: toastId });

            } else {
                // Full AI-based generation
                setLoadingMessage('Aquecendo a IA...');
                toast.loading('Aquecendo a IA...', { id: toastId });

                if (type === 'carousel') {
                    // Step 1: Generate the script and image prompts
                    setLoadingMessage('Criando roteiro do carrossel...');
                    toast.loading('Criando roteiro do carrossel...', { id: toastId });
                    const carouselScript = await geminiService.generateCarouselScript(googleApiKey, topic, count, contentLevel, activeStyleGuide);
        
                    // Step 2: Generate background images
                    const imagePrompts = carouselScript.map(slide => slide.imagePrompt);
                    setLoadingMessage(`Gerando ${count} visuais coesos...`);
                    toast.loading(`Gerando ${count} visuais coesos...`, { id: toastId });
                    
                    let aiBackgroundsBase64: string[];
                    if (imageGenerationProvider === 'freepik') {
                        const freepikApiKey = currentUser.linkedAccounts.freepik!.apiKey;
                        aiBackgroundsBase64 = await freepikService.generateBackgroundImages(freepikApiKey, imagePrompts);
                    } else {
                        aiBackgroundsBase64 = await geminiService.generateBackgroundImages(googleApiKey, imagePrompts);
                    }
                    const backgroundSrcs = aiBackgroundsBase64.map(b64 => `data:image/png;base64,${b64}`);
        
                    // Step 3: Generate layout for each image based on the script
                    setLoadingMessage('Criando layouts inteligentes...');
                    toast.loading('Criando layouts inteligentes...', { id: toastId });
                    const layoutPromises = backgroundSrcs.map((bgSrc, index) => {
                        const scriptItem = carouselScript[index];
                        if (!scriptItem) {
                            return Promise.resolve(null);
                        }
                        return geminiService.generateLayoutForProvidedText(googleApiKey, bgSrc, scriptItem.slideContent, topic, activeKit);
                    });
                    const allLayouts = await Promise.all(layoutPromises);

                    // Step 4: Assemble the posts
                    const newPosts: Post[] = [];
                    const carouselId = uuidv4();
                    
                    for (let i = 0; i < backgroundSrcs.length; i++) {
                        const layoutData = allLayouts[i];
                        const backgroundSrc = backgroundSrcs[i];
                        const scriptData = carouselScript[i];
                        
                        if (!layoutData || !backgroundSrc || !scriptData) continue;
                        
                        const postId = uuidv4();
                        const backgroundElement: BackgroundElement = {
                            id: `${postId}-background`,
                            type: 'background',
                            src: backgroundSrc,
                            prompt: scriptData.imagePrompt,
                            provider: imageGenerationProvider,
                        };
            
                        const fontSizeMap: Record<string, number> = { large: 48, medium: 28, small: 18, cta: 22 };
            
                        const textElements: TextElement[] = layoutData.map(aiEl => {
                            const textColor = aiEl.backgroundTone === 'dark' ? '#FFFFFF' : '#0F172A';
                            const newElement: TextElement = {
                                 id: `${postId}-${uuidv4()}`,
                                 type: 'text',
                                 content: aiEl.content,
                                 x: (aiEl.x / 100) * postSize.width,
                                 y: (aiEl.y / 100) * postSize.height,
                                 width: (aiEl.width / 100) * postSize.width,
                                 height: (aiEl.height / 100) * postSize.height,
                                 rotation: aiEl.rotation || 0,
                                 opacity: 1,
                                 locked: false,
                                 visible: true,
                                 fontSize: fontSizeMap[aiEl.fontSize] || 24,
                                 fontFamily: aiEl.fontFamily || 'Poppins',
                                 accentFontFamily: aiEl.accentFontFamily,
                                 color: aiEl.color || textColor,
                                 textAlign: aiEl.textAlign,
                                 verticalAlign: 'middle',
                                 letterSpacing: 0,
                                 lineHeight: aiEl.lineHeight || 1.4,
                                 highlightColor: aiEl.highlightColor,
                                 backgroundColor: aiEl.backgroundColor,
                            };
                            if (aiEl.fontSize === 'cta' && aiEl.backgroundColor) {
                                newElement.padding = 10;
                                newElement.borderRadius = 8;
                            }
                            return newElement;
                        });
                        
                        newPosts.push({
                            id: postId,
                            elements: [backgroundElement, ...textElements],
                            carouselId,
                            slideIndex: i,
                        });
                    }
                    setPosts(newPosts);
                    if (newPosts.length > 0) setSelectedPostId(newPosts[0].id);
                    toast.success('Carrossel gerado com sucesso!', { id: toastId });
    
                } else { // Single Post Generation
                    setLoadingMessage('Gerando conceitos visuais...');
                    toast.loading('Gerando conceitos visuais...', { id: toastId });
                    const backgroundPrompts = await geminiService.generateImagePrompts(googleApiKey, topic, count, referenceImages, activeStyleGuide);
        
                    setLoadingMessage('Projetando visuais deslumbrantes...');
                    toast.loading('Projetando visuais deslumbrantes...', { id: toastId });
                    
                    let aiBackgroundData: string[];
                    if (imageGenerationProvider === 'freepik') {
                        const freepikApiKey = currentUser.linkedAccounts.freepik!.apiKey;
                        aiBackgroundData = await freepikService.generateBackgroundImages(freepikApiKey, backgroundPrompts);
                    } else {
                        aiBackgroundData = await geminiService.generateBackgroundImages(googleApiKey, backgroundPrompts);
                    }
                    
                    const finalBackgrounds = aiBackgroundData.map((data, i) => ({
                        src: `data:image/png;base64,${data}`,
                        prompt: backgroundPrompts[i]
                    }));
            
                    setLoadingMessage('Criando layouts inteligentes...');
                    toast.loading('Criando layouts inteligentes...', { id: toastId });
            
                    const layoutPromises = finalBackgrounds.map(bgData => 
                        geminiService.generateLayoutAndContentForImage(googleApiKey, bgData.src, topic, contentLevel, activeKit)
                    );
                    const allLayouts = await Promise.all(layoutPromises);
            
                    let newPosts: Post[] = [];
            
                    for (let i = 0; i < finalBackgrounds.length; i++) {
                        const bgData = finalBackgrounds[i];
                        const layoutData = allLayouts[i];
                        const postId = uuidv4();
                        
                        const backgroundElement: BackgroundElement = {
                            id: `${postId}-background`, type: 'background', src: bgData.src, prompt: bgData.prompt, provider: imageGenerationProvider,
                        };
            
                        const fontSizeMap: Record<string, number> = { large: 48, medium: 28, small: 18, cta: 22 };
            
                        const textElements: TextElement[] = layoutData.map(aiEl => {
                            const textColor = aiEl.backgroundTone === 'dark' ? '#FFFFFF' : '#0F172A';
                            const newElement: TextElement = {
                                 id: `${postId}-${uuidv4()}`,
                                 type: 'text',
                                 content: aiEl.content,
                                 x: (aiEl.x / 100) * postSize.width,
                                 y: (aiEl.y / 100) * postSize.height,
                                 width: (aiEl.width / 100) * postSize.width,
                                 height: (aiEl.height / 100) * postSize.height,
                                 rotation: aiEl.rotation || 0, opacity: 1, locked: false, visible: true,
                                 fontSize: fontSizeMap[aiEl.fontSize] || 24,
                                 fontFamily: aiEl.fontFamily || 'Poppins', accentFontFamily: aiEl.accentFontFamily,
                                 color: aiEl.color || textColor, textAlign: aiEl.textAlign, verticalAlign: 'middle',
                                 letterSpacing: 0, lineHeight: aiEl.lineHeight || 1.4,
                                 highlightColor: aiEl.highlightColor, backgroundColor: aiEl.backgroundColor,
                            };
                            if (aiEl.fontSize === 'cta' && aiEl.backgroundColor) {
                                newElement.padding = 10;
                                newElement.borderRadius = 8;
                            }
                            return newElement;
                        });
                        
                        let postPalette: string[] | undefined;
                        if(colorMode === 'extract'){
                            const { palette } = await geminiService.extractPaletteFromImage(googleApiKey, bgData.src);
                            postPalette = palette;
                        }
                        
                        newPosts.push({ id: postId, elements: [...textElements, backgroundElement], palette: postPalette });
                    }
            
                    setPosts(newPosts);
                    if (newPosts.length > 0) setSelectedPostId(newPosts[0].id);
                    toast.success('Posts gerados com sucesso!', { id: toastId });
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Falha ao gerar conteúdo.', { id: toastId });
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
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
    
        const addAndSelectElement = (element: AnyElement) => {
            setPosts(posts => posts.map(p => {
                if (p.id === selectedPostId) {
                    const bgIndex = p.elements.findIndex(e => e.type === 'background');
                    const newElements = [...p.elements];
                    newElements.splice(bgIndex, 0, element);
                    return { ...p, elements: newElements };
                }
                return p;
            }));
            setSelectedElementId(element.id);
        };
    
        const baseProps = {
            id: newId,
            x: postSize.width / 2 - 150,
            y: postSize.height / 2 - 150,
            width: 300,
            height: 300,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
        };

        switch (type) {
            case 'text':
                addAndSelectElement({ ...baseProps, type: 'text', content: 'Novo Texto', height: 50, y: postSize.height / 2 - 25, fontSize: 24, fontFamily: 'Poppins', color: '#FFFFFF', textAlign: 'center', verticalAlign: 'middle', letterSpacing: 0, lineHeight: 1.4 });
                break;
            case 'image':
                if (options?.src) addAndSelectElement({ ...baseProps, type: 'image', src: options.src, blendMode: 'normal', filters: { brightness: 1, contrast: 1, saturate: 1, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, invert: 0 }, borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent' });
                break;
            case 'gradient':
                addAndSelectElement({ ...baseProps, type: 'gradient', x: 0, y: postSize.height / 2, width: postSize.width, height: postSize.height / 2, color1: 'rgba(0,0,0,0.7)', color2: 'rgba(0,0,0,0)', angle: 0, blendMode: 'normal' });
                break;
            case 'shape':
                addAndSelectElement({ ...baseProps, type: 'shape', shape: options?.shape || 'rectangle', fillColor: 'rgba(236, 72, 153, 1)', borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent', blendMode: 'normal' });
                break;
            case 'qrcode':
                addAndSelectElement({ ...baseProps, type: 'qrcode', width: 200, height: 200, y: postSize.height / 2 - 100, x: postSize.width / 2 - 100, url: 'https://gemini.google.com', color: '#000000', backgroundColor: '#FFFFFF', blendMode: 'normal' });
                break;
        }
    };

    const handleRemoveElement = (elementId: string) => {
        if (!selectedPostId) return;
        setPosts(posts => posts.map(p => p.id === selectedPostId ? {...p, elements: p.elements.filter(e => e.id !== elementId)} : p));
        setSelectedElementId(null);
    };

    const handleDuplicateElement = (elementId: string) => {
        if (!selectedPostId) return;
        setPosts(posts => posts.map(p => {
            if (p.id !== selectedPostId) return p;
            
            const originalElement = p.elements.find(e => e.id === elementId);
            if (!originalElement || originalElement.type === 'background') return p;

            const newElement = {
                ...originalElement,
                id: `${selectedPostId}-${uuidv4()}`,
                x: originalElement.x + 20,
                y: originalElement.y + 20,
            };

            const originalIndex = p.elements.findIndex(e => e.id === elementId);
            const newElements = [...p.elements];
            newElements.splice(originalIndex, 0, newElement as AnyElement);
            
            setSelectedElementId(newElement.id);
            return { ...p, elements: newElements };
        }));
        toast.success("Camada duplicada!");
    };

    const handleToggleElementVisibility = (elementId: string) => {
        const selectedPost = posts.find(p => p.id === selectedPostId);
        const element = selectedPost?.elements.find(e => e.id === elementId);
        if (element && element.type !== 'background') {
            updatePostElement(elementId, { visible: !element.visible });
        }
    };
    
    const handleToggleElementLock = (elementId: string) => {
        const selectedPost = posts.find(p => p.id === selectedPostId);
        const element = selectedPost?.elements.find(e => e.id === elementId);
        if (element && element.type !== 'background') {
            updatePostElement(elementId, { locked: !element.locked });
        }
    };
    
    const handleReorderElements = (sourceId: string, destinationId: string) => {
        if (!selectedPostId) return;
        setPosts(posts => posts.map(p => {
            if (p.id !== selectedPostId) return p;

            const elements = [...p.elements];
            const sourceIndex = elements.findIndex(e => e.id === sourceId);
            const destinationIndex = elements.findIndex(e => e.id === destinationId);
            if (sourceIndex === -1 || destinationIndex === -1) return p;
            
            const [removed] = elements.splice(sourceIndex, 1);
            elements.splice(destinationIndex, 0, removed);

            return { ...p, elements };
        }));
    };

    const handleSaveBrandKit = (name: string) => {
        if (!currentUser) return;
        if (!selectedPostId) {
            toast.error("Selecione um post para usar seu layout no Brand Kit.");
            return;
        }
        const postToSave = posts.find(p => p.id === selectedPostId);
        if (!postToSave) return;
        
        const assets: BrandAsset[] = [];
        const layoutElements = postToSave.elements.map(el => {
            const newEl = { ...el, id: el.id.split('-').slice(1).join('-') }; // Make IDs relative
            if (newEl.type === 'image' && newEl.src.startsWith('data:image')) {
                const assetId = uuidv4();
                assets.push({ id: assetId, type: 'image', dataUrl: newEl.src });
                (newEl as ImageElement).assetId = assetId;
                (newEl as ImageElement).src = `asset://${assetId}`; // Replace src with a reference
            }
            return newEl;
        });
    
        const newLayout: LayoutTemplate = { id: uuidv4(), name: 'Layout Padrão', elements: layoutElements };
    
        const newBrandKit: BrandKit = {
            id: uuidv4(),
            name,
            styleGuide,
            fonts: availableFonts.filter(f => f.dataUrl), // Only save custom fonts
            palette: customPalette,
            layouts: [newLayout],
            assets: assets,
        };
    
        const updatedKits = [...brandKits, newBrandKit];
        setBrandKits(updatedKits);
        localStorage.setItem(`brandKits_${currentUser.id}`, JSON.stringify(updatedKits));
        toast.success(`Brand Kit "${name}" salvo!`);
    };

    const handleOpenAddLayoutModal = () => {
        if (!activeBrandKitId) {
            toast.error("Nenhum Brand Kit está ativo para adicionar um layout.");
            return;
        }
        if (!selectedPostId) {
            toast.error("Por favor, selecione um post para salvar como um novo layout.");
            return;
        }
        setAddLayoutModalOpen(true);
    };

    const handleSaveLayoutToActiveKit = (layoutName: string) => {
        if (!currentUser || !activeBrandKitId || !selectedPostId) {
            toast.error("Erro: Usuário, kit ou post não selecionado.");
            return;
        }
        
        const postToSave = posts.find(p => p.id === selectedPostId);
        if (!postToSave) return;
        
        const updatedKits = brandKits.map(kit => {
            if (kit.id !== activeBrandKitId) {
                return kit;
            }
            
            const newAssets = [...kit.assets];
    
            const layoutElements = postToSave.elements.map(el => {
                const newEl = { ...el, id: el.id.split('-').slice(1).join('-') };
                if (newEl.type === 'image' && newEl.src.startsWith('data:image')) {
                    let asset = newAssets.find(a => a.dataUrl === newEl.src);
                    if (!asset) {
                        asset = { id: uuidv4(), type: 'image', dataUrl: newEl.src };
                        newAssets.push(asset);
                    }
                    (newEl as ImageElement).assetId = asset.id;
                    (newEl as ImageElement).src = `asset://${asset.id}`;
                }
                return newEl;
            });
            
            const newLayout: LayoutTemplate = { id: uuidv4(), name: layoutName, elements: layoutElements };
            
            toast.success(`Layout "${layoutName}" adicionado ao kit!`);
    
            return {
                ...kit,
                layouts: [...kit.layouts, newLayout],
                assets: newAssets,
            };
        });

        setBrandKits(updatedKits);
        localStorage.setItem(`brandKits_${currentUser.id}`, JSON.stringify(updatedKits));
        setAddLayoutModalOpen(false);
    };
    
    const handleUpdateLayoutName = (layoutId: string, newName: string) => {
        if (!currentUser || !activeBrandKitId) {
            toast.error("Nenhum Brand Kit está ativo.");
            return;
        }
        if (!newName.trim()) {
            toast.error("O nome do layout não pode ser vazio.");
            return;
        }
    
        const updatedKits = brandKits.map(kit => {
            if (kit.id !== activeBrandKitId) {
                return kit;
            }
            return {
                ...kit,
                layouts: kit.layouts.map(layout =>
                    layout.id === layoutId ? { ...layout, name: newName.trim() } : layout
                ),
            };
        });
        setBrandKits(updatedKits);
        localStorage.setItem(`brandKits_${currentUser.id}`, JSON.stringify(updatedKits));
        toast.success("Nome do layout atualizado!");
    };
    
    const handleDeleteLayoutFromKit = (layoutId: string) => {
        if (!currentUser || !activeBrandKitId) {
            toast.error("Nenhum Brand Kit está ativo.");
            return;
        }
    
        const newKits = brandKits.map(kit => {
            if (kit.id !== activeBrandKitId) {
                return kit;
            }
            
            if (selectedLayoutId === layoutId) {
                setSelectedLayoutId(null);
                setUseLayoutToFill(false);
            }

            return {
                ...kit,
                layouts: kit.layouts.filter(layout => layout.id !== layoutId),
            };
        });

        setBrandKits(newKits);
        localStorage.setItem(`brandKits_${currentUser.id}`, JSON.stringify(newKits));
        toast.success("Layout removido do kit.");
    };

    const loadFontsFromKit = (kit: BrandKit) => {
        kit.fonts.forEach(font => {
            if (font.dataUrl) {
                if (document.querySelector(`style[data-font-name="${font.name}"]`)) {
                     handleAddFont(font);
                     return;
                }

                const newStyle = document.createElement('style');
                newStyle.setAttribute('data-custom-font', 'true');
                newStyle.setAttribute('data-font-name', font.name);
                newStyle.innerHTML = `
                    @font-face {
                        font-family: "${font.name}";
                        src: url(${font.dataUrl});
                    }
                `;
                document.head.appendChild(newStyle);
                handleAddFont(font);
            }
        });
    };

    const handleApplyBrandKit = (kitId: string) => {
        const kit = brandKits.find(k => k.id === kitId);
        if (!kit) { toast.error("Brand Kit não encontrado."); return; }
        
        setActiveBrandKitId(kit.id);
        setStyleGuide(kit.styleGuide);
        setUseStyleGuide(!!kit.styleGuide);
        setCustomPalette(kit.palette);
        loadFontsFromKit(kit);
    
        setSelectedLayoutId(null);
        setUseLayoutToFill(false);

        toast.success(`Brand Kit "${kit.name}" aplicado!`);
    };

    const handleExportBrandKit = (kitId: string) => {
        const kit = brandKits.find(t => t.id === kitId);
        if (!kit) { toast.error("Brand Kit não encontrado."); return; }

        const kitJson = JSON.stringify(kit, null, 2);
        const blob = new Blob([kitJson], { type: 'application/json' });
        saveAs(blob, `BrandKit_${kit.name.replace(/ /g, '_')}.json`);
        toast.success(`Brand Kit "${kit.name}" exportado!`);
    };
    
    const handleImportBrandKit = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentUser) return;
        const file = event.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const importedData = JSON.parse(text) as BrandKit;
    
                if (importedData && typeof importedData.name === 'string' && Array.isArray(importedData.layouts)) {
                    const newKit: BrandKit = { ...importedData, id: uuidv4() };
                    const updatedKits = [...brandKits, newKit];
                    setBrandKits(updatedKits);
                    localStorage.setItem(`brandKits_${currentUser.id}`, JSON.stringify(updatedKits));
                    loadFontsFromKit(newKit);
                    toast.success(`Brand Kit "${newKit.name}" importado com sucesso!`);
                } else {
                    throw new Error("Formato de arquivo de Brand Kit inválido.");
                }
            } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : "Falha ao importar Brand Kit.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleDeleteBrandKit = (kitId: string) => {
        if (!currentUser) return;
        if(activeBrandKitId === kitId) setActiveBrandKitId(null);
        const updatedKits = brandKits.filter(k => k.id !== kitId);
        setBrandKits(updatedKits);
        localStorage.setItem(`brandKits_${currentUser.id}`, JSON.stringify(updatedKits));
        toast.success("Brand Kit removido.");
    };

    const handleAddPostFromLayout = (layoutId: string, showToast = true): Post | null => {
        const kit = brandKits.find(k => k.id === activeBrandKitId);
        const layout = kit?.layouts.find(l => l.id === layoutId);
        if (!kit || !layout) {
            toast.error("Layout não encontrado no kit ativo.");
            return null;
        }

        const newPostId = uuidv4();
        const newElements: AnyElement[] = layout.elements.map(el => {
            const newEl = { ...el, id: `${newPostId}-${el.id}` };
            if (newEl.type === 'image' && newEl.assetId) {
                const asset = kit.assets.find(a => a.id === newEl.assetId);
                if (asset) {
                    newEl.src = asset.dataUrl;
                }
            }
            return newEl as AnyElement;
        });
        
        const newPost: Post = {
            id: newPostId,
            elements: newElements,
        };

        setPosts(prev => [...prev, newPost]);
        setSelectedPostId(newPostId);
        if(showToast) toast.success("Post criado a partir do layout!");
        return newPost;
    };


    const handleAlignElement = (alignment: 'h-start' | 'h-center' | 'h-end' | 'v-start' | 'v-center' | 'v-end') => {
        const selectedPost = posts.find(p => p.id === selectedPostId);
        if (!selectedPost || !selectedElementId) return;

        const element = selectedPost.elements.find(e => e.id === selectedElementId);
        if (!element || element.type === 'background') return;

        const { width: canvasWidth, height: canvasHeight } = postSize;
        const { width: elWidth, height: elHeight } = element;
    
        let newX = element.x;
        let newY = element.y;
    
        switch (alignment) {
            case 'h-start': newX = 0; break;
            case 'h-center': newX = (canvasWidth - elWidth) / 2; break;
            case 'h-end': newX = canvasWidth - elWidth; break;
            case 'v-start': newY = 0; break;
            case 'v-center': newY = (canvasHeight - elHeight) / 2; break;
            case 'v-end': newY = canvasHeight - elHeight; break;
        }
    
        updatePostElement(selectedElementId, { x: Math.round(newX), y: Math.round(newY) });
    };

    const handleRegenerateBackground = async (elementId: string, prompt: string) => {
        const post = posts.find(p => p.id === selectedPostId);
        const bgElement = post?.elements.find(e => e.id === elementId) as BackgroundElement | undefined;
        if (!bgElement || !currentUser) return;

        const provider = bgElement.provider || 'google'; // Default to Google if not set

        const apiKey = currentUser.linkedAccounts[provider]?.apiKey;
        if (!apiKey) {
            toast.error(`Conecte sua chave de API do ${provider === 'google' ? 'Google Gemini' : 'Freepik'} para gerar um novo fundo.`);
            setAccountModalOpen(true);
            return;
        }

        const toastId = toast.loading(`Gerando novo fundo com ${provider === 'google' ? 'Google' : 'Freepik'}...`);
        try {
            let newSrc: string;
            if (provider === 'freepik') {
                newSrc = await freepikService.generateSingleBackgroundImage(apiKey, prompt);
            } else {
                newSrc = await geminiService.generateSingleBackgroundImage(apiKey, prompt);
            }
            updatePostElement(elementId, { src: newSrc });
            toast.success("Fundo atualizado!", { id: toastId });
        } catch (e) {
            toast.error("Falha ao gerar novo fundo.", { id: toastId });
        }
    };
    
    const handleUpdateBackgroundSrc = (elementId: string, src: string) => {
        updatePostElement(elementId, { src, provider: undefined }); // User provided, so clear provider
    };


    const handleExport = async (format: 'png' | 'jpeg' | 'zip') => {
        const toastId = toast.loading(`Exportando...`);
        setSelectedElementId(null);
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const fontURL = "https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&family=Poppins:wght@400;700&family=Roboto:wght@400;700&display=swap";
            let fontCSS = await fetch(fontURL).then(res => res.text());

            const customFontStyles = document.querySelectorAll('style[data-custom-font="true"]');
            customFontStyles.forEach(styleElement => {
                fontCSS += `\n${styleElement.innerHTML}`;
            });

            const imageOptions = {
                pixelRatio: 2,
                fetchRequestInit: { mode: 'cors' as RequestMode },
                fontEmbedCSS: fontCSS,
            };

            if (format === 'zip') {
                const zip = new JSZip();
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.top = '-9999px';
                document.body.appendChild(container);

                for (const post of posts) {
                    const postContainer = document.createElement('div');
                    container.appendChild(postContainer);
                    const root = createRoot(postContainer);
                    
                    root.render(<StaticPost post={post} postSize={postSize} />);

                    await new Promise(r => setTimeout(r, 100));

                    const nodeToCapture = postContainer.firstChild as HTMLElement;
                    if (nodeToCapture) {
                        const blob = await htmlToImage.toBlob(nodeToCapture, imageOptions);
                        if (blob) {
                            const fileName = post.carouselId ? `carousel-${post.carouselId}-slide-${(post.slideIndex || 0) + 1}.png` : `post-${post.id}.png`;
                            zip.file(fileName, blob);
                        }
                    }
                    root.unmount();
                }

                document.body.removeChild(container);
                const zipBlob = await zip.generateAsync({ type: "blob" });
                saveAs(zipBlob, "posts.zip");
                toast.success("Todos os posts foram exportados como ZIP!", { id: toastId });

            } else {
                 if (!editorRef.current) {
                    toast.error("Editor não está pronto.");
                    return;
                }
                const exportFunction = format === 'png' ? htmlToImage.toPng : htmlToImage.toJpeg;
                const dataUrl = await exportFunction(editorRef.current, { ...imageOptions, quality: 0.95 });
                const link = document.createElement('a');
                link.download = `post-${selectedPostId}.${format}`;
                link.href = dataUrl;
                link.click();
                toast.success(`Post exportado como ${format.toUpperCase()}!`, { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Falha na exportação.", { id: toastId });
        }
    };

    const selectedPost = posts.find(p => p.id === selectedPostId);
    const selectedElement = selectedPost?.elements.find(e => e.id === selectedElementId);
    const activeBrandKit = brandKits.find(k => k.id === activeBrandKitId);
    
    const currentCarouselSlides = selectedPost?.carouselId 
        ? posts.filter(p => p.carouselId === selectedPost.carouselId).sort((a, b) => (a.slideIndex || 0) - (b.slideIndex || 0))
        : [];
    const currentSlideIndex = currentCarouselSlides.findIndex(p => p.id === selectedPostId);
    
    const handleFitToScreen = useCallback(() => {
        if (!viewportRef.current || !postSize) return;
        const { width: vw, height: vh } = viewportRef.current.getBoundingClientRect();
        const { width: cw, height: ch } = postSize;

        const zoomX = vw / cw;
        const zoomY = vh / ch;
        const newZoom = Math.min(zoomX, zoomY) * 0.9;

        setZoom(newZoom);
    }, [postSize]);

    useEffect(() => {
        handleFitToScreen();
    }, [selectedPostId, postSize, handleFitToScreen]);
    
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const newZoom = e.deltaY > 0 ? zoom / zoomFactor : zoom * zoomFactor;
        const clampedZoom = Math.max(0.1, Math.min(newZoom, 5));
        setZoom(clampedZoom);
    };

    const handleZoomIn = () => setZoom(z => Math.min(z * 1.25, 5));
    const handleZoomOut = () => setZoom(z => Math.max(z / 1.25, 0.1));

    const handleAddPost = () => {
        const newPostId = uuidv4();
        const newPost: Post = {
            id: newPostId,
            elements: [{
                id: `${newPostId}-background`,
                type: 'background',
                src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8//9/PQAI8wN3Y0UNbAAAAABJRU5ErkJggg==', // dark grey
            }]
        };
        setPosts(prev => [...prev, newPost]);
        setSelectedPostId(newPostId);
        setSelectedElementId(null);
        toast.success("Novo post adicionado!");
    };

    const handleDeletePost = ({ postId, carouselId }: { postId?: string, carouselId?: string }) => {
        const postIndex = posts.findIndex(p => p.id === postId);
        setPosts(prev => {
            const newPosts = carouselId
                ? prev.filter(p => p.carouselId !== carouselId)
                : prev.filter(p => p.id !== postId);
                
            if (selectedPostId === postId || (carouselId && selectedPost?.carouselId === carouselId)) {
                if (newPosts.length > 0) {
                     const nextIndex = Math.max(0, postIndex - 1);
                     setSelectedPostId(newPosts[nextIndex]?.id || newPosts[0]?.id);
                } else {
                    setSelectedPostId(null);
                }
            }
            return newPosts;
        });
        toast.success("Removido com sucesso!");
    };

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
             <AddLayoutModal
                isOpen={isAddLayoutModalOpen}
                onClose={() => setAddLayoutModalOpen(false)}
                onSave={handleSaveLayoutToActiveKit}
                postToPreview={selectedPost}
                postSize={postSize}
            />
            <AccountManagerModal
                isOpen={isAccountModalOpen}
                onClose={() => setAccountModalOpen(false)}
                user={currentUser}
                onLinkAccount={handleLinkAccount}
                onUnlinkAccount={handleUnlinkAccount}
            />
            <div className="flex flex-col h-screen font-sans bg-gray-950 text-gray-100" style={{ minWidth: '1400px' }}>
                <header className="w-full bg-zinc-900 border-b border-zinc-800 px-6 py-2 flex justify-end items-center flex-shrink-0">
                    <UserProfile 
                        user={currentUser}
                        onLogin={handleLogin}
                        onLogout={handleLogout}
                        onManageAccounts={() => setAccountModalOpen(true)}
                    />
                </header>
                <div className="flex flex-row flex-grow min-h-0">
                    <ControlPanel
                        isLoading={isLoading}
                        onGenerate={handleGeneratePosts}
                        onExport={handleExport}
                        onSaveBrandKit={handleSaveBrandKit}
                        onAddLayoutToActiveKit={handleOpenAddLayoutModal}
                        onImportBrandKit={handleImportBrandKit}
                        onExportBrandKit={handleExportBrandKit}
                        onDeleteBrandKit={handleDeleteBrandKit}
                        onApplyBrandKit={handleApplyBrandKit}
                        onAddPostFromLayout={handleAddPostFromLayout}
                        onUpdateLayoutName={handleUpdateLayoutName}
                        onDeleteLayoutFromKit={handleDeleteLayoutFromKit}
                        brandKits={brandKits}
                        activeBrandKit={activeBrandKit}
                        postSize={postSize}
                        setPostSize={setPostSize}
                        hasPosts={posts.length > 0}
                        referenceImages={referenceImages}
                        customBackgrounds={customBackgrounds}
                        styleImages={styleImages}
                        onFileChange={handleFileChange}
                        onRemoveImage={handleRemoveImage}
                        colorMode={colorMode}
                        setColorMode={setColorMode}
                        customPalette={customPalette}
                        setCustomPalette={setCustomPalette}
                        styleGuide={styleGuide}
                        useStyleGuide={useStyleGuide}
                        setUseStyleGuide={setUseStyleGuide}
                        onAnalyzeStyle={handleAnalyzeStyle}
                        selectedLayoutId={selectedLayoutId}
                        setSelectedLayoutId={setSelectedLayoutId}
                        useLayoutToFill={useLayoutToFill}
                        setUseLayoutToFill={setUseLayoutToFill}
                        currentUser={currentUser}
                        imageGenerationProvider={imageGenerationProvider}
                        setImageGenerationProvider={setImageGenerationProvider}
                    />
                    <main 
                        className="flex-1 flex flex-col items-center justify-center bg-black/30 overflow-hidden relative"
                        ref={viewportRef}
                        onWheel={handleWheel}
                    >
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center text-center">
                                <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="mt-4 text-xl font-semibold text-gray-300">{loadingMessage}</p>
                                <p className="text-gray-400">Aguarde, a mágica está acontecendo...</p>
                            </div>
                        )}
                        {!isLoading && !currentUser && (
                             <div className="text-center text-gray-400">
                                 <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Posty</h2>
                                 <p>Faça login para começar a criar seu conteúdo.</p>
                             </div>
                        )}
                        {!isLoading && currentUser && posts.length === 0 && (
                             <div className="text-center text-gray-400">
                                 <h2 className="text-2xl font-bold mb-2">Tudo pronto!</h2>
                                 <p>Selecione um Brand Kit ou preencha os detalhes para gerar conteúdo.</p>
                             </div>
                        )}
                        {selectedPost && currentUser && (
                             <div 
                                className="flex items-center justify-center transition-transform duration-100 ease-out"
                                style={{ 
                                    transform: `scale(${zoom})`,
                                }}
                            >
                                <CanvasEditor
                                    ref={editorRef}
                                    post={selectedPost}
                                    postSize={postSize}
                                    onUpdateElement={updatePostElement}
                                    selectedElementId={selectedElementId}
                                    onSelectElement={setSelectedElementId}
                                />
                            </div>
                        )}

                        {currentCarouselSlides.length > 1 && (
                             <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4">
                                <button 
                                    onClick={() => handleSelectPost(currentCarouselSlides[currentSlideIndex - 1].id)}
                                    disabled={currentSlideIndex === 0}
                                    className="p-2 bg-black/50 rounded-full hover:bg-black/80 disabled:opacity-30 transition-all"
                                >
                                    <ChevronLeft className="w-6 h-6"/>
                                </button>
                                <button
                                    onClick={() => handleSelectPost(currentCarouselSlides[currentSlideIndex + 1].id)}
                                    disabled={currentSlideIndex === currentCarouselSlides.length - 1}
                                    className="p-2 bg-black/50 rounded-full hover:bg-black/80 disabled:opacity-30 transition-all"
                                >
                                    <ChevronRight className="w-6 h-6"/>
                                </button>
                            </div>
                        )}

                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-zinc-900/70 backdrop-blur-sm p-2 rounded-lg shadow-lg">
                            {selectedElement && selectedElement.type !== 'background' && (
                                <div className="flex items-center space-x-1 pr-2 border-r border-zinc-700">
                                    <button onClick={() => handleAlignElement('h-start')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Align Left"><AlignHorizontalJustifyStart className="w-4 h-4" /></button>
                                    <button onClick={() => handleAlignElement('h-center')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Align Center Horizontal"><AlignHorizontalJustifyCenter className="w-4 h-4" /></button>
                                    <button onClick={() => handleAlignElement('h-end')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Align Right"><AlignHorizontalJustifyEnd className="w-4 h-4" /></button>
                                    <button onClick={() => handleAlignElement('v-start')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Align Top"><AlignVerticalJustifyStart className="w-4 h-4" /></button>
                                    <button onClick={() => handleAlignElement('v-center')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Align Center Vertical"><AlignVerticalJustifyCenter className="w-4 h-4" /></button>
                                    <button onClick={() => handleAlignElement('v-end')} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Align Bottom"><AlignVerticalJustifyEnd className="w-4 h-4" /></button>
                                    <div className="w-px h-5 bg-zinc-700 mx-1"></div>
                                    <button onClick={() => handleToggleElementVisibility(selectedElement.id)} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Toggle Visibility">
                                        {selectedElement.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => handleToggleElementLock(selectedElement.id)} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Toggle Lock">
                                        {selectedElement.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => handleDuplicateElement(selectedElement.id)} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Duplicate Element"><Copy className="w-4 h-4"/></button>
                                    <button onClick={() => handleRemoveElement(selectedElement.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-md" aria-label="Remove Element"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            )}
                             {posts.length > 0 && !isLoading && currentUser && (
                                <div className="flex items-center space-x-2">
                                    <button onClick={handleZoomOut} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Zoom Out"><ZoomOut className="w-5 h-5"/></button>
                                    <span className="text-sm font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
                                    <button onClick={handleZoomIn} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Zoom In"><ZoomIn className="w-5 h-5"/></button>
                                    <button onClick={handleFitToScreen} className="p-2 hover:bg-zinc-700 rounded-md" aria-label="Fit to Screen"><Maximize className="w-5 h-5"/></button>
                                </div>
                            )}
                        </div>
                    </main>
                    <aside className="w-80 bg-zinc-900 flex flex-col h-full shadow-lg transition-all duration-300 flex-shrink-0">
                        {posts.length > 0 && !isLoading && currentUser && (
                            <>
                                <PostGallery
                                    posts={posts}
                                    selectedPostId={selectedPostId}
                                    onSelectPost={handleSelectPost}
                                    onAddPost={handleAddPost}
                                    onDeletePost={handleDeletePost}
                                />
                                <LayersPanel
                                    selectedPost={selectedPost}
                                    selectedElementId={selectedElementId}
                                    onSelectElement={setSelectedElementId}
                                    onUpdateElement={updatePostElement}
                                    onAddElement={handleAddElement}
                                    onRemoveElement={handleRemoveElement}
                                    onDuplicateElement={handleDuplicateElement}
                                    onToggleVisibility={handleToggleElementVisibility}
                                    onToggleLock={handleToggleElementLock}
                                    onReorderElements={handleReorderElements}
                                    onRegenerateBackground={handleRegenerateBackground}
                                    onUpdateBackgroundSrc={handleUpdateBackgroundSrc}
                                    availableFonts={availableFonts}
                                    onAddFont={handleAddFont}
                                    palettes={{
                                        post: selectedPost?.palette,
                                        custom: customPalette,
                                    }}
                                />
                            </>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
};

export default App;
