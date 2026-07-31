// Vercel serverless function — runs on Vercel's servers, never in the browser.
// GEMINI_API_KEY lives only in this process's environment (set in the Vercel
// project's Environment Variables), so it's never part of the HTML/JS/CSS
// bundle shipped to the client and never appears in the browser's network tab.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { exercise_name, entries } = req.body || {};

  if (!exercise_name || !Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: 'exercise_name and a non-empty entries array are required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    return;
  }

  const summary = entries
    .slice(0, 5)
    .map((e, i) => {
      const weightPart = e.weight ? ` @ ${e.weight}${e.weight_unit || ''}` : '';
      return `${i + 1}. ${e.sets}x${e.reps}${weightPart} — ${e.created_at}`;
    })
    .join('\n');

  const prompt = `You are a knowledgeable strength coach. Here are the last ${entries.length} logged sets for "${exercise_name}", most recent first:

${summary}

In 2-4 sentences, give specific feedback on progression, form cues to watch for, and recovery. Don't just repeat the numbers back.`;

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini request failed' });
      return;
    }

    const tip = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!tip) {
      res.status(502).json({ error: 'Gemini returned no tip' });
      return;
    }

    res.status(200).json({ tip });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach Gemini' });
  }
};
