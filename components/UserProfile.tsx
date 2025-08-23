
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { LogIn, LogOut, Settings, ChevronDown, User as UserIcon } from 'lucide-react';

interface UserProfileProps {
    user: User | null;
    onLogin: () => void;
    onLogout: () => void;
    onManageAccounts: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogin, onLogout, onManageAccounts }) => {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) {
        return (
            <button
                onClick={onLogin}
                className="flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                <LogIn className="w-4 h-4 mr-2" />
                Fazer Login com Google
            </button>
        );
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setMenuOpen(!isMenuOpen)}
                className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-700 p-1.5 pr-3 rounded-full transition-colors"
            >
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                <span className="text-sm font-medium text-white">{user.name}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-800 rounded-lg shadow-lg z-20 border border-zinc-700 overflow-hidden animate-fade-in-down">
                    <div className="p-3 border-b border-zinc-700">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                    </div>
                    <div className="p-1">
                        <button
                            onClick={() => { onManageAccounts(); setMenuOpen(false); }}
                            className="w-full text-left flex items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 rounded-md"
                        >
                            <Settings className="w-4 h-4 mr-3 text-zinc-400" />
                            Gerenciar Contas
                        </button>
                        <button
                            onClick={onLogout}
                            className="w-full text-left flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-md"
                        >
                            <LogOut className="w-4 h-4 mr-3" />
                            Sair
                        </button>
                    </div>
                </div>
            )}
             <style>{`
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default UserProfile;
