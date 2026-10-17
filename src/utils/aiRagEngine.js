/**
 * محرك البحث الدلالي السحابي والمحلي (OpenAI Responses API + File Search Vector Store RAG & Benchmarking)
 * - يدعم OpenAI Responses API (/v1/responses) مع أداة file_search ومخزن المتجهات Vector Store:
 *   vs_6ad37a3dabac81918cc341f5c2bd0d02
 * - يطبق Structured Outputs (json_schema: dictionary_search_results) بصرامة.
 * - يستخرج النتائج من output_text أو من مصفوفة output -> message -> content[0].text.
 * - يستخرج بيانات التوكنات (input_tokens, output_tokens, total_tokens) وزمن الاستجابة بالثواني.
 * - يدعم أيضاً التبديل لمزودات أخرى للتجربة والمقارنة (Gemini, DeepSeek, Claude) مع إرجاع نفس هيكل الـ JSON الموحد.
 */

import { normalizeArabic, smartSearchEntries } from './smartSearch.js';

export const DEFAULT_VECTOR_STORE_ID = 'vs_6ad37a3dabac81918cc341f5c2bd0d02';

export const DEFAULT_SYSTEM_PROMPT = `أنت محرك بحث معجمي مقيد. مهمتك الوحيدة هي فهم سؤال المستخدم (سواء كان باللهجة العامية العراقية أو الفصحى) واستخراج المصطلحات المطابقة له حصراً من ملفات المعجم في أداة file_search.
الحدود الصارمة للعمل:
1. ممنوع الشرح الطويل أو الإفتاء أو إضافة أي حرف من خارج المعجم.
2. إذا وجدت في النص عبارة إحالة مثل (راجع كذا)، ابحث عن المصطلح المحال إليه واستخرج معناه.
3. أرجع النتيجة دائماً بصيغة JSON فقط بدون أي نص خارجه، وتحتوي على قائمة (results) بحد أقصى 5 مصطلحات ليختار المستخدم منها، وكل عنصر يحتوي على:
- id: معرف الكلمة في المعجم إن وجد (مثل fiqh_647) أو اتركه فارغاً.
- term: اسم المصطلح الدقيق كما ورد في المعجم.
- dictionaryId: نوع المعجم (مثلاً: fiqhi_main).
- page: رقم الصفحة.
- short_meaning: ملخص مكثف جداً للمعنى من نص المعجم لا يتجاوز 20 كلمة يوضح للمستخدم لماذا هذا المصطلح يطابق سؤاله.
- source: المصدر المذكور بين الأقواس باختصار.
إذا لم تجد أي مصطلح مطابق في المعجم، أرجع مصفوفة results فارغة مع رسالة قصيرة في حقل message.`;

export const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI (Responses API + File Search)',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-4.1-mini']
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    suggestedModels: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro']
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner']
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    defaultModel: 'claude-3-7-sonnet-latest',
    suggestedModels: ['claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest']
  }
];

export const DICTIONARY_SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          term: { type: 'string' },
          dictionaryId: { type: 'string' },
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

const DICT_LABELS = {
  fiqhi_main: 'المعجم الفقهي',
  usuli_dict: 'المعجم الأصولي',
  lughawi_dict: 'المعجم اللغوي'
};

export function getDictionaryLabel(dictId) {
  return DICT_LABELS[dictId] || dictId || 'المعجم الفقهي';
}

/**
 * بناء جسم الطلب القياسي لـ OpenAI Responses API مع أداة file_search و json_schema
 */
export function buildOpenAiResponsesRequestBody({
  model,
  instructions,
  userQuery,
  vectorStoreIds,
  maxNumResults = 5,
  scopeFilter = 'all'
}) {
  const validStoreIds = (Array.isArray(vectorStoreIds) ? vectorStoreIds : [vectorStoreIds])
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  if (validStoreIds.length === 0) {
    validStoreIds.push(DEFAULT_VECTOR_STORE_ID);
  }

  const scopeHint =
    scopeFilter && scopeFilter !== 'all'
      ? ` [نطاق البحث المطلوب: ${scopeFilter} (${getDictionaryLabel(scopeFilter)})]`
      : '';

  const isReasoningModel = /^o\d/i.test((model || '').trim());

  const body = {
    model: (model || 'gpt-4o-mini').trim(),
    instructions: instructions || DEFAULT_SYSTEM_PROMPT,
    input: `${userQuery}${scopeHint}`,
    max_output_tokens: 450,
    tools: [
      {
        type: 'file_search',
        vector_store_ids: validStoreIds,
        max_num_results: Number(maxNumResults) || 5
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'dictionary_search_results',
        strict: true,
        schema: DICTIONARY_SEARCH_SCHEMA
      }
    }
  };

  if (!isReasoningModel) {
    body.temperature = 0.1;
  }

  return body;
}

/**
 * استخراج وفهم الرد (Response Parsing) من استجابة OpenAI Responses API
 */
export function parseOpenAiResponsesOutput(apiResponseData) {
  if (!apiResponseData) {
    return { results: [], message: 'لم ترد استجابة من الخادم.' };
  }

  let rawJsonText = '';

  // 1. الفحص المباشر للحقل output_text إن وجد
  if (typeof apiResponseData.output_text === 'string' && apiResponseData.output_text.trim()) {
    rawJsonText = apiResponseData.output_text.trim();
  }

  // 2. البحث داخل مصفوفة output -> العنصر ذو النوع message -> content[0].text
  if (!rawJsonText && Array.isArray(apiResponseData.output)) {
    const msgItem = apiResponseData.output.find((item) => item && item.type === 'message');
    if (msgItem && Array.isArray(msgItem.content)) {
      for (const part of msgItem.content) {
        if (typeof part?.text === 'string' && part.text.trim()) {
          rawJsonText = part.text.trim();
          break;
        }
      }
    }
    // احتياط في حال كان النص في أي عنصر داخل output
    if (!rawJsonText) {
      for (const item of apiResponseData.output) {
        if (Array.isArray(item?.content)) {
          for (const part of item.content) {
            if (typeof part?.text === 'string' && part.text.trim()) {
              rawJsonText = part.text.trim();
              break;
            }
          }
        }
        if (rawJsonText) break;
      }
    }
  }

  if (!rawJsonText) {
    return { results: [], message: 'لم يتم العثور على نص مخرجات في رد النموذج.' };
  }

  // تنظيف أي علامات markdown ```json إن وجدت وتحويلها إلى كائن برمجي
  const cleaned = rawJsonText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      results: Array.isArray(parsed.results) ? parsed.results : [],
      message: typeof parsed.message === 'string' ? parsed.message : ''
    };
  } catch {
    // محاولة استخراج أول كائن JSON من النص
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return {
          results: Array.isArray(parsed.results) ? parsed.results : [],
          message: typeof parsed.message === 'string' ? parsed.message : ''
        };
      } catch {
        // ignore
      }
    }
    return { results: [], message: rawJsonText };
  }
}

/**
 * استرجاع هجين محلي للمزودات الأخرى (عند التبديل للتجربة خارج OpenAI Vector Store)
 */
export function retrieveLocalCandidates(allDictionaries, query, scopeDictId = 'all', maxCandidates = 5) {
  if (!query || !query.trim()) return [];
  let pool = [];
  const allEntriesMap = new Map();

  for (const dict of allDictionaries) {
    for (const entry of dict.preparedEntries || dict.entries || []) {
      const enriched = {
        ...entry,
        dictionaryId: entry.dictionaryId || dict.id,
        dictionaryLabel: dict.category || DICT_LABELS[dict.id] || 'المعجم'
      };
      allEntriesMap.set(normalizeArabic(entry.term), enriched);
      if (scopeDictId === 'all' || dict.id === scopeDictId) {
        pool.push(enriched);
      }
    }
  }

  const results = smartSearchEntries(pool, query, { letterFilter: 'الكل', searchScope: 'all' });
  const topCandidates = results.slice(0, Number(maxCandidates) || 5);

  return topCandidates.map((cand) => {
    let resolvedDefinition = cand.definition;
    const refRegex = /راجع\s+(?:لفظ|كلمة|باب)?\s*[«"(\[]?([^»")\].،:]{2,30})[»")\]]?/g;
    const matches = [...cand.definition.matchAll(refRegex)];
    const resolvedNotes = [];

    for (const m of matches) {
      const refTermRaw = m[1].trim();
      const normRef = normalizeArabic(refTermRaw);
      const targetEntry = allEntriesMap.get(normRef);
      if (targetEntry && targetEntry.id !== cand.id) {
        resolvedNotes.push(`[تعريف "${targetEntry.term}" المحال إليه: ${targetEntry.definition}]`);
      }
    }
    if (resolvedNotes.length > 0) {
      resolvedDefinition = `${cand.definition} ${resolvedNotes.join(' ')}`;
    }
    return {
      id: cand.id,
      term: cand.term,
      definition: resolvedDefinition,
      page: cand.page,
      dictionaryId: cand.dictionaryId,
      sources: cand.sources || []
    };
  });
}

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.2);
}

/**
 * استدعاء البحث الدلالي السحابي عبر OpenAI Responses API (/v1/responses) أو المزود البديل للتجربة
 */
export async function executeCloudSemanticSearch({
  provider = 'openai',
  model = 'gpt-4o-mini',
  apiKey = '',
  vectorStoreIds = [DEFAULT_VECTOR_STORE_ID],
  maxNumResults = 5,
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  userQuery = '',
  scopeFilter = 'all',
  allDictionaries = []
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('يرجى إدخال مفتاح الـ API (API Key) في شاشة الإعدادات أولاً.');
  }

  const startTime = performance.now();

  // المسار الأساسي ١: OpenAI Responses API مع أداة file_search والـ Vector Store
  if (provider === 'openai') {
    const requestBody = buildOpenAiResponsesRequestBody({
      model,
      instructions: systemPrompt,
      userQuery,
      vectorStoreIds,
      maxNumResults,
      scopeFilter
    });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `خطأ من OpenAI Responses API (${response.status})`);
    }

    const parsed = parseOpenAiResponsesOutput(data);
    const usage = data?.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const totalTokens =
      usage.total_tokens || inputTokens + outputTokens || estimateTokens(JSON.stringify(parsed));
    const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(2));

    return {
      results: parsed.results,
      message: parsed.message,
      inputTokens,
      outputTokens,
      totalTokens,
      responseTimeSec: elapsedSeconds
    };
  }

  // المسار ٢: دعم التبديل لمزودات أخرى للتجربة والمقارنة مع إرجاع نفس هيكل الـ JSON
  const localCands = retrieveLocalCandidates(allDictionaries, userQuery, scopeFilter, maxNumResults);
  const contextLines = localCands
    .map(
      (c) =>
        `- id: ${c.id} | term: ${c.term} | dictionaryId: ${c.dictionaryId} | page: ${c.page} | text: ${c.definition} | source: ${(c.sources || []).join('، ')}`
    )
    .join('\n');

  const promptForOtherProvider = `سؤال المستخدم: "${userQuery}"\n\nمقتطفات المعجم:\n${contextLines}\n\nأرجع JSON فقط مطابقاً للمخطط: {"results": [{"id":"","term":"","dictionaryId":"","page":1,"short_meaning":"","source":""}], "message": ""}`;

  let rawText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  if (provider === 'gemini') {
    const cleanModel = (model || 'gemini-2.5-flash').replace(/^models\//, '').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt || DEFAULT_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: promptForOtherProvider }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'خطأ من Gemini API');
    rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '{}';
    inputTokens = data?.usageMetadata?.promptTokenCount || 0;
    outputTokens = data?.usageMetadata?.candidatesTokenCount || 0;
    totalTokens = data?.usageMetadata?.totalTokenCount || estimateTokens(promptForOtherProvider + rawText);
  } else if (provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: (model || 'claude-3-7-sonnet-latest').trim(),
        max_tokens: 450,
        temperature: 0.1,
        system: systemPrompt || DEFAULT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: promptForOtherProvider }]
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'خطأ من Claude API');
    rawText = data?.content?.map((c) => c.text || '').join('\n') || '{}';
    inputTokens = data?.usage?.input_tokens || 0;
    outputTokens = data?.usage?.output_tokens || 0;
    totalTokens = inputTokens + outputTokens || estimateTokens(promptForOtherProvider + rawText);
  } else {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: (model || 'deepseek-chat').trim(),
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
          { role: 'user', content: promptForOtherProvider }
        ]
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'خطأ من DeepSeek API');
    rawText = data?.choices?.[0]?.message?.content || '{}';
    inputTokens = data?.usage?.prompt_tokens || 0;
    outputTokens = data?.usage?.completion_tokens || 0;
    totalTokens = data?.usage?.total_tokens || estimateTokens(promptForOtherProvider + rawText);
  }

  const parsed = parseOpenAiResponsesOutput({ output_text: rawText });
  const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(2));

  return {
    results: parsed.results,
    message: parsed.message,
    inputTokens,
    outputTokens,
    totalTokens,
    responseTimeSec: elapsedSeconds
  };
}

/**
 * مطابقة البطاقة المقترحة مع بيانات المعجم المحلية لفتح التعريف الكامل والأصلي
 */
export function findFullEntryInDictionaries(allDictionaries, cardItem) {
  if (!cardItem) return null;
  const targetId = String(cardItem.id || '').trim();
  const targetTermNorm = normalizeArabic(cardItem.term || '');

  // 1. البحث بواسطة id الدقيق
  if (targetId) {
    for (const dict of allDictionaries) {
      const foundById = (dict.preparedEntries || dict.entries || []).find((e) => e.id === targetId);
      if (foundById) return { entry: foundById, dict };
    }
  }

  // 2. البحث بواسطة تطابق اسم المصطلح (term)
  if (targetTermNorm) {
    for (const dict of allDictionaries) {
      const entries = dict.preparedEntries || dict.entries || [];
      const exact = entries.find((e) => (e._normTerm || normalizeArabic(e.term)) === targetTermNorm);
      if (exact) return { entry: exact, dict };
    }
    for (const dict of allDictionaries) {
      const entries = dict.preparedEntries || dict.entries || [];
      const partial = entries.find(
        (e) =>
          (e._normTerm || normalizeArabic(e.term)).includes(targetTermNorm) ||
          targetTermNorm.includes(e._normTerm || normalizeArabic(e.term))
      );
      if (partial) return { entry: partial, dict };
    }
  }

  return null;
}

/**
 * تحويل سجل التجارب (ai_search_benchmarks) إلى صيغة CSV
 */
export function convertLogsToCsv(logs) {
  const headers = [
    'timestamp',
    'provider',
    'model',
    'vectorStoreId',
    'query',
    'suggestedTerms',
    'totalTokens',
    'inputTokens',
    'outputTokens',
    'responseTimeSec',
    'rating',
    'systemPrompt'
  ];

  const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = logs.map((log) => [
    log.timestamp,
    log.provider || 'OpenAI',
    log.model,
    log.vectorStoreId || DEFAULT_VECTOR_STORE_ID,
    log.query,
    (log.results || []).map((r) => `${r.term} (ص${r.page})`).join(' | '),
    log.totalTokens ?? log.tokens ?? 0,
    log.inputTokens ?? 0,
    log.outputTokens ?? 0,
    log.responseTimeSec,
    log.rating,
    log.systemPrompt
  ]);

  return '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
}

/**
 * حساب ملخص أداء النماذج من سجل التجارب
 */
export function computeBenchmarkStats(logs) {
  if (!logs || logs.length === 0) {
    return { models: [], bestAccuracyModel: null, fastestModel: null, lowestTokensModel: null };
  }

  const byModel = new Map();

  for (const log of logs) {
    const key = `${log.model}`;
    if (!byModel.has(key)) {
      byModel.set(key, {
        key,
        provider: log.provider || 'OpenAI',
        model: log.model,
        totalRuns: 0,
        goodCount: 0,
        badCount: 0,
        totalTimeSec: 0,
        totalTokens: 0
      });
    }
    const item = byModel.get(key);
    item.totalRuns += 1;
    if (log.rating === 'good' || log.rating === 'جيد') item.goodCount += 1;
    else item.badCount += 1;
    item.totalTimeSec += Number(log.responseTimeSec) || 0;
    item.totalTokens += Number(log.totalTokens ?? log.tokens) || 0;
  }

  const models = Array.from(byModel.values()).map((m) => ({
    ...m,
    goodRate: Math.round((m.goodCount / m.totalRuns) * 100),
    avgTimeSec: Number((m.totalTimeSec / m.totalRuns).toFixed(2)),
    avgTokens: Math.round(m.totalTokens / m.totalRuns)
  }));

  models.sort((a, b) => b.goodRate - a.goodRate || a.avgTokens - b.avgTokens);

  const bestAccuracyModel = [...models].sort((a, b) => b.goodRate - a.goodRate || b.goodCount - a.goodCount)[0];
  const fastestModel = [...models].sort((a, b) => a.avgTimeSec - b.avgTimeSec)[0];
  const lowestTokensModel = [...models].sort((a, b) => a.avgTokens - b.avgTokens)[0];

  return {
    models,
    bestAccuracyModel,
    fastestModel,
    lowestTokensModel
  };
}
