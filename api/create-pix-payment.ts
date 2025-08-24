// Vercel vai tratar este arquivo como uma Serverless Function.
// O nome do arquivo se torna o endpoint da API: /api/create-pix-payment

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas o método POST é permitido' });
    }

    const { items, customer, order_nsu } = req.body;
    if (!items || !customer || !order_nsu) {
        return res.status(400).json({ error: 'Os campos "items", "customer", e "order_nsu" são obrigatórios.' });
    }

    const handle = process.env.INFINITEPAY_HANDLE;
    const clientId = process.env.INFINITEPAY_CLIENT_ID;
    const clientSecret = process.env.INFINITEPAY_CLIENT_SECRET;

    if (!handle || !clientId || !clientSecret) {
        return res.status(500).json({ error: 'As credenciais da InfinitePay não estão configuradas corretamente no servidor.' });
    }

    try {
        // A API de checkout/links não requer autenticação Bearer, apenas o 'handle'.
        // No entanto, manteremos o padrão de autenticação se for necessário para outras APIs.
        // A documentação da API de links de checkout não especifica a necessidade de token.
        
        const checkoutResponse = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                handle: handle,
                redirect_url: `https://posty-go.vercel.app?payment_status=success&order_nsu=${order_nsu}`,
                order_nsu: order_nsu,
                customer: customer,
                items: items,
            })
        });

        if (!checkoutResponse.ok) {
             const errorData = await checkoutResponse.json();
             console.error("Erro ao criar link de checkout na InfinitePay:", errorData);
             const errorMessage = errorData?.errors?.[0]?.message || 'Falha ao criar link de checkout.';
             return res.status(checkoutResponse.status).json({ error: errorMessage });
        }

        const checkoutData = await checkoutResponse.json();

        if (checkoutData && checkoutData.url) {
            res.status(200).json({ url: checkoutData.url });
        } else {
            console.error("Resposta inesperada da InfinitePay ao criar link:", checkoutData);
            res.status(500).json({ error: 'Não foi possível criar o link de pagamento. Resposta inesperada da API.' });
        }

    } catch (error: any) {
        console.error("Erro ao criar link de checkout com InfinitePay:", error);
        res.status(500).json({ error: `Falha ao se comunicar com a InfinitePay: ${error.message}` });
    }
}