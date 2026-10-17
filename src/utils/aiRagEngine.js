/**
 * محرك الذكاء الاصطناعي والبحث الموفر للتوكنات (AI RAG Search & Benchmarking Engine)
 * يدعم:
 * 1. استرجاع هجين محلي (Local Hybrid Retrieval) مع فك الإحالات ("راجع ...") تلقائياً.
 * 2. الاتصال المباشر بمزودي الذكاء الاصطناعي: Google Gemini, OpenAI, DeepSeek, Anthropic Claude, Custom OpenAI-Compatible URL.
 * 3. حساب زمن الاستجابة وعدد التوكنات المستهلكة.
 * 4. حفظ وتصدير واستيراد سجل التجارب (ai_benchmark_logs.json & CSV) وحساب إحصائيات مقارنة النماذج.
 */

import { normalizeArabic, smartSearchEntries } from './smartSearch.js';

export const DEFAULT_SYSTEM_PROMPT = `أنت باحث معجمي خبير في "المعجم الفقهي" و"المعجم الأصولي" و"المعجم اللغوي".
مهمتك مساعدة المستخدم في الوصول إلى المصطلح الدقيق ومعناه بالاعتماد الحصري على "مقتطفات المعجم المرفقة" مع السؤال.

التزم بالقواعد التالية بدقة:
1. إذا سأل المستخدم عن معنى كلمة مباشرة: اعرض له تعريفها من المعجم المرفق مع ذكر (نوع المعجم، رقم الصفحة، والمصدر المذكور بين الأقواس).
2. إذا سأل المستخدم سؤالاً بالمعنى أو باللهجة العامية (مثلاً يصف حالة أو عملية ويريد معرفة اسمها الفقهي أو اللغوي): استنتج المصطلح المطابق من المقتطفات المرفقة، واذكر اسمه بوضوح في بداية الجواب ثم اشرح معناه من نص المعجم.
3. الترشيحات: في نهاية إجابتك، رشّح للمستخدم (من 2 إلى 4 مصطلحات ذات صلة) وردت في المقتطفات المرفقة تحت عنوان "كلمات مقترحة من المعجم:".
4. الأمانة العلمية: لا تؤلف أي تعريف أو حكم شرعي من خارج النصوص المرفقة، وإذا لم تجد الإجابة في المقتطفات المرفقة قل بوضوح: "لا يوجد نص مطابق في المقترحات الحالية، جرّب تغيير كلمات البحث".
5. الاختصار والوضوح: اجعل إجابتك مباشرة، مرتبة، وسريعة القراءة.`;

export const AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    suggestedModels: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-2.0-flash']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1-nano']
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
    suggestedModels: ['claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest']
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible URL',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'llama-3.3-70b-versatile', 'qwen-2.5-72b-instruct']
  }
];

const DICT_LABELS = {
  fiqhi_main: 'المعجم الفقهي',
  usuli_dict: 'المعجم الأصولي',
  lughawi_dict: 'المعجم اللغوي'
};

/**
 * استخراج أفضل المرشحات محلياً مع فك إحالات "راجع ..." تلقائياً
 */
export function retrieveLocalCandidates(allDictionaries, query, scopeDictId = 'all', maxCandidates = 6) {
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
      if (scopeDictId === 'all' || scopeDictId === 'auto' || dict.id === scopeDictId) {
        pool.push(enriched);
      }
    }
  }

  // في حال كان النطاق "auto" (تحديد تلقائي)، نبحث في جميع المعاجم ونرتب الأعلى تطابقاً
  const results = smartSearchEntries(pool, query, { letterFilter: 'الكل', searchScope: 'all' });
  const topCandidates = results.slice(0, Number(maxCandidates) || 6);

  // فك الإحالات التي تبدأ بكلمة "راجع" وجلب تعريف الكلمة المحال إليها تلقائياً
  return topCandidates.map((cand) => {
    let resolvedDefinition = cand.definition;
    const refRegex = /راجع\s+(?:لفظ|كلمة|باب)?\s*[«"(\[]?([^»")\].،:]{2,30})[»")\]]?/g;
    const matches = [...cand.definition.matchAll(refRegex)];
    const resolvedNotes = [];

    for (const m of matches) {
      const refTermRaw = m[1].trim();
      const normRef = normalizeArabic(refTermRaw);
      let targetEntry = allEntriesMap.get(normRef);
      if (!targetEntry) {
        // بحث جزئي سريع عن الكلمة المحال إليها
        for (const [k, v] of allEntriesMap.entries()) {
          if (k === normRef || k.includes(normRef) || normRef.includes(k)) {
            targetEntry = v;
            break;
          }
        }
      }
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
      originalDefinition: cand.definition,
      letter: cand.letter,
      page: cand.page,
      dictionaryId: cand.dictionaryId,
      dictionaryLabel: cand.dictionaryLabel,
      sources: cand.sources || []
    };
  });
}

/**
 * بناء النص المضغوط الموفر للتوكنات الذي يُرسل مع سؤال المستخدم
 */
export function buildCompressedContextPrompt(userQuery, candidates) {
  const lines = candidates.map((c, idx) => {
    const srcText = c.sources && c.sources.length ? ` | المصادر: ${c.sources.join('، ')}` : '';
    return `${idx + 1}. [${c.dictionaryLabel} - ص ${c.page}] ${c.term}: ${c.definition}${srcText}`;
  });

  return `سؤال المستخدم: "${userQuery}"

مقتطفات المعجم المرفقة (${candidates.length} مصطلحات):
${lines.join('\n')}`;
}

/**
 * تقدير عدد التوكنات في حال لم يرجع المزود usage صريحاً
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.2);
}

/**
 * إرسال الطلب إلى مزود الذكاء الاصطناعي المختار وحساب الزمن والتوكنات
 */
export async function callAiProvider({
  provider,
  model,
  apiKey,
  customUrl,
  systemPrompt,
  userQuery,
  candidates
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('يرجى إدخال مفتاح الـ API لهذا المزود في شاشة الإعدادات أولاً.');
  }

  const userPrompt = buildCompressedContextPrompt(userQuery, candidates);
  const startTime = performance.now();

  let answerText = '';
  let totalTokens = 0;

  if (provider === 'gemini') {
    const cleanModel = (model || 'gemini-2.5-flash').replace(/^models\//, '').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt || DEFAULT_SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `خطأ من Gemini API (${response.status})`);
    }
    answerText =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') ||
      'لم يتم إرجاع نص من النموذج.';
    totalTokens =
      data?.usageMetadata?.totalTokenCount ||
      estimateTokens((systemPrompt || '') + userPrompt + answerText);
  } else if (provider === 'claude') {
    const url = 'https://api.anthropic.com/v1/messages';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: (model || 'claude-3-7-sonnet-latest').trim(),
        max_tokens: 1024,
        temperature: 0.2,
        system: systemPrompt || DEFAULT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `خطأ من Claude API (${response.status})`);
    }
    answerText =
      data?.content?.map((c) => c.text || '').join('\n') || 'لم يتم إرجاع نص من النموذج.';
    totalTokens =
      (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0) ||
      estimateTokens((systemPrompt || '') + userPrompt + answerText);
  } else {
    // OpenAI / DeepSeek / Custom OpenAI-Compatible URL
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    if (provider === 'deepseek') {
      endpoint = 'https://api.deepseek.com/chat/completions';
    } else if (provider === 'custom') {
      endpoint = (customUrl || '').trim() || 'https://api.openai.com/v1/chat/completions';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: (model || 'gpt-4o-mini').trim(),
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `خطأ من المزود (${response.status})`);
    }
    answerText = data?.choices?.[0]?.message?.content || 'لم يتم إرجاع نص من النموذج.';
    totalTokens =
      data?.usage?.total_tokens ||
      estimateTokens((systemPrompt || '') + userPrompt + answerText);
  }

  const elapsedSeconds = Number(((performance.now() - startTime) / 1000).toFixed(2));

  return {
    answer: answerText.trim(),
    tokens: totalTokens,
    responseTimeSec: elapsedSeconds
  };
}

/**
 * تحويل سجلات التقييم إلى صيغة CSV
 */
export function convertLogsToCsv(logs) {
  const headers = [
    'timestamp',
    'provider',
    'model',
    'dictionaryScope',
    'query',
    'candidatesSent',
    'responseTimeSec',
    'tokens',
    'rating',
    'note',
    'answer',
    'systemPrompt'
  ];

  const escapeCsv = (val) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = logs.map((log) => [
    log.timestamp,
    log.provider,
    log.model,
    log.dictionaryScope,
    log.query,
    (log.candidatesSent || []).map((c) => c.term || c).join(' | '),
    log.responseTimeSec,
    log.tokens,
    log.rating,
    log.note || '',
    log.answer,
    log.systemPrompt
  ]);

  return '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
}

/**
 * حساب إحصائيات ومقارنة النماذج من سجل التجارب
 */
export function computeBenchmarkStats(logs) {
  if (!logs || logs.length === 0) {
    return { models: [], bestAccuracyModel: null, fastestModel: null, lowestTokensModel: null };
  }

  const byModel = new Map();

  for (const log of logs) {
    const key = `${log.provider} • ${log.model}`;
    if (!byModel.has(key)) {
      byModel.set(key, {
        key,
        provider: log.provider,
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
    item.totalTokens += Number(log.tokens) || 0;
  }

  const models = Array.from(byModel.values()).map((m) => ({
    ...m,
    goodRate: Math.round((m.goodCount / m.totalRuns) * 100),
    avgTimeSec: Number((m.totalTimeSec / m.totalRuns).toFixed(2)),
    avgTokens: Math.round(m.totalTokens / m.totalRuns)
  }));

  models.sort((a, b) => b.goodRate - a.goodRate || a.avgTimeSec - b.avgTimeSec);

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
