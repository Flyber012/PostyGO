// A simple hex to rgb converter
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

// Parses a color string (hex, rgb, rgba) into an RGBA object
export function parseColor(colorStr: string): { r: number; g: number; b: number; a: number } {
    if (!colorStr || colorStr === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    if (colorStr.startsWith('#')) {
        const rgb = hexToRgb(colorStr);
        return rgb ? { ...rgb, a: 1 } : { r: 0, g: 0, b: 0, a: 1 };
    }
    if (colorStr.startsWith('rgb')) {
        const parts = colorStr.match(/[\d.]+/g);
        if (parts && (parts.length === 3 || parts.length === 4)) {
            return {
                r: parseInt(parts[0], 10),
                g: parseInt(parts[1], 10),
                b: parseInt(parts[2], 10),
                a: parts.length === 4 ? parseFloat(parts[3]) : 1
            };
        }
    }
    // Default fallback
    return { r: 0, g: 0, b: 0, a: 1 };
}

// Converts an RGBA object to a CSS rgba string
export function rgbaToString(rgba: { r: number; g: number; b: number; a: number }): string {
    return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
}

// Converts an RGB object to a hex string
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Converts RGB to HSV color model
export function rgbToHsv(r: number, g: number, b: number): { h: number, s: number, v: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s, v: v };
}

// Converts HSV to RGB color model
export function hsvToRgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
    let r = 0, g = 0, b = 0;
    h /= 360;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}