




import { GoogleGenAI, Type, Part } from "@google/genai";
import { AIGeneratedTextElement, PaletteExtractionResult, AIGeneratedCarouselScriptSlide, TextElement, BrandKit, PostSize, TextStyle } from '../types';

// Conforme solicitado, esta chave será usada como padrão.
// A geração de imagens pode falhar se não estiver vinculada a uma conta com faturamento.
const DEFAULT_API_KEY = "AIzaSyCfPECJaa9lVtmn-fXUDPTGncJYAkvkrYQ";

const getAIClient = (userApiKey?: string) => {
    const apiKey = userApiKey || DEFAULT_API_KEY;
    if (!apiKey) {
        throw new Error("Chave de API do Google Gemini não encontrada. Por favor, adicione sua chave em 'Gerenciar Contas' para usar esta funcionalidade.");
    }
    return new GoogleGenAI({ apiKey });
};

export async function verifyApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    const ai = new GoogleGenAI({ apiKey });
    try {
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'hi',
            config: {
                maxOutputTokens: 1, 
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        return true;
    } catch (error) {
        console.error("Gemini API key verification failed:", error);
        return false;
    }
}

const getAspectRatio = (postSize: PostSize): '1:1' | '4:3' | '3:4' | '16:9' | '9:16' => {
    const ratio = postSize.width / postSize.height;
    if (ratio === 1) return '1:1';
    if (ratio > 1.7) return '16:9'; 
    if (ratio > 1.3) return '4:3';
    if (ratio < 0.6) return '9:16';
    if (ratio < 0.85) return '3:4';
    return '1:1';
}

export async function generateBackgroundImages(prompts: string[], postSize: PostSize, userApiKey?: string): Promise<string[]> {
    const ai = getAIClient(userApiKey);
    const aspectRatio = getAspectRatio(postSize);

    const imagePromises = prompts.map(prompt => {
        return ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio,
            },
        });
    });

    const responses = await Promise.all(imagePromises);

    const base64Images = responses.map(response => {
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error('Falha ao gerar imagem com a API Gemini.');
    });

    return base64Images;
}

async function generateEnhancedImagePrompt(basePrompt: string, inspirationImages: string[], userApiKey?: string): Promise<string> {
    const ai = getAIClient(userApiKey);
    const parts: Part[] = [];

    const systemPrompt = `Você é um diretor de arte especialista em engenharia de prompt para IA generativa de imagens. Sua tarefa é analisar as imagens de inspiração fornecidas para entender seu estilo, cor, composição e "vibe" geral. Em seguida, você deve criar um prompt novo, detalhado e artístico para o tópico "${basePrompt}", incorporando o estilo analizado. O prompt resultante deve ser rico em detalhes visuais e pronto para ser usado por um modelo de texto para imagem como Imagen.`;
    parts.push({ text: systemPrompt });

    inspirationImages.forEach(base64Image => {
        const [header, data] = base64Image.split(',');
        if (!header || !data) return;
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        parts.push({ inlineData: { mimeType, data } });
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts }
    });
    
    return response.text.trim();
}

export async function generateSingleBackgroundImage(prompt: string, postSize: PostSize, userApiKey?: string, inspirationImages?: string[]): Promise<string> {
    const ai = getAIClient(userApiKey);
    const aspectRatio = getAspectRatio(postSize);

    let finalPrompt = prompt;
    if (inspirationImages && inspirationImages.length > 0) {
        finalPrompt = await generateEnhancedImagePrompt(prompt, inspirationImages, userApiKey);
    }

    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: finalPrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    }
    throw new Error('Falha ao gerar imagem com a API Gemini.');
}


export async function analyzeStyleFromImages(base64Images: string[], userApiKey?: string): Promise<string> {
    const ai = getAIClient(userApiKey);
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

export async function generateImagePrompts(topic: string, count: number, styleGuide: string | null, inspirationImages: string[] = [], userApiKey?: string): Promise<string[]> {
    const ai = getAIClient(userApiKey);
    const parts: Part[] = [];
    
    let prompt = `Você é um diretor de arte criativo. Sua tarefa é gerar ${count} prompts de imagem distintos, visualmente interessantes e artísticos para um gerador de imagens de IA, todos baseados no tópico principal: "${topic}".

    **Instruções:**
    1.  **Composição Limpa:** A composição deve ser limpa, minimalista e esteticamente agradável. O objetivo é criar um fundo que complemente o texto, não que compita com ele.
    2.  **Espaço Negativo CRÍTICO:** A imagem DEVE incluir uma quantidade significativa de espaço negativo (como uma parede lisa, céu claro, fundo desfocado ou superfície texturizada simples). Este espaço é onde o texto será colocado, por isso não deve conter elementos que distraiam.
    3.  **Evitar Desordem:** Evite cenas excessivamente cheias ou ocupadas.
    4.  **Diversidade Temática:** Cada prompt deve explorar um ângulo ou subtema diferente relacionado ao tópico principal. Evite repetições.
    5.  **Riqueza Visual:** Descreva a cena, os objetos, as cores, a iluminação e a composição. Use adjetivos evocativos.`;

    if (inspirationImages.length > 0) {
         prompt += `\n\n**DIRETRIZES DE ESTILO VISUAL OBRIGATÓRIAS (das imagens de inspiração):**\nAnalise o estilo, as cores e a "vibe" das imagens fornecidas. Todos os prompts que você criar DEVEM seguir esta estética visual de perto.`;
    } else if (styleGuide) {
        prompt += `\n\n**DIRETRIZES DE ESTILO OBRIGATÓRIAS (do Brand Kit):**\n${styleGuide}\n\nAdapte o estilo dos prompts (ex: 'fotografia cinematográfica', 'ilustração 3D minimalista', 'arte abstrata com gradientes') para corresponder a essas diretrizes.`;
    } else {
        prompt += `\n\n**Estilo Padrão:** Vise um estilo de fotografia limpo, moderno e profissional com iluminação suave e natural.`;
    }

    prompt += `\n\nRetorne um array JSON contendo exatamente ${count} strings, onde cada string é um prompt de imagem completo.`;
    parts.push({ text: prompt });

    inspirationImages.forEach(base64Image => {
        const [header, data] = base64Image.split(',');
        if (!header || !data) return;
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        parts.push({ inlineData: { mimeType, data } });
    });


    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                    description: "Um prompt de imagem detalhado e artístico."
                }
            }
        }
    });

    try {
        const result = JSON.parse(response.text.trim());
        if (Array.isArray(result) && result.length > 0) {
            return result as string[];
        }
        throw new Error("Formato de prompts de imagem inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar os prompts de imagem da IA:", response.text);
        throw new Error("Não foi possível gerar prompts de imagem.");
    }
}


export async function generateLayoutAndContentForImage(background: string, topic: string, contentLevel: 'mínimo' | 'médio' | 'detalhado', brandKit: BrandKit | null, userApiKey?: string, textStyle: TextStyle = 'padrão'): Promise<AIGeneratedTextElement[]> {
    const ai = getAIClient(userApiKey);
    const parts: Part[] = [];

    const isBase64Image = background.startsWith('data:image');
    
    if (isBase64Image) {
        const [header, data] = background.split(',');
        if (!header || !data) throw new Error("Formato de imagem base64 inválido.");
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        parts.push({ inlineData: { mimeType, data } });
    }
    
    const contentLevelInstructions = {
        mínimo: 'Gere um texto muito conciso. Uma frase curta ou um título de impacto. O objetivo é ser rápido e direto.',
        médio: 'Gere um texto informativo, mas breve. Um título e um subtítulo ou um pequeno parágrafo são ideais. Equilibre informação com clareza.',
        detalhado: 'Gere um texto mais completo. Pode incluir um título, um subtítulo e um parágrafo mais elaborado ou uma lista de pontos. Forneça mais valor e contexto.'
    };

    const textStyleInstructions = {
        padrão: 'Mantenha um tom de voz neutro e informativo, adequado para um público geral.',
        profissional: 'Adote um tom de voz profissional, corporativo e direto. Use uma linguagem formal e evite gírias ou excesso de emojis.',
        amigável: 'Escreva como se estivesse conversando com um amigo. Use uma linguagem informal e acolhedora, faça perguntas e use emojis relevantes de forma moderada.',
        inspirador: 'Use um tom de voz motivacional e edificante. Inspire o leitor com mensagens positivas e encorajadoras.',
        divertido: 'Adote um tom bem-humorado, espirituoso e descontraído. O objetivo é entreter e engajar através da diversão.'
    };

    let prompt = `Você é um diretor de arte e designer gráfico de IA com um olho impecável para composição e tipografia. Sua missão é criar um layout de texto visualmente deslumbrante e, acima de tudo, legível, para o tópico "${topic}", posicionando-o sobre o fundo fornecido.`;
    
    if (!isBase64Image) {
         prompt += ` O fundo é uma cor sólida: ${background}.`;
    }

    prompt += `
    **Nível de Conteúdo Solicitado: ${contentLevel.toUpperCase()}**
    - ${contentLevelInstructions[contentLevel]}

    **Estilo do Texto Solicitado: ${textStyle.toUpperCase()}**
    - ${textStyleInstructions[textStyle]}

    **REGRAS INQUEBRÁVEIS de Design e Composição:**
    1.  **Conteúdo Criativo:** Primeiro, crie o texto. Seja envolvente, use markdown (\`**destaque**\`) para ênfase e emojis relevantes. Use 'Poppins' como a fontFamily padrão.
    2.  **ANÁLISE VISUAL CRÍTICA:** Analise o fundo para identificar "zonas seguras" com espaço negativo (céu, paredes, áreas desfocadas). É PROIBIDO posicionar texto sobre rostos, produtos ou o ponto focal principal. A legibilidade e o respeito pela imagem são fundamentais.
    3.  **HIERARQUIA E POSICIONAMENTO:** Decomponha o texto em elementos lógicos (título, corpo, etc.) e distribua-os harmonicamente. O título (use fontSize: 'large') deve ser o mais proeminente. A descrição (use fontSize: 'medium') deve ser secundária. Texto de rodapé (use fontSize: 'small') deve ser discreto.
    4.  **MARGENS DE SEGURANÇA:** Todos os elementos de texto DEVEM estar contidos dentro de uma área segura. As coordenadas 'x' e 'y' mais a 'width'/'height' não devem exceder 95% e devem ser maiores que 5%. Exemplo: um elemento em x=90 só pode ter uma largura máxima de 5. Isso evita que o texto seja cortado nas bordas.
    5.  **CONTRASTE É REI:** Analise o tom do fundo (\`backgroundTone\`) *exatamente* onde você vai colocar cada bloco de texto. Use branco ('#FFFFFF') para fundos escuros e um cinza muito escuro/preto ('#0F172A') para fundos claros.
    6.  **ALTURA DA LINHA PADRÃO:** OBRIGATORIAMENTE use um \`lineHeight\` de \`1\`.
    7.  **DESIGN INTELIGENTE:**
        -   Para CTAs, use o \`fontSize\` 'cta' e sugira uma \`backgroundColor\` sólida e contrastante. A altura (\`height\`) DEVE ser justa ao conteúdo.`;
    
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
        Você é um diretor de arte IA que deve aplicar o Brand Kit acima. Sua missão é criar um layout de texto para o tópico "${topic}" sobre o fundo fornecido.`;
        
        if (!isBase64Image) {
            prompt += ` O fundo é uma cor sólida: ${background}.`;
        }

        prompt += `
        **Nível de Conteúdo Solicitado: ${contentLevel.toUpperCase()}**
        - ${contentLevelInstructions[contentLevel]}

        **Estilo do Texto Solicitado: ${textStyle.toUpperCase()}**
        - ${textStyleInstructions[textStyle]}

        **Seu Processo (Seguindo as Regras):**
        1.  **Conteúdo no Tom Certo:** Crie o texto alinhado com o tópico e a "vibe" do Guia de Estilo.
        2.  **Análise e Posicionamento:** Analise o fundo para encontrar "zonas seguras". Posicione os elementos de texto seguindo o Guia de Estilo e criando uma hierarquia visual clara. **NUNCA** coloque texto sobre rostos ou pontos focais.
        3.  **MARGENS DE SEGURANÇA:** Todos os elementos de texto DEVEM estar contidos dentro de uma área segura entre 5% e 95% da tela para evitar cortes.
        4.  **Tipografia e Cores:** Aplique as fontes e cores OBRIGATÓRIAS do Brand Kit.
        5.  **Contraste:** Use branco ('#FFFFFF') para fundos escuros e preto/cinza escuro ('#0F172A') para fundos claros, a menos que a paleta do Brand Kit forneça outras opções.
        6.  **ALTURA DA LINHA PADRÃO:** OBRIGATORIAMENTE use um \`lineHeight\` de \`1\`.`;
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        content: { type: Type.STRING, description: "O conteúdo de texto para este elemento, possivelmente incluindo emojis." },
                        x: { type: Type.NUMBER, description: "A posição horizontal (esquerda) da caixa de texto, como uma porcentagem da largura total (5-95)." },
                        y: { type: Type.NUMBER, description: "A posição vertical (topo) da caixa de texto, como uma porcentagem da altura total (5-95)." },
                        width: { type: Type.NUMBER, description: "A largura da caixa de texto, como uma porcentagem da largura total (10-90)." },
                        height: { type: Type.NUMBER, description: "A altura da caixa de texto, como uma porcentagem da altura total. DEVE ser justa ao conteúdo de texto para evitar espaços vazios." },
                        fontSize: { type: Type.STRING, enum: ['large', 'medium', 'small', 'cta'], description: "Categoria de tamanho de fonte sugerida." },
                        fontFamily: { type: Type.STRING, description: "O nome da fonte a ser usada, OBRIGATORIAMENTE uma das fontes permitidas." },
                        color: { type: Type.STRING, description: "A cor do texto em hexadecimal, OBRIGATORIAMENTE uma da paleta permitida." },
                        textAlign: { type: Type.STRING, enum: ['left', 'center', 'right'], description: "Alinhamento do texto." },
                        lineHeight: { type: Type.NUMBER, description: "Altura de linha sugerida para o texto (OBRIGATORIAMENTE 1)." },
                        backgroundTone: { type: Type.STRING, enum: ['light', 'dark'], description: "O tom da área da imagem atrás do texto." },
                        highlightColor: { type: Type.STRING, description: "Uma cor de destaque vibrante em hexadecimal (ex: '#FF6B6B') da paleta para palavras em markdown." },
                        accentFontFamily: { type: Type.STRING, description: "Uma fonte de exibição/script para palavras em markdown para contraste tipográfico (ex: 'Caveat')." },
                        backgroundColor: { type: Type.STRING, description: "Uma cor de fundo sólida em hexadecimal da paleta para CTAs." },
                    },
                    required: ["content", "x", "y", "width", "height", "fontSize", "textAlign", "backgroundTone", "fontFamily", "color", "lineHeight"],
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

export async function generateCarouselScript(topic: string, slideCount: number, contentLevel: 'mínimo' | 'médio' | 'detalhado', styleGuide: string | null, userApiKey?: string): Promise<AIGeneratedCarouselScriptSlide[]> {
    const ai = getAIClient(userApiKey);
    const contentLevelInstructions = {
        mínimo: 'Seja muito sucinto. Frases curtas, palavras de impacto. Ideal para mensagens rápidas.',
        médio: 'Equilibre informação e brevidade. Um título e uma breve explicação ou 1-2 pontos principais por slide.',
        detalhado: 'Elabore mais. Use parágrafos curtos ou listas mais completas. Entregue o máximo de valor em cada slide.'
    };

    let prompt = `Você é um copywriter de elite e estrategista de conteúdo para mídias sociais, mestre em criar carrosséis virais. Sua missão é criar o roteiro COMPLETO para um carrossel do Instagram de ${slideCount} slides sobre o tópico "${topic}".

    **Nível de Detalhe do Conteúdo: ${contentLevel.toUpperCase()}**
    - ${contentLevelInstructions[contentLevel]}

    **ESTRUTURA NARRATIVA OBRIGATÓRIA (SEGUIR À RISCA):**

    *   **Slide 1: A Capa de Impacto**
        *   **Conteúdo:** Crie um título principal (um "gancho") que seja extremamente curioso, prometa um grande benefício ou apresente um problema chocante. Adicione um subtítulo curto de apoio. O objetivo é PARAR a rolagem.
        *   **Exemplo:** Título: "Você está cometendo estes 5 erros de produtividade?". Subtítulo: "O #3 vai te surpreender."

    *   **Slide 2: A Ponte (Opcional, se > 3 slides)**
        *   **Conteúdo:** Se houver mais de 3 slides, use este para contextualizar o problema ou a promessa da capa. Crie uma conexão e termine com uma chamada CLARA para a ação de deslizar. Ex: "Descubra como virar o jogo... ➡️"

    *   **Slides de Conteúdo (do 2 ou 3 até o penúltimo):**
        *   **Conteúdo:** Entregue o valor prometido. Divida a informação em dicas, passos ou pontos-chave. **UM PONTO PRINCIPAL POR SLIDE.** Mantenha o texto conciso e fácil de ler. Use **negrito** para destacar termos importantes. Termine o texto de cada slide com uma frase que crie uma ponte para o próximo, como "Mas isso não é tudo...", "A seguir, o mais importante...", etc.

    *   **ÚLTIMO Slide: A Chamada Para Ação (CTA)**
        *   **Conteúdo:** Faça um resumo de uma frase da solução ou do benefício principal. Em seguida, adicione uma CTA clara e direta para engajamento.
        *   **Exemplo de CTA:** "Gostou? Salve este post para não esquecer e comente qual dica você vai usar hoje! 👇"

    **REGRAS INQUEBRÁVEIS:**
    1.  **A ESTRUTURA ACIMA É LEI:** Você DEVE seguir a sequência e o propósito de cada tipo de slide.
    2.  **CTA APENAS NO FINAL:** A chamada para ação principal (curtir, comentar, salvar) é PERMITIDA **EXCLUSIVAMENTE** no último slide.
    3.  **CONECTIVIDADE:** O texto deve fluir de um slide para o outro, criando uma narrativa que prenda o leitor.

    **Diretrizes de Imagem:**
    - Para cada slide, crie um prompt de imagem detalhado e artístico.
    - **COESÃO VISUAL:** Todos os prompts de imagem devem compartilhar um estilo e paleta de cores consistentes.
    - **PROMPT PARA O SLIDE FINAL (CTA):** OBRIGATORIAMENTE, crie um prompt para uma imagem de fundo mais simples, minimalista e com bastante espaço negativo (ex: "fundo de gradiente suave em tons pastel, com uma textura sutil, muito espaço livre na parte inferior"). Isso é crucial para que o usuário possa adicionar seu logotipo.

    Retorne um array JSON de objetos, onde cada objeto representa um slide e contém 'slideContent' e 'imagePrompt'.`;

     if (styleGuide) {
        prompt = `**REGRA CRÍTICA: Siga estritamente o Guia de Estilo abaixo para TODAS as decisões de conteúdo e imagem.**
        ---
        **GUIA DE ESTILO:**
        ${styleGuide}
        ---
        Você é um criador de conteúdo de marca que deve seguir o guia de estilo acima. Sua missão é criar um roteiro para um carrossel do Instagram de ${slideCount} slides sobre o tópico "${topic}" que seja perfeitamente alinhado à marca.
        
        **A ESTRUTURA NARRATIVA ABAIXO É OBRIGATÓRIA:**
        
        *   **Slide 1: A Capa de Impacto:** Crie um título "gancho" alinhado com o tom da marca.
        *   **Slides de Conteúdo (até o penúltimo):** Entregue o valor principal. Cada slide deve ser um passo lógico na narrativa e terminar incentivando o deslize.
        *   **ÚLTIMO Slide: A Chamada Para Ação (CTA):** Resuma a mensagem e adicione uma CTA que corresponda à voz da marca.

        **REGRAS INQUEBRÁVEIS:**
        1.  **A ESTRUTURA ACIMA É LEI.**
        2.  **CTA APENAS NO FINAL.**
        3.  **PROMPT DE IMAGEM PARA O SLIDE FINAL (CTA):** OBRIGATORIAMENTE, crie um prompt para uma imagem de fundo limpa, alinhada à marca, e com muito espaço negativo para um logotipo.
        
        O tom, o conteúdo e os prompts de imagem devem seguir o Guia de Estilo.`;
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
                            description: "O conteúdo de texto completo para este slide, seguindo a estrutura narrativa e o tom definidos."
                        },
                        imagePrompt: {
                            type: Type.STRING,
                            description: "Um prompt de imagem detalhado e artisticamente consistente para este slide, alinhado ao estilo geral."
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

export async function generateLayoutForProvidedText(base64Image: string, textContent: string, topic: string, brandKit: BrandKit | null, userApiKey?: string): Promise<AIGeneratedTextElement[]> {
    const ai = getAIClient(userApiKey);
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
    4.  **MARGENS DE SEGURANÇA:** Todos os elementos de texto DEVEM estar contidos dentro de uma área segura entre 5% e 95% da tela para evitar cortes.
    5.  **CONTRASTE É REI:** Analise o tom da imagem (\`backgroundTone\`) *exatamente* onde você vai colocar cada bloco de texto. Use branco ('#FFFFFF') para fundos escuros e um cinza muito escuro/preto ('#0F172A') para fundos claros.
    6.  **DESIGN INTELIGENTE:**
        -   Use markdown (\`**destaque**\`) no texto para enfatizar palavras-chave.
        -   Se houver uma chamada para ação (CTA), atribua o \`fontSize\` 'cta' e sugira uma \`backgroundColor\` sólida e contrastante. Para CTAs, a altura (\`height\`) DEVE ser justa ao conteúdo.
        -   OBRIGATORIAMENTE use um \`lineHeight\` de \`1\`.`;

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
        2.  **MARGENS DE SEGURANÇA:** Todos os elementos de texto DEVEM estar contidos dentro de uma área segura entre 5% e 95% da tela para evitar cortes.
        3.  **Hierarquia e Decomposição:** Decomponha o texto em elementos lógicos (título, corpo, etc.) e aplique a hierarquia visual do Guia de Estilo.
        4.  **Tipografia e Cores:** Aplique as fontes e cores OBRIGATÓRIAS do Brand Kit.
        5.  **Contraste:** Use branco ('#FFFFFF') para fundos escuros e preto/cinza escuro ('#0F172A') para fundos claros, a menos que a paleta do Brand Kit forneça outras opções.
        6.  **ALTURA DA LINHA PADRÃO:** OBRIGATORIAMENTE use um \`lineHeight\` de \`1\`.`;
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
                        x: { type: Type.NUMBER, description: "A posição horizontal (esquerda) da caixa de texto, como uma porcentagem da largura total (5-95)." },
                        y: { type: Type.NUMBER, description: "A posição vertical (topo) da caixa de texto, como uma porcentagem da altura total (5-95)." },
                        width: { type: Type.NUMBER, description: "A largura da caixa de texto, como uma porcentagem da largura total (10-90)." },
                        height: { type: Type.NUMBER, description: "A altura da caixa de texto, como uma porcentagem da altura total. DEVE ser justa ao conteúdo de texto para evitar espaços vazios." },
                        fontSize: { type: Type.STRING, enum: ['large', 'medium', 'small', 'cta'], description: "Categoria de tamanho de fonte sugerida." },
                        fontFamily: { type: Type.STRING, description: "O nome da fonte a ser usada, OBRIGATORIAMENTE uma das fontes permitidas." },
                        color: { type: Type.STRING, description: "A cor do texto em hexadecimal, OBRIGATORIAMENTE uma da paleta permitida." },
                        textAlign: { type: Type.STRING, enum: ['left', 'center', 'right'], description: "Alinhamento do texto." },
                        lineHeight: { type: Type.NUMBER, description: "Altura de linha sugerida para o texto (OBRIGATORIAMENTE 1)." },
                        backgroundTone: { type: Type.STRING, enum: ['light', 'dark'], description: "O tom da área da imagem atrás do texto." },
                        highlightColor: { type: Type.STRING, description: "Uma cor de destaque vibrante em hexadecimal (ex: '#FF6B6B') da paleta para palavras em markdown." },
                        accentFontFamily: { type: Type.STRING, description: "Uma fonte de exibição/script para palavras em markdown para contraste tipográfico (ex: 'Caveat')." },
                        backgroundColor: { type: Type.STRING, description: "Uma cor de fundo sólida em hexadecimal da paleta para CTAs." },
                    },
                    required: ["content", "x", "y", "width", "height", "fontSize", "textAlign", "backgroundTone", "fontFamily", "color", "lineHeight"],
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
    textElements: {id: string, description: string, exampleContent: string}[], 
    topic: string, 
    contentLevel: 'mínimo' | 'médio' | 'detalhado', 
    styleGuide: string | null,
    userApiKey?: string,
    textStyle: TextStyle = 'padrão'
): Promise<Record<string, string>> {
    const ai = getAIClient(userApiKey);
    
    const contentLevelInstructions = {
        mínimo: 'Gere um texto muito conciso. Uma frase curta ou um título de impacto.',
        médio: 'Gere um texto informativo, mas breve. Um título e um subtítulo ou um pequeno parágrafo são ideais.',
        detalhado: 'Gere um texto mais completo. Pode incluir um título, um subtítulo e um parágrafo mais elaborado.'
    };

    const textStyleInstructions = {
        padrão: 'Mantenha um tom de voz neutro e informativo, adequado para um público geral.',
        profissional: 'Adote um tom de voz profissional, corporativo e direto. Use uma linguagem formal e evite gírias ou excesso de emojis.',
        amigável: 'Escreva como se estivesse conversando com um amigo. Use uma linguagem informal e acolhedora, faça perguntas e use emojis relevantes de forma moderada.',
        inspirador: 'Use um tom de voz motivacional e edificante. Inspire o leitor com mensagens positivas e encorajadoras.',
        divertido: 'Adote um tom bem-humorado, espirituoso e descontraído. O objetivo é entreter e engajar através da diversão.'
    };

    const contextString = textElements.map(el => 
        `- Elemento ID "${el.id}":\n  - Propósito: ${el.description}\n  - Exemplo de conteúdo: "${el.exampleContent}"`
    ).join('\n');

    let prompt = `Você é um copywriter de IA. Sua ÚNICA tarefa é gerar conteúdo de texto para preencher um layout pré-existente sobre o tópico "${topic}".
    
    **Nível de Conteúdo Solicitado: ${contentLevel.toUpperCase()}**
    - ${contentLevelInstructions[contentLevel]}

    **Estilo do Texto Solicitado: ${textStyle.toUpperCase()}**
    - ${textStyleInstructions[textStyle]}

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

        **Estilo do Texto Solicitado: ${textStyle.toUpperCase()}**
        - ${textStyleInstructions[textStyle]}

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

export async function extractPaletteFromImage(base64Image: string, userApiKey?: string): Promise<PaletteExtractionResult> {
    const ai = getAIClient(userApiKey);
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