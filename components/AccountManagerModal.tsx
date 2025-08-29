





import React, { useState } from 'react';
import { User } from '../types';
import { X, CheckCircle, Link, XCircle, Key, Eye, EyeOff, RotateCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as freepikService from '../services/freepikService';


interface AccountManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onLinkAccount: (service: 'freepik', apiKey: string) => void;
    onUnlinkAccount: (service: 'freepik') => void;
}

type Service = 'freepik';

interface ServiceRowProps {
    service: Service;
    name: string;
    description: string;
    icon: React.ReactNode;
    user: User | null;
    onLink: (service: Service, apiKey: string) => void;
    onUnlink: (service: Service) => void;
    getApiKeyUrl: string;
    verificationFn: (apiKey: string) => Promise<boolean>;
}

const ServiceRow: React.FC<ServiceRowProps> = ({ service, name, description, icon, user, onLink, onUnlink, getApiKeyUrl, verificationFn }) => {
    const [apiKey, setApiKey] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const isConnected = user?.linkedAccounts?.[service]?.status === 'connected';

    const handleConnect = async () => {
        if (!apiKey.trim()) {
            toast.error('A chave de API não pode estar vazia.');
            return;
        }
        setIsVerifying(true);
        const isValid = await verificationFn(apiKey.trim());
        setIsVerifying(false);

        if (isValid) {
            onLink(service, apiKey.trim());
            setIsEditing(false);
            setApiKey('');
            toast.success(`${name} conectado com sucesso!`);
        } else {
            let errorMessage = `Chave de API do ${name} inválida ou expirada. Verifique e tente novamente.`;
            if (service === 'freepik') { // Custom message for Freepik due to CORS
                 errorMessage = `A chave do ${name} parece válida, mas a verificação falhou. Isso geralmente ocorre devido a restrições de CORS do navegador.`;
            }
            toast.error(errorMessage, { duration: 6000 });
        }
    };

    const handleCancel = () => {
        setApiKey('');
        setIsEditing(false);
    };

    return (
        <div className="bg-zinc-800/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center mr-4">{icon}</div>
                    <div>
                        <h3 className="font-semibold text-white">{name}</h3>
                        <p className="text-xs text-zinc-400">{description}</p>
                    </div>
                </div>
                {!isConnected && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-md transition-colors"
                    >
                        <Link className="w-4 h-4 mr-2" />
                        Conectar
                    </button>
                )}
                {isConnected && (
                     <div className="flex items-center space-x-2">
                         <span className="flex items-center text-green-400 text-sm font-medium">
                            <CheckCircle className="w-4 h-4 mr-2" /> Conectado
                        </span>
                        <button
                            onClick={() => onUnlink(service)}
                            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-semibold px-3 py-1.5 rounded-md transition-colors"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
            {isEditing && (
                <div className="mt-4 space-y-3 p-3 bg-black/20 rounded-md animate-fade-in-fast">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-zinc-300 flex items-center"><Key className="w-4 h-4 mr-2 text-zinc-400" /> Chave de API</label>
                        <a href={getApiKeyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline">
                            Obter Chave de API ↗
                        </a>
                    </div>
                     <div className="relative">
                        <input
                            type={isKeyVisible ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-600 rounded-md pl-3 pr-10 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            placeholder={`Cole sua chave de API do ${name} aqui`}
                            autoFocus
                        />
                         <button onClick={() => setIsKeyVisible(!isKeyVisible)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white">
                            {isKeyVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                     </div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <button onClick={handleCancel} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold rounded-md transition-colors">
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConnect}
                            disabled={isVerifying}
                            className="w-36 flex items-center justify-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md transition-colors disabled:bg-green-800 disabled:cursor-wait"
                        >
                            {isVerifying ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Salvar e Verificar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const AccountManagerModal: React.FC<AccountManagerModalProps> = ({ isOpen, onClose, user, onLinkAccount, onUnlinkAccount }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-2xl p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Gerenciar Contas</h2>
                    <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-zinc-400">Conecte suas próprias chaves de API para obter gerações ilimitadas e usar seus próprios créditos.</p>
                    <ServiceRow 
                        service="freepik"
                        name="Freepik"
                        description="Para geração de imagens (pode falhar no navegador)."
                        icon={<img src="https://freepik.cdnpk.net/img/logo/freepik-company-dark.svg" alt="Freepik" className="w-6 h-auto invert"/>}
                        user={user}
                        onLink={onLinkAccount as any}
                        onUnlink={onUnlinkAccount as any}
                        getApiKeyUrl="https://www.freepik.com/profile/api-keys"
                        verificationFn={freepikService.verifyApiKey}
                    />
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
                @keyframes fade-in-fast {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in-fast {
                    animation: fade-in-fast 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default AccountManagerModal;