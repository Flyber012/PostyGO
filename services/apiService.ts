import { AIGeneratedTextElement, BrandKit, PostSize, TextStyle } from '../types';
import { UserProfile } from '@/components/Auth';

const API_BASE_URL = '/api'; // Using Vite proxy

// --- Helper for API calls ---
async function post<T>(endpoint: string, body: object): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    // For endpoints that might return text (like analyzeStyle)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    // Assuming text response if not json
    return response.text() as unknown as T;
}


// --- Auth Functions ---
export async function getUserProfile(email: string): Promise<{ user: UserProfile | null }> {
    const response = await fetch(`/user?email=${encodeURIComponent(email)}`);
    if (!response.ok) throw new Error('Failed to fetch user profile.');
    return response.json();
}

export async function logout(email: string): Promise<{ success: boolean }> {
    return post('/logout', { email });
}


// --- AI Proxy Functions ---

export async function generateLayoutAndContentForImage(
    email: string,
    background: string,
    topic: string,
    contentLevel: 'mínimo' | 'médio' | 'detalhado',
    brandKit: BrandKit | null,
    textStyle: TextStyle = 'padrão'
): Promise<AIGeneratedTextElement[]> {
    return post('/generateLayoutAndContentForImage', { email, background, topic, contentLevel, brandKit, textStyle });
}

export async function analyzeStyleFromImages(email: string, base64Images: string[]): Promise<string> {
    return post('/analyzeStyleFromImages', { email, base64Images });
}

export async function generateImagePrompts(
    email: string,
    topic: string,
    count: number,
    styleGuide: string | null,
    inspirationImages: string[] = []
): Promise<string[]> {
    return post('/generateImagePrompts', { email, topic, count, styleGuide, inspirationImages });
}

// This function now calls our backend, which in turn uses the server's API key for image generation.
export async function generateBackgroundImages(email: string, prompts: string[], postSize: PostSize): Promise<string[]> {
    // Note: The 'email' is still required for the isAuthenticated middleware on our backend,
    // even if this specific endpoint uses the server's API key for the final call to Google.
    return post('/generateBackgroundImages', { email, prompts, postSize });
}

// The other functions from the original service (like generateSingleBackgroundImage, generateTextForLayout, etc.)
// are primarily frontend logic orchestrators now. The core AI generation for them happens in the endpoints above.
// For example, `generateSingleBackgroundImage` would now be a simple wrapper around `generateImagePrompts` and `generateBackgroundImages`.
// We will adjust the calling code in App.tsx to use the new service functions directly.
// For now, we will stub out the remaining functions as they are no longer directly calling an AI service.

export async function generateSingleBackgroundImage(email: string, prompt: string, postSize: PostSize, inspirationImages?: string[]): Promise<string> {
    // This function now orchestrates calls through our backend
    const enhancedPrompt = prompt; // In a real scenario, you might have another endpoint for prompt enhancement
    const prompts = [enhancedPrompt];
    const images = await generateBackgroundImages(email, prompts, postSize);
    if (!images || images.length === 0) {
        throw new Error("Failed to generate a single background image.");
    }
    // The backend is expected to return base64 strings directly
    return `data:image/jpeg;base64,${images[0]}`;
}

// This function is no longer needed as the logic is now fully on the backend in `generateLayoutAndContentForImage`
export async function generateTextForLayout(): Promise<Record<string, string>> {
    console.warn("generateTextForLayout is now handled by the backend. This function should not be called directly.");
    return Promise.resolve({});
}

// All other functions are either deprecated or their logic is now on the backend.
// The frontend will now call the primary proxy functions above.