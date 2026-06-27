export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt missing' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'KEY_MISSING: ANTHROPIC_API_KEY not found in environment' });
  }

  // Test with simplest possible request first
  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: String(prompt).slice(0, 3000) }]
  };

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
  } catch (networkErr) {
    return res.status(502).json({ error: 'NETWORK_ERROR: ' + networkErr.message });
  }

  const rawText = await response.text();

  if (!response.ok) {
    return res.status(200).json({
      error: 'ANTHROPIC_' + response.status,
      detail: rawText,
      keyPrefix: apiKey ? apiKey.substring(0, 12) + '...' : 'NOT SET'
    });
  }

  let data;
  try { data = JSON.parse(rawText); } catch {
    return res.status(200).json({ error: 'PARSE_ERROR', detail: rawText.slice(0, 500) });
  }

  const result = (data.content || []).map(c => c.text || '').join('\n');
  return res.status(200).json({ result });
}
