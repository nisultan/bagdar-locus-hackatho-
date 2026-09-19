// Vercel serverless function: разбор рекомендации через Gemini.
// Нужен GEMINI_API_KEY в переменных окружения. Без ключа клиент показывает
// разбор по правилам, поэтому продукт работает в любом случае.
//
// Ответ — не сплошной текст, а строгий JSON: интерфейс раскладывает его по
// блокам («вердикт», «в вашу пользу», «что сделать», «на что смотреть»).
// Схема заодно держит модель в узде: длинные рассуждения просто некуда писать.

const SYSTEM = `Ты — консультант по поступлению для школьников Казахстана. Отвечай кратко и по делу.
Язык ответа берётся из поля "lang": ru — русский, kk — казахский.

Правила:
- опирайся ТОЛЬКО на переданные данные; ничего не придумывай;
- никаких процентов шансов, гарантий поступления, рейтингов и дат, которых нет во входных данных;
- пиши конкретно: вместо «улучшите английский» — «IELTS 6.0 к весне»;
- если данных не хватает, так и скажи в поле "check";
- без markdown, эмодзи и вводных фраз вроде «конечно» или «как консультант».

Ограничения по длине соблюдай строго: verdict — одно предложение до 20 слов,
каждый пункт strengths и actions — до 12 слов, watch и check — до 15 слов.`;

/** Актуальная быстрая модель Gemini: ответ короткий, задержка важнее глубины. */
const DEFAULT_MODEL = 'gemini-3.8-flash';

/** Схема ответа: модель обязана вернуть ровно эти поля и не больше. */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', description: 'Одно предложение: кому и почему эта программа подходит' },
    strengths: {
      type: 'array',
      description: '2–3 сильные стороны профиля именно для этой программы',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 3,
    },
    actions: {
      type: 'array',
      description: '2–3 конкретных шага на ближайшие месяцы',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 3,
    },
    watch: { type: 'string', description: 'Главный риск или ограничение, о котором стоит помнить' },
    check: { type: 'string', description: 'Что обязательно проверить на официальном сайте' },
  },
  required: ['verdict', 'strengths', 'actions', 'watch', 'check'],
};

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
          generationConfig: {
            // Токены «размышления» Gemini 3 тратятся из этого же лимита, поэтому
            // запас нужен с большим отрывом: при нехватке ответ обрывается
            // на середине JSON, и разобрать его уже нельзя.
            maxOutputTokens: 2048,
            // Глубину рассуждения не задаём: у Flash-моделей минимальная и так
            // по умолчанию, а поле thinkingLevel этот эндпоинт не принимает
            // (400 Unknown name) — проверено на живом деплое.
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );
    if (!r.ok) {
      // Текст ошибки Google отдаём наружу: в нём нет ключа, зато видно причину
      // (неверный ключ, снятая с обслуживания модель, превышение квоты).
      const detail = await r.text().catch(() => '');
      let message = detail.slice(0, 300);
      try {
        message = JSON.parse(detail)?.error?.message ?? message;
      } catch {
        /* не JSON — оставляем как есть */
      }
      return res.status(502).json({ error: 'Upstream error', status: r.status, model, detail: message });
    }

    const data = await r.json();
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((part: any) => part?.text ?? '')
      .join('')
      .trim();
    if (!text) return res.status(502).json({ error: 'Empty response' });

    // Ответ мог оборваться по лимиту токенов — тогда это не наш формат,
    // и честнее отдать ошибку: клиент покажет разбор по правилам, а не огрызок JSON.
    const finish = data?.candidates?.[0]?.finishReason;
    if (finish && finish !== 'STOP') return res.status(502).json({ error: `Incomplete response: ${finish}` });

    let advice: any;
    try {
      advice = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'Malformed response' });
    }
    if (!advice || typeof advice.verdict !== 'string') {
      return res.status(502).json({ error: 'Malformed response' });
    }

    // Подрезаем на сервере: длина — часть контракта с интерфейсом, а не пожелание.
    const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const list = (v: unknown) =>
      Array.isArray(v) ? v.map(clean).filter(Boolean).slice(0, 3) : [];

    return res.status(200).json({
      advice: {
        verdict: clean(advice.verdict),
        strengths: list(advice.strengths),
        actions: list(advice.actions),
        watch: clean(advice.watch),
        check: clean(advice.check),
      },
    });
  } catch {
    return res.status(502).json({ error: 'Upstream error' });
  }
}
