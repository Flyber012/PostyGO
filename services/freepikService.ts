
import { PostSize } from '../types';

// Chave de API padrão fornecida pelo usuário.
const DEFAULT_API_KEY = "FPSX79eca67f2b982538ba1d2e970fa24cb0";
const GENERATE_ENDPOINT = 'https://api.freepik.com/v1/ai/images';

const getApiKey = () => {
    if (!DEFAULT_API_KEY) {
        throw new Error("Chave de API do Freepik não configurada.");
    }
    return DEFAULT_API_KEY;
};

/**
 * Gera uma única imagem usando a API do Freepik.
 * @param apiKey A chave de API do usuário para autenticação.
 * @param prompt O prompt de texto para a geração da imagem.
 * @returns Uma string base64 dos dados da imagem.
 */
async function generateImage(apiKey: string, prompt: string, postSize: PostSize): Promise<string> {
    // A documentação do Freepik não é clara sobre os tamanhos suportados além de 1024x1024.
    // Para garantir a compatibilidade e evitar erros, usaremos "1024x1024".
    // A aplicação usa `object-cover` para a imagem de fundo, que irá preencher o espaço corretamente.
    const size = "1024x1024";

    const response = await fetch(GENERATE_ENDPOINT, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            size: size,
            quantity: 1
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido da API do Freepik' }));
        console.error('Erro da API do Freepik:', errorData);
        throw new Error(`Falha na geração com Freepik: ${errorData.title || response.statusText}`);
    }

    const result = await response.json();
    
    // A estrutura da resposta é { data: [{ base64: "..." }] }
    if (result.data && result.data[0] && result.data[0].base64) {
        return result.data[0].base64;
    } else {
        throw new Error('Formato de resposta inesperado da API do Freepik.');
    }
}

/**
 * Gera várias imagens de fundo em paralelo.
 * @param prompts Um array de prompts de texto.
 * @param postSize O tamanho dos posts a serem gerados.
 * @returns Uma promessa que resolve para um array de strings base64 de imagens.
 */
export async function generateBackgroundImages(prompts: string[], postSize: PostSize): Promise<string[]> {
    const apiKey = getApiKey();
    const imagePromises = prompts.map(prompt => generateImage(apiKey, prompt, postSize));
    return Promise.all(imagePromises);
}

/**
 * Gera uma única imagem de fundo e retorna uma URL de dados completa.
 * @param prompt O prompt de texto.
 * @param postSize O tamanho do post a ser gerado.
 * @returns Uma promessa que resolve para uma URL de dados de imagem completa (ex: 'data:image/png;base64,...').
 */
export async function generateSingleBackgroundImage(prompt: string, postSize: PostSize): Promise<string> {
    const apiKey = getApiKey();
    const base64Data = await generateImage(apiKey, prompt, postSize);
    return `data:image/png;base64,${base64Data}`;
}
