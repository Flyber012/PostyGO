

import { GoogleGenAI, Type, Part } from "@google/genai";
import { AIGeneratedTextElement, PaletteExtractionResult, AIGeneratedCarouselScriptSlide, TextElement, BrandKit } from '../types';

const getAIClient = (apiKey: string) => {
    // A chave DEVE ser fornecida pelo usuário. Se não, a biblioteca lidará com o erro.
    return new GoogleGenAI({ apiKey });
};

/**
 * Verifica se a chave de API do Google Gemini é válida.
 * @param apiKey A chave de API a ser verificada.
 * @returns true se a chave for válida, false caso contrário.
 */
export async function verifyApiKey(apiKey: string): Promise<boolean> {
    try {
        const ai = getAIClient(apiKey);
        // Faz uma chamada muito leve para verificar se a chave é válida e tem permissões.
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'hi' // Um prompt mínimo para validar a autenticação.
        });
        return true;
    } catch (error) {
        console.error("Falha na verificação da chave de API do Google Gemini:", error);
        return false;
    }
}


export async function analyzeStyleFromImages(apiKey: string, base64Images: string[]): Promise<string> {
    const ai = getAIClient(apiKey);
    const parts: Part[] = [];

    const prompt = `Você é um diretor de arte sênior e especialista em branding. Sua tarefa é analisar as imagens de design fornecidas e criar um "Guia de Estilo" (Style Guide) conciso e acionável em texto. Este guia será usado por outra IA para gerar novos designs que correspondam a este estilo.

    Analise os seguintes aspectos e descreva-os claramente:
    1.  **Vibe e Estética Geral:** Descreva a sensação geral em poucas palavras (ex: "minimalista e profissional", "vibrante e divertido", "tecnológico e futurista", "elegante e orgânico").
    2.  **Paleta de Cores:** Identifique as 2-3 cores primárias, 1-2 cores de destaque/acento e as cores de fundo típicas (claras ou escuras).
    3.  **Tipografia:** Descreva os estilos de fonte. Use termos como "sans-serif moderna e limpa", "serifa clássica e elegante", "fonte de script manuscrita". Mencione o peso (ex: "títulos em negrito", "corpo de texto leve") e o uso de maiúsculas/minúsculas.
    4.  **Composição e Layout:** Descreva as regras de layout. (ex: "muito espaço negativo", "layouts baseados em grade", "composições centradas", "elementos sobrepostos").
    5.  **Elementos Gráficos:** Mencione o uso de ícones, formas (círculos, linhas), gradientes, texturas ou estilos de fotografia.
    
    Seja direto e use linguagem descritiva que uma IA possa entender e seguir facilmente.`;

    parts.push({ text: prompt });

    base64Images.forEach(base64Image => {
        const [header, data] = base64Image.split(',');
        if (!header || !data) return;
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        parts.push({
            inlineData: { mimeType, data }
        });
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts }
    });
    
    return response.text.trim();
}


export async function generateImagePrompts(apiKey: string, topic: string, count: number, referenceImages: string[], styleGuide: string | null): Promise<string[]> {
    const ai = getAIClient(apiKey);
    let prompt: string;
    const parts: Part[] = [];
    const basePrompt = `Gere uma lista de ${count} prompts de imagem únicos e distintos para um gerador de imagens de IA. Cada prompt deve ser para um fundo de postagem de mídia social sobre o tópico "${topic}". Os prompts devem ser detalhados, artísticos e visualmente descritivos (por exemplo, 'Fundo abstrato com gradientes de cores pastel, foco suave, minimalista').`;

    if (styleGuide && referenceImages.length > 0) {
        prompt = `**REGRA CRÍTICA: Use as duas fontes de inspiração a seguir.**
1.  **Guia de Estilo (para a estética geral):** Siga estritamente as regras de vibe, paleta de cores e elementos gráficos do Guia de Estilo para garantir coesão.
2.  **Imagens de Referência (para o tema e composição):** Use as imagens fornecidas como a PRINCIPAL inspiração para o tema, assunto, cores e composição dos novos fundos.

---
**GUIA DE ESTILO:**
${styleGuide}
---
Com base no guia de estilo E inspirado pelas imagens de referência, gere uma lista de ${count} prompts de imagem únicos e coesos sobre "${topic}".`;

        referenceImages.forEach(base64Image => {
            const [header, data] = base64Image.split(',');
            if (!header || !data) return;
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            parts.push({ inlineData: { mimeType, data } });
        });

    } else if (styleGuide) {
        prompt = `**REGRA CRÍTICA: Siga estritamente o Guia de Estilo abaixo.**
---
**GUIA DE ESTILO:**
${styleGuide}
---
Com base no guia de estilo acima, gere uma lista de ${count} prompts de imagem únicos e coesos para um gerador de imagens de IA. Cada prompt deve ser para um fundo de postagem de mídia social sobre o tópico "${topic}".`;

    } else if (referenceImages.length > 0) {
        prompt = `Usando as imagens fornecidas como inspiração estilística e temática, gere uma lista de ${count} prompts de imagem únicos e distintos para um gerador de imagens de IA. Cada prompt deve ser para um fundo de postagem de mídia social sobre o tópico "${topic}" e deve se alinhar ao estilo das imagens de referência.`;
        
        referenceImages.forEach(base64Image => {
            const [header, data] = base64Image.split(',');
            if (!header || !data) return;
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            parts.push({ inlineData: { mimeType, data } });
        });
    } else {
        prompt = basePrompt;
    }

    parts.unshift({ text: prompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });

    try {
        const parsedResponse = JSON.parse(response.text.trim());
        if (Array.isArray(parsedResponse) && parsedResponse.every(p => typeof p === 'string')) {
            return parsedResponse;
        }
        throw new Error("Formato de resposta de prompts inválido da IA.");
    } catch (e) {
        console.error("Falha ao analisar os prompts da IA:", response.text);
        throw new Error("A IA retornou uma resposta inesperada para os prompts. Por favor, tente novamente.");
    }
}


export async function generateLayoutAndContentForImage(apiKey: string, base64Image: string, topic: string, contentLevel: 'mínimo' | 'médio' | 'detalhado', brandKit: BrandKit | null): Promise<AIGeneratedTextElement[]> {
    const ai = getAIClient(apiKey);
    const [header, data] = base64Image.split(',');
    if (!header || !data) throw new Error("Formato de imagem base64 inválido.");
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

    const imagePart = { inlineData: { mimeType, data } };
    
    const contentLevelInstructions = {
        mínimo: 'Gere um texto muito conciso. Uma frase curta ou um título de impacto. O objetivo é ser rápido e direto.',
        médio: 'Gere um texto informativo, mas breve. Um título e um subtítulo ou um pequeno parágrafo são ideais. Equilibre informação com clareza.',
        detalhado: 'Gere um texto mais completo. Pode incluir um título, um subtítulo e um parágrafo mais elaborado ou uma lista de pontos. Forneça mais valor e contexto.'
    };

    let prompt = `Você é um diretor de arte e designer gráfico de IA com um olho impecável para composição e tipografia. Sua missão é criar um layout de texto visualmente deslumbrante e, acima de tudo, legível, para o tópico "${topic}", posicionando-o sobre a imagem de fundo.

    **Nível de Conteúdo Solicitado: ${contentLevel.toUpperCase()}**
    - ${contentLevelInstructions[contentLevel]}

    **Seu Processo Criativo (Regras Inquebráveis):**
    1.  **Conteúdo Criativo com Personalidade:** Primeiro, crie o texto. Seja envolvente, use markdown (\`**destaque**\`) para ênfase e emojis relevantes.
    2.  **ANÁLISE VISUAL CRÍTICA:** Depois de ter o texto, analise a imagem. Identifique as "zonas seguras" com espaço negativo (céu, paredes, áreas desfocadas).
    3.  **NUNCA OBSTRUA O ESSENCIAL:** É PROIBIDO posicionar texto sobre rostos, produtos, ou o ponto focal principal da imagem. A legibilidade e o respeito pela imagem são fundamentais.
    4.  **HIERARQUIA E POSICIONAMENTO:** Decomponha seu texto em elementos lógicos (título, corpo, etc.) e distribua-os harmonicamente nas zonas seguras que você identificou.
    5.  **CONTRASTE É REI:** Analise o tom da imagem (\`backgroundTone\`) *exatamente* onde você vai colocar cada bloco de texto. Use branco ('#FFFFFF') para fundos escuros e um cinza muito escuro/preto ('#0F172A') para fundos claros.
    6.  **DESIGN INTELIGENTE:**
        -   Para textos com markdown, sugira uma \`highlightColor\` vibrante da imagem e uma \`accentFontFamily\` de contraste.
        -   Se criar uma CTA, use o \`fontSize\` 'cta' e sugira uma \`backgroundColor\` sólida da paleta da imagem.
        -   Para CTAs, a altura (\`height\`) DEVE ser justa ao conteúdo para que pareçam botões.`;
    
    if (brandKit) {
        const styleGuide = brandKit.styleGuide || '';
        const fontNames = brandKit.fonts.map(f => f.name).join(', ') || 'Poppins, Inter';
        const palette = brandKit.palette.join(', ') || '#FFFFFF, #0F172A';

        prompt = `**REGRAS DE BRANDING OBRIGATÓRIAS:**
        ---
        - **Guia de Estilo Geral:** ${styleGuide}
        - **Fontes Permitidas:** Você DEVE usar uma das seguintes fontes: ${fontNames}. Defina a fonte principal no campo 'fontFamily'.
        - **Paleta de Cores Obrigatória:** Você DEVE usar cores desta paleta para textos, fundos de botão e destaques: ${palette}. Defina a cor do texto no campo 'color'.
        ---
        Você é um diretor de arte IA que deve aplicar o Brand Kit acima. Sua missão é criar um layout de texto para o tópico "${topic}" sobre a imagem fornecida.

        **Nível de Conteúdo Solicitado: ${contentLevel.toUpperCase()}**
        - ${contentLevelInstructions[contentLevel]}

        **Seu Processo (Seguindo as Regras):**
        1.  **Conteúdo no Tom Certo:** Crie o texto alinhado com o tópico e a "vibe" do Guia de Estilo.
        2.  **Análise e Posicionamento:** Analise a imagem para encontrar "zonas seguras" e posicione os elementos de texto conforme as regras de composição do Guia de Estilo. **NUNCA** coloque texto sobre rostos ou pontos focais.
        3.  **Tipografia e Cores:** Aplique as fontes e cores OBRIGATÓRIAS do Brand Kit.
        4.  **Contraste:** Use branco ('#FFFFFF') para fundos escuros e preto/cinza escuro ('#0F172A') para fundos claros, a menos que a paleta do Brand Kit forneça outras opções.`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        content: { type: Type.STRING, description: "O conteúdo de texto para este elemento, possivelmente incluindo emojis." },
                        x: { type: Type.NUMBER, description: "A posição horizontal (esquerda) da caixa de texto, como uma porcentagem da largura total (0-100)." },
                        y: { type: Type.NUMBER, description: "A posição vertical (topo) da caixa de texto, como uma porcentagem da altura total (0-100)." },
                        width: { type: Type.NUMBER, description: "A largura da caixa de texto, como uma porcentagem da largura total (10-90)." },
                        height: { type: Type.NUMBER, description: "A altura da caixa de texto, como uma porcentagem da altura total. DEVE ser justa ao conteúdo de texto para evitar espaços vazios." },
                        fontSize: { type: Type.STRING, enum: ['large', 'medium', 'small', 'cta'], description: "Categoria de tamanho de fonte sugerida." },
                        fontFamily: { type: Type.STRING, description: "O nome da fonte a ser usada, OBRIGATORIAMENTE uma das fontes permitidas." },
                        color: { type: Type.STRING, description: "A cor do texto em hexadecimal, OBRIGATORIAMENTE uma da paleta permitida." },
                        textAlign: { type: Type.STRING, enum: ['left', 'center', 'right'], description: "Alinhamento do texto." },
                        lineHeight: { type: Type.NUMBER, description: "Altura de linha sugerida para o texto (ex: 1.4)." },
                        rotation: { type: Type.NUMBER, description: "Um leve ângulo de rotação em graus (ex: -2.5) para dinamismo." },
                        backgroundTone: { type: Type.STRING, enum: ['light', 'dark'], description: "O tom da área da imagem atrás do texto." },
                        highlightColor: { type: Type.STRING, description: "Uma cor de destaque vibrante em hexadecimal (ex: '#FF6B6B') da paleta para palavras em markdown." },
                        accentFontFamily: { type: Type.STRING, description: "Uma fonte de exibição/script para palavras em markdown para contraste tipográfico (ex: 'Caveat')." },
                        backgroundColor: { type: Type.STRING, description: "Uma cor de fundo sólida em hexadecimal da paleta para CTAs." },
                    },
                    required: ["content", "x", "y", "width", "height", "fontSize", "textAlign", "backgroundTone", "fontFamily", "color"],
                }
            }
        }
    });

    try {
        const result = JSON.parse(response.text.trim());
        if (Array.isArray(result)) {
            return result as AIGeneratedTextElement[];
        }
        throw new Error("Formato de layout inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar o layout da IA:", response.text);
        throw new Error("Não foi possível gerar um layout para a imagem.");
    }
}

export async function generateCarouselScript(apiKey: string, topic: string, slideCount: number, contentLevel: 'mínimo' | 'médio' | 'detalhado', styleGuide: string | null): Promise<AIGeneratedCarouselScriptSlide[]> {
    const ai = getAIClient(apiKey);
    const contentLevelInstructions = {
        mínimo: 'Seja muito sucinto em cada slide. Use frases curtas e palavras de impacto. Ideal para mensagens rápidas.',
        médio: 'Forneça uma quantidade equilibrada de informação em cada slide. Um título e uma breve explicação ou 1-2 pontos principais.',
        detalhado: 'Elabore mais em cada slide de conteúdo. Use parágrafos curtos, listas de pontos mais completas. Entregue o máximo de valor possível em cada slide.'
    };

    let prompt = `Você é um criador de conteúdo viral e copywriter especialista em mídias sociais, com um tom humano, envolvente e levemente informal. Sua missão é criar o roteiro para um carrossel do Instagram de ${slideCount} slides sobre o tópico "${topic}".

    **Nível de Detalhe do Conteúdo: ${contentLevel.toUpperCase()}**
    - ${contentLevelInstructions[contentLevel]}

    **Diretrizes de Conteúdo e Tom:**
    - **Narrativa Coesa:** Crie uma história ou um guia que flua logicamente de um slide para o outro. Comece com um gancho forte, desenvolva o meio e termine com uma conclusão e CTA claros.
    - **Tom Humano:** Escreva como se estivesse conversando com um amigo. Use perguntas para engajar o leitor, use emojis relevantes de forma moderada, e mantenha as frases curtas e impactantes. Evite a todo custo um tom robótico ou corporativo.
    - **Estrutura Clássica de Carrossel:**
      1. **Capa (Slide 1):** Título magnético que gera curiosidade ou promete uma solução.
      2. **Introdução (Slide 2):** Apresente o problema ou o tema e prometa o que o leitor vai aprender. Inclua uma chamada para deslizar (ex: "Arrasta pro lado ➡️").
      3. **Conteúdo (Slides 3 a ${slideCount - 1}):** Entregue o valor principal. Divida a informação em dicas, passos ou pontos-chave, um por slide.
      4. **Conclusão/CTA (Slide ${slideCount}):** Resuma a ideia principal e diga ao leitor o que fazer a seguir (curtir, comentar, salvar, seguir).

    **Diretrizes de Imagem:**
    - Para cada slide, crie um prompt de imagem detalhado e artístico para um gerador de IA.
    - **COESÃO VISUAL É CRÍTICA:** Todos os prompts de imagem devem compartilhar um estilo consistente (ex: 'fotografia cinematográfica com tons quentes', 'ilustração 3D vibrante e minimalista', 'fundo abstrato com gradiente suave'). A paleta de cores deve ser harmoniosa em todos os slides.

    Retorne um array JSON de objetos, onde cada objeto representa um slide e contém 'slideContent' (o texto completo para aquele slide) e 'imagePrompt'.`;

     if (styleGuide) {
        prompt = `**REGRA CRÍTICA: Siga estritamente o Guia de Estilo abaixo para TODAS as decisões de conteúdo e imagem.**
        ---
        **GUIA DE ESTILO:**
        ${styleGuide}
        ---
        Você é um criador de conteúdo que deve internalizar o Guia de Estilo acima. Sua missão é criar um roteiro para um carrossel do Instagram de ${slideCount} slides sobre o tópico "${topic}" que pareça ter sido criado pela mesma marca/pessoa.

        **Nível de Detalhe do Conteúdo: ${contentLevel.toUpperCase()}**
        - ${contentLevelInstructions[contentLevel]}

        **Diretrizes de Conteúdo e Tom:**
        - **Tom de Voz:** Adapte seu texto para corresponder à "vibe" descrita no Guia de Estilo.
        - **Estrutura:** Mantenha a estrutura clássica de carrossel (Capa, Intro, Conteúdo, CTA).

        **Diretrizes de Imagem:**
        - Crie um prompt de imagem para cada slide.
        - **COESÃO VISUAL INQUEBRÁVEL:** Todos os prompts de imagem DEVEM seguir rigorosamente as diretrizes de paleta de cores, tipografia, composição e elementos gráficos do Guia de Estilo. Eles precisam parecer um conjunto coeso.`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                description: "Um array de objetos, onde cada objeto representa um slide do carrossel.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        slideContent: {
                            type: Type.STRING,
                            description: "O conteúdo de texto completo para este slide, escrito de forma envolvente e humana."
                        },
                        imagePrompt: {
                            type: Type.STRING,
                            description: "Um prompt de imagem detalhado e artisticamente consistente para este slide."
                        }
                    },
                    required: ["slideContent", "imagePrompt"]
                }
            }
        }
    });

    try {
        const result = JSON.parse(response.text.trim());
        if (Array.isArray(result) && result.length > 0) {
            return result as AIGeneratedCarouselScriptSlide[];
        }
        throw new Error("Formato de roteiro de carrossel inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar o roteiro do carrossel da IA:", response.text);
        throw new Error("Não foi possível gerar um roteiro para o carrossel.");
    }
}

export async function generateLayoutForProvidedText(apiKey: string, base64Image: string, textContent: string, topic: string, brandKit: BrandKit | null): Promise<AIGeneratedTextElement[]> {
    const ai = getAIClient(apiKey);
    const [header, data] = base64Image.split(',');
    if (!header || !data) throw new Error("Formato de imagem base64 inválido.");
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

    const imagePart = { inlineData: { mimeType, data } };
    
    let prompt = `Você é um diretor de arte e designer gráfico de IA com um olho impecável para composição e tipografia. Sua missão é criar um layout de texto visualmente deslumbrante e, acima de tudo, legível, para o conteúdo de texto fornecido, posicionando-o sobre a imagem de fundo.
    O tópico geral é "${topic}". O texto exato para este slide é:\n"""\n${textContent}\n"""

    **Seu Processo Criativo (Regras Inquebráveis):**
    1.  **ANÁLISE VISUAL PRIMEIRO:** Sua tarefa mais CRÍTICA é analisar a imagem. Identifique as "zonas seguras" com espaço negativo (céu, paredes, áreas desfocadas, etc.). Encontre os melhores locais para o texto que não competem com os elementos principais da imagem.
    2.  **HIERARQUIA É TUDO:** Decomponha o \`textContent\` em elementos lógicos (ex: título, subtítulo, corpo do texto, chamada para ação). Use \`fontSize\` ('large', 'medium', 'small', 'cta') para criar uma hierarquia visual clara. O elemento mais importante deve se destacar.
    3.  **NUNCA OBSTRUA O ESSENCIAL:** É PROIBIDO posicionar texto sobre rostos, produtos, ou o ponto focal principal da imagem. A legibilidade e o respeito pela imagem são fundamentais.
    4.  **CONTRASTE É REI:** Analise o tom da imagem (\`backgroundTone\`) *exatamente* onde você vai colocar cada bloco de texto. Use branco ('#FFFFFF') para fundos escuros e um cinza muito escuro/preto ('#0F172A') para fundos claros.
    5.  **DESIGN INTELIGENTE:**
        -   Use markdown (\`**destaque**\`) no texto para enfatizar palavras-chave. Para essas palavras, sugira uma \`highlightColor\` vibrante extraída da paleta da imagem e uma \`accentFontFamily\` de contraste.
        -   Se houver uma chamada para ação (CTA), atribua o \`fontSize\` 'cta' e sugira uma \`backgroundColor\` sólida e contrastante, também extraída da imagem, para que pareça um botão clicável.
        -   Para CTAs, a altura (\`height\`) DEVE ser justa ao conteúdo. Não adicione preenchimento vertical na altura; a aplicação cuidará do preenchimento.
        -   Adicione uma leve \`rotation\` (-3 a 3 graus) a um ou dois elementos para um toque dinâmico, mas mantenha o texto principal reto (0 graus) para facilitar a leitura.`;

    if (brandKit) {
        const styleGuide = brandKit.styleGuide || '';
        const fontNames = brandKit.fonts.map(f => f.name).join(', ') || 'Poppins, Inter';
        const palette = brandKit.palette.join(', ') || '#FFFFFF, #0F172A';
        prompt = `**REGRAS DE BRANDING OBRIGATÓRIAS:**
        ---
        - **Guia de Estilo Geral:** ${styleGuide}
        - **Fontes Permitidas:** Você DEVE usar uma das seguintes fontes: ${fontNames}. Defina a fonte principal no campo 'fontFamily'.
        - **Paleta de Cores Obrigatória:** Você DEVE usar cores desta paleta para textos, fundos de botão e destaques: ${palette}. Defina a cor do texto no campo 'color'.
        ---
        Você é um diretor de arte IA que deve aplicar o Brand Kit acima. Sua missão é criar um layout para o texto fornecido abaixo, posicionando-o sobre a imagem.
        O texto para este slide é:\n"""\n${textContent}\n"""

        **Seu Processo (Seguindo as Regras):**
        1.  **Análise e Posicionamento:** Analise a imagem para encontrar "zonas seguras" e posicione os elementos de texto conforme as regras de composição do Guia de Estilo. **NUNCA** coloque texto sobre rostos ou pontos focais.
        2.  **Hierarquia e Decomposição:** Decomponha o texto em elementos lógicos (título, corpo, etc.) e aplique a hierarquia visual do Guia de Estilo.
        3.  **Tipografia e Cores:** Aplique as fontes e cores OBRIGATÓRIAS do Brand Kit.
        4.  **Contraste:** Use branco ('#FFFFFF') para fundos escuros e preto/cinza escuro ('#0F172A') para fundos claros, a menos que a paleta do Brand Kit forneça outras opções.`;
    }
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        content: { type: Type.STRING, description: "O conteúdo de texto para este elemento, possivelmente incluindo emojis." },
                        x: { type: Type.NUMBER, description: "A posição horizontal (esquerda) da caixa de texto, como uma porcentagem da largura total (0-100)." },
                        y: { type: Type.NUMBER, description: "A posição vertical (topo) da caixa de texto, como uma porcentagem da altura total (0-100)." },
                        width: { type: Type.NUMBER, description: "A largura da caixa de texto, como uma porcentagem da largura total (10-90)." },
                        height: { type: Type.NUMBER, description: "A altura da caixa de texto, como uma porcentagem da altura total. DEVE ser justa ao conteúdo de texto para evitar espaços vazios." },
                        fontSize: { type: Type.STRING, enum: ['large', 'medium', 'small', 'cta'], description: "Categoria de tamanho de fonte sugerida." },
                        fontFamily: { type: Type.STRING, description: "O nome da fonte a ser usada, OBRIGATORIAMENTE uma das fontes permitidas." },
                        color: { type: Type.STRING, description: "A cor do texto em hexadecimal, OBRIGATORIAMENTE uma da paleta permitida." },
                        textAlign: { type: Type.STRING, enum: ['left', 'center', 'right'], description: "Alinhamento do texto." },
                        lineHeight: { type: Type.NUMBER, description: "Altura de linha sugerida para o texto (ex: 1.4)." },
                        rotation: { type: Type.NUMBER, description: "Um leve ângulo de rotação em graus (ex: -2.5) para dinamismo." },
                        backgroundTone: { type: Type.STRING, enum: ['light', 'dark'], description: "O tom da área da imagem atrás do texto." },
                        highlightColor: { type: Type.STRING, description: "Uma cor de destaque vibrante em hexadecimal (ex: '#FF6B6B') da paleta para palavras em markdown." },
                        accentFontFamily: { type: Type.STRING, description: "Uma fonte de exibição/script para palavras em markdown para contraste tipográfico (ex: 'Caveat')." },
                        backgroundColor: { type: Type.STRING, description: "Uma cor de fundo sólida em hexadecimal da paleta para CTAs." },
                    },
                    required: ["content", "x", "y", "width", "height", "fontSize", "textAlign", "backgroundTone", "fontFamily", "color"],
                }
            }
        }
    });

    try {
        const result = JSON.parse(response.text.trim());
        if (Array.isArray(result)) {
            return result as AIGeneratedTextElement[];
        }
        throw new Error("Formato de layout inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar o layout da IA:", response.text);
        throw new Error("Não foi possível gerar um layout para o texto e imagem fornecidos.");
    }
}

export async function generateTextForLayout(
    apiKey: string,
    textElements: {id: string, description: string, exampleContent: string}[], 
    topic: string, 
    contentLevel: 'mínimo' | 'médio' | 'detalhado', 
    styleGuide: string | null
): Promise<Record<string, string>> {
    const ai = getAIClient(apiKey);
    
    const contentLevelInstructions = {
        mínimo: 'Gere um texto muito conciso. Uma frase curta ou um título de impacto.',
        médio: 'Gere um texto informativo, mas breve. Um título e um subtítulo ou um pequeno parágrafo são ideais.',
        detalhado: 'Gere um texto mais completo. Pode incluir um título, um subtítulo e um parágrafo mais elaborado.'
    };

    const contextString = textElements.map(el => 
        `- Elemento ID "${el.id}":\n  - Propósito: ${el.description}\n  - Exemplo de conteúdo: "${el.exampleContent}"`
    ).join('\n');

    let prompt = `Você é um copywriter de IA. Sua ÚNICA tarefa é gerar conteúdo de texto para preencher um layout pré-existente sobre o tópico "${topic}".
    
    **Nível de Conteúdo Solicitado: ${contentLevel.toUpperCase()}**
    - ${contentLevelInstructions[contentLevel]}

    **Estrutura do Layout e Contexto:**
    ${contextString}

    **Instruções:**
    1.  Crie um conteúdo novo e relevante sobre o tópico para cada um dos elementos de texto listados.
    2.  Use o "Propósito" para entender o que escrever (ex: 'título principal' deve ser curto e impactante; 'corpo de texto' deve ser mais detalhado).
    3.  O "Exemplo de conteúdo" é apenas para referência de estilo e tamanho. NÃO o copie.
    4.  Seja criativo e mantenha o tom apropriado para mídias sociais.
    5.  Sua resposta DEVE SER um único objeto JSON, onde as chaves são os 'id's dos elementos de texto e os valores são as novas strings de conteúdo que você criou.`;

    if (styleGuide) {
        prompt = `**REGRA CRÍTICA: Siga estritamente o Guia de Estilo abaixo para definir o TOM e a VIBE do texto.**
        ---
        **GUIA DE ESTILO:**
        ${styleGuide}
        ---
        Você é um copywriter de IA que deve seguir o guia de estilo acima. Sua ÚNICA tarefa é gerar conteúdo de texto para preencher um layout pré-existente sobre o tópico "${topic}".
        
        **Nível de Conteúdo Solicitado: ${contentLevel.toUpperCase()}**
        - ${contentLevelInstructions[contentLevel]}

        **Estrutura do Layout e Contexto:**
        ${contextString}

        **Instruções:**
        1.  Crie um conteúdo novo sobre o tópico para cada elemento, garantindo que o tom do texto esteja alinhado com a "Vibe e Estética Geral" do Guia de Estilo.
        2.  Use o "Propósito" de cada elemento para guiar o conteúdo.
        3.  Sua resposta DEVE SER um único objeto JSON, onde as chaves são os 'id's dos elementos e os valores são as novas strings de conteúdo.`;
    }
    
    const schemaProperties: Record<string, { type: Type; description: string }> = {};
    const requiredProperties: string[] = [];

    textElements.forEach(el => {
        const descriptionContent = el.exampleContent.length > 50 ? `${el.exampleContent.substring(0, 47)}...` : el.exampleContent;
        schemaProperties[el.id] = {
            type: Type.STRING,
            description: `Novo conteúdo para o elemento de texto ('${el.description}') que originalmente continha: "${descriptionContent}"`
        };
        requiredProperties.push(el.id);
    });

     const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: schemaProperties,
                required: requiredProperties,
            }
        }
    });
    
    try {
        const result = JSON.parse(response.text.trim());
        if (typeof result === 'object' && result !== null) {
            return result as Record<string, string>;
        }
        throw new Error("Formato de conteúdo de texto inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar o conteúdo de texto da IA:", response.text);
        throw new Error("Não foi possível gerar conteúdo de texto para o layout.");
    }
}


export async function generateBackgroundImages(apiKey: string, prompts: string[]): Promise<string[]> {
    const ai = getAIClient(apiKey);
    const imagePromises = prompts.map(prompt => 
        ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '1:1', // Nota: A API gerará 1:1, nós o ajustaremos no CSS.
            },
        })
    );

    const responses = await Promise.all(imagePromises);
    return responses.map(res => res.generatedImages[0].image.imageBytes);
}

export async function generateSingleBackgroundImage(apiKey: string, prompt: string): Promise<string> {
    const ai = getAIClient(apiKey);
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '1:1',
        },
    });
    return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
}

export async function extractPaletteFromImage(apiKey: string, base64Image: string): Promise<PaletteExtractionResult> {
    const ai = getAIClient(apiKey);
    const [header, data] = base64Image.split(',');
    if (!header || !data) throw new Error("Formato de imagem base64 inválido.");
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

    const imagePart = { inlineData: { mimeType, data } };
    const prompt = "A partir da imagem fornecida, extraia uma paleta de cores harmoniosa de 2 a 4 cores adequadas para um design de postagem de mídia social (por exemplo, para texto, destaques). A primeira cor deve ser a mais vibrante para destaques. Além disso, analise se a imagem é predominantemente 'clara' ou 'escura' para garantir o contraste do texto.";

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    palette: {
                        type: Type.ARRAY,
                        description: "Uma matriz de 2 a 4 strings de cores hexadecimais.",
                        items: { type: Type.STRING }
                    },
                    imageTone: {
                        type: Type.STRING,
                        description: "O tom geral da imagem, ou 'light' ou 'dark'.",
                        enum: ['light', 'dark']
                    }
                },
                required: ["palette", "imageTone"]
            }
        }
    });

    try {
        const result = JSON.parse(response.text.trim());
        if (result.palette && Array.isArray(result.palette) && result.palette.length > 0 && result.imageTone) {
            return result as PaletteExtractionResult;
        }
        throw new Error("Formato de paleta inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar a paleta da IA:", response.text);
        throw new Error("Não foi possível extrair uma paleta de cores da imagem.");
    }
}