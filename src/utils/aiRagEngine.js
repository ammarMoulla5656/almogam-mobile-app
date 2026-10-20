/**
 * محرك البحث الدلالي السحابي والمحلي:
 * 1. OpenAI Responses API (/v1/responses) مع أداة file_search ومخزن المتجهات Vector Store:
 * 2. Google Gemini Interactions API الرسمية (https://generativelanguage.googleapis.com/v1beta/interactions)
 *    وفق التوثيق الرسمي (https://ai.google.dev/gemini-api/docs/get-started) والنماذج المعتمدة:
 *    gemini-3.8-flash, gemini-3.5-flash-lite, gemini-4-argon, gemini-3.6-flash, gemini-3.1-flash-lite, gemini-3.1-pro-preview, gemini-3-flash-preview
 */

import { normalizeArabic, smartSearchEntries } from './smartSearch.js';

export const DEFAULT_VECTOR_STORE_ID = '';

export const DEFAULT_SYSTEM_PROMPT = `أنت محرك بحث معجمي فقهي سريع. مهمتك فهم سؤال المستخدم بالعامية أو الفصحى واستخراج 5 مصطلحات من أداة file_search.

قواعد السرعة والدقة:
1. استدعِ أداة file_search مرة واحدة فقط بمجموعة كلمات مفتاحية فقهية مركزة ترادف معنى سؤال المستخدم (مثلاً للبول والغائط: "سلس مسلوس حفيظة مبطون استبراء حدث أخبثان عذرة").
2. لا يجب أن تحتوي قائمة (results) دائماً على 5 مصطلحات كاملة: ضع في البداية المصطلحات المطابقة تماماً للسؤال، ثم أكمل الباقي إلى 3 مصطلحات قريبة او تشابة لكن في حال تطلب 5 اكتلبها واذا لم يتطلب لا داعي لكن ابحث على المعنى بدقة(مثل أبواب الطهارة أو الحدث أو التخلي) الظاهرة أمامك في نتائج البحث، ولا ترجع أقل من 5 مصطلحات أبداً.
3. التزم بنص المعجم حرفياً في حقل short_meaning (ملخص لا يتجاوز 15 كلمة) ولا تؤلف من خارج النص.
4. أرجع النتيجة بصيغة JSON فقط مطابقة للمخطط`;

export const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI (Responses API + File Search)',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini']
  },
  {
    id: 'gemini',
    name: 'Google Gemini (Interactions API)',
    defaultModel: 'gemini-3.8-flash',
    suggestedModels: [
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-4-argon',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview'
    ]
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

// مخطط Structured Output المتوافق مع Gemini Interactions API (https://ai.google.dev/gemini-api/docs/structured-output)
export const GEMINI_INTERACTIONS_SCHEMA = {
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
          page: { type: 'integer' },
          short_meaning: { type: 'string' },
          source: { type: 'string' }
        },
        required: ['id', 'term', 'dictionaryId', 'page', 'short_meaning', 'source']
      }
    },
    message: { type: 'string' }
  },
  required: ['results', 'message']
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
 * ترقية أي اسم نموذج Gemini قديم محفوظ مسبقاً (مثل gemini-2.5-flash-lite) إلى النماذج المعتمدة في التوثيق الرسمي
 */
export function normalizeGeminiModelName(model) {
  const cleaned = String(model || '')
    .replace(/^models\//i, '')
    .trim();
  if (!cleaned || cleaned === 'gemini-2.5-flash') return 'gemini-3.8-flash';
  if (cleaned === 'gemini-2.5-flash-lite' || cleaned === 'gemini-2.0-flash-lite') return 'gemini-3.5-flash-lite';
  if (cleaned === 'gemini-2.5-pro') return 'gemini-4-argon';
  if (cleaned === 'gemini-2.0-flash') return 'gemini-3.8-flash';
  return cleaned;
}

/**
 * بناء جسم الطلب القياسي لـ OpenAI Responses API مع أداة file_search و json_schema
 * مع تفعيل max_tool_calls: 1 لمنع تكرار البحث ومضاعفة التوكنات
 */
export function buildOpenAiResponsesRequestBody({
  model,
  instructions,
  userQuery,
  vectorStoreIds,
  maxNumResults = 8,
  scopeFilter = 'all'
}) {
  const validStoreIds = (Array.isArray(vectorStoreIds) ? vectorStoreIds : [vectorStoreIds])
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  const scopeHint =
    scopeFilter && scopeFilter !== 'all'
      ? ` [نطاق البحث المطلوب: ${scopeFilter} (${getDictionaryLabel(scopeFilter)})]`
      : '';

  const isReasoningModel = /^o\d/i.test((model || '').trim());

  const body = {
    model: (model || 'gpt-4o-mini').trim(),
    instructions: instructions || DEFAULT_SYSTEM_PROMPT,
    input: `${userQuery}${scopeHint}`,
    max_output_tokens: 700,
    max_tool_calls: 1,
    tools: [
      {
        type: 'file_search',
        vector_store_ids: validStoreIds,
        max_num_results: Number(maxNumResults) || 8
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
 * بناء جسم الطلب القياسي لـ Google Gemini Interactions API
 * وفق التوثيق الرسمي: https://ai.google.dev/gemini-api/docs/get-started
 * و https://ai.google.dev/gemini-api/docs/thinking
 */
export function buildGeminiInteractionsRequestBody({
  model,
  systemInstruction,
  instructions,
  inputPrompt,
  userQuery,
  localContextText
}) {
  const cleanModel = normalizeGeminiModelName(model);
  const resolvedInput =
    inputPrompt ||
    `سؤال المستخدم: "${userQuery || ''}"\n\nمقتطفات المعجم:\n${localContextText || ''}\n\nأرجع JSON فقط مطابقاً للمخطط.`;
  return {
    model: cleanModel,
    system_instruction: systemInstruction || instructions || DEFAULT_SYSTEM_PROMPT,
    input: resolvedInput,
    generation_config: {
      thinking_level: 'low',
      temperature: 0.1
    },
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: GEMINI_INTERACTIONS_SCHEMA
    }
  };
}

/**
 * استخراج النص المخرج من استجابة Google Gemini Interactions API
 * ({ steps: [{ type: "model_output", content: [{ type: "text", text: "..." }] }], usage: { total_tokens, total_input_tokens, total_output_tokens } })
 */
export function parseGeminiInteractionsOutput(data) {
  if (!data) {
    return { results: [], message: 'لم ترد استجابة من خادم Gemini.' };
  }

  let rawText = '';

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    rawText = data.output_text.trim();
  }

  if (!rawText && Array.isArray(data.steps)) {
    for (let i = data.steps.length - 1; i >= 0; i--) {
      const step = data.steps[i];
      if (step && step.type === 'model_output' && Array.isArray(step.content)) {
        const texts = step.content
          .filter((c) => c && (c.type === 'text' || typeof c.text === 'string'))
          .map((c) => c.text || '')
          .join('\n')
          .trim();
        if (texts) {
          rawText = texts;
          break;
        }
      }
    }
  }

  // دعم احتياطي في حال أرجع الخادم بنية candidates
  if (!rawText && Array.isArray(data.candidates)) {
    rawText = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n')?.trim() || '';
  }

  return parseOpenAiResponsesOutput({ output_text: rawText });
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
    const cleanMsg = cleaned.startsWith('{')
      ? 'انقطع رد النموذج قبل اكتمال صيغة JSON (incomplete)، يرجى إعادة المحاولة.'
      : rawJsonText;
    return { results: [], message: cleanMsg };
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
 * استدعاء البحث الدلالي السحابي عبر OpenAI Responses API (/v1/responses)
 * أو Google Gemini Interactions API (/v1beta/interactions) أو المزود البديل للتجربة
 */
export async function executeCloudSemanticSearch({
  provider = 'openai',
  model = 'gpt-4o-mini',
  apiKey = '',
  vectorStoreIds = [],
  maxNumResults = 8,
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
    const reconciledResults = reconcileResultsWithDictionaries(parsed.results, allDictionaries, scopeFilter);
    const usage = data?.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const totalTokens =
      usage.total_tokens || inputTokens + outputTokens || estimateTokens(JSON.stringify(parsed));
    const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(2));

    return {
      results: reconciledResults,
      message: parsed.message,
      inputTokens,
      outputTokens,
      totalTokens,
      responseTimeSec: elapsedSeconds
    };
  }

  // تحضير مقتطفات المعجم للمزودات الأخرى (إرسال أفضل 12-15 مرشحاً ليختار النموذج أدقها بحد أقصى maxNumResults)
  const candidatePoolCount = Math.max((Number(maxNumResults) || 5) * 3, 12);
  const localCands = retrieveLocalCandidates(allDictionaries, userQuery, scopeFilter, candidatePoolCount);
  const contextLines = localCands
    .map(
      (c) =>
        `- id: ${c.id} | term: ${c.term} | dictionaryId: ${c.dictionaryId} | page: ${c.page} | text: ${c.definition} | source: ${(c.sources || []).join('، ')}`
    )
    .join('\n');

  const promptForOtherProvider = `سؤال المستخدم: "${userQuery}"\n\nمقتطفات المعجم:\n${contextLines}\n\nأرجع JSON فقط مطابقاً للمخطط (بحد أقصى ${Number(maxNumResults) || 5} نتائج): {"results": [{"id":"","term":"","dictionaryId":"","page":1,"short_meaning":"","source":""}], "message": ""}`;

  // المسار ٢: Google Gemini Interactions API الرسمية (https://generativelanguage.googleapis.com/v1beta/interactions)
  if (provider === 'gemini') {
    const interactionBody = buildGeminiInteractionsRequestBody({
      model,
      systemInstruction: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      inputPrompt: promptForOtherProvider
    });

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim()
      },
      body: JSON.stringify(interactionBody)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `خطأ من Gemini Interactions API (${response.status})`);
    }

    const parsed = parseGeminiInteractionsOutput(data);
    const reconciledResults = reconcileResultsWithDictionaries(parsed.results, allDictionaries, scopeFilter);
    const usage = data?.usage || {};
    const inputTokens = usage.total_input_tokens || usage.input_tokens || 0;
    const outputTokens = usage.total_output_tokens || usage.output_tokens || 0;
    const totalTokens =
      usage.total_tokens ||
      inputTokens + outputTokens ||
      estimateTokens(promptForOtherProvider + JSON.stringify(parsed));
    const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(2));

    return {
      results: reconciledResults,
      message: parsed.message,
      inputTokens,
      outputTokens,
      totalTokens,
      responseTimeSec: elapsedSeconds
    };
  }

  // المسار ٣: Claude أو DeepSeek
  let rawText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  if (provider === 'claude') {
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
  const reconciledResults = reconcileResultsWithDictionaries(parsed.results, allDictionaries, scopeFilter);
  const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(2));

  return {
    results: reconciledResults,
    message: parsed.message,
    inputTokens,
    outputTokens,
    totalTokens,
    responseTimeSec: elapsedSeconds
  };
}

function stripLeadingAl(normStr) {
  return (normStr || '').replace(/^ال/, '').trim();
}

/**
 * مطابقة البطاقة المقترحة مع بيانات المعجم المحلية لفتح التعريف الكامل والأصلي
 * تعطي الأولوية القصوى لتطابق اسم المصطلح (term) لتجنب أي إزاحة في أرقام id بين ملفات السحابة والمعجم المحلي
 */
export function findFullEntryInDictionaries(allDictionaries, cardItem) {
  if (!cardItem || !Array.isArray(allDictionaries) || allDictionaries.length === 0) return null;
  const targetId = String(cardItem.id || '').trim();
  const targetTermNorm = normalizeArabic(cardItem.term || '');
  const targetTermBare = stripLeadingAl(targetTermNorm);
  // بطاقة الذكاء الاصطناعي يجب أن تُطابق داخل معجمها فقط؛ البحث في المعاجم
  // الأخرى قد يفتح تعريفاً فقهياً لنتيجة أصولية لمجرد تشابه كلمة عامة.
  const requestedDictId = String(cardItem.dictionaryId || '').trim();
  const dict = allDictionaries.find((candidate) => candidate.id === requestedDictId);
  if (!dict) return null;
  const entries = dict.preparedEntries || dict.entries || [];
  const normTerm = (entry) => entry._normTerm || normalizeArabic(entry.term);

  // 1. البحث أولاً بتطابق اسم المصطلح الدقيق (مع أو بدون "ال" التعريف)
  if (targetTermNorm) {
    const exact = entries.find((e) => {
      const eNorm = normTerm(e);
      return eNorm === targetTermNorm || (targetTermBare.length >= 2 && stripLeadingAl(eNorm) === targetTermBare);
    });
    if (exact) return { entry: exact, dict };

    // يقبل العنوان الأصلي إذا كان عبارة أطول من اسم المصطلح، مثل
    // "استصحاب الحكم الشرعي" مقابل مدخل "الاستصحاب".
    const contained = entries
      .filter((e) => {
        const eNorm = normTerm(e);
        const eBare = stripLeadingAl(eNorm);
        return eBare.length >= 4 && targetTermBare.includes(eBare);
      })
      .sort((a, b) => normTerm(b).length - normTerm(a).length)[0];
    if (contained) return { entry: contained, dict };
  }

  // 2. البحث بواسطة id فقط إذا لم يكن هناك اسم مصطلح أو كان اسم المصطلح متطابقاً جزئياً مع العنصر
  if (targetId) {
    const foundById = entries.filter((e) => e.id === targetId);
    if (!targetTermNorm && foundById.length === 1) return { entry: foundById[0], dict };
  }

  return null;
}

/**
 * تصحيح ومطابقة نتائج الذكاء الاصطناعي مع المعجم المحلي لضمان دقة (id, page, source) عند الضغط على أي بطاقة
 */
export function reconcileResultsWithDictionaries(results, allDictionaries, scopeFilter = 'all') {
  if (!Array.isArray(results)) return [];
  if (!Array.isArray(allDictionaries) || allDictionaries.length === 0) return results;

  return results.map((item) => {
    const matched = findFullEntryInDictionaries(allDictionaries, item);
    if (scopeFilter !== 'all' && item.dictionaryId !== scopeFilter) return null;
    if (!matched) return item;
    const realEntry = matched.entry;
    const realDict = matched.dict;
    const entrySources = Array.isArray(realEntry.sources)
      ? realEntry.sources
      : realEntry.sources
        ? [realEntry.sources]
        : [];
    const cleanSource = entrySources[0] || '';

    return {
      ...item,
      id: realEntry.id,
      term: realEntry.term,
      dictionaryId: realDict.id,
      page: realEntry.page || null,
      source: cleanSource
    };
  }).filter(Boolean);
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
