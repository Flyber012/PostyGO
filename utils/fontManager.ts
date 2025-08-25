const loadingFonts = new Map<string, Promise<void>>();

/**
 * Dynamically loads a Google Font by creating a <link> element in the document's head.
 * It caches requests to avoid redundant network calls for the same font.
 * @param {string} fontName The name of the Google Font to load (e.g., 'Roboto', 'Open Sans').
 */
export function loadGoogleFont(fontName: string): Promise<void> {
  if (loadingFonts.has(fontName)) {
    return loadingFonts.get(fontName)!;
  }

  // Also include locally loaded fonts via @font-face from index.html
  const systemFonts = [
    'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 
    'sans-serif', 'serif', 'monospace', 'Bebas Neue', 'Caveat'
  ];
  if (systemFonts.some(s => fontName.includes(s))) {
    return Promise.resolve();
  }

  const promise = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    const formattedFontName = fontName.replace(/ /g, '+');
    
    link.href = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@400;700&display=swap`;
    link.rel = 'stylesheet';

    link.onload = () => {
      // Font stylesheet is loaded and ready to be used.
      resolve();
    };

    link.onerror = () => {
      console.warn(`Failed to load Google Font: ${fontName}`);
      loadingFonts.delete(fontName); // Allow retrying if it fails
      reject(new Error(`Failed to load font: ${fontName}`));
    };
    
    document.head.appendChild(link);
  });
  
  loadingFonts.set(fontName, promise);
  return promise;
}
