// Vercel serverless function: personalised explanation of a recommendation via Gemini.
// Requires GEMINI_API_KEY in the deployment environment. Without it the client
// falls back to the rule-based explanation, so the product works either way.

const SYSTEM = `Ты — консультант по поступлению для школьников Казахстана.
Объясни простым языком (4–6 коротких предложений), почему программа подходит ученику и что ему сделать в ближайшие месяцы.
Отвечай на том языке, который указан в поле "lang": ru — по-русски, kk — по-казахски.
Правила: опирайся ТОЛЬКО на переданные данные; не придумывай даты, проценты шансов, рейтинги или гарантии поступления;
если данных не хватает — скажи, что нужно проверить на официальном сайте. Без markdown-заголовков.`;

/** Актуальная быстрая модель Gemini: ответ короткий, задержка важнее глубины. */
const DEFAULT_MODEL = 'gemini-2.5-flash';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI is not configured' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (!body?.profile || !body?.recommendation) return res.status(400).json({ error: 'Bad request' });

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Ключ в заголовке, а не в query: иначе он оседает в логах прокси и CDN.
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [
            { role: 'user', parts: [{ text: `Данные (JSON):\n${JSON.stringify(body).slice(0, 6000)}` }] },
          ],
          generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
        }),
      },
    );
    if (!r.ok) return res.status(502).json({ error: 'Upstream error' });

    const data = await r.json();
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((part: any) => part?.text ?? '')
      .join('')
      .trim();

    if (!text) return res.status(502).json({ error: 'Empty response' });
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: 'Upstream error' });
  }
}
