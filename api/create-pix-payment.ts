// Vercel vai tratar este arquivo como uma Serverless Function.
// O nome do arquivo se torna o endpoint da API: /api/create-pix-payment
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

    const { amount, description } = req.body;
    if (!amount || !description) {
        return res.status(400).json({ error: 'Os campos "amount" e "description" são obrigatórios.' });
    }

    const clientId = process.env.EFI_CLIENT_ID;
    const clientSecret = process.env.EFI_CLIENT_SECRET;
    const isSandbox = process.env.EFI_SANDBOX === 'true';

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'As credenciais da Efí não estão configuradas no servidor.' });
    }

    try {
        const accessToken = await getEfiToken(clientId, clientSecret, isSandbox);

        // Gera um txid único com 32 caracteres alfanuméricos
        const txid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10);

        const apiUrl = isSandbox 
            ? 'https://api-pix-h.gerencianet.com.br' 
            : 'https://api-pix.gerencianet.com.br';

        // Etapa 1: Criar a cobrança imediata (cob)
        const cobResponse = await fetch(`${apiUrl}/v2/cob/${txid}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                calendario: { expiracao: 3600 }, // Expira em 1 hora
                valor: { original: amount.toFixed(2) },
                solicitacaoPagador: description,
            })
        });

        if (!cobResponse.ok) {
            const errorData = await cobResponse.json();
            console.error("Erro ao criar cobrança na Efí:", errorData);
            throw new Error(errorData.titulo || 'Falha ao criar a cobrança PIX.');
        }

        const cobData = await cobResponse.json();
        const locId = cobData.loc.id;

        // Etapa 2: Gerar o QR Code para a cobrança criada
        const qrCodeResponse = await fetch(`${apiUrl}/v2/loc/${locId}/qrcode`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!qrCodeResponse.ok) {
            const errorData = await qrCodeResponse.json();
            console.error("Erro ao gerar QR Code na Efí:", errorData);
            throw new Error(errorData.titulo || 'Falha ao gerar o QR Code.');
        }

        const qrCodeData = await qrCodeResponse.json();
        
        res.status(200).json({
            txid: txid,
            qrCodeImage: qrCodeData.imagemQrcode, // base64 da imagem do QR Code
            qrCodeCopyPaste: qrCodeData.qrcode, // string para o "copia e cola"
        });

    } catch (error: any) {
        console.error("Erro no processo de pagamento com a Efí:", error);
        res.status(500).json({ error: error.message || 'Ocorreu um erro interno.' });
    }
}