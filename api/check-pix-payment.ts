// Vercel vai tratar este arquivo como uma Serverless Function.
// O nome do arquivo se torna o endpoint da API: /api/check-pix-payment
// Este endpoint usa a API de PIX da Efí (antiga Gerencianet).

// Função para obter o token de acesso da Efí
async function getEfiToken(clientId: string, clientSecret: string, isSandbox: boolean) {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenUrl = isSandbox 
        ? 'https://api-pix-h.gerencianet.com.br/oauth/token' 
        : 'https://api-pix.gerencianet.com.br/oauth/token';

    const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grant_type: 'client_credentials' })
    });

    if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("Erro de autenticação com a Efí:", errorData);
        throw new Error('Falha na autenticação com o provedor de pagamento.');
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas o método POST é permitido' });
    }

    const { txid } = req.body;
    if (!txid) {
        return res.status(400).json({ error: 'O "txid" da transação é obrigatório.' });
    }

    const clientId = process.env.EFI_CLIENT_ID;
    const clientSecret = process.env.EFI_CLIENT_SECRET;
    const isSandbox = process.env.EFI_SANDBOX === 'true';

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'As credenciais da Efí não estão configuradas no servidor.' });
    }

    try {
        const accessToken = await getEfiToken(clientId, clientSecret, isSandbox);

        const apiUrl = isSandbox 
            ? 'https://api-pix-h.gerencianet.com.br' 
            : 'https://api-pix.gerencianet.com.br';

        const checkResponse = await fetch(`${apiUrl}/v2/cob/${txid}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!checkResponse.ok) {
            const errorData = await checkResponse.json();
            console.error("Erro ao verificar cobrança na Efí:", errorData);
            // Se a cobrança não for encontrada (404), não é um erro fatal, apenas não está paga.
            if (checkResponse.status === 404) {
                 return res.status(200).json({ status: 'NAO_ENCONTRADA' });
            }
            throw new Error(errorData.titulo || 'Falha ao verificar o status do pagamento.');
        }
        
        const checkData = await checkResponse.json();
        
        // Retorna o status da cobrança (ex: ATIVA, CONCLUIDA, REMOVIDA_PELO_USUARIO_RECEBEDOR)
        res.status(200).json({ status: checkData.status });

    } catch (error: any) {
        console.error("Erro ao verificar status do pagamento com a Efí:", error);
        res.status(500).json({ error: error.message || 'Ocorreu um erro interno.' });
    }
}