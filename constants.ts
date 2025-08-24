import { PostSize, BrandKit, FontDefinition } from './types';
import { v4 as uuidv4 } from 'uuid';

export const INITIAL_FONTS: FontDefinition[] = [
    { name: 'Roboto' }, { name: 'Open Sans' }, { name: 'Lato' }, { name: 'Montserrat' }, { name: 'Oswald' },
    { name: 'Poppins' }, { name: 'Inter' }, { name: 'Anton' }, { name: 'Bebas Neue' }, { name: 'Caveat' },
];

export const POST_SIZES: PostSize[] = [
    { name: 'Square (1:1)', width: 1080, height: 1080 },
    { name: 'Portrait (4:5)', width: 1080, height: 1350 },
    { name: 'Story (9:16)', width: 1080, height: 1920 },
];

export const PRESET_BRAND_KITS: BrandKit[] = [
    {
        id: uuidv4(),
        name: 'Tech & Moderno',
        styleGuide: `
            1. Vibe e Estética Geral: Tecnológico, futurista, limpo e profissional.
            2. Paleta de Cores: Primárias são azul elétrico (#3B82F6) e ciano (#14B8A6). Fundo escuro (#0F172A).
            3. Tipografia: Sans-serif moderna e limpa (Poppins, Inter) com títulos em negrito (700).
            4. Composição e Layout: Layouts baseados em grade, assimétricos, com bom uso de espaço negativo.
            5. Elementos Gráficos: Linhas finas, gradientes sutis, ícones de contorno.
        `,
        fonts: [{ name: 'Poppins' }, { name: 'Inter' }],
        palette: ['#3B82F6', '#14B8A6', '#FFFFFF', '#9CA3AF'],
        layouts: [
            {
                id: uuidv4(),
                name: 'Citação Impactante',
                elements: [
                    { id: 'quote-text', type: 'text', content: '"A melhor forma de prever o futuro é criá-lo."', x: 108, y: 405, width: 864, height: 270, rotation: 0, opacity: 1, locked: false, visible: true, fontSize: 80, fontFamily: 'Poppins', fontWeight: 700, fontStyle: 'normal', textDecoration: 'none', color: '#FFFFFF', textAlign: 'center', verticalAlign: 'middle', letterSpacing: 0, lineHeight: 1.2, textShadow: '2px 2px 8px rgba(0,0,0,0.7)' },
                    { id: 'author-text', type: 'text', content: '- Peter Drucker', x: 324, y: 750, width: 432, height: 54, rotation: 0, opacity: 1, locked: false, visible: true, fontSize: 32, fontFamily: 'Inter', fontWeight: 400, fontStyle: 'normal', textDecoration: 'none', color: '#9CA3AF', textAlign: 'center', verticalAlign: 'middle', letterSpacing: 0, lineHeight: 1.2 },
                ]
            }
        ],
        assets: [],
    },
    {
        id: uuidv4(),
        name: 'Elegante & Orgânico',
        styleGuide: `
            1. Vibe e Estética Geral: Elegante, orgânico, minimalista e calmo.
            2. Paleta de Cores: Tons terrosos e neutros. Bege (#F5F5F4), verde sálvia (#A3B18A), marrom suave (#582F0E).
            3. Tipografia: Combinação de uma serifa clássica (Lato) para títulos e uma sans-serif limpa (Roboto) para o corpo.
            4. Composição e Layout: Composições centradas, muito espaço em branco, foco na simplicidade.
            5. Elementos Gráficos: Formas orgânicas suaves, texturas de papel ou linho, fotografias de natureza.
        `,
        fonts: [{ name: 'Lato' }, { name: 'Roboto' }],
        palette: ['#A3B18A', '#582F0E', '#F5F5F4', '#344E41'],
        layouts: [
             {
                id: uuidv4(),
                name: 'Anúncio de Evento',
                elements: [
                    { id: 'event-title', type: 'text', content: 'WORKSHOP DE CERÂMICA', x: 54, y: 100, width: 972, height: 150, rotation: 0, opacity: 1, locked: false, visible: true, fontSize: 100, fontFamily: 'Lato', fontWeight: 700, fontStyle: 'normal', textDecoration: 'none', color: '#344E41', textAlign: 'center', verticalAlign: 'middle', letterSpacing: 5, lineHeight: 1.1 },
                    { id: 'event-subtitle', type: 'text', content: 'Uma Manhã Criativa', x: 216, y: 250, width: 648, height: 60, rotation: 0, opacity: 1, locked: false, visible: true, fontSize: 48, fontFamily: 'Roboto', fontWeight: 400, fontStyle: 'normal', textDecoration: 'none', color: '#582F0E', textAlign: 'center', verticalAlign: 'middle', letterSpacing: 0, lineHeight: 1.2 },
                    { id: 'event-date', type: 'text', content: '25 DEZ | 10:00', x: 270, y: 745, width: 540, height: 90, rotation: 0, opacity: 1, locked: false, visible: true, fontSize: 64, fontFamily: 'Lato', fontWeight: 700, fontStyle: 'normal', textDecoration: 'none', color: '#344E41', textAlign: 'center', verticalAlign: 'middle', letterSpacing: 1, lineHeight: 1.2 },
                ],
            }
        ],
        assets: [],
    }
];