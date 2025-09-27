import React from 'react';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

// Este tipo corresponde ao payload que recebemos do Google
export type UserProfile = {
    name?: string;
    email?: string;
    picture?: string;
};

interface AuthProps {
    user: UserProfile | null;
    onLogout: () => void;
    isLoading: boolean;
}

const Auth: React.FC<AuthProps> = ({ user, onLogout, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-24 h-9 px-3 py-1.5 bg-zinc-800 rounded-md">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-400"></div>
            </div>
        );
    }

    if (user) {
        return (
            <div className="flex items-center space-x-2">
                {user.picture && (
                    <img src={user.picture} alt={user.name || 'User'} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                )}
                <button
                    onClick={onLogout}
                    className="flex items-center space-x-2 text-sm font-medium px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md"
                    title="Fazer Logout"
                >
                    <LogOut className="w-4 h-4 text-zinc-300" />
                </button>
            </div>
        );
    }

    return (
        <a
            href="/api/auth/google"
            className="flex items-center space-x-2 text-sm font-medium px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
        >
            <LogIn className="w-4 h-4" />
            <span className="hidden md:inline">Login com Google</span>
        </a>
    );
};

export default Auth;