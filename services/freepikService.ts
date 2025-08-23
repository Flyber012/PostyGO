

// Endpoint hipotético para a API de geração de imagens da Freepik AI.
const API_ENDPOINT = 'https://api.freepik.com/v1/ai/images/generate';

/**
 * Gera uma única imagem usando a API do Freepik.
 * @param apiKey A chave de API do usuário para autenticação.
 * @param prompt O prompt de texto para a geração da imagem.
 * @returns Uma string base64 dos dados da imagem.
 */
async function generateImage(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            size: "1024x1024", // Assumindo um tamanho fixo para consistência
            quantity: 1
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido da API do Freepik' }));
        console.error('Erro da API do Freepik:', errorData);
        throw new Error(`Falha na geração com Freepik: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    
    // Assumindo que a estrutura da resposta seja { data: [{ base64: "..." }] }
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
    console.log(`[Serviço Freepik] Iniciando geração real para ${prompts.length} prompts.`);
    
    const imagePromises = prompts.map(prompt => generateImage(apiKey, prompt));
    
    const results = await Promise.all(imagePromises);
    // Retorna um array de strings base64, como esperado pela App.tsx
    return results;
}

/**
 * Gera uma única imagem de fundo e retorna uma URL de dados completa.
 * @param apiKey A chave de API do usuário.
 * @param prompt O prompt de texto.
 * @returns Uma promessa que resolve para uma URL de dados de imagem completa (ex: 'data:image/png;base64,...').
 */
export async function generateSingleBackgroundImage(apiKey: string, prompt: string): Promise<string> {
    console.log(`[Serviço Freepik] Iniciando geração única real para o prompt: ${prompt}`);
    const base64Data = await generateImage(apiKey, prompt);
    // Retorna a URL de dados completa, como esperado pela App.tsx para regeneração
    return `data:image/png;base64,${base64Data}`;
}