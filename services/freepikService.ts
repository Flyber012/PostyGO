


const GENERATE_ENDPOINT = 'https://api.freepik.com/v1/ai/images/generate';
// Este é um endpoint hipotético para verificação de chaves, baseado em práticas comuns de API.
// Usamos isso para uma verificação leve sem gastar créditos de geração.
const VERIFY_ENDPOINT = 'https://api.freepik.com/v1/me';

/**
 * Verifica se a chave de API do Freepik é válida fazendo uma chamada leve.
 * @param apiKey A chave de API a ser verificada.
 * @returns true se a chave for válida, false caso contrário.
 */
export async function verifyApiKey(apiKey: string): Promise<boolean> {
    try {
        const response = await fetch(VERIFY_ENDPOINT, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
        });
        // Uma resposta bem-sucedida (2xx) indica uma chave válida.
        // Respostas de erro (4xx, 5xx) indicam uma chave inválida ou problema no servidor.
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