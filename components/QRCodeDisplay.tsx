import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
    url: string;
    color: string;
    backgroundColor: string;
    width: number;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url, color, backgroundColor, width }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        const generateQR = async () => {
            try {
                // Ensure URL is not empty to avoid QR code library errors
                const validUrl = url && url.trim() !== '' ? url : 'https://posty.app';
                const dataUrl = await QRCode.toDataURL(validUrl, {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    width,
                    margin: 1,
                    color: {
                        dark: color || '#000000',
                        light: backgroundColor || '#FFFFFF',
                    },
                });
                setQrCodeUrl(dataUrl);
            } catch (err) {
                console.error('Failed to generate QR code', err);
                setQrCodeUrl(''); // Clear on error to show placeholder
            }
        };
        generateQR();
    }, [url, color, backgroundColor, width]);

    if (!qrCodeUrl) {
        return (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-center p-2">
                <span className="text-xs text-gray-500">Insira uma URL válida para gerar o QR Code.</span>
            </div>
        );
    }
    

    return <img src={qrCodeUrl} alt={`QR code for ${url}`} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />;
};

export default QRCodeDisplay;
