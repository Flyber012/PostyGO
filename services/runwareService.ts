
const GENERATE_ENDPOINT = 'https://api.runware.ai/v1/images/generations';
const VERIFY_ENDPOINT = 'https://api.runware.ai/v1/me';

/**
 * Verifies if the Runware AI API key is valid.
 * @param apiKey The API key to verify.
 * @returns true if the key is valid, false otherwise.
 */
export async function verifyApiKey(apiKey: string): Promise<boolean> {
    try {
        const response = await fetch(VERIFY_ENDPOINT, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to verify Runware API key:", error);
        return false;
    }
}

async function generateImage(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(GENERATE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            width: 1024,
            height: 1024,
            model: "stable-diffusion-xl-v1-0",
            num_outputs: 1,
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown Runware API error' }));
        console.error('Runware API Error:', errorData);
        throw new Error(`Failed to generate with Runware: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    
    if (result.choices && result.choices[0] && result.choices[0].image_base64) {
        return result.choices[0].image_base64;
    } else {
        throw new Error('Unexpected response format from Runware API.');
    }
}

/**
 * Generates multiple background images in parallel.
 * @param apiKey The user's API key.
 * @param prompts An array of text prompts.
 * @returns A promise that resolves to an array of base64 image strings.
 */
export async function generateBackgroundImages(apiKey: string, prompts: string[]): Promise<string[]> {
    const imagePromises = prompts.map(prompt => generateImage(apiKey, prompt));
    const results = await Promise.all(imagePromises);
    return results;
}

/**
 * Generates a single background image and returns a full data URL.
 * @param apiKey The user's API key.
 * @param prompt The text prompt.
 * @returns A promise that resolves to a full image data URL (e.g., 'data:image/png;base64,...').
 */
export async function generateSingleBackgroundImage(apiKey: string, prompt: string): Promise<string> {
    const base64Data = await generateImage(apiKey, prompt);
    return `data:image/png;base64,${base64Data}`;
}
