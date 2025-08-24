import React from 'react';
import { BrandKit, User } from '../types';
import { X, Package } from 'lucide-react';
import { BrandKitManagement } from './BrandKitManagement';

interface BrandKitPanelProps {
    isOpen: boolean;
    onClose: () => void;
    // Props needed for BrandKitManagement
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

export const BrandKitPanel: React.FC<BrandKitPanelProps> = (props) => {
    const { isOpen, onClose } = props;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-start lg:hidden" onClick={onClose}>
            <div 
                className="h-full w-screen sm:w-96 bg-zinc-900 transform transition-transform duration-300 ease-in-out animate-slide-in-left"
                onClick={e => e.stopPropagation()}
            >
                 <div className="flex items-center p-4 border-b border-zinc-800">
                    <Package className="text-purple-400 mr-3 h-6 w-6"/>
                    <h1 className="text-xl font-bold text-white">Brand Kits</h1>
                    <button onClick={onClose} className="ml-auto p-2 bg-zinc-800/80 rounded-full text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">
                     <BrandKitManagement {...props} />
                </div>
            </div>
             <style>{`
                @keyframes slide-in-left {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-left {
                    animation: slide-in-left 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};