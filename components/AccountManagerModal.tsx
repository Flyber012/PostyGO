


import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, CheckCircle, Link, XCircle, Key, Eye, EyeOff, RotateCw, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as geminiService from '../services/geminiService';
import * as freepikService from '../services/freepikService';

interface AccountManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onLinkAccount: (service: 'google' | 'freepik' | 'envato' | 'chatgpt', apiKey: string) => void;
    onUnlinkAccount: (service: 'google' | 'freepik' | 'envato' | 'chatgpt') => void;
}

type Service = 'google' | 'freepik' | 'envato' | 'chatgpt';

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
        } else {
            let errorMessage = `Chave de API do ${name} inválida ou expirada. Verifique e tente novamente.`;
            if (service === 'google') {
                errorMessage += ' Se o erro persistir, verifique se o faturamento está ativado em seu projeto do Google Cloud.';
            }
            toast.error(errorMessage);
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
                      {service === 'google' && (
                        <div className="mt-2 p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-xs text-yellow-200 space-y-2">
                             <p className="flex items-start">
                                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 text-yellow-400 shrink-0"/>
                                <span>
                                    <strong>Aviso Importante:</strong> A geração de imagens (API Imagen) requer uma conta do Google Cloud com <strong>faturamento ativado</strong>.
                                </span>
                            </p>
                            <p>
                                O Posty usa a <strong>sua própria chave de API</strong>. Custos de geração de imagem serão cobrados diretamente na sua conta do Google Cloud.
                            </p>
                            <a href="https://console.cloud.google.com/billing" target="_blank" rel="noopener noreferrer" className="font-semibold text-yellow-100 hover:underline">
                                Configurar Faturamento no Google Cloud ↗
                            </a>
                        </div>
                    )}
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

const DisabledServiceRow: React.FC<{ name: string, description: string, icon: React.ReactNode }> = ({ name, description, icon }) => (
    <div className="bg-zinc-800/50 p-4 rounded-lg opacity-50 cursor-not-allowed">
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <div className="w-8 h-8 flex items-center justify-center mr-4">{icon}</div>
                <div>
                    <h3 className="font-semibold text-white flex items-center">
                        {name}
                        <span className="ml-2 text-[10px] bg-yellow-600 text-yellow-200 px-1.5 py-0.5 rounded-full font-bold tracking-wider">EM BREVE</span>
                    </h3>
                    <p className="text-xs text-zinc-400">{description}</p>
                </div>
            </div>
            <button
                disabled
                className="flex items-center bg-zinc-700 text-zinc-400 text-sm font-semibold px-3 py-1.5 rounded-md"
            >
                <Link className="w-4 h-4 mr-2" />
                Conectar
            </button>
        </div>
    </div>
);


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
                    <ServiceRow 
                        service="google"
                        name="Google Gemini"
                        description="Para geração de textos e imagens com IA."
                        icon={<img src="https://www.gstatic.com/images/branding/product/2x/gemini_48dp.png" alt="Google Gemini" className="w-6 h-6"/>}
                        user={user}
                        onLink={onLinkAccount}
                        onUnlink={onUnlinkAccount}
                        getApiKeyUrl="https://aistudio.google.com/app/apikey"
                        verificationFn={geminiService.verifyApiKey}
                    />
                     <ServiceRow 
                        service="freepik"
                        name="Freepik AI"
                        description="Para geração de imagens com a IA do Freepik."
                        icon={<img src="https://freepik.cdnpk.net/img/logo/freepik-gradient_2.svg" alt="Freepik" className="w-7 h-7"/>}
                        user={user}
                        onLink={onLinkAccount}
                        onUnlink={onUnlinkAccount}
                        getApiKeyUrl="https://www.freepik.com/developers/applications"
                        verificationFn={freepikService.verifyApiKey}
                    />
                    <DisabledServiceRow
                        name="ChatGPT"
                        description="Para geração de conteúdo textual avançado."
                        icon={
                            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-white">
                                <path d="M22.2819 9.82132C22.2819 9.44319 22.1069 9.08256 21.8116 8.8253C21.5163 8.56804 21.1287 8.42847 20.7241 8.42847H18.4281C18.0235 8.42847 17.6359 8.56804 17.3406 8.8253C17.0453 9.08256 16.8703 9.44319 16.8703 9.82132V12.1173C16.8703 12.5119 17.0453 12.8725 17.3406 13.1298C17.6359 13.387 18.0235 13.5266 18.4281 13.5266H19.2131V14.4552C19.2131 15.2475 18.9068 15.996 18.3683 16.5345C17.8298 17.073 17.0813 17.3793 16.289 17.3793H15.589C14.9394 17.3793 14.3339 17.5852 13.8828 17.9471C13.4317 18.309 13.1693 18.7979 13.1693 19.3225V20.7241C13.1693 21.1287 13.3089 21.5163 13.5662 21.8116C13.8234 22.1069 14.1841 22.2819 14.5622 22.2819H16.8582C17.2628 22.2819 17.6504 22.1423 17.9457 21.885C18.241 21.6278 18.416 21.2671 18.416 20.889V18.593C18.416 18.1884 18.2764 17.8008 18.0192 17.5435C17.7619 17.2863 17.4012 17.1113 17.0231 17.1113H16.2381V16.1827C16.2381 15.3904 16.5444 14.6419 17.0829 14.1034C17.6214 13.5649 18.3699 13.2586 19.1622 13.2586H19.8622C20.5118 13.2586 21.1173 13.0527 21.5684 12.6908C22.0195 12.3289 22.2819 11.8399 22.2819 11.3154V9.82132ZM9.82132 1.71806C9.44319 1.71806 9.08256 1.89309 8.8253 2.18838C8.56804 2.48366 8.42847 2.87127 8.42847 3.27586V5.57186C8.42847 5.97645 8.56804 6.36406 8.8253 6.62132C9.08256 6.87858 9.44319 7.01814 9.82132 7.01814H12.1173C12.5119 7.01814 12.8725 6.87858 13.1298 6.62132C13.387 6.36406 13.5266 5.97645 13.5266 5.57186V4.17027C13.5266 3.37798 13.2203 2.62947 12.6818 2.09096C12.1433 1.55245 11.3948 1.24612 10.6025 1.24612H9.82132V1.71806ZM7.01814 8.42847C6.63945 8.42847 6.27811 8.56942 6.01831 8.82772C5.75851 9.08602 5.61814 9.44496 5.61814 9.82132V12.1173C5.61814 12.5119 5.75771 12.8725 6.01497 13.1298C6.27223 13.387 6.63286 13.5266 7.011 13.5266H9.30699C9.71158 13.5266 10.1001 13.387 10.3564 13.1298C10.6127 12.8725 10.7523 12.5119 10.7523 12.1173V11.2173C10.7523 10.5677 10.5464 9.96219 10.1845 9.51108C9.82259 9.05996 9.33364 8.79761 8.80914 8.79761H7.28614V8.42847ZM3.27586 8.99132C2.87127 8.99132 2.48366 9.13089 2.18838 9.38815C1.89309 9.64541 1.71806 10.006 1.71806 10.4006V12.6966C1.71806 13.1012 1.85763 13.4888 2.1149 13.7461C2.37216 14.0033 2.73279 14.1429 3.12738 14.1429H5.42338C5.82797 14.1429 6.21558 14.0033 6.47284 13.7461C6.7301 13.4888 6.86967 13.1012 6.86967 12.6966V11.8116C6.86967 11.162 6.66373 10.5565 6.30182 10.1054C5.93992 9.65426 5.45097 9.39191 4.92647 9.39191H3.27586V8.99132Z"/>
                            </svg>
                        }
                    />
                     <DisabledServiceRow
                        name="Envato Elements"
                        description="Acesse sua biblioteca do Envato Elements."
                        icon={<img src="https://assets.stickpng.com/images/62ae36a6a242a9a79764511d.png" alt="Envato" className="w-7 h-7 invert brightness-0"/>}
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