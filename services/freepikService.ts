import { PostSize } from '../types';
import { toast } from 'react-hot-toast';

// Chave de API padrão fornecida pelo usuário.
export const DEFAULT_API_KEY = "FPSX79eca67f2b982538ba1d2e970fa24cb0";
const GENERATE_ENDPOINT = 'https://api.freepik.com/v1/ai/text-to-image';
const ME_ENDPOINT = 'https://api.freepik.com/v1/me';

const getApiKey = (userApiKey?: string) => {
    const apiKey = userApiKey || DEFAULT_API_KEY;
    if (!apiKey) {
        throw new Error("Chave de API do Freepik não encontrada. Por favor, adicione sua chave em 'Gerenciar Contas'.");
    }
    return apiKey;
};

export async function verifyApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    try {
        const response = await fetch(ME_ENDPOINT, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'x-freepik-api-key': apiKey,
            },
        });
        return response.ok;
    } catch (error) {
        console.error("Freepik API verification failed:", error);
        toast.error("Falha ao verificar: A API do Freepik não pode ser acessada diretamente do navegador (erro de CORS). É necessário um servidor proxy.", { duration: 8000 });
        return false;
    }
}

const parseFreepikSize = (postSize: PostSize): 'square_1_1' | 'vertical_2_3' | 'vertical_9_16' => {
    const ratio = postSize.width / postSize.height;
    if (ratio === 1) return 'square_1_1'; // Square (1:1)
    if (ratio < 0.6) return 'vertical_9_16'; // Story (9:16)
    return 'vertical_2_3'; // Portrait (4:5) - closest match
};

const callFreepikApi = async (prompt: string, postSize: PostSize, userApiKey?: string) => {
    const apiKey = getApiKey(userApiKey);
    const size = parseFreepikSize(postSize);
    
    try {
        // Step 1: Start generation job
        const startResponse = await fetch(GENERATE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-freepik-api-key': apiKey,
            },
            body: JSON.stringify({
                prompt: prompt,
                num_images: 1,
                image: { size: size },
                styling: { style: "photorealistic" },
            }),
        });

        if (!startResponse.ok) {
            const errorData = await startResponse.json();
            throw new Error(`Erro do Freepik ao iniciar: ${errorData.title || 'Falha na requisição'}`);
        }

        const startResult = await startResponse.json();
        const jobId = startResult.data?.[0]?.id;
        if (!jobId) {
            throw new Error("Não foi possível obter o ID do trabalho do Freepik.");
        }

        // Step 2: Poll for result
        let attempts = 0;
        const maxAttempts = 30; // Poll for max 3 minutes (30 * 6s)
        const pollInterval = 6000; // 6 seconds

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));

            const pollResponse = await fetch(`${GENERATE_ENDPOINT}/${jobId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'x-freepik-api-key': apiKey,
                },
            });

            if (!pollResponse.ok) {
                console.error(`Erro ao consultar o status do trabalho do Freepik: ${pollResponse.statusText}`);
                attempts++;
                continue;
            }

            const pollResult = await pollResponse.json();

            if (pollResult.data?.status === 'completed') {
                const base64 = pollResult.data.images?.[0]?.base64;
                if (base64) {
                    return base64;
                } else {
                    throw new Error("Trabalho do Freepik concluído, mas sem dados de imagem.");
                }
            } else if (pollResult.data?.status === 'in_progress' || pollResult.data?.status === 'pending') {
                attempts++;
            } else {
                throw new Error(`Trabalho do Freepik falhou com o status: ${pollResult.data?.status || 'desconhecido'}`);
            }
        }

        throw new Error("Tempo limite de geração de imagem do Freepik excedido.");

    } catch (error) {
        console.error("Erro na chamada à API do Freepik:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
             throw new Error("A API do Freepik não pode ser chamada do navegador (erro de CORS). É necessário um servidor proxy para esta função.");
        }
        throw error;
    }
};

export async function generateBackgroundImages(prompts: string[], postSize: PostSize, userApiKey?: string): Promise<string[]> {
    const imagePromises = prompts.map(prompt => callFreepikApi(prompt, postSize, userApiKey));
    return Promise.all(imagePromises);
}

export async function generateSingleBackgroundImage(prompt: string, postSize: PostSize, userApiKey?: string): Promise<string> {
    const base64Image = await callFreepikApi(prompt, postSize, userApiKey);
    return `data:image/png;base64,${base64Image}`;
}
