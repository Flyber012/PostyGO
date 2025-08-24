import React, { useState } from 'react';
import { User } from '../types';
import { X, RotateCw, Sparkles, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface BuyCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

const creditPackages = [
    { credits: 100, price: 1.00, description: "R$ 0,01 por imagem" },
    { credits: 500, price: 4.50, description: "10% de desconto" },
    { credits: 1000, price: 8.00, description: "20% de desconto" },
];

const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({ isOpen, onClose, user }) => {
    const [selectedPackage, setSelectedPackage] = useState(creditPackages[0]);
    const [isLoading, setIsLoading] = useState(false);

    const handlePurchase = async () => {
        if (!user) {
            toast.error("Você precisa estar logado para comprar créditos.");
            return;
        }
        setIsLoading(true);

        const orderId = `posty-${selectedPackage.credits}-${uuidv4()}`;

        try {
            // Salvar informações na sessão para verificação após o redirecionamento
            sessionStorage.setItem('pending_payment_order_id', orderId);
            sessionStorage.setItem('pending_payment_credits', String(selectedPackage.credits));

            const response = await fetch('/api/create-pix-payment', { // O nome do endpoint é o mesmo, mas a lógica mudou
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_nsu: orderId,
                    customer: {
                        name: user.name,
                        email: user.email,
                    },
                    items: [{
                        quantity: 1,
                        price: Math.round(selectedPackage.price * 100), // Preço em centavos
                        description: `${selectedPackage.credits} créditos para Posty`
                    }]
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Falha ao gerar o link de pagamento.");
            }

            const data = await response.json();
            if (data.url) {
                // Redireciona o usuário para a página de checkout da InfinitePay
                window.location.href = data.url;
            } else {
                throw new Error("Link de pagamento não recebido.");
            }

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
            // Limpa a sessão em caso de erro
            sessionStorage.removeItem('pending_payment_order_id');
            sessionStorage.removeItem('pending_payment_credits');
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-sm p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-yellow-400"/> Comprar Créditos
                    </h2>
                    <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <p className="text-sm text-zinc-400">Cada crédito permite gerar uma imagem de fundo com IA. Escolha seu pacote:</p>
                    <div className="space-y-3">
                        {creditPackages.map(pkg => (
                            <button
                                key={pkg.credits}
                                onClick={() => setSelectedPackage(pkg)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${selectedPackage.credits === pkg.credits ? 'border-purple-500 bg-purple-900/20' : 'border-zinc-700 bg-zinc-800/50 hover:border-purple-400'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-white">{pkg.credits} Créditos</p>
                                    <p className="font-bold text-lg text-green-400">R$ {pkg.price.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <p className="text-xs text-zinc-400">{pkg.description}</p>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handlePurchase}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-all duration-200 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <RotateCw className="w-5 h-5 mr-2 animate-spin" />
                                Redirecionando...
                            </>
                        ) : (
                            <>
                                <CreditCard className="w-5 h-5 mr-2" />
                                Pagar R$ {selectedPackage.price.toFixed(2).replace('.', ',')} com InfinitePay
                            </>
                        )}
                    </button>
                </div>
                <p className="text-xs text-zinc-500 text-center mt-3">Você será redirecionado para um ambiente de pagamento seguro.</p>
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

export default BuyCreditsModal;