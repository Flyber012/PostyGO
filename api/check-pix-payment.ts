// Vercel vai tratar este arquivo como uma Serverless Function.
// O nome do arquivo se torna o endpoint da API: /api/check-pix-payment
// Este endpoint usa a API de PIX da Efí (antiga Gerencianet).

// Função para obter o token de acesso da Efí
async function getEfiToken(clientId: string, clientSecret: string) {
    const auth = btoa(`${clientId}:${clientSecret}`);
    const tokenUrl = 'https://api-pix.efipay.com.br/oauth/token'; // Endpoint de Produção ATUALIZADO

    const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grant_type: 'client_credentials' })
    });

    if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({'error_description': 'Falha ao obter token.'}));
        console.error("Erro de autenticação com a Efí:", errorData);
        throw new Error(errorData.error_description || 'Falha na autenticação com o provedor de pagamento.');
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
}

async function checkPaymentHandler(req: any, res: any) {
    const { txid } = req.body;
    if (!txid) {
        return res.status(400).json({ error: 'O "txid" da transação é obrigatório.' });
    }

    const clientId = process.env.EFI_CLIENT_ID_P;
    const clientSecret = process.env.EFI_CLIENT_SECRET_P;

    if (!clientId || !clientSecret) {
        console.error("As variáveis de ambiente de produção da Efí (EFI_CLIENT_ID_P, EFI_CLIENT_SECRET_P) não estão configuradas.");
        return res.status(500).json({ error: 'As credenciais de pagamento de produção não estão configuradas corretamente no servidor.' });
    }

    try {
        const accessToken = await getEfiToken(clientId, clientSecret);

        const apiUrl = 'https://api-pix.efipay.com.br'; // Endpoint de Produção ATUALIZADO

        const checkResponse = await fetch(`${apiUrl}/v2/cob/${txid}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!checkResponse.ok) {
            // Se a cobrança não for encontrada (404), não é um erro fatal, apenas não está paga.
            if (checkResponse.status === 404) {
                 return res.status(200).json({ status: 'NAO_ENCONTRADA' });
            }
            const errorData = await checkResponse.json().catch(() => ({ titulo: `Erro ${checkResponse.status} da API de pagamento.`}));
            console.error("Erro ao verificar cobrança na Efí:", errorData);
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
        await checkPaymentHandler(req, res);
    } else {
        res.status(405).json({ error: 'Apenas o método POST é permitido' });
    }
}