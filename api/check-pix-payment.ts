// Vercel vai tratar este arquivo como uma Serverless Function.
// O nome do arquivo se torna o endpoint da API: /api/check-pix-payment

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas o método POST é permitido' });
    }

    const { order_nsu } = req.body;
    if (!order_nsu) {
        return res.status(400).json({ error: 'O "order_nsu" é obrigatório.' });
    }

    const handle = process.env.INFINITEPAY_HANDLE;
    if (!handle) {
        return res.status(500).json({ error: 'A InfiniteTag (handle) não está configurada no servidor.' });
    }

    try {
        const checkResponse = await fetch('https://api.infinitepay.io/invoices/public/checkout/payment_check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                handle: handle,
                order_nsu: order_nsu,
            })
        });
        
        if (!checkResponse.ok) {
            const errorData = await checkResponse.json();
            console.error("Erro ao verificar pagamento na InfinitePay:", errorData);
            throw new Error(errorData.message || `Erro ${checkResponse.status}`);
        }
        
        const checkData = await checkResponse.json();
        
        if (checkData && typeof checkData.paid === 'boolean') {
            res.status(200).json({ paid: checkData.paid });
        } else {
            res.status(500).json({ error: 'Resposta de verificação de pagamento inválida da InfinitePay.' });
        }

    } catch (error: any) {
        console.error("Erro ao verificar status do pagamento com InfinitePay:", error);
        res.status(500).json({ error: `Falha ao se comunicar com a InfinitePay: ${error.message}` });
    }
}