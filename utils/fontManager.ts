const loadedFontLinks = new Set<string>();
const embeddedFontCache = new Map<string, string>();


/**
 * Dynamically loads a Google Font by creating a <link> element in the document's head.
 * This is suitable for the live editor preview.
 * It caches requests to avoid redundant network calls for the same font.
 * @param {string} fontName The name of the Google Font to load (e.g., 'Roboto', 'Open Sans').
 */
export function loadGoogleFont(fontName: string): Promise<void> {
    if (loadedFontLinks.has(fontName)) {
        return Promise.resolve();
    }

    // Also include locally loaded fonts via @font-face from index.html
    const systemFonts = [
        'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia',
        'sans-serif', 'serif', 'monospace', 'Bebas Neue', 'Caveat'
    ];
    if (systemFonts.some(s => fontName.toLowerCase().includes(s.toLowerCase()))) {
        return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
        const link = document.createElement('link');
        const formattedFontName = fontName.replace(/ /g, '+');

        link.href = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@400;700&display=swap`;
        link.rel = 'stylesheet';

        link.onload = () => {
            loadedFontLinks.add(fontName);
            resolve();
        };

        link.onerror = () => {
            console.warn(`Failed to load Google Font: ${fontName}`);
            reject(new Error(`Failed to load font: ${fontName}`));
        };

        document.head.appendChild(link);
    });
}


async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
    const blob = new Blob([buffer]);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
}

/**
 * Fetches Google Fonts CSS, then fetches the font files themselves and embeds them as base64 data URLs
 * into a new CSS string. This is ideal for ensuring fonts are available for server-side rendering or image export.
 * @param {Set<string>} fontNames - A Set of Google Font names.
 * @returns {Promise<string>} A promise that resolves to a CSS string with embedded fonts.
 */
export async function getFontEmbedCss(fontNames: Set<string>): Promise<string> {
    const fontFamilies = Array.from(fontNames)
        .filter(name => {
            const systemFonts = ['arial', 'verdana', 'helvetica', 'times new roman', 'courier new', 'georgia', 'sans-serif', 'serif', 'monospace', 'bebas neue', 'caveat'];
            return !systemFonts.includes(name.toLowerCase());
        })
        .map(name => `family=${name.replace(/ /g, '+')}:wght@400;700`);

    if (fontFamilies.length === 0) {
        return Promise.resolve('');
    }

    const cacheKey = fontFamilies.sort().join('&');
    if (embeddedFontCache.has(cacheKey)) {
        return embeddedFontCache.get(cacheKey)!;
    }

    const cssUrl = `https://fonts.googleapis.com/css2?${fontFamilies.join('&')}&display=swap`;
    
    try {
        const cssResponse = await fetch(cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36' }});
        if (!cssResponse.ok) {
            throw new Error(`Failed to fetch Google Fonts CSS (${cssResponse.status}): ${cssResponse.statusText}`);
        }
        let cssText = await cssResponse.text();

        const fontUrlRegex = /url\((https:\/\/fonts\.gstatic\.com\/s\/[^)]+\.woff2)\)/g;
        const fontUrls = [...new Set([...cssText.matchAll(fontUrlRegex)].map(match => match[1]))];

        const fontPromises = fontUrls.map(async url => {
            try {
                const fontResponse = await fetch(url);
                if (!fontResponse.ok) {
                    console.warn(`Failed to fetch font file: ${url}`);
                    return { url, base64: null };
                }
                const arrayBuffer = await fontResponse.arrayBuffer();
                const base64 = await arrayBufferToBase64(arrayBuffer);
                return { url, base64 };
            } catch (e) {
                console.warn(`Network error fetching font file: ${url}`, e);
                return { url, base64: null };
            }
        });

        const embeddedFonts = await Promise.all(fontPromises);

        for (const { url, base64 } of embeddedFonts) {
            if (base64) {
                const dataUrl = `data:font/woff2;base64,${base64}`;
                cssText = cssText.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), dataUrl);
            }
        }
        
        embeddedFontCache.set(cacheKey, cssText);
        return cssText;

    } catch (error) {
        console.error("Error embedding fonts:", error);
        return ''; // Return empty string on failure to not break export
    }
}
