import React, { useState, useRef } from 'react';
import { BrandKit, LayoutTemplate, User } from '../types';
import { Save, Download, Upload, Trash2, Plus, Check, LayoutTemplate as LayoutIcon, Copy, AlertCircle, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BrandKitManagementProps {
    user: User | null;
    hasPosts: boolean;
    brandKits: BrandKit[];
    activeBrandKit: BrandKit | undefined;
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

export const BrandKitManagement: React.FC<BrandKitManagementProps> = (props) => {
    const {
        user, hasPosts, brandKits, activeBrandKit, onSaveBrandKit, onAddLayoutToActiveKit,
        onImportBrandKit, onExportBrandKit, onDeleteBrandKit, onApplyBrandKit,
        onAddPostFromLayout, onUpdateLayoutName, onDeleteLayoutFromKit,
        selectedLayoutId, setSelectedLayoutId
    } = props;

    const [newKitName, setNewKitName] = useState('');
    const importKitRef = useRef<HTMLInputElement>(null);
    const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
    const [tempLayoutName, setTempLayoutName] = useState('');

    const handleSaveKitClick = () => {
        if (!user) {
            toast.error("Você precisa estar logado para criar um Brand Kit.");
            return;
        }
        if(newKitName.trim()) {
            onSaveBrandKit(newKitName);
            setNewKitName('');
        }
    };
    
    const handleStartEditingLayout = (layout: LayoutTemplate) => {
        setEditingLayoutId(layout.id);
        setTempLayoutName(layout.name);
    };

    const handleConfirmLayoutEdit = () => {
        if (editingLayoutId && tempLayoutName.trim()) {
            onUpdateLayoutName(editingLayoutId, tempLayoutName);
        } else if (editingLayoutId) {
            toast.error("O nome do layout não pode ser vazio.");
        }
        setEditingLayoutId(null);
        setTempLayoutName('');
    };
    
    const handleCancelLayoutEdit = () => {
        setEditingLayoutId(null);
        setTempLayoutName('');
    };


    return (
        <div className="space-y-4">
             <p className="text-sm text-gray-400 -mt-2">Salve, carregue e aplique identidades visuais completas.</p>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {brandKits.map(kit => {
                    const isActive = activeBrandKit?.id === kit.id;
                    return (
                     <div key={kit.id} className={`bg-black/30 p-3 rounded-lg transition-all ${isActive ? 'ring-2 ring-purple-500' : ''}`}>
                        <p className="font-semibold text-white text-sm">{kit.name}</p>
                        <div className="flex items-center space-x-2 mt-2">
                            <button 
                                onClick={() => onApplyBrandKit(kit.id)} 
                                disabled={isActive}
                                className="flex-1 flex items-center justify-center text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 px-2 rounded-md transition-colors disabled:bg-green-600 disabled:cursor-default"
                            >
                                {isActive ? <><Check className="mr-1.5 h-3 w-3"/> Ativo</> : <><Package className="mr-1.5 h-3 w-3"/> Aplicar</>}
                            </button>
                            <button onClick={() => onExportBrandKit(kit.id)} className="p-2 bg-zinc-600 hover:bg-zinc-500 rounded-md transition-colors" title="Exportar Brand Kit"><Download className="h-3 w-3"/></button>
                            <button onClick={() => onDeleteBrandKit(kit.id)} className="p-2 bg-zinc-600 hover:bg-red-500/50 rounded-md transition-colors" title="Deletar Brand Kit"><Trash2 className="h-3 w-3"/></button>
                        </div>
                    </div>
                    )
                })}
            </div>

            {hasPosts && user && <div>
                <label htmlFor="kit-name" className="block text-sm font-medium text-gray-300 mb-1">Nome do Novo Kit</label>
                <div className="flex space-x-2">
                    <input type="text" id="kit-name" value={newKitName} onChange={e => setNewKitName(e.target.value)} className="flex-grow w-full bg-black/50 border border-zinc-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="ex: 'Minha Marca Incrível'"/>
                </div>
                 <button onClick={handleSaveKitClick} disabled={!newKitName.trim()} className="mt-2 w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:bg-zinc-500">
                    <Save className="mr-2 h-4 w-4"/> Criar Kit do Post Atual
                </button>
            </div>}
             <button onClick={() => importKitRef.current?.click()} className="w-full flex items-center justify-center bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                <Upload className="mr-2 h-4 w-4"/> Importar Kit de Arquivo
            </button>
            <input type="file" ref={importKitRef} onChange={onImportBrandKit} accept=".json" className="hidden" />

            {activeBrandKit && (
                <div className="pt-3 border-t border-zinc-600">
                     <h3 className="text-md font-semibold text-gray-200 pb-2">Layouts do Kit Ativo</h3>
                    {activeBrandKit.layouts.length > 0 ? (
                        <div className="space-y-2">
                            {activeBrandKit.layouts.map(layout => (
                                <div key={layout.id} className={`bg-black/20 p-2 rounded-md flex items-center justify-between transition-all group ${selectedLayoutId === layout.id ? 'ring-2 ring-blue-500' : ''}`}>
                                    <div className="flex items-center flex-grow min-w-0">
                                        <input 
                                            type="radio" 
                                            id={`layout-${layout.id}`} 
                                            name="active-layout" 
                                            value={layout.id} 
                                            checked={selectedLayoutId === layout.id}
                                            onChange={() => setSelectedLayoutId(layout.id)}
                                            className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 mr-3 shrink-0"
                                        />
                                        <LayoutIcon className="w-4 h-4 mr-2 text-purple-400 shrink-0"/>
                                        
                                        {editingLayoutId === layout.id ? (
                                            <input
                                                type="text"
                                                value={tempLayoutName}
                                                onChange={(e) => setTempLayoutName(e.target.value)}
                                                onBlur={handleConfirmLayoutEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                                                    if (e.key === 'Escape') handleCancelLayoutEdit();
                                                }}
                                                autoFocus
                                                className="w-full bg-zinc-700 text-white text-sm rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => handleStartEditingLayout(layout)}
                                                className="text-sm truncate cursor-pointer hover:underline"
                                                title={layout.name}
                                            >
                                                {layout.name}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-1 pl-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                        <button onClick={() => onAddPostFromLayout(layout.id)} className="p-1.5 text-xs text-white rounded-md transition-colors hover:bg-white/20" title="Criar cópia manual deste layout">
                                            <Copy className="w-3 h-3"/>
                                        </button>
                                        <button onClick={() => onDeleteLayoutFromKit(layout.id)} className="p-1.5 text-xs text-red-400 rounded-md transition-colors hover:bg-red-500/50" title="Deletar Layout">
                                            <Trash2 className="w-3 h-3"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="bg-black/20 p-3 rounded-md text-center">
                            <p className="text-xs text-zinc-400">Nenhum layout salvo neste kit.</p>
                        </div>
                    )}
                    {hasPosts && user && (
                        <button onClick={onAddLayoutToActiveKit} className="mt-3 w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                           <Plus className="mr-2 h-4 w-4"/> Adicionar Layout do Post Atual
                        </button>
                    )}
                </div>
            )}
             {!user && (
                <div className="flex items-center justify-center text-center p-2 bg-yellow-900/30 rounded-lg mt-4">
                    <AlertCircle className="w-4 h-4 mr-2 text-yellow-400 shrink-0" />
                    <p className="text-xs text-yellow-300">Faça login para salvar Brand Kits.</p>
                </div>
            )}
        </div>
    );
};