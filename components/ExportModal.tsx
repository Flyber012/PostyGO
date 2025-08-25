import React, { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { X, Download, FileImage, Archive, RotateCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Post, PostSize, Project, TextElement } from '../types';
import * as htmlToImage from 'html-to-image';
import saveAs from 'file-saver';
import JSZip from 'jszip';
import StaticPost from './StaticPost';
import { getFontEmbedCss, FontSpec } from '../utils/fontManager';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    posts: Post[];
    postSize: PostSize;
    selectedPost: Post | null;
    project: Project | null;
}

type ExportScope = 'current' | 'all';
type ExportFormat = 'png' | 'jpeg' | 'zip';

const FONT_WEIGHT_MAP: Record<string, number> = {
    'normal': 400,
    'bold': 700,
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, posts, postSize, selectedPost, project }) => {
    const [exportScope, setExportScope] = useState<ExportScope>('current');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
    const [isExporting, setIsExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        
        if (!selectedPost) {
            setExportScope('all');
            setExportFormat('zip');
        } else {
            setExportScope('current');
            setExportFormat('png');
        }
    }, [isOpen, selectedPost]);
    
    useEffect(() => {
        if (exportScope === 'all') {
            setExportFormat('zip');
        } else {
            if (exportFormat === 'zip') setExportFormat('png');
        }
    }, [exportScope, exportFormat]);
    
    const generateImageInIframe = (post: Post, postSize: PostSize, fontEmbedCss: string): Promise<string> => {
        return new Promise(async (resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.top = '-9999px';
            iframe.style.border = 'none';
            iframe.width = `${postSize.width}px`;
            iframe.height = `${postSize.height}px`;

            document.body.appendChild(iframe);

            const cleanup = (root: Root | null) => {
                if (root) root.unmount();
                if (iframe.parentElement) {
                    document.body.removeChild(iframe);
                }
            };
            
            let reactRoot: Root | null = null;

            try {
                const doc = iframe.contentWindow?.document;
                if (!doc) {
                    throw new Error("Não foi possível acessar o documento do iframe.");
                }

                doc.open();
                doc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body, html { margin: 0; padding: 0; font-family: sans-serif; }
                            ${fontEmbedCss}
                        </style>
                    </head>
                    <body>
                        <div id="render-root" style="width:${postSize.width}px; height:${postSize.height}px;"></div>
                    </body>
                    </html>
                `);
                doc.close();

                const renderRootEl = doc.getElementById('render-root');
                if (!renderRootEl) {
                    throw new Error("Não foi possível encontrar o elemento raiz para renderização no iframe.");
                }

                reactRoot = createRoot(renderRootEl);
                reactRoot.render(<StaticPost post={post} postSize={postSize} />);

                // Wait for render and images to load
                await new Promise(r => setTimeout(r, 100));

                const images = Array.from(doc.getElementsByTagName('img'));
                const imagePromises = images.map(img => {
                    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
                    return new Promise<void>((resolveImg, rejectImg) => {
                        img.onload = () => resolveImg();
                        img.onerror = () => {
                            console.warn(`Could not load image during export: ${img.src}.`);
                            resolveImg(); // Don't fail the whole export
                        };
                    });
                });
                await Promise.all(imagePromises);
                
                await new Promise(r => setTimeout(r, 300));

                const options = {
                    quality: 0.98,
                    pixelRatio: 2,
                    imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                };
                
                const targetNode = doc.getElementById('render-root') as HTMLElement;
                let dataUrl: string;

                if (exportFormat === 'jpeg') {
                    dataUrl = await htmlToImage.toJpeg(targetNode, options);
                } else {
                    dataUrl = await htmlToImage.toPng(targetNode, options);
                }
                
                cleanup(reactRoot);
                resolve(dataUrl);

            } catch (error) {
                cleanup(reactRoot);
                reject(error);
            }
        });
    };

    const handleExport = async () => {
        if (!project) return;
    
        setIsExporting(true);
        const toastId = toast.loading('Iniciando exportação...');
        const projectName = project.name.replace(/ /g, '_');
    
        try {
            const postsToExport = exportScope === 'current' && selectedPost ? [selectedPost] : posts;
            
            setExportMessage('Analisando fontes...');
            toast.loading('Analisando fontes...', { id: toastId });

            const fontSpecKeys = new Set<string>();
            const uniqueFontSpecs = new Set<FontSpec>();
            const tempDiv = document.createElement('div');

            const addFontSpec = (spec: FontSpec) => {
                const key = `${spec.name}-${spec.weight}-${spec.style}`;
                if (!fontSpecKeys.has(key)) {
                    fontSpecKeys.add(key);
                    uniqueFontSpecs.add(spec);
                }
            };

            postsToExport.forEach(post => {
                post.elements.forEach(element => {
                    if (element.type === 'text') {
                        const textEl = element as TextElement;
                        addFontSpec({ name: textEl.fontFamily, weight: textEl.fontWeight, style: textEl.fontStyle });
                        
                        tempDiv.innerHTML = textEl.content;
                        const styledSpans = tempDiv.querySelectorAll('span[style]');
                        styledSpans.forEach(span => {
                            const style = (span as HTMLElement).style;
                            const family = style.fontFamily?.split(',')[0].replace(/['"]/g, '').trim();
                            const weightStr = style.fontWeight;
                            const weight = FONT_WEIGHT_MAP[weightStr] || parseInt(weightStr, 10) || textEl.fontWeight;
                            const fontStyle = (style.fontStyle as 'normal' | 'italic') || textEl.fontStyle;

                            if (family) {
                                addFontSpec({ name: family, weight: weight, style: fontStyle });
                            }
                        });
                    }
                });
            });
            
            setExportMessage('Preparando fontes...');
            toast.loading('Preparando fontes...', { id: toastId });
            const fontEmbedCss = await getFontEmbedCss(uniqueFontSpecs);
            
            if (exportScope === 'current' && selectedPost) {
                setExportMessage(`Renderizando post...`);
                toast.loading(`Renderizando post como ${exportFormat.toUpperCase()}...`, { id: toastId });

                const dataUrl = await generateImageInIframe(selectedPost, postSize, fontEmbedCss);
                saveAs(dataUrl, `${projectName}_post.${exportFormat}`);
                toast.success('Exportação concluída!', { id: toastId });

            } else if (exportScope === 'all') {
                const zip = new JSZip();
    
                for (let i = 0; i < posts.length; i++) {
                    const post = posts[i];
                    setExportMessage(`Renderizando post ${i + 1}/${posts.length}...`);
                    toast.loading(`Renderizando post ${i + 1}/${posts.length}...`, { id: toastId });
                    
                    const pngDataUrl = await generateImageInIframe(post, postSize, fontEmbedCss);
                    const base64Data = pngDataUrl.split(',')[1];
                    zip.file(`post_${String(i + 1).padStart(2, '0')}.png`, base64Data, { base64: true });
                }
                
                setExportMessage(`Compactando arquivos...`);
                toast.loading(`Compactando ${posts.length} posts...`, { id: toastId });
                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `${projectName}_all_posts.zip`);
                toast.success('Todos os posts foram exportados!', { id: toastId });
            }
        } catch (error) {
            console.error("Export failed:", error);
            toast.error(error instanceof Error ? error.message : "Ocorreu um erro durante a exportação.", { id: toastId });
        } finally {
            setIsExporting(false);
            setExportMessage('');
            onClose();
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-md p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        <Download className="w-5 h-5 mr-2"/> Exportar Posts
                    </h2>
                    <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">O que exportar?</h3>
                        <div className="grid grid-cols-2 gap-2">
                             <button
                                onClick={() => setExportScope('current')}
                                disabled={!selectedPost}
                                className={`p-3 rounded-md text-left transition-all ${exportScope === 'current' ? 'bg-purple-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700/70 text-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <p className="font-semibold">Post Atual</p>
                                <p className="text-xs opacity-80">Exporta apenas o post que está selecionado no momento.</p>
                            </button>
                             <button
                                onClick={() => setExportScope('all')}
                                disabled={posts.length === 0}
                                className={`p-3 rounded-md text-left transition-all ${exportScope === 'all' ? 'bg-purple-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700/70 text-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <p className="font-semibold">Todos os Posts</p>
                                <p className="text-xs opacity-80">Exporta todos os {posts.length} posts do projeto.</p>
                            </button>
                        </div>
                    </div>

                     <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Formato</h3>
                         <div className="flex bg-zinc-800 p-1 rounded-lg">
                            {exportScope === 'current' ? (
                                <>
                                <button onClick={() => setExportFormat('png')} className={`flex-1 flex items-center justify-center text-center text-sm py-1.5 rounded-md transition-all duration-300 ${exportFormat === 'png' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}><FileImage className="w-4 h-4 mr-2"/> PNG</button>
                                <button onClick={() => setExportFormat('jpeg')} className={`flex-1 flex items-center justify-center text-center text-sm py-1.5 rounded-md transition-all duration-300 ${exportFormat === 'jpeg' ? 'bg-purple-600 text-white shadow' : 'text-gray-300 hover:bg-zinc-700'}`}><FileImage className="w-4 h-4 mr-2"/> JPEG</button>
                                </>
                            ) : (
                                <button onClick={() => setExportFormat('zip')} className={`flex-1 flex items-center justify-center text-center text-sm py-1.5 rounded-md transition-all duration-300 bg-purple-600 text-white shadow`}><Archive className="w-4 h-4 mr-2"/> ZIP</button>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-700">
                        <button 
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-all duration-200 disabled:opacity-50"
                        >
                            {isExporting ? (
                                <>
                                    <RotateCw className="w-5 h-5 mr-2 animate-spin"/>
                                    {exportMessage || 'Exportando...'}
                                </>
                            ) : (
                                 `Exportar como ${exportFormat.toUpperCase()}`
                            )}
                        </button>
                    </div>
                </div>
            </div>
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

export default ExportModal;