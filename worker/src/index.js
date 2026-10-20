const DICTIONARIES = {
  fiqhi_main: { label: 'المعجم الفقهي', env: 'VECTOR_STORE_FIQHI' },
  usuli_dict: { label: 'المعجم الأصولي', env: 'VECTOR_STORE_USULI' },
  lughawi_dict: { label: 'المعجم اللغوي', env: 'VECTOR_STORE_LUGHAWI' }
};
const ALL_SCOPES = Object.keys(DICTIONARIES);
const MODEL = 'gpt-4o-mini';
const MAX_QUERY_CHARS = 50;
const MAX_BODY_BYTES = 8_000;
const INSTRUCTIONS = `أنت محرك بحث معجمي فقهي دلالي فائق الذكاء. مهمتك فهم أسئلة المستخدمين بالعامية الدارجة الشديدة وترجمتها فوراً إلى المصطلح الفقهي التراثي المقابل، ثم استخراجه من المعجم عبر أداة file_search.

قواعد التكييف الذكي للعامية:
1. استنتاج المصطلح الهدف قبل البحث (مهم جداً):
   - افهم المعنى الغائي من الوصف الشعبي. لا تبحث بألفاظ السؤال الحرفية، بل خمن المصطلح الفقهي الأقرب فوراً.
   * أمثلة للتكييف الشعبي والعامي:
     - "شي يسوون بيه جبن في بطن الطلي أو الماعز" -> المصطلح هو (الأنفحة). ابحث عن: "أنفحة إنفحة جبن تجبين كرش حمل جدي طهارة ميتة ذبيحة".
     - "البنية الي ما مزوجة وموافقة أبوها" -> المصطلح هو (البكر). ابحث عن: "بكر باكرة عذراء ثيب ولاية أب إذن ولي".
     - "طلي / صخل / بعير" -> ترجمها فقهياً إلى: "حمل، جدي، بهيمة أنعام، إبل".
     - "الوصخ اللي يطلع ورا البول" -> ابحث عن: "ودي وذي مذي بلل استبراء حدث".

2. تجنب فخ الكلمات التشريحية العامة:
   - تحذير: إياك أن تجعل كلمات البحث مقتصرة على أعضاء عامة مثل (بطن، يد، رجل، ظهر، دم) بمفردها؛ لأنها ستسترجع بطاقات غير مقصودة (مثل القابلة، البطن، الدية). اجعل كلمات البحث دائماً تتضمن: (اسم المصطلح المتوقع + الباب الفقهي).

3. ترتيب النتائج وعرضها:
   - أرجع المصطلح المطابق تماماً للوصف في البطاقة الأولى (رقم 1).
   - اعرض من 3 إلى 5 نتائج وثيقة الصلة فقط.
   - انقل نص التعريف في حقل (short_meaning) بأمانة وإيجاز لا يتجاوز 15 كلمة من نص المعجم المسترجع.

4. المخرجات:
   - بصيغة JSON مطابقة تماماً للمخطط المطلوب دون أي نصوص إضافية.
   - اجعل dictionaryId يطابق المعجم الذي استرجعت منه النتيجة: fiqhi_main أو usuli_dict أو lughawi_dict.
   - أرجع page بقيمة 0 وsource كنص فارغ، ولا تعرض بيانات الصفحة أو المصدر للمستخدم.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          term: { type: 'string' },
          dictionaryId: { type: 'string', enum: ALL_SCOPES },
          page: { type: 'number' },
          short_meaning: { type: 'string' },
          source: { type: 'string' }
        },
        required: ['id', 'term', 'dictionaryId', 'page', 'short_meaning', 'source'],
        additionalProperties: false
      }
    },
    message: { type: 'string' }
  },
  required: ['results', 'message'],
  additionalProperties: false
};

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.CORS_ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
  const headers = {
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Install-ID',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (!allowed.length) headers['Access-Control-Allow-Origin'] = '*';
  else if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(request, env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function consumeQuota(env, name, limit) {
  const id = env.USAGE_LIMITER.idFromName(name);
  const stub = env.USAGE_LIMITER.get(id);
  const response = await stub.fetch('https://limiter/take', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day: new Date().toISOString().slice(0, 10), limit })
  });
  return response.json();
}

function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

function normalizeTerm(term) {
  return term.normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ar');
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);
    if (url.pathname !== '/api/semantic-search') return json(request, env, { message: 'المسار غير موجود.' }, 404);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.CORS_ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
    if (allowed.length && origin && !allowed.includes(origin)) return json(request, env, { message: 'هذا المصدر غير مسموح.' }, 403);
    if (request.method === 'GET') return json(request, env, { ok: true, model: MODEL });
    if (request.method !== 'POST') return json(request, env, { message: 'الطريقة غير مدعومة.' }, 405);
    if (!env.OPENAI_API_KEY) return json(request, env, { message: 'خدمة البحث غير مهيأة.' }, 503);

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) return json(request, env, { message: 'السؤال أطول من الحد المسموح.' }, 413);
    let payload;
    try { payload = JSON.parse(rawBody); } catch { return json(request, env, { message: 'بيانات الطلب غير صالحة.' }, 400); }
    const query = typeof payload.query === 'string' ? payload.query.trim() : '';
    if (!query) return json(request, env, { message: 'اكتب سؤال البحث أولاً.' }, 400);
    if (Array.from(query).length > MAX_QUERY_CHARS) return json(request, env, { message: `الحد الأقصى ${MAX_QUERY_CHARS} حرفاً.` }, 400);

    const scope = payload.scope === 'all' ? ALL_SCOPES : [payload.scope];
    if (!scope.every((id) => ALL_SCOPES.includes(id))) return json(request, env, { message: 'نطاق المعجم غير صالح.' }, 400);
    const vectorStoreIds = [...new Set(scope.map((id) => env[DICTIONARIES[id].env]).filter(Boolean))];
    if (vectorStoreIds.length !== scope.length) return json(request, env, { message: 'لم تكتمل تهيئة فهارس المعاجم.' }, 503);

    const installId = request.headers.get('X-Install-ID') || '';
    if (!/^[a-zA-Z0-9-]{12,80}$/.test(installId)) return json(request, env, { message: 'معرف التطبيق غير صالح.' }, 400);
    const installHash = await sha256(installId);
    const ipHash = await sha256(request.headers.get('CF-Connecting-IP') || 'unknown-client');
    const installQuota = await consumeQuota(env, `install:${installHash}`, Number(env.DAILY_LIMIT_PER_INSTALL) || 20);
    if (!installQuota.allowed) return json(request, env, { message: 'وصلت إلى 20 عملية بحث اليوم. حاول غداً.', remaining: 0 }, 429);
    const ipQuota = await consumeQuota(env, `ip:${ipHash}`, Number(env.DAILY_LIMIT_PER_IP) || 100);
    if (!ipQuota.allowed) return json(request, env, { message: 'تم بلوغ حد الاستخدام اليومي من هذا الاتصال. حاول غداً.', remaining: 0 }, 429);
    const globalQuota = await consumeQuota(env, 'global', Number(env.GLOBAL_DAILY_LIMIT) || 100);
    if (!globalQuota.allowed) return json(request, env, { message: 'توقف البحث مؤقتاً بعد بلوغ سقف الاستخدام اليومي. حاول غداً.', remaining: 0 }, 429);

    const maxResults = Math.max(1, Math.min(Number(env.MAX_SEARCH_RESULTS) || 15, Number(payload.maxResults) || 15, 15));
    const started = Date.now();
    let openAiResponse;
    try {
      openAiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          instructions: INSTRUCTIONS,
          input: `${query}\n\nنطاق البحث: ${scope.map((id) => DICTIONARIES[id].label).join('، ')}`,
          temperature: 0,
          max_output_tokens: 400,
          max_tool_calls: 1,
          tools: [{
            type: 'file_search',
            vector_store_ids: vectorStoreIds,
            max_num_results: maxResults,
            ranking_options: { ranker: 'auto' }
          }],
          text: { format: { type: 'json_schema', name: 'dictionary_search_results', strict: true, schema: OUTPUT_SCHEMA } }
        })
      });
    } catch {
      return json(request, env, { message: 'تعذر الاتصال بخدمة البحث.' }, 502);
    }
    const responseData = await openAiResponse.json().catch(() => ({}));
    if (!openAiResponse.ok) {
      return json(request, env, { message: responseData.error?.message || 'تعذر إتمام البحث حالياً.' }, 502);
    }
    try {
      const parsed = JSON.parse(outputText(responseData));
      const seenTerms = new Set();
      const results = [];
      for (const item of (Array.isArray(parsed.results) ? parsed.results : [])) {
        if (!item || typeof item.term !== 'string' || !scope.includes(item.dictionaryId)) continue;
        const key = normalizeTerm(item.term);
        if (!key || seenTerms.has(key)) continue;
        seenTerms.add(key);
        const shortMeaning = typeof item.short_meaning === 'string'
          ? item.short_meaning.trim().split(/\s+/).filter(Boolean).slice(0, 15).join(' ')
          : '';
        results.push({ ...item, id: item.id || key, short_meaning: shortMeaning, page: 0, source: '' });
        if (results.length === 5) break;
      }
      return json(request, env, {
        results,
        message: parsed.message || '',
        inputTokens: responseData.usage?.input_tokens || 0,
        outputTokens: responseData.usage?.output_tokens || 0,
        totalTokens: responseData.usage?.total_tokens || 0,
        responseTimeSec: Number(((Date.now() - started) / 1000).toFixed(2))
      });
    } catch {
      return json(request, env, { message: 'تعذر قراءة نتائج البحث. حاول بصياغة أخرى.' }, 502);
    }
  }
};

export class UsageLimiter {
  constructor(ctx) { this.ctx = ctx; }

  async fetch(request) {
    const { day, limit } = await request.json();
    const allowed = await this.ctx.storage.transaction(async (txn) => {
      const current = await txn.get('daily') || { day, count: 0 };
      if (current.day !== day) { current.day = day; current.count = 0; }
      if (current.count >= limit) return { allowed: false, remaining: 0 };
      current.count += 1;
      await txn.put('daily', current);
      return { allowed: true, remaining: limit - current.count };
    });
    return Response.json(allowed);
  }
}
