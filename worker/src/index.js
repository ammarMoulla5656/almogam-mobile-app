const DICTIONARIES = {
  fiqhi_main: { label: 'المعجم الفقهي', env: 'VECTOR_STORE_FIQHI' },
  usuli_dict: { label: 'المعجم الأصولي', env: 'VECTOR_STORE_USULI' },
  lughawi_dict: { label: 'المعجم اللغوي', env: 'VECTOR_STORE_LUGHAWI' }
};
const ALL_SCOPES = Object.keys(DICTIONARIES);
const ALL_DICTIONARY_LABELS = Object.values(DICTIONARIES).map((dictionary) => dictionary.label);
const MODEL = 'gpt-5.6-luna';
const MAX_QUERY_CHARS = 50;
const MAX_BODY_BYTES = 8_000;
const BASE_INSTRUCTIONS = `أنت محرك بحث معجمي دلالي. السؤال قد يكون عامياً أو وصفاً شعبياً لا يذكر اسم المصطلح.

## قبل اختيار نتيجة
- أعد البطاقات التي لها صلة بالمعنى المقصود، بما فيها الصلة الجزئية أو القرب من الباب والمفهوم، كي يعالج التطبيق النتائج لاحقاً.
- term يجب أن يكون عنوان بطاقة ظهر حرفياً في نتائج file_search. لا تجعل كلمة وردت داخل تعريف بطاقة أخرى عنواناً؛ أعد البطاقة بعنوانها الأصلي.
- أعد من 3 إلى 5 بطاقات ذات صلة، مرتبة من المطابقة التامة إلى القريبة ثم المجاورة. أعد أقل من 3 فقط إذا لم توجد بطاقات أخرى ذات صلة، وقائمة فارغة فقط إذا لم توجد أي بطاقة مناسبة.
- لا ترجع بطاقة لمجرد اشتراكها في لفظ عام إذا كان معناها بعيداً تماماً.
- استخدم العناوين والتعريفات الموجودة في نتائج file_search فقط. لا تخترع مصطلحاً أو تعريفاً.
- لا تكرر البطاقة. short_meaning اقتباس حرفي من تعريف البطاقة نفسها، بحد أقصى 15 كلمة، بلا إعادة صياغة. اترك message فارغاً دائماً.
- اذكر اسم المعجم الصحيح في dictionaryName. أخرج JSON فقط. اجعل page=0 وsource="" دائماً.

## نطاق البحث والاستعلامات
استخدم المعنى المقصود والمصطلحات المرشحة والاستعلامات التي أُرسلت لك. نفّذ file_search مرة واحدة فقط، واستعمل الاستعلامات المقدمة كما هي. لا تعد إلى ألفاظ السؤال العامية. ابحث في جميع المفاهيم المذكورة، مع الالتزام بنطاق المعجم المحدد.`;

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    meaning: { type: 'string' },
    candidate_terms: {
      type: 'array',
      items: {
        type: 'object',
        properties: { term: { type: 'string' }, root: { type: 'string' } },
        required: ['term', 'root'],
        additionalProperties: false
      }
    },
    queries: { type: 'array', items: { type: 'string' } }
  },
  required: ['meaning', 'candidate_terms', 'queries'],
  additionalProperties: false
};

const ANALYSIS_INSTRUCTIONS = `أنت محلل للمصطلحات المعجمية. لا تبحث في ملفات ولا تجب عن السؤال. حلل المقصود فقط ثم أخرج JSON حسب المخطط.
1. اكتب meaning بالفصحى في جملة واحدة تصف المعنى الذي يقصده السائل.
2. استنتج من 2 إلى 4 candidate_terms، الأرجح أولاً، واكتب جذر كل مصطلح. اشتق المصطلح من وظيفة الشيء أو من جذر فعل/اسم الوصف، ولا تكتف بتبديل كلمات السؤال.
ميّز بين موضع التقاء عظمتين (المفصل) وبين النسيج الذي يربط العظام (الرباط)، ولا تستبدل أحدهما بالآخر من دون قرينة واضحة.
3. اكتب 4 أو 5 queries قصيرة، كل واحدة من 2 إلى 5 كلمات فصيحة، مبنية على المصطلحات المرشحة وجذرها وبابها ومرادف قوي. اجعل استعلاماً أو اثنين منها لمفاهيم مجاورة في الباب نفسه كي تسترجع بطاقات قريبة، لا المصطلح المرشح وحده. تجنب نسخ العبارة العامية أو ألفاظها المميزة.
لا تضف نصاً خارج JSON.`;

const DICTIONARY_INSTRUCTIONS = {
  fiqhi_main: `## نطاق البحث: المعجم الفقهي حصراً
فكّر بأبواب الفقه: العبادات، المعاملات، النكاح والأسرة، الحدود والديات، الأطعمة والذبائح، والأعيان والحيوانات والأعضاء بأسمائها الفقهية. لا تخلط المصطلح الفقهي بالمصطلح الأصولي أو اللغوي.`,
  usuli_dict: `## نطاق البحث: المعجم الأصولي حصراً
فكّر بمفاهيم علم أصول الفقه فقط: الأدلة وحجيتها، دلالات الألفاظ، الأحكام التكليفية والوضعية، الاجتهاد والتقليد، التعارض والترجيح، النسخ، والأصول العملية. لا تحوّل السؤال إلى تعريف لغوي أو فرعي فقهي، ولا ترجّح مصطلحاً فقهياً فرعياً على المصطلح الأصولي المقابل.`,
  lughawi_dict: `## نطاق البحث: المعجم اللغوي حصراً
فكّر بالجذور والصيغ والمعاني اللغوية للألفاظ وبالمترادفات والأضداد. ابدأ بجذر اللفظ المقصود، وراعِ الاستعمال اللغوي أو الصرفي أو النحوي كما يورده المعجم. لا تنقل المعنى الفقهي أو الأصولي إلى نتيجة لغوية.`,
  all: `## نطاق البحث: المعاجم الثلاثة
طبّق نطاق كل معجم على حدة: المصطلحات الفقهية للمعجم الفقهي، ومفاهيم أصول الفقه للمعجم الأصولي، والجذور والمعاني والاستعمالات اللغوية للمعجم اللغوي. اكتب اسم المعجم بالعربية في dictionaryName لكل نتيجة، ولا تخلط بينها.`
};

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          dictionaryName: { type: 'string', enum: ALL_DICTIONARY_LABELS },
          page: { type: 'number' },
          short_meaning: { type: 'string' },
          source: { type: 'string' }
        },
        required: ['term', 'dictionaryName', 'page', 'short_meaning', 'source'],
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
    const scopeInstructions = scope.length === 1
      ? DICTIONARY_INSTRUCTIONS[scope[0]]
      : DICTIONARY_INSTRUCTIONS.all;
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

    const maxResults = Math.max(1, Math.min(Number(env.MAX_SEARCH_RESULTS) || 20, Number(payload.maxResults) || 20, 20));
    const started = Date.now();
    let analysisResponse;
    try {
      analysisResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          instructions: `${ANALYSIS_INSTRUCTIONS}\n\n${scopeInstructions}`,
          input: `السؤال الأصلي: ${query}\nنطاق البحث: ${scope.map((id) => DICTIONARIES[id].label).join('، ')}`,
          reasoning: { effort: 'none' },
          temperature: 0,
          max_output_tokens: 400,
          text: { format: { type: 'json_schema', name: 'dictionary_query_analysis', strict: true, schema: ANALYSIS_SCHEMA } }
        })
      });
    } catch {
      return json(request, env, { message: 'تعذر الاتصال بخدمة البحث.' }, 502);
    }
    const analysisData = await analysisResponse.json().catch(() => ({}));
    if (!analysisResponse.ok) {
      return json(request, env, { message: analysisData.error?.message || 'تعذر تحليل سؤال البحث.' }, 502);
    }

    let analysis;
    try {
      analysis = JSON.parse(outputText(analysisData));
    } catch {
      return json(request, env, { message: 'تعذر فهم سؤال البحث. حاول بصياغة أخرى.' }, 502);
    }
    const meaning = typeof analysis.meaning === 'string' ? analysis.meaning.trim().slice(0, 500) : '';
    const candidateTerms = (Array.isArray(analysis.candidate_terms) ? analysis.candidate_terms : [])
      .slice(0, 4)
      .map((candidate) => `${String(candidate.term || '').trim()} (الجذر: ${String(candidate.root || '').trim()})`)
      .filter((candidate) => candidate.length > 12);
    const candidateTermRanks = new Map(
      (Array.isArray(analysis.candidate_terms) ? analysis.candidate_terms : [])
        .slice(0, 4)
        .map((candidate, index) => [normalizeTerm(candidate.term || ''), index])
        .filter(([term]) => term)
    );
    const queries = (Array.isArray(analysis.queries) ? analysis.queries : [])
      .slice(0, 5)
      .map((item) => String(item || '').trim().slice(0, 120))
      .filter(Boolean);
    if (!meaning || !queries.length) {
      return json(request, env, { message: 'لم أتمكن من استنتاج مصطلح مناسب لهذا السؤال.' }, 200);
    }

    let openAiResponse;
    try {
      openAiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          instructions: `${BASE_INSTRUCTIONS}\n\n${scopeInstructions}`,
          input: `السؤال الأصلي: ${query}\n\nالمعنى المقصود: ${meaning}\n\nالمصطلحات المرشحة (الأرجح أولاً):\n${candidateTerms.map((term, index) => `${index + 1}. ${term}`).join('\n')}\n\nنطاق البحث: ${scope.map((id) => DICTIONARIES[id].label).join('، ')}\n\nاستعلامات file_search، استخدمها كما هي:\n${queries.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
          reasoning: { effort: 'low' },
          max_output_tokens: 1200,
          max_tool_calls: 1,
          tool_choice: 'required',
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
      const rankedItems = (Array.isArray(parsed.results) ? parsed.results : [])
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const rankA = candidateTermRanks.get(normalizeTerm(a.item?.term || '')) ?? 99;
          const rankB = candidateTermRanks.get(normalizeTerm(b.item?.term || '')) ?? 99;
          return rankA - rankB || a.index - b.index;
        });
      for (const { item } of rankedItems) {
        if (!item || typeof item.term !== 'string') continue;
        const dictionaryId = scope.length === 1
          ? scope[0]
          : ALL_SCOPES.find((id) => DICTIONARIES[id].label === item.dictionaryName);
        if (!dictionaryId || !scope.includes(dictionaryId)) continue;
        const key = normalizeTerm(item.term);
        if (!key || seenTerms.has(key)) continue;
        seenTerms.add(key);
        const shortMeaning = typeof item.short_meaning === 'string'
          ? item.short_meaning.trim().split(/\s+/).filter(Boolean).slice(0, 15).join(' ')
          : '';
        results.push({ ...item, id: key, dictionaryId, short_meaning: shortMeaning, page: 0, source: '' });
        if (results.length === 5) break;
      }
      return json(request, env, {
        results,
        message: parsed.message || '',
        inputTokens: (analysisData.usage?.input_tokens || 0) + (responseData.usage?.input_tokens || 0),
        outputTokens: (analysisData.usage?.output_tokens || 0) + (responseData.usage?.output_tokens || 0),
        totalTokens: (analysisData.usage?.total_tokens || 0) + (responseData.usage?.total_tokens || 0),
        meaning,
        candidateTerms: (Array.isArray(analysis.candidate_terms) ? analysis.candidate_terms : [])
          .slice(0, 4)
          .map((candidate) => ({ term: String(candidate.term || '').trim(), root: String(candidate.root || '').trim() }))
          .filter((candidate) => candidate.term),
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
