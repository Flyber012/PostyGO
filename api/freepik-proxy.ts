// Vercel vai tratar este arquivo como uma Serverless Function.
// O nome do arquivo (freepik-proxy) se torna o endpoint da API: /api/freepik-proxy

// Usamos `any` aqui porque os tipos completos da Vercel não estão disponíveis neste ambiente de módulo simples.
// A estrutura é similar a `(req: VercelRequest, res: VercelResponse)`
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Apenas o método POST é permitido' });
        return;
    }

    const { prompt, size } = req.body;
    if (!prompt || !size) {
        res.status(400).json({ error: 'Os campos "prompt" e "size" são obrigatórios.' });
        return;
    }

    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'A chave da API do Freepik não está configurada no servidor.' });
        return;
    }

    const GENERATE_ENDPOINT = 'https://api.freepik.com/v1/ai/text-to-image';

    try {
        // Etapa 1: Iniciar o trabalho de geração
        const startResponse = await fetch(GENERATE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-freepik-api-key': apiKey,
            },
            body: JSON.stringify({
                prompt: prompt,
                negative_prompt: "blurry, ugly, deformed, noisy, text, letters, watermark, low quality",
                num_images: 1,
                image: { size: size },
                styling: { style: "photorealistic" },
            }),
        });

        if (!startResponse.ok) {
            let errorMessage = 'Falha na requisição';
            try {
                const errorData = await startResponse.json();
                // Log do erro completo para depuração no servidor
                console.error("Freepik API Error:", JSON.stringify(errorData, null, 2));
                // Constrói uma mensagem mais útil para o cliente
                errorMessage = errorData.title || 'Erro desconhecido do Freepik';
                if (errorData.detail) {
                    errorMessage += `. Detalhe: ${errorData.detail}`;
                }
            } catch (e) {
                errorMessage = `O serviço do Freepik respondeu com um erro inesperado (Status: ${startResponse.status}).`;
            }
            res.status(startResponse.status).json({ error: errorMessage });
            return;
        }

        const startResult = await startResponse.json();
        const jobId = startResult.data?.[0]?.id;
        if (!jobId) {
            res.status(500).json({ error: "Não foi possível obter o ID do trabalho do Freepik." });
            return;
        }

        // Etapa 2: Consultar o resultado (polling)
        let attempts = 0;
        const maxAttempts = 30; // ~3 minutos de tempo limite
        const pollInterval = 6000; // 6 segundos

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));

            const pollResponse = await fetch(`${GENERATE_ENDPOINT}/${jobId}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json', 'x-freepik-api-key': apiKey },
            });

            if (pollResponse.ok) {
                const pollResult = await pollResponse.json();
                if (pollResult.data?.status === 'completed') {
                    const base64 = pollResult.data.images?.[0]?.base64;
                    if (base64) {
                        res.status(200).json({ base64: base64 });
                        return;
                    }
                } else if (pollResult.data?.status === 'failed') {
                     res.status(500).json({ error: `Trabalho do Freepik falhou.` });
                     return;
                }
            }
            attempts++;
        }
        
        res.status(504).json({ error: "Tempo limite de geração de imagem do Freepik excedido." });

    } catch (error) {
        console.error("Erro no proxy do Freepik:", error);
        res.status(500).json({ error: 'Erro interno no servidor proxy.' });
    }
}