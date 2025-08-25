import React, { useState, useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { X, Download, FileImage, FileText, Archive, RotateCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Post, PostSize, Project, TextElement } from '../types';
import * as htmlToImage from 'html-to-image';
import saveAs from 'file-saver';
import JSZip from 'jszip';
import StaticPost from './StaticPost';
import { loadGoogleFont } from '../utils/fontManager';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    posts: Post[];
    postSize: PostSize;
    selectedPost: Post | null;
    project: Project | null;
    staticPostRendererRef: React.RefObject<HTMLDivElement>;
}

type ExportScope = 'current' | 'all';
type ExportFormat = 'png' | 'jpeg' | 'zip';

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, posts, postSize, selectedPost, project, staticPostRendererRef }) => {
    const [exportScope, setExportScope] = useState<ExportScope>('current');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
    const [isExporting, setIsExporting] = useState(false);
    const rendererRootRef = useRef<Root | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setIsExporting(false);
            setExportScope('current');
            setExportFormat('png');
            if (rendererRootRef.current) {
                rendererRootRef.current.unmount();
                rendererRootRef.current = null;
            }
            return;
        }
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
    }, [exportScope]);

    const handleExport = async () => {
        if (!staticPostRendererRef.current || !project) return;
    
        setIsExporting(true);
        const rendererContainer = staticPostRendererRef.current;
        const projectName = project.name.replace(/ /g, '_');

        if (!rendererContainer) {
            toast.error("Erro: Não foi possível encontrar o container para exportar.");
            setIsExporting(false);
            return;
        }

        if (!rendererRootRef.current) {
            rendererRootRef.current = createRoot(rendererContainer);
        }
        const root = rendererRootRef.current;
    
        try {
            const postsToExport = exportScope === 'current' && selectedPost ? [selectedPost] : posts;
            const toastId = toast.loading('Carregando fontes para exportação...');

            // 1. Collect all fonts from elements and their rich-text content
            const allFonts = new Set<string>();
            const fontRegex = /font-family:\s*['"]([^'"]+)['"]/g;
            postsToExport.forEach(post => {
                post.elements.forEach(element => {
                    if (element.type === 'text') {
                        const textEl = element as TextElement;
                        allFonts.add(textEl.fontFamily);
                        let match;
                        while ((match = fontRegex.exec(textEl.content)) !== null) {
                            allFonts.add(match[1]);
                        }
                    }
                });
            });

            // 2. Load all collected fonts and wait for them
            try {
                await Promise.all(Array.from(allFonts).map(fontName => loadGoogleFont(fontName)));
            } catch (error) {
                console.error("Font loading failed during export:", error);
                toast.error("Algumas fontes não puderam ser carregadas. A exportação pode não ficar perfeita.", { id: toastId });
            }


            if (exportScope === 'current' && selectedPost) {
                toast.loading(`Exportando post como ${exportFormat.toUpperCase()}...`, { id: toastId });
                
                root.render(<StaticPost post={selectedPost} postSize={postSize} />);
                await new Promise(resolve => setTimeout(resolve, 750)); // Give React and fonts time to render

                const imageTargetNode = rendererContainer.firstChild as HTMLElement;
                if (!imageTargetNode) throw new Error("Componente renderizado não encontrado para exportação.");

                let dataUrl;
                if (exportFormat === 'jpeg') {
                    dataUrl = await htmlToImage.toJpeg(imageTargetNode, { quality: 0.95, pixelRatio: 2 });
                } else {
                    dataUrl = await htmlToImage.toPng(imageTargetNode, { pixelRatio: 2 });
                }
                
                saveAs(dataUrl, `${projectName}_post.${exportFormat}`);
                toast.success('Exportação concluída!', { id: toastId });

            } else if (exportScope === 'all') {
                toast.loading('Preparando para exportar todos os posts...', { id: toastId });
                const zip = new JSZip();
    
                for (let i = 0; i < posts.length; i++) {
                    const post = posts[i];
                    toast.loading(`Processando post ${i + 1} de ${posts.length}...`, { id: toastId });
                    
                    root.render(<StaticPost post={post} postSize={postSize} />);
                    await new Promise(resolve => setTimeout(resolve, 750)); // Allow render time

                    const imageTargetNode = rendererContainer.firstChild as HTMLElement;
                    if (!imageTargetNode) throw new Error(`Componente renderizado não encontrado para o post ${i + 1}.`);

                    const pngDataUrl = await htmlToImage.toPng(imageTargetNode, { pixelRatio: 2 });
                    const base64Data = pngDataUrl.split(',')[1];
                    zip.file(`post_${i + 1}.png`, base64Data, { base64: true });
                }
                
                toast.loading(`Compactando ${posts.length} posts...`, { id: toastId });
                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `${projectName}_all_posts.zip`);
                toast.success('Todos os posts foram exportados!', { id: toastId });
            }
        } catch (error) {
            console.error("Export failed:", error);
            toast.error(error instanceof Error ? error.message : "Ocorreu um erro durante a exportação.");
        } finally {
            if (rendererRootRef.current) {
                rendererRootRef.current.unmount();
                rendererRootRef.current = null;
            }
            setIsExporting(false);
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
                                    Exportando...
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