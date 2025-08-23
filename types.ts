


export interface BaseElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number; // 0-360
    opacity: number; // 0-1
    locked: boolean;
    visible: boolean;
}

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';


export interface TextElement extends BaseElement {
    type: 'text';
    content: string;
    fontSize: number;
    fontFamily: string;
    accentFontFamily?: string;
    color: string;
    highlightColor?: string;
    textAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
    letterSpacing: number; // in px
    lineHeight: number; // e.g., 1.5
    textShadow?: string; // e.g., '2px 2px 4px #000000'
    strokeColor?: string;
    strokeWidth?: number;
    backgroundColor?: string;
    padding?: number;
    borderRadius?: number;
    backdropFilters?: {
        blur: number; // in px
        brightness: number; // 0-2
        contrast: number; // 0-2
        saturate: number; // 0-2
    };
}

export interface ImageElement extends BaseElement {
    type: 'image';
    src: string; // base64 or a url
    assetId?: string; // UUID to link to a BrandAsset
    filters: {
        brightness: number; // 0-2
        contrast: number; // 0-2
        saturate: number; // 0-2
        blur: number; // in px
        grayscale: number; // 0-1
        sepia: number; // 0-1
        hueRotate: number; // 0-360
        invert: number; // 0-1
    };
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    blendMode?: BlendMode;
}

export interface GradientElement extends BaseElement {
    type: 'gradient';
    color1: string;
    color2: string;
    angle: number;
    blendMode?: BlendMode;
}

export interface ShapeElement extends BaseElement {
    type: 'shape';
    shape: 'rectangle' | 'circle';
    fillColor: string;
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    blendMode?: BlendMode;
}

export interface QRCodeElement extends BaseElement {
    type: 'qrcode';
    url: string;
    color: string;
    backgroundColor: string;
    blendMode?: BlendMode;
}

export interface BackgroundElement {
    id: string;
    type: 'background';
    src: string; // base64
    prompt?: string; // The prompt used to generate it, for regeneration
    provider?: 'runware';
}


export type AnyElement = TextElement | ImageElement | GradientElement | BackgroundElement | ShapeElement | QRCodeElement;


export interface Post {
    id: string;
    elements: AnyElement[];
    palette?: string[];
    carouselId?: string;
    slideIndex?: number;
}

export interface LayoutTemplate {
    id: string;
    name: string;
    elements: AnyElement[];
}

export interface PostSize {
    name: string;
    width: number;
    height: number;
}

export interface FontDefinition {
    name: string;
    dataUrl?: string; // base64 data URL for custom fonts
}

export interface BrandAsset {
    id: string; // UUID
    type: 'image';
    dataUrl: string; // base64 data URL
}

export interface BrandKit {
    id: string;
    name: string;
    styleGuide: string | null;
    fonts: FontDefinition[];
    palette: string[];
    layouts: LayoutTemplate[];
    assets: BrandAsset[]; // For storing logos, icons, etc.
}


export interface AIGeneratedTextElement {
    content: string;
    x: number; // percentage
    y: number; // percentage
    width: number; // percentage
    height: number; // percentage
    fontSize: 'large' | 'medium' | 'small' | 'cta';
    textAlign: 'left' | 'center' | 'right';
    lineHeight?: number; // e.g. 1.4
    rotation?: number; // degrees
    backgroundTone: 'light' | 'dark'; // AI's analysis of the background behind this text
    highlightColor?: string; // e.g., "#FF6B6B" for markdown text
    accentFontFamily?: string; // e.g., "Caveat" for markdown text
    backgroundColor?: string; // e.g., "#4ECDC4" for CTA buttons
    fontFamily: string;
    color: string;
}

export interface AIGeneratedCarouselSlide {
    layout: AIGeneratedTextElement[];
    imagePrompt: string;
}

export interface AIGeneratedCarouselScriptSlide {
    slideContent: string;
    imagePrompt: string;
}

export interface PaletteExtractionResult {
    palette: string[];
    imageTone: 'light' | 'dark';
}

// --- User and Account Management ---

export interface LinkedAccount {
    apiKey: string;
    status: 'connected';
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
    linkedAccounts: {
        google?: LinkedAccount;
        envato?: LinkedAccount;
        chatgpt?: LinkedAccount;
        runware?: LinkedAccount;
    };
}