const express = require('express');
const { google } = require('googleapis');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config({ path: '../.env.local' });

const app = express();
const port = 3001;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- Google OAuth2 Setup ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:5173/api/auth/google/callback`
);

const userTokens = {};

const scopes = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/generative-language.retriever',
];

// --- Helper Functions ---

/**
 * Gets an AI client authenticated with the USER'S token. For text models.
 */
const getUserAuthenticatedAIClient = (email) => {
    if (!userTokens[email] || !userTokens[email].tokens.access_token) {
        throw new Error('User is not authenticated or token is missing.');
    }
    const { access_token } = userTokens[email].tokens;
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token });
    return new GoogleGenerativeAI({ auth });
};

/**
 * Gets an AI client authenticated with the SERVER'S API key. For image models.
 */
const getServerAuthenticatedAIClient = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Server API Key (GEMINI_API_KEY) is not configured.");
    }
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const fileToGenerativePart = (base64Data) => {
    const [header, data] = base64Data.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    return { inlineData: { data, mimeType } };
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- Auth Routes ---
app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes, prompt: 'consent' });
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const ticket = await oauth2Client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    userTokens[payload.email] = { tokens, profile: payload };
    console.log(`Authentication successful for user: ${payload.email}`);
    res.redirect(`http://localhost:5173/?user=${encodeURIComponent(payload.email)}`);
  } catch (error) {
    console.error('Error during Google callback:', error.message);
    res.redirect('http://localhost:5173/?auth_error=true');
  }
});

app.get('/user', (req, res) => {
    const email = req.query.email;
    res.json({ user: userTokens[email]?.profile || null });
});

app.post('/logout', (req, res) => {
    const { email } = req.body;
    if (email && userTokens[email]) {
        delete userTokens[email];
        console.log(`User ${email} logged out.`);
    }
    res.json({ success: true });
});

// --- Middleware for AI endpoints ---
const isAuthenticated = (req, res, next) => {
    const { email } = req.body;
    if (!email || !userTokens[email]) return res.status(401).json({ error: 'User not authenticated' });
    req.userEmail = email;
    next();
};

app.use('/api', isAuthenticated);

// --- AI Proxy Endpoints ---

app.post('/api/generateLayoutAndContentForImage', async (req, res) => {
    try {
        const { background, topic, contentLevel, brandKit, textStyle } = req.body;
        const genAI = getUserAuthenticatedAIClient(req.userEmail);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });

        // This is the full prompt logic, moved from the frontend
        const contentLevelInstructions = { mínimo: 'Gere um texto muito conciso...', médio: 'Gere um texto informativo, mas breve...', detalhado: 'Gere um texto mais completo...' };
        const textStyleInstructions = { padrão: 'Tom neutro.', profissional: 'Tom corporativo.', amigável: 'Tom de conversa.', inspirador: 'Tom motivacional.', divertido: 'Tom bem-humorado.' };
        let prompt = `Você é um diretor de arte e designer gráfico de IA... [THE VERY LONG AND DETAILED PROMPT FROM THE ORIGINAL geminiService.ts GOES HERE] ...Sua missão é criar um layout de texto para o tópico "${topic}".\nNível de Conteúdo: ${contentLevelInstructions[contentLevel]}\nEstilo de Texto: ${textStyleInstructions[textStyle]}`;
        if (brandKit) prompt += `\nBrandKit: ${JSON.stringify(brandKit)}`;

        const parts = [{ text: prompt }];
        if (background.startsWith('data:image')) parts.unshift(fileToGenerativePart(background));

        const result = await model.generateContent({ contents: [{ parts }] });
        const jsonResponse = JSON.parse(result.response.text());
        res.json(jsonResponse.layout);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/analyzeStyleFromImages', async (req, res) => {
    try {
        const { base64Images } = req.body;
        const genAI = getUserAuthenticatedAIClient(req.userEmail);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const prompt = `Você é um diretor de arte sênior... [THE FULL PROMPT FROM geminiService.ts GOES HERE]`;
        const imageParts = base64Images.map(fileToGenerativePart);
        const result = await model.generateContent({ contents: [{ parts: [prompt, ...imageParts] }] });
        res.send(result.response.text());
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generateImagePrompts', async (req, res) => {
    try {
        const { topic, count, styleGuide, inspirationImages } = req.body;
        const genAI = getUserAuthenticatedAIClient(req.userEmail);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        let prompt = `Você é um diretor de arte criativo... Gere ${count} prompts para "${topic}"... [THE FULL PROMPT FROM geminiService.ts GOES HERE]`;
        if (styleGuide) prompt += `\nGuia de Estilo: ${styleGuide}`;
        const imageParts = (inspirationImages || []).map(fileToGenerativePart);
        const result = await model.generateContent({ contents: [{ parts: [prompt, ...imageParts] }] });
        const jsonResponse = JSON.parse(result.response.text());
        res.json(jsonResponse.prompts);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// THIS ENDPOINT USES THE SERVER'S API KEY
app.post('/api/generateBackgroundImages', async (req, res) => {
    try {
        const { prompts, postSize } = req.body;
        // This client uses the server's key, NOT the user's token
        const genAI = getServerAuthenticatedAIClient();

        // Imagen API calls are different. We need to use the `getGenerativeModel` with the specific model name.
        // As of latest updates, this might be through a specific endpoint or library function.
        // Assuming a hypothetical `generateImages` function on the model for clarity.
        // The actual implementation would depend on the exact API structure for Imagen on Vertex AI.
        // This part of the code is the most likely to need adjustment based on Google's API docs.
        const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate" }); // Example model name

        const imagePromises = prompts.map(p => model.generateContent(
           `A high-quality, professional image for a social media post. Prompt: "${p}". Aspect ratio should be around ${postSize.width}:${postSize.height}.`
        ));

        // This is a simplified placeholder. The real API might return URLs or different structures.
        const responses = await Promise.all(imagePromises);
        const base64Images = responses.map(response => {
            const part = response.response.candidates[0].content.parts.find(p => p.fileData);
            if (!part) throw new Error('No image data in response');
            return part.fileData.data; // Assuming base64 data is returned directly
        });

        res.json(base64Images);
    } catch (error) {
        console.error('Image Generation API Error:', error);
        res.status(500).json({ error: "Failed to generate images. " + error.message });
    }
});


app.listen(port, () => {
  console.log(`Backend server ready on port ${port}`);
});