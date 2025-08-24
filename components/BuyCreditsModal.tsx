import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, RotateCw, Sparkles, Copy as CopyIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BuyCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onPurchaseSuccess: (credits: number) => void;
}

const creditPackages = [
    { credits: 100, price: 1.00, description: "R$ 0,01 por imagem" },
    { credits: 500, price: 4.50, description: "10% de desconto" },
    { credits: 1000, price: 8.00, description: "20% de desconto" },
];

enum PaymentStep {
    SELECT_PACKAGE,
    AWAITING_PAYMENT,
    PAYMENT_SUCCESS
}

const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({ isOpen, onClose, user, onPurchaseSuccess }) => {
    const [step, setStep] = useState<PaymentStep>(PaymentStep.SELECT_PACKAGE);
    const [selectedPackage, setSelectedPackage] = useState(creditPackages[0]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [paymentData, setPaymentData] = useState<{
        txid: string;
        qrCodeImage: string;
        qrCodeCopyPaste: string;
    } | null>(null);

    // Reset state when modal is closed
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => { // Delay reset to allow closing animation
                setStep(PaymentStep.SELECT_PACKAGE);
                setIsLoading(false);
                setPaymentData(null);
            }, 300);
        }
    }, [isOpen]);

    // Polling effect to check for payment status
    useEffect(() => {
        if (step !== PaymentStep.AWAITING_PAYMENT || !paymentData?.txid) {
            return;
        }

        const intervalId = setInterval(async () => {
            try {
                const response = await fetch('/api/check-pix-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txid: paymentData.txid }),
                });
                const data = await response.json();
                
                if (data.status === 'CONCLUIDA') {
                    clearInterval(intervalId);
                    onPurchaseSuccess(selectedPackage.credits);
                    setStep(PaymentStep.PAYMENT_SUCCESS);
                    toast.success(`${selectedPackage.credits} créditos adicionados com sucesso!`);
                    setTimeout(onClose, 2000); // Close modal after showing success
                }
            } catch (error) {
                console.error("Polling error:", error);
                // Don't stop polling for network errors, it might recover
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(intervalId); // Cleanup on unmount or step change

    }, [step, paymentData, onPurchaseSuccess, selectedPackage.credits, onClose]);


    const handlePurchase = async () => {
        if (!user) {
            toast.error("Você precisa estar logado para comprar créditos.");
            return;
        }
        setIsLoading(true);

        try {
            const response = await fetch('/api/create-pix-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: selectedPackage.price,
                    description: `${selectedPackage.credits} créditos para Posty`,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Falha ao gerar o PIX.");
            }

            const data = await response.json();
            setPaymentData(data);
            setStep(PaymentStep.AWAITING_PAYMENT);

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        if (paymentData?.qrCodeCopyPaste) {
            navigator.clipboard.writeText(paymentData.qrCodeCopyPaste);
            toast.success("Código PIX copiado!");
        }
    };
    
    if (!isOpen) return null;

    const renderContent = () => {
        switch (step) {
            case PaymentStep.AWAITING_PAYMENT:
                return (
                     <div className="text-center">
                        <h3 className="text-lg font-semibold text-white mb-2">Pague para continuar</h3>
                        <p className="text-sm text-zinc-400 mb-4">Escaneie o QR Code abaixo com o app do seu banco.</p>
                        {paymentData?.qrCodeImage && (
                            <img src={paymentData.qrCodeImage} alt="PIX QR Code" className="mx-auto rounded-lg border-4 border-white" />
                        )}
                        <p className="text-xs text-zinc-500 mt-4">Aguardando pagamento...</p>

                        <div className="mt-4">
                            <button onClick={handleCopy} className="w-full flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 px-4 rounded-md transition-all duration-200">
                                <CopyIcon className="w-4 h-4 mr-2" />
                                Copiar Código PIX
                            </button>
                        </div>
                         <button onClick={() => setStep(PaymentStep.SELECT_PACKAGE)} className="text-zinc-400 hover:text-white text-sm mt-4">
                            Voltar
                        </button>
                    </div>
                );
            case PaymentStep.PAYMENT_SUCCESS:
                 return (
                    <div className="text-center py-8">
                        <svg className="mx-auto h-16 w-16 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-xl font-semibold text-white mt-4">Pagamento Aprovado!</h3>
                        <p className="text-zinc-300 mt-1">{selectedPackage.credits} créditos foram adicionados à sua conta.</p>
                    </div>
                 );
            case PaymentStep.SELECT_PACKAGE:
            default:
                return (
                     <>
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
                                        Gerando PIX...
                                    </>
                                ) : (
                                    <>
                                        Pagar R$ {selectedPackage.price.toFixed(2).replace('.', ',')} com PIX
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                );
        }
    }


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
                {renderContent()}
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