// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(express.json());
app.use(cors()); // in production restrict origin

const port = process.env.PORT || 5174;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if(!OPENAI_KEY){
  console.error('Missing OPENAI_API_KEY in environment. Create a .env file with OPENAI_API_KEY=sk-...');
  process.exit(1);
}

const config = new Configuration({ apiKey: OPENAI_KEY });
const openai = new OpenAIApi(config);

// Simple endpoint
app.post('/api/search', async (req, res) => {
  try{
    const query = req.body?.query;
    if(!query) return res.status(400).json({ error: 'Query required' });

    // Build a friendly system message and send to Chat API
    const system = `You are a helpful assistant that gives concise, accurate answers and links or examples when useful. Format the response in plain text.`;

    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: query }
    ];

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo', // change if you have access to other models
      messages,
      max_tokens: 700,
      temperature: 0.2,
    });

    const answer = completion.data.choices?.[0]?.message?.content?.trim() ?? 'No response';
    return res.json({ answer });
  }catch(err){
    console.error(err?.response?.data || err.message || err);
    const msg = err?.response?.data?.error?.message || err.message || 'Unknown server error';
    res.status(500).json({ error: msg });
  }
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
