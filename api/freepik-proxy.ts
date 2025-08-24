// Vercel vai tratar este arquivo como uma Serverless Function.
// O nome do arquivo (freepik-proxy) se torna o endpoint da API: /api/freepik-proxy

async function freepikHandler(req: any, res: any) {
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
                size: size,
                style: "photorealistic",
            }),
        });

        if (!startResponse.ok) {
            let errorMessage = 'Falha na requisição';
            try {
                const errorData = await startResponse.json();
                console.error("Freepik API Error:", JSON.stringify(errorData, null, 2));

                let detailMessage = '';
                if (typeof errorData.detail === 'string') {
                    detailMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    detailMessage = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
                }

                errorMessage = errorData.title || 'Erro desconhecido do Freepik';
                if (detailMessage) {
                    errorMessage += `. Detalhe: ${detailMessage}`;
                }
            } catch (e) {
                 const errorText = await startResponse.text();
                 console.error("Freepik API non-JSON error:", errorText);
                 errorMessage = `O serviço do Freepik respondeu com um erro inesperado (Status: ${startResponse.status}).`;
            }
            res.status(startResponse.status).json({ error: errorMessage });
            return;
        }

        const startResult = await startResponse.json();
        
        // NOVO: Verificar se a imagem foi retornada diretamente (resposta síncrona)
        const directBase64 = startResult.data?.[0]?.base64;
        if (directBase64) {
            res.status(200).json({ base64: directBase64 });
            return;
        }

        // Se não, continuar com a lógica de polling (resposta assíncrona)
        const jobId = startResult.data?.[0]?.id || startResult.data?.id;

        if (!jobId) {
            console.error("Freepik response did not contain a job ID or direct base64. Full response:", JSON.stringify(startResult, null, 2));
            res.status(500).json({ error: `Não foi possível obter o ID do trabalho do Freepik. Resposta completa da API: ${JSON.stringify(startResult)}` });
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

export default async function handler(req: any, res: any) {
    // Set CORS headers for local development
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method === 'POST') {
        await freepikHandler(req, res);
    } else {
        res.status(405).json({ error: 'Apenas o método POST é permitido' });
    }
}
