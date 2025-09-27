const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config({ path: '../.env.local' });

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5173/api/auth/google/callback' // This must match the authorized redirect URI in your Google Cloud project
);

// Store tokens in a simple in-memory object for this example
// In a production app, you'd want to store this more securely (e.g., in a database)
const userTokens = {};

// Scopes define the level of access you're asking for from the user's account.
const scopes = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/generative-language.retriever',
];

// Route to start the Google authentication flow
app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  res.redirect(url);
});

// Route to handle the callback from Google
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    // Store user info and tokens
    userTokens[email] = { tokens, profile: payload };
    console.log(`Tokens stored for user ${email}`);

    // Redirect user back to the frontend with their email as an identifier
    res.redirect(`http://localhost:5173/?user=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.redirect('http://localhost:5173/?auth_error=true');
  }
});

// Endpoint to get user info
app.get('/user', (req, res) => {
    const email = req.query.email;
    if (email && userTokens[email]) {
        res.json({ user: userTokens[email].profile });
    } else {
        res.json({ user: null });
    }
});

// Endpoint to logout
app.post('/logout', (req, res) => {
    const { email } = req.body;
    if (email && userTokens[email]) {
        delete userTokens[email];
        console.log(`User ${email} logged out.`);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'User not specified or not found' });
    }
});

// Secure endpoint to generate content with Gemini
app.post('/generate', async (req, res) => {
  const { email, prompt, history } = req.body;

  if (!email || !userTokens[email]) {
    return res.status(401).send('User not authenticated');
  }

  if (!prompt) {
    return res.status(400).send('Prompt is required');
  }

  try {
    const userClient = new google.auth.OAuth2();
    userClient.setCredentials(userTokens[email].tokens);

    // Initialize Vertex AI with the user's credentials
    const vertexAI = google.vertexai({
        version: 'v1',
        auth: userClient,
    });

    const location = 'us-central1';
    const model = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${location}/models/gemini-1.0-pro`;

    const generativeModel = vertexAI.preview.generativeModels;

    const request = {
        contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
    };

    const result = await generativeModel.streamGenerateContent({
        model,
        contents: request.contents,
    });

    // For this proxy, we'll stream the response back to the client
    res.setHeader('Content-Type', 'text/plain');
    for await (const item of result.stream) {
      if (item.candidates && item.candidates[0].content && item.candidates[0].content.parts) {
        res.write(item.candidates[0].content.parts[0].text);
      }
    }
    res.end();

  } catch (error) {
    console.error('Error calling Gemini API:', error.message);
    res.status(500).send('Failed to generate content from Gemini. ' + error.message);
  }
});


app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});