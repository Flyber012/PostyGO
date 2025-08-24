const GENERATE_ENDPOINT = 'https://api.freepik.com/v1/ai/images';
const VERIFY_ENDPOINT = 'https://api.freepik.com/v1/ai/styles'; // Usar um endpoint leve e de leitura

/**
 * Verifica se a chave de API do Freepik é válida fazendo uma chamada leve à API.
 * @param apiKey A chave de API a ser verificada.
 * @returns true se a chave for válida, false caso contrário.
 */
export async function verifyApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    try {
        const response = await fetch(VERIFY_ENDPOINT, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
                'Accept': 'application/json'
            },
        });
        // Uma resposta bem-sucedida (2xx) indica uma chave válida.
        return response.ok;
    } catch (error) {
        // Erros de rede (ex: CORS, sem conexão) também resultarão em falha na verificação.
        console.error("Falha na requisição de verificação da chave Freepik:", error);
        return false;
    }
}

/**
 * Gera uma única imagem usando a API do Freepik.
 * @param apiKey A chave de API do usuário para autenticação.
 * @param prompt O prompt de texto para a geração da imagem.
 * @returns Uma string base64 dos dados da imagem.
 */
async function generateImage(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(GENERATE_ENDPOINT, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            size: "1024x1024",
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
 * @param apiKey A chave de API do usuário.
 * @param prompts Um array de prompts de texto.
 * @returns Uma promessa que resolve para um array de strings base64 de imagens.
 */
export async function generateBackgroundImages(apiKey: string, prompts: string[]): Promise<string[]> {
    const imagePromises = prompts.map(prompt => generateImage(apiKey, prompt));
    return Promise.all(imagePromises);
}

/**
 * Gera uma única imagem de fundo e retorna uma URL de dados completa.
 * @param apiKey A chave de API do usuário.
 * @param prompt O prompt de texto.
 * @returns Uma promessa que resolve para uma URL de dados de imagem completa (ex: 'data:image/png;base64,...').
 */
export async function generateSingleBackgroundImage(apiKey: string, prompt: string): Promise<string> {
    const base64Data = await generateImage(apiKey, prompt);
    return `data:image/png;base64,${base64Data}`;
}
