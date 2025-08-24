import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, File, Save, FolderOpen, Download, HardDriveDownload } from 'lucide-react';

interface HeaderProps {
    onNewProject: () => void;
    onSaveProject: () => void;
    onSaveAsProject: () => void;
    onOpenProject: () => void;
    hasProject: boolean;
}

const Header: React.FC<HeaderProps> = (props) => {
    const { onNewProject, onSaveProject, onSaveAsProject, onOpenProject, hasProject } = props;
    const [isProjectMenuOpen, setProjectMenuOpen] = useState(false);
    const projectMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
                setProjectMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menuButtonClasses = "w-full text-left flex items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <header className="header bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
                <div className="flex items-center">
                    <Sparkles className="text-purple-400 mr-2 h-6 w-6"/>
                    <h1 className="text-xl font-bold text-white">Posty</h1>
                </div>

                <div className="relative" ref={projectMenuRef}>
                    <button onClick={() => setProjectMenuOpen(!isProjectMenuOpen)} className="flex items-center space-x-2 text-sm font-medium px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md">
                        <span className="hidden sm:inline">Projeto</span>
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    {isProjectMenuOpen && (
                        <div className="absolute left-0 mt-2 w-56 bg-zinc-800 rounded-lg shadow-lg z-20 border border-zinc-700 p-1">
                             <button onClick={() => { onNewProject(); setProjectMenuOpen(false); }} className={menuButtonClasses}>
                                <File className="w-4 h-4 mr-3" /> Novo Projeto
                            </button>
                             <button onClick={() => { onOpenProject(); setProjectMenuOpen(false); }} className={menuButtonClasses}>
                                <FolderOpen className="w-4 h-4 mr-3" /> Abrir...
                            </button>
                            <div className="my-1 h-px bg-zinc-700"></div>
                             <button onClick={() => { onSaveProject(); setProjectMenuOpen(false); }} disabled={!hasProject} className={menuButtonClasses}>
                                <Save className="w-4 h-4 mr-3" /> Salvar
                            </button>
                            <button onClick={() => { onSaveAsProject(); setProjectMenuOpen(false); }} disabled={!hasProject} className={menuButtonClasses}>
                                <HardDriveDownload className="w-4 h-4 mr-3" /> Salvar Como... (.posty)
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
                 <button onClick={() => { /* Implement export logic */ }} disabled={!hasProject} className="flex items-center space-x-2 text-sm font-medium px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download className="w-4 h-4"/>
                    <span className="hidden md:inline">Exportar Posts</span>
                </button>
            </div>
        </header>
    );
};

export default Header;