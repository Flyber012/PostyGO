import { GoogleGenAI, GenerateContentResponse, Part, Type } from "@google/genai";
import { AIGeneratedTextElement, PaletteExtractionResult, AIGeneratedCarouselScriptSlide, TextElement, BrandKit, PostSize, TextStyle } from '../types';

// The API key must be obtained exclusively from the environment variable `process.env.API_KEY`.
// Assume this variable is pre-configured, valid, and accessible.
const getAIClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("Chave de API do Google GenAI não encontrada. Por favor, configure a variável de ambiente API_KEY.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const getGeminiAspectRatio = (postSize: PostSize): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" => {
    const ratio = postSize.width / postSize.height;
    if (Math.abs(ratio - 1) < 0.01) return '1:1';
    if (Math.abs(ratio - (4/5)) < 0.05) return '3:4';
    if (Math.abs(ratio - (9/16)) < 0.01) return '9:16';
    if (Math.abs(ratio - (5/4)) < 0.05) return '4:3';
    if (Math.abs(ratio - (16/9)) < 0.01) return '16:9';
    return '1:1';
};

export async function generateBackgroundImages(prompts: string[], postSize: PostSize): Promise<string[]> {
    const ai = getAIClient();
    const aspectRatio = getGeminiAspectRatio(postSize);

    const imagePromises = prompts.map(prompt => {
        return ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: aspectRatio,
                outputMimeType: 'image/jpeg',
            },
        });
    });

    const responses = await Promise.all(imagePromises);

    const base64Images = responses.map(response => {
        if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error('Falha ao gerar imagem com a API Gemini.');
    });

    return base64Images;
}

async function generateEnhancedImagePrompt(basePrompt: string, inspirationImages: string[]): Promise<string> {
    const ai = getAIClient();

    const textPart = {
        text: `Você é um diretor de arte especialista em engenharia de prompt para IA generativa de imagens. Sua tarefa é analisar as imagens de inspiração fornecidas para entender seu estilo, cor, composição e "vibe" geral. Em seguida, você deve criar um prompt novo, detalhado e artístico para o tópico "${basePrompt}", incorporando o estilo analizado. O prompt resultante deve ser rico em detalhes visuais e pronto para ser usado por um modelo de texto para imagem como DALL-E. Responda APENAS com o prompt final.`
    };
    
    const imageParts: Part[] = inspirationImages.map(base64Image => {
        const [header, data] = base64Image.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        return {
            inlineData: {
                mimeType: mimeType,
                data: data
            }
        };
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, ...imageParts] },
    });
    
    return response.text.trim() || basePrompt;
}

export async function generateSingleBackgroundImage(prompt: string, postSize: PostSize, inspirationImages?: string[]): Promise<string> {
    const ai = getAIClient();
    const aspectRatio = getGeminiAspectRatio(postSize);

    let finalPrompt = prompt;
    if (inspirationImages && inspirationImages.length > 0) {
        finalPrompt = await generateEnhancedImagePrompt(prompt, inspirationImages);
    }

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: finalPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio,
            outputMimeType: 'image/jpeg',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
        return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
    }
    throw new Error('Falha ao gerar imagem com a API Gemini.');
}


export async function analyzeStyleFromImages(base64Images: string[]): Promise<string> {
    const ai = getAIClient();

    const prompt = `Você é um diretor de arte sênior e especialista em branding. Sua tarefa é analisar as imagens de design fornecidas e criar um "Guia de Estilo" (Style Guide) conciso e acionável em texto. Este guia será usado por outra IA para gerar novos designs que correspondam a este estilo.

    Analise os seguintes aspectos e descreva-os claramente:
    1.  **Vibe e Estética Geral:** Descreva a sensação geral em poucas palavras (ex: "minimalista e profissional", "vibrante e divertido", "tecnológico e futurista", "elegante e orgânico").
    2.  **Paleta de Cores:** Identifique as 2-3 cores primárias, 1-2 cores de destaque/acento e as cores de fundo típicas (claras ou escuras).
    3.  **Tipografia:** Descreva os estilos de fonte. Use termos como "sans-serif moderna e limpa", "serifa clássica e elegante", "fonte de script manuscrita". Mencione o peso (ex: "títulos em negrito", "corpo de texto leve") e o uso de maiúsculas/minúsculas.
    4.  **Composição e Layout:** Descreva as regras de layout. (ex: "muito espaço negativo", "layouts baseados em grade", "composições centradas", "elementos sobrepostos").
    5.  **Elementos Gráficos:** Mencione o uso de ícones, formas (círculos, linhas), gradientes, texturas ou estilos de fotografia.
    
    Seja direto e use linguagem descritiva que uma IA possa entender e seguir facilmente.`;

    const textPart = { text: prompt };
    const imageParts: Part[] = base64Images.map(base64Image => {
        const [header, data] = base64Image.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        return {
            inlineData: {
                mimeType: mimeType,
                data: data
            }
        };
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, ...imageParts] },
    });
    
    return response.text.trim() || '';
}

export async function generateImagePrompts(topic: string, count: number, styleGuide: string | null, inspirationImages: string[] = []): Promise<string[]> {
    const ai = getAIClient();
    
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

    prompt += `\n\nRetorne um array JSON contendo exatamente ${count} strings, onde cada string é um prompt de imagem completo. O JSON deve ter a seguinte estrutura: { "prompts": ["prompt1", "prompt2", ...] }`;

    const textPart = { text: prompt };
    const imageParts: Part[] = inspirationImages.map(base64Image => {
        const [header, data] = base64Image.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        return {
            inlineData: { mimeType: mimeType, data: data }
        };
    });
    
    const contents = { parts: [textPart, ...imageParts] };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    prompts: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });

    try {
        const result = JSON.parse(response.text.trim() || '{}');
        if (result.prompts && Array.isArray(result.prompts) && result.prompts.length > 0) {
            return result.prompts as string[];
        }
        throw new Error("Formato de prompts de imagem inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar os prompts de imagem da IA:", response.text);
        throw new Error("Não foi possível gerar prompts de imagem.");
    }
}


export async function generateLayoutAndContentForImage(background: string, topic: string, contentLevel: 'mínimo' | 'médio' | 'detalhado', brandKit: BrandKit | null, textStyle: TextStyle = 'padrão'): Promise<AIGeneratedTextElement[]> {
    const ai = getAIClient();
    const isBase64Image = background.startsWith('data:image');
    
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
    1.  **Conteúdo Criativo:** Primeiro, crie o texto. Seja envolvente, use markdown (\`**destaque**\`) para ênfase e emojis relevantes. Para a \`fontFamily\`, escolha uma fonte moderna e limpa da seguinte lista, que melhor se adapte à "vibe" da imagem: 'Poppins', 'Inter', 'Sora', 'Plus Jakarta Sans', 'Outfit', 'Lexend', 'Manrope'.
    2.  **ANÁLISE VISUAL CRÍTICA:** Analise o fundo para identificar "zonas seguras" com espaço negativo (céu, paredes, áreas desfocadas). É PROIBIDO posicionar texto sobre rostos, produtos ou o ponto focal principal. A legibilidade e o respeito pela imagem são fundamentais.
    3.  **HIERARQUIA E POSICIONAMENTO:** Decomponha o texto em elementos lógicos (título, corpo, etc.) e distribua-os harmonicamente. O título (use fontSize: 'large') deve ser o mais proeminente. A descrição (use fontSize: 'medium') deve ser secundária. Texto de rodapé (use fontSize: 'small') deve ser discreto.
    4.  **MARGENS DE SEGURANÇA:** Todos os elementos de texto DEVEM estar contidos dentro de uma área segura. As coordenadas 'x' e 'y' mais a 'width'/'height' não devem exceder 95% e devem ser maiores que 5%. Exemplo: um elemento em x=90 só pode ter uma largura máxima de 5. Isso evita que o texto seja cortado nas bordas.
    5.  **CONTRASTE É REI:** Analise o tom do fundo (\`backgroundTone\`) *exatamente* onde você vai colocar cada bloco de texto. Use branco ('#FFFFFF') para fundos escuros e um cinza muito escuro/preto ('#0F172A') para fundos claros.
    6.  **ALTURA DA LINHA PADRÃO:** OBRIGATORIAMENTE use um \`lineHeight\` de \`1.3\`.
    7.  **DESIGN INTELIGENTE:**
        -   Para CTAs, use o \`fontSize\` 'cta' e sugira uma \`backgroundColor\` sólida e contrastante. A altura (\`height\`) DEVE ser justa ao conteúdo.
    
    **Formato de Saída:** Responda com um objeto JSON contendo uma chave "layout", que é um array de objetos. Cada objeto representa um elemento de texto e deve ter as seguintes chaves: "content" (string), "x" (número %), "y" (número %), "width" (número %), "height" (número %), "fontSize" ('large'|'medium'|'small'|'cta'), "textAlign" ('left'|'center'|'right'), "backgroundTone" ('light'|'dark'), "fontFamily" (string), "color" (string hex), "lineHeight" (número, 1.3), "highlightColor" (string hex opcional), "accentFontFamily" (string opcional), "backgroundColor" (string hex opcional).`;
    
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
        6.  **ALTURA DA LINHA PADRÃO:** OBRIGATORIAMENTE use um \`lineHeight\` de \`1.3\`.
        
        **Formato de Saída:** Responda com um objeto JSON contendo uma chave "layout", que é um array de objetos, seguindo a estrutura descrita anteriormente.`;
    }

    const parts: Part[] = [{ text: prompt }];
    if(isBase64Image) {
        const [header, data] = background.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        parts.unshift({ inlineData: { mimeType, data } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    layout: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                content: { type: Type.STRING },
                                x: { type: Type.NUMBER },
                                y: { type: Type.NUMBER },
                                width: { type: Type.NUMBER },
                                height: { type: Type.NUMBER },
                                fontSize: { type: Type.STRING },
                                textAlign: { type: Type.STRING },
                                backgroundTone: { type: Type.STRING },
                                fontFamily: { type: Type.STRING },
                                color: { type: Type.STRING },
                                lineHeight: { type: Type.NUMBER },
                                highlightColor: { type: Type.STRING },
                                accentFontFamily: { type: Type.STRING },
                                backgroundColor: { type: Type.STRING },
                            }
                        }
                    }
                }
            }
        }
    });

    try {
        const result = JSON.parse(response.text.trim() || '{}');
        if (result.layout && Array.isArray(result.layout)) {
            return result.layout as AIGeneratedTextElement[];
        }
        throw new Error("Formato de layout inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar o layout da IA:", response.text);
        throw new Error("Não foi possível gerar um layout para a imagem.");
    }
}

export async function generateCarouselScript(topic: string, slideCount: number, contentLevel: 'mínimo' | 'médio' | 'detalhado', styleGuide: string | null): Promise<AIGeneratedCarouselScriptSlide[]> {
    const ai = getAIClient();
    const contentLevelInstructions = {
        mínimo: 'Seja muito sucinto. Frases curtas, palavras de impacto. Ideal para mensagens rápidas.',
        médio: 'Equilibre informação e brevidade. Um título e uma breve explicação ou 1-2 pontos principais por slide.',
        detalhado: 'Elabore mais. Use parágrafos curtos ou listas mais completas. Entregue o máximo de valor em cada slide.'
    };

    let prompt = `Você é um copywriter especialista em mídias sociais e um diretor de arte. Sua tarefa é criar o roteiro completo para um carrossel de ${slideCount} slides no Instagram sobre o tópico: "${topic}".

    **Nível de Conteúdo Solicitado: ${contentLevel.toUpperCase()}**
    - ${contentLevelInstructions[contentLevel]}

    **Instruções:**
    1.  **Estrutura do Carrossel:** Crie uma narrativa que flua logicamente. O primeiro slide deve ter um gancho forte. Os slides do meio desenvolvem o tópico. O último slide deve ter um CTA (Call to Action) claro.
    2.  **Conteúdo do Slide (\`slideContent\`):** Escreva o texto para cada slide. Seja direto, use quebras de linha para facilitar a leitura e markdown (\`**destaque**\`) para ênfase.
    3.  **Prompt de Imagem (\`imagePrompt\`):** Para CADA slide, crie um prompt de imagem detalhado e artístico para um gerador de imagens de IA (como Imagen ou DALL-E). O prompt deve descrever uma imagem de fundo que complemente o texto do slide, seja visualmente atraente e tenha bastante espaço negativo para o texto.`;
    
    if (styleGuide) {
        prompt += `\n\n**DIRETRIZES DE ESTILO OBRIGATÓRIAS:**\n${styleGuide}\n\nO tom do texto e o estilo visual dos prompts de imagem DEVEM seguir rigorosamente estas diretrizes.`;
    }

    prompt += `\n\n**Formato de Saída:** Retorne um objeto JSON com a chave "slides", que é um array de objetos. Cada objeto deve ter as chaves 'slideContent' (string) e 'imagePrompt' (string).`
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    slides: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                slideContent: { type: Type.STRING },
                                imagePrompt: { type: Type.STRING },
                            }
                        }
                    }
                }
            }
        }
    });

    try {
        const result = JSON.parse(response.text.trim() || '{}');
        if (result.slides && Array.isArray(result.slides) && result.slides.length > 0) {
            return result.slides as AIGeneratedCarouselScriptSlide[];
        }
        throw new Error("Formato de roteiro de carrossel inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar o roteiro do carrossel da IA:", response.text);
        throw new Error("Não foi possível gerar um roteiro para o carrossel.");
    }
}

export async function generateLayoutForProvidedText(base64Image: string, textContent: string, topic: string, brandKit: BrandKit | null): Promise<AIGeneratedTextElement[]> {
    const ai = getAIClient();
    let prompt = `Você é um diretor de arte e designer gráfico de IA. Sua tarefa é criar um layout visualmente atraente para o texto fornecido, posicionando-o sobre a imagem de fundo. O tópico geral é "${topic}". O texto exato para este slide é:\n"""\n${textContent}\n"""\n\nSiga as mesmas regras de design, composição, hierarquia e contraste da tarefa de geração de layout e conteúdo. A única diferença é que o texto já está definido. Responda com um objeto JSON com a chave "layout" contendo um array de objetos de elementos de texto.`;
    
    if (brandKit) {
         prompt += `\n\n**DIRETRIZES DE BRAND KIT OBRIGATÓRIAS:**\n${brandKit.styleGuide}\nFontes: ${brandKit.fonts.map(f => f.name).join(', ')}\nPaleta: ${brandKit.palette.join(', ')}`;
    }
    
    const [header, data] = base64Image.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    const imagePart = { inlineData: { mimeType, data } };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: { /* same as generateLayoutAndContentForImage */ }
        }
    });
    const result = JSON.parse(response.text.trim() || '{}');
    return result.layout || [];
}

export async function generateTextForLayout(
    textElements: {id: string, description: string, exampleContent: string}[], 
    topic: string, 
    contentLevel: 'mínimo' | 'médio' | 'detalhado', 
    styleGuide: string | null,
    textStyle: TextStyle = 'padrão'
): Promise<Record<string, string>> {
    const ai = getAIClient();
    let prompt = `Você é um copywriter de IA. Sua tarefa é gerar novos textos para preencher um layout pré-definido, baseado no tópico "${topic}". Para cada elemento de texto, forneço um ID, uma descrição e um exemplo de conteúdo. Crie um conteúdo novo e relevante que se encaixe na descrição.\n\n**Tópico:** ${topic}\n**Nível de Conteúdo:** ${contentLevel}\n**Estilo do Texto:** ${textStyle}\n\n**Elementos para Preencher:**\n${JSON.stringify(textElements, null, 2)}\n\nSua resposta DEVE SER um único objeto JSON, onde as chaves são os 'id's dos elementos de texto e os valores são as novas strings de conteúdo que você criou.`;
    if (styleGuide) {
        prompt += `\n\n**Guia de Estilo a Seguir:**\n${styleGuide}`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" } // No schema needed for a simple map
    });
    
    try {
        const result = JSON.parse(response.text.trim() || '{}');
        if (typeof result === 'object' && result !== null) {
            return result as Record<string, string>;
        }
        throw new Error("Formato de conteúdo de texto inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar o conteúdo de texto da IA:", response.text);
        throw new Error("Não foi possível gerar conteúdo de texto para o layout.");
    }
}

export async function extractPaletteFromImage(base64Image: string): Promise<PaletteExtractionResult> {
    const ai = getAIClient();
    const prompt = "A partir da imagem fornecida, extraia uma paleta de cores harmoniosa de 2 a 4 cores. Analise também se o tom geral da imagem é claro ('light') ou escuro ('dark'). Responda com um objeto JSON com as chaves 'palette' (array de strings hex) e 'imageTone' ('light' ou 'dark').";

    const [header, data] = base64Image.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    const imagePart = { inlineData: { mimeType, data } };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    palette: { type: Type.ARRAY, items: { type: Type.STRING } },
                    imageTone: { type: Type.STRING }
                }
            }
        }
    });

    try {
        const result = JSON.parse(response.text.trim() || '{}');
        if (result.palette && Array.isArray(result.palette) && result.palette.length > 0 && result.imageTone) {
            return result as PaletteExtractionResult;
        }
        throw new Error("Formato de paleta inválido na resposta da IA.");
    } catch (e) {
        console.error("Falha ao analisar a paleta da IA:", response.text);
        throw new Error("Não foi possível extrair uma paleta de cores da imagem.");
    }
}
