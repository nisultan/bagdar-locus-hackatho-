// Vercel serverless function: personalised explanation of a recommendation via Claude.
// Requires ANTHROPIC_API_KEY in the deployment environment. Without it the client
// falls back to the rule-based explanation, so the product works either way.

const SYSTEM = `Ты — консультант по поступлению для школьников Казахстана.
Объясни простым языком (4–6 коротких предложений, на русском), почему программа подходит ученику и что ему сделать в ближайшие месяцы.
Правила: опирайся ТОЛЬКО на переданные данные; не придумывай даты, проценты шансов, рейтинги или гарантии поступления;
если данных не хватает — скажи, что нужно проверить на официальном сайте. Без markdown-заголовков.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI is not configured' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (!body?.profile || !body?.recommendation) return res.status(400).json({ error: 'Bad request' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Данные (JSON):\n${JSON.stringify(body).slice(0, 6000)}` }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'Upstream error' });
    const data = await r.json();
    const text = (data.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim();
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: 'Upstream error' });
  }
}
