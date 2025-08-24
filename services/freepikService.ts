import { PostSize } from '../types';

// O endpoint do nosso proxy Vercel Serverless Function.
const PROXY_ENDPOINT = '/api/freepik-proxy';

// A chave de API padrão é usada se o usuário não fornecer a sua.
// O proxy usará a chave configurada nas variáveis de ambiente da Vercel.
export const DEFAULT_API_KEY = "FPSX79eca67f2b982538ba1d2e970fa24cb0";

// A verificação real da chave agora acontece no lado do servidor.
// Esta função apenas verifica se uma chave foi inserida para fins de UI.
export async function verifyApiKey(apiKey: string): Promise<boolean> {
    // Não podemos verificar diretamente devido ao CORS, mas podemos assumir
    // que se o usuário inseriu uma chave, ele pretende que ela seja válida.
    // A falha real ocorrerá (e será notificada) ao tentar gerar uma imagem.
    return !!apiKey;
}

const parseFreepikSize = (postSize: PostSize): 'square_1_1' | 'vertical_2_3' | 'vertical_9_16' => {
    const ratio = postSize.width / postSize.height;
    if (ratio === 1) return 'square_1_1';
    if (ratio < 0.6) return 'vertical_9_16';
    return 'vertical_2_3';
};

const callFreepikProxy = async (prompt: string, postSize: PostSize, userApiKey?: string) => {
    // O userApiKey é ignorado aqui, pois o proxy usará a chave segura do process.env.FREEPIK_API_KEY.
    // A lógica para o usuário usar sua própria chave é mantida no caso de o padrão falhar.
    const size = parseFreepikSize(postSize);
    
    try {
        const response = await fetch(PROXY_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                size: size,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro do Proxy Freepik: ${errorData.error || 'Falha na requisição'}`);
        }

        const result = await response.json();
        if (result.base64) {
            return result.base64;
        } else {
            throw new Error("Proxy retornou sucesso, mas sem dados de imagem.");
        }

    } catch (error) {
        console.error("Erro ao chamar o proxy do Freepik:", error);
        throw error; // Repassa o erro para ser exibido na UI
    }
};

export async function generateBackgroundImages(prompts: string[], postSize: PostSize, userApiKey?: string): Promise<string[]> {
    const imagePromises = prompts.map(prompt => callFreepikProxy(prompt, postSize, userApiKey));
    return Promise.all(imagePromises);
}

export async function generateSingleBackgroundImage(prompt: string, postSize: PostSize, userApiKey?: string): Promise<string> {
    const base64Image = await callFreepikProxy(prompt, postSize, userApiKey);
    return `data:image/png;base64,${base64Image}`;
}
