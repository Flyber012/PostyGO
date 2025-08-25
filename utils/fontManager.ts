const loadedFonts = new Set<string>();

/**
 * Dynamically loads a Google Font by creating a <link> element in the document's head.
 * It checks if the font has already been loaded to avoid redundant network requests.
 * @param {string} fontName The name of the Google Font to load (e.g., 'Roboto', 'Open Sans').
 */
export function loadGoogleFont(fontName: string): void {
  if (loadedFonts.has(fontName)) {
    return; // Font already loaded or requested
  }

  // Basic check for system fonts that don't need loading
  const systemFonts = ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'sans-serif', 'serif', 'monospace'];
  if(systemFonts.includes(fontName)) {
    return;
  }

  const link = document.createElement('link');
  const formattedFontName = fontName.replace(/ /g, '+');
  
  link.href = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@400;700&display=swap`;
  link.rel = 'stylesheet';

  link.onload = () => {
    // Optional: Add a check to see if the font is actually available
    // document.fonts.check(`12px "${fontName}"`) -> returns boolean
    // For now, we assume it loads correctly.
  };

  link.onerror = () => {
    console.warn(`Failed to load Google Font: ${fontName}`);
    loadedFonts.delete(fontName); // Allow retrying if it fails
  };
  
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}
