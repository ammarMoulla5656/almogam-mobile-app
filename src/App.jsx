import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Sun,
  Moon,
  Copy,
  ChevronDown,
  Bookmark,
  Check,
  X,
  Info,
  Home,
  ArrowUpRight,
  ListFilter,
  Type,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Download,
  Upload,
  Plus,
  RotateCcw,
  KeyRound,
  Cpu,
  Database,
  Trash2
} from 'lucide-react';
import initialData from './data/dictionaries.json';
import { prepareEntryForSearch, smartSearchEntries } from './utils/smartSearch.js';
import {
  DEFAULT_VECTOR_STORE_ID,
  DEFAULT_SYSTEM_PROMPT,
  AI_PROVIDERS,
  getDictionaryLabel,
  normalizeGeminiModelName,
  executeCloudSemanticSearch,
  findFullEntryInDictionaries,
  convertLogsToCsv,
  computeBenchmarkStats
} from './utils/aiRagEngine.js';

const STORAGE_KEYS = {
  THEME: 'almogam_theme_v1',
  BOOKMARKS: 'almogam_bookmarks_v1',
  FONT_SIZE: 'almogam_font_size_v1',
  AI_CONFIG: 'almogam_ai_config_v3',
  AI_LOGS: 'ai_search_benchmarks'
};

const ARABIC_CHAPTERS = [
  { letter: 'الكل', short: 'الكل' },
  { letter: 'الهمزة', short: 'أ' },
  { letter: 'الباء', short: 'ب' },
  { letter: 'التاء', short: 'ت' },
  { letter: 'الثاء', short: 'ث' },
  { letter: 'الجيم', short: 'ج' },
  { letter: 'الحاء', short: 'ح' },
  { letter: 'الخاء', short: 'خ' },
  { letter: 'الدال', short: 'د' },
  { letter: 'الذال', short: 'ذ' },
  { letter: 'الراء', short: 'ر' },
  { letter: 'الزاي', short: 'ز' },
  { letter: 'السين', short: 'س' },
  { letter: 'الشين', short: 'ش' },
  { letter: 'الصاد', short: 'ص' },
  { letter: 'الضاد', short: 'ض' },
  { letter: 'الطاء', short: 'ط' },
  { letter: 'الظاء', short: 'ظ' },
  { letter: 'العين', short: 'ع' },
  { letter: 'الغين', short: 'غ' },
  { letter: 'الفاء', short: 'ف' },
  { letter: 'القاف', short: 'ق' },
  { letter: 'الكاف', short: 'ك' },
  { letter: 'اللام', short: 'ل' },
  { letter: 'الميم', short: 'م' },
  { letter: 'النون', short: 'ن' },
  { letter: 'الهاء', short: 'هـ' },
  { letter: 'الواو', short: 'و' },
  { letter: 'الياء', short: 'ي' }
];

const FONT_STYLES = {
  sm: { termSize: '18px', defSize: '16px', lineHeight: '1.75' },
  md: { termSize: '22px', defSize: '20px', lineHeight: '1.9' },
  lg: { termSize: '26px', defSize: '24px', lineHeight: '2.05' }
};

const DEFAULT_AI_CONFIG = {
  provider: 'openai',
  modelsByProvider: {
    openai: 'gpt-4o-mini',
    gemini: 'gemini-3.8-flash',
    deepseek: 'deepseek-chat',
    claude: 'claude-3-7-sonnet-latest'
  },
  apiKeysByProvider: {
    openai: '',
    gemini: '',
    deepseek: '',
    claude: ''
  },
  vectorStoreId: DEFAULT_VECTOR_STORE_ID,
  extraVectorStoreIds: '',
  maxNumResults: 8,
  systemPrompt: DEFAULT_SYSTEM_PROMPT
};

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [darkMode]);

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'md';
  });

  const currentFont = FONT_STYLES[fontSize] || FONT_STYLES.md;

  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const bookmarksSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  const toggleBookmark = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setBookmarks((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const allDictionaries = useMemo(() => {
    return initialData.dictionaries.map((d) => ({
      ...d,
      preparedEntries: d.entries.map(prepareEntryForSearch)
    }));
  }, []);

  // إعدادات الذكاء الاصطناعي وسجل التجارب (ai_search_benchmarks.json)
  const [aiConfig, setAiConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
      if (!saved) return DEFAULT_AI_CONFIG;
      const parsed = JSON.parse(saved);
      const mergedModels = {
        ...DEFAULT_AI_CONFIG.modelsByProvider,
        ...(parsed.modelsByProvider || {})
      };
      mergedModels.gemini = normalizeGeminiModelName(mergedModels.gemini);
      return {
        ...DEFAULT_AI_CONFIG,
        ...parsed,
        modelsByProvider: mergedModels,
        apiKeysByProvider: { ...DEFAULT_AI_CONFIG.apiKeysByProvider, ...(parsed.apiKeysByProvider || {}) }
      };
    } catch {
      return DEFAULT_AI_CONFIG;
    }
  });

  const updateAiConfig = (updater) => {
    setAiConfig((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      localStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify(next));
      return next;
    });
  };

  const [benchmarkLogs, setBenchmarkLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AI_LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const persistBenchmarkLogs = useCallback((logs) => {
    setBenchmarkLogs(logs);
    const jsonStr = JSON.stringify(logs, null, 2);
    localStorage.setItem(STORAGE_KEYS.AI_LOGS, jsonStr);
    const csvStr = convertLogsToCsv(logs);
    localStorage.setItem(STORAGE_KEYS.AI_LOGS + '_csv', csvStr);
    if (window.AndroidShare && typeof window.AndroidShare.saveBenchmarkFiles === 'function') {
      try {
        window.AndroidShare.saveBenchmarkFiles(jsonStr, csvStr);
      } catch {
        // ignore
      }
    }
  }, []);

  // حالة النافذة العائمة للبحث الدلالي بالذكاء الاصطناعي (Floating AI Search UI)
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiScope, setAiScope] = useState('all'); // 'all' | 'fiqhi_main' | 'usuli_dict' | 'lughawi_dict'
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [manualTermInput, setManualTermInput] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'good' | 'bad'
  const [selectedFullEntryModal, setSelectedFullEntryModal] = useState(null); // { entry, dict, aiCard }
  const [showStatsModal, setShowStatsModal] = useState(false);

  const getActiveVectorStoreIds = useCallback(() => {
    const primary = (aiConfig.vectorStoreId || DEFAULT_VECTOR_STORE_ID).trim();
    const extras = (aiConfig.extraVectorStoreIds || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return [primary, ...extras].filter(Boolean);
  }, [aiConfig.vectorStoreId, aiConfig.extraVectorStoreIds]);

  const handleRunAiSearch = async () => {
    if (!aiQuery.trim()) {
      showToast('يرجى كتابة سؤالك أو المعنى المراد البحث عنه أولاً');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setFeedbackGiven(null);

    const providerId = aiConfig.provider || 'openai';
    const providerObj = AI_PROVIDERS.find((p) => p.id === providerId) || AI_PROVIDERS[0];
    const modelName = aiConfig.modelsByProvider[providerId] || providerObj.defaultModel;
    const apiKey = aiConfig.apiKeysByProvider[providerId] || '';
    const storeIds = getActiveVectorStoreIds();

    try {
      const res = await executeCloudSemanticSearch({
        provider: providerId,
        model: modelName,
        apiKey,
        vectorStoreIds: storeIds,
        maxNumResults: Number(aiConfig.maxNumResults) || 8,
        systemPrompt: aiConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        userQuery: aiQuery.trim(),
        scopeFilter: aiScope,
        allDictionaries
      });

      setAiResult({
        results: res.results || [],
        message: res.message || '',
        inputTokens: res.inputTokens || 0,
        outputTokens: res.outputTokens || 0,
        totalTokens: res.totalTokens || 0,
        responseTimeSec: res.responseTimeSec || 0,
        provider: providerObj.name,
        providerId,
        model: modelName,
        vectorStoreId: storeIds.join(', '),
        query: aiQuery.trim(),
        scope: aiScope
      });
    } catch (err) {
      setAiError(err.message || 'حدث خطأ أثناء الاتصال بسحابة الذكاء الاصطناعي');
    } finally {
      setAiLoading(false);
    }
  };

  // حذف بطاقة غير مناسبة من النتائج المقترحة قبل التقييم
  const handleRemoveSuggestedCard = (idx, e) => {
    if (e) e.stopPropagation();
    setAiResult((prev) => {
      if (!prev) return prev;
      const updated = prev.results.filter((_, i) => i !== idx);
      return { ...prev, results: updated };
    });
  };

  // إضافة مصطلح يدوياً لقائمة النتائج المقترحة قبل التقييم
  const handleAddManualSuggestedCard = () => {
    if (!manualTermInput.trim() || !aiResult) return;
    const matched = findFullEntryInDictionaries(allDictionaries, { term: manualTermInput.trim() });
    const newCard = matched
      ? {
          id: matched.entry.id,
          term: matched.entry.term,
          dictionaryId: matched.dict.id,
          page: matched.entry.page || 1,
          short_meaning: matched.entry.definition.slice(0, 110) + '...',
          source: (matched.entry.sources || [])[0] || matched.dict.category
        }
      : {
          id: `manual_${Date.now()}`,
          term: manualTermInput.trim(),
          dictionaryId: aiScope === 'all' ? 'fiqhi_main' : aiScope,
          page: 1,
          short_meaning: 'مصطلح مضاف يدوياً لتصحيح القائمة المقترحة',
          source: 'إضافة يدوية'
        };

    setAiResult((prev) => ({
      ...prev,
      results: [...(prev?.results || []), newCard]
    }));
    setManualTermInput('');
    showToast(`تمت إضافة "${newCard.term}" إلى البطاقات المقترحة`);
  };

  // فتح التعريف الكامل والأصلي من المعجم المحلي عند الضغط على أي بطاقة مقترحة
  const handleOpenSuggestedCardFullView = (cardItem) => {
    const matched = findFullEntryInDictionaries(allDictionaries, cardItem);
    if (matched) {
      setSelectedFullEntryModal({
        entry: matched.entry,
        dict: matched.dict,
        aiCard: cardItem
      });
    } else {
      // في حال لم يجد تطابقاً حرفياً في المعجم المحلي، نعرض نافذة تحتوي على بيانات البطاقة مع زر البحث في المعجم
      setSelectedFullEntryModal({
        entry: {
          id: cardItem.id || 'ai_term',
          term: cardItem.term,
          definition: cardItem.short_meaning || 'اضغط على زر (فتح في المعجم) للبحث عن النص الكامل.',
          letter: cardItem.term?.replace(/^ال/, '')?.charAt(0) || 'أ',
          page: cardItem.page || 1,
          sources: cardItem.source ? [cardItem.source] : []
        },
        dict:
          allDictionaries.find((d) => d.id === cardItem.dictionaryId) || allDictionaries[0],
        aiCard: cardItem
      });
    }
  };

  // حفظ التقييم الفوري في ملف ai_search_benchmarks.json
  const handleRateAiResult = (ratingType) => {
    if (!aiResult) return;
    const logItem = {
      id: `bench_${Date.now()}`,
      timestamp: new Date().toLocaleString('sv-SE'),
      provider: aiResult.provider,
      model: aiResult.model,
      vectorStoreId: aiResult.vectorStoreId || DEFAULT_VECTOR_STORE_ID,
      systemPrompt: aiConfig.systemPrompt,
      query: aiResult.query,
      results: aiResult.results,
      inputTokens: aiResult.inputTokens,
      outputTokens: aiResult.outputTokens,
      totalTokens: aiResult.totalTokens,
      responseTimeSec: aiResult.responseTimeSec,
      rating: ratingType === 'good' ? 'جيد' : 'سيء'
    };

    const nextLogs = [logItem, ...benchmarkLogs];
    persistBenchmarkLogs(nextLogs);
    setFeedbackGiven(ratingType);
    showToast(`تم حفظ التقييم (${logItem.rating}) في ai_search_benchmarks.json`);
  };

  const handleExportBenchmarkLogs = (format = 'json') => {
    if (benchmarkLogs.length === 0) {
      showToast('لا توجد تجارب محفوظة بعد للتصدير');
      return;
    }
    const isCsv = format === 'csv';
    const content = isCsv ? convertLogsToCsv(benchmarkLogs) : JSON.stringify(benchmarkLogs, null, 2);
    const filename = isCsv ? 'ai_search_benchmarks.csv' : 'ai_search_benchmarks.json';

    if (window.AndroidShare && typeof window.AndroidShare.share === 'function') {
      window.AndroidShare.saveBenchmarkFiles(
        JSON.stringify(benchmarkLogs, null, 2),
        convertLogsToCsv(benchmarkLogs)
      );
      window.AndroidShare.share(filename, content);
      return;
    }

    const blob = new Blob([content], {
      type: isCsv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`تم تصدير ${filename} بنجاح`);
  };

  const handleImportBenchmarkLogs = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const imported = Array.isArray(parsed) ? parsed : parsed.logs || [];
        if (!imported.length) {
          showToast('الملف لا يحتوي على تجارب صالحة');
          return;
        }
        const merged = [...imported, ...benchmarkLogs];
        persistBenchmarkLogs(merged);
        setShowStatsModal(true);
        showToast(`تم استيراد ${imported.length} تجربة بنجاح!`);
      } catch {
        showToast('تأكد من اختيار ملف JSON صالح');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // حالة التصفح الرئيسية للمعجم
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDictId, setSelectedDictId] = useState('fiqhi_main');
  const [selectedLetter, setSelectedLetter] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedEntryId, setPinnedEntryId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set(['fiqh_1']));
  const [visibleCount, setVisibleCount] = useState(12);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2300);
  }, []);

  const currentDict = useMemo(() => {
    return allDictionaries.find((d) => d.id === selectedDictId) || allDictionaries[0];
  }, [allDictionaries, selectedDictId]);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedLetter, selectedDictId, activeTab]);

  const filteredEntries = useMemo(() => {
    if (!currentDict) return [];
    const results = smartSearchEntries(currentDict.preparedEntries, searchQuery, {
      letterFilter: activeTab === 'home' ? 'الكل' : selectedLetter,
      searchScope: 'all',
      onlyBookmarks: activeTab === 'bookmarks',
      bookmarksSet
    });
    if (pinnedEntryId && searchQuery.trim()) {
      const pinned =
        results.find((e) => e.id === pinnedEntryId) ||
        currentDict.preparedEntries.find((e) => e.id === pinnedEntryId);
      if (pinned) {
        return [pinned, ...results.filter((e) => e.id !== pinnedEntryId)];
      }
    }
    return results;
  }, [currentDict, searchQuery, selectedLetter, activeTab, bookmarksSet, pinnedEntryId]);

  const toggleCard = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCopy = useCallback(
    async (entry, dictCategory, e) => {
      if (e) e.stopPropagation();
      const cat = dictCategory || currentDict.category;
      const formatted = `📘 ${entry.term}\n\n${entry.definition}\n\n— (${cat} - ص ${entry.page || 1} - تطبيق المعجم)`;
      try {
        await navigator.clipboard.writeText(formatted);
        showToast(`تم نسخ "${entry.term}"`);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = formatted;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`تم نسخ "${entry.term}"`);
      }
    },
    [currentDict, showToast]
  );

  const extractCrossReference = useCallback((definition) => {
    if (!definition) return null;
    const match = definition.match(
      /(راجع|يراجع|انظر)\s+(?:ما\s+(?:يأتي|سبق)\s+(?:أيضا\s+|أيضاً\s+)?في\s+)?(?:مادة|لفظ|كلمة|باب)?\s*[:：]?\s*[«"(\[]?([^»")\].،؛:\n]{2,28})[»")\]]?/
    );
    if (!match) return null;
    const verb = match[1] === 'انظر' ? 'انظر' : 'راجع';
    const rawTarget = match[2].replace(/[«»"()[\]]/g, '').trim();
    if (!rawTarget) return null;
    const skipBooks = [
      'اللسان', 'التهذيب', 'الديوان', 'صحيح', 'الصبح', 'إرشاد', 'الصحاح',
      'القاموس', 'المحكم', 'جمهرة', 'السبعة', 'تفسيره', 'الحيوان', 'ضعيف',
      'الشرائع', 'اللمعة', 'المكاسب', 'التحرير', 'الجواهر', 'العروة',
      'المبسوط', 'المصباح', 'الفتاوى', 'محاشي', 'المجمع'
    ];
    if (skipBooks.some((b) => rawTarget.includes(b)) || /\b(?:ص|ج)\s*[0-9٠-٩۱-۹]/.test(rawTarget)) {
      return null;
    }
    return { verb, target: rawTarget };
  }, []);

  const jumpToTerm = useCallback(
    (refTerm, dictId, entryId, e) => {
      if (e) e.stopPropagation();
      const cleaned = (refTerm || '')
        .replace(/^[«"(\[]+|[»")\].،؛:]+$/g, '')
        .replace(/[«»"()[\]]/g, '')
        .trim();
      const targetDictId =
        dictId && allDictionaries.some((d) => d.id === dictId) ? dictId : selectedDictId;
      const targetDict =
        allDictionaries.find((d) => d.id === targetDictId) || currentDict || allDictionaries[0];

      if (targetDictId !== selectedDictId) {
        setSelectedDictId(targetDictId);
      }

      let targetEntry = null;
      if (entryId && targetDict) {
        targetEntry = targetDict.preparedEntries.find((item) => item.id === entryId) || null;
      }
      if (!targetEntry && targetDict && cleaned) {
        const searchMatches = smartSearchEntries(targetDict.preparedEntries, cleaned, {
          letterFilter: 'الكل',
          searchScope: 'all'
        });
        if (searchMatches.length > 0) {
          targetEntry = searchMatches[0];
        }
      }

      setSelectedLetter('الكل');
      setActiveTab('dictionary');
      setSearchQuery(cleaned);

      if (targetEntry) {
        setPinnedEntryId(targetEntry.id);
        setExpandedIds(new Set([targetEntry.id]));
      } else if (entryId) {
        setPinnedEntryId(entryId);
        setExpandedIds(new Set([entryId]));
      }

      setSelectedFullEntryModal(null);
      setAiSheetOpen(false);

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 60);
      }

      showToast(targetEntry ? `عرض: ${targetEntry.term}` : `عرض: ${cleaned}`);
    },
    [allDictionaries, currentDict, selectedDictId, showToast]
  );

  const stats = useMemo(() => computeBenchmarkStats(benchmarkLogs), [benchmarkLogs]);
  const activeProviderObj = AI_PROVIDERS.find((p) => p.id === aiConfig.provider) || AI_PROVIDERS[0];

  const renderEntryCards = (entriesList) => {
    if (entriesList.length === 0) {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 shadow-sm my-3">
          <Search className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
            {activeTab === 'bookmarks' ? 'لا توجد مصطلحات محفوظة بعد' : 'لا توجد نتائج مطابقة'}
          </h3>
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        {entriesList.slice(0, visibleCount).map((entry) => {
          const isExpanded = expandedIds.has(entry.id);
          const isBookmarked = bookmarksSet.has(entry.id);
          const refInfo = extractCrossReference(entry.definition);

          return (
            <div
              key={entry.id}
              id={`entry-card-${entry.id}`}
              onClick={() => toggleCard(entry.id)}
              className={`rounded-3xl transition-all duration-200 cursor-pointer border ${
                isExpanded
                  ? 'bg-white dark:bg-slate-900 border-teal-500 shadow-lg ring-2 ring-teal-500/20'
                  : 'bg-white dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 shadow-sm active:scale-[0.99]'
              }`}
            >
              <div className="p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 transition-colors ${
                      isExpanded
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-slate-700'
                    }`}
                  >
                    {entry.term.replace(/^ال/, '').charAt(0) || 'أ'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        style={{ fontSize: currentFont.termSize }}
                        className="font-extrabold text-slate-900 dark:text-white leading-snug"
                      >
                        {entry.term}
                      </h2>
                      {!isExpanded && refInfo && (
                        <button
                          onClick={(e) => jumpToTerm(refInfo.target, currentDict.id, null, e)}
                          className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center gap-1 transition shadow-xs"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>
                            {refInfo.verb}: {refInfo.target}
                          </span>
                        </button>
                      )}
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        باب {entry.letter} • ص {entry.page}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => toggleBookmark(entry.id, e)}
                    className={`p-2.5 rounded-2xl transition ${
                      isBookmarked
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-teal-600 dark:text-teal-400' : 'text-slate-400'
                    }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50 rounded-b-3xl cursor-auto select-text"
                >
                  <p
                    style={{ fontSize: currentFont.defSize, lineHeight: currentFont.lineHeight }}
                    className="font-serif text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-inner"
                  >
                    {entry.definition}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-3 mb-4">
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-teal-100/80 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">
                      باب حرف {entry.letter} (ص {entry.page})
                    </span>

                    {refInfo && (
                      <button
                        onClick={(e) => jumpToTerm(refInfo.target, currentDict.id, null, e)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 active:scale-95 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center gap-1 transition shadow-xs"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>
                          {refInfo.verb}: {refInfo.target}
                        </span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleCopy(entry, currentDict.category, e)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-sm font-extrabold shadow-md transition"
                  >
                    <Copy className="w-4 h-4" />
                    <span>نسخ الجواب</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {entriesList.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 12)}
            className="w-full py-4 rounded-3xl bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 font-extrabold text-base border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            عرض المزيد
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 select-none">
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[80] bg-teal-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* الهيدر في شاشة المعجم والمحفوظات */}
      {(activeTab === 'dictionary' || activeTab === 'bookmarks') && (
        <header className="sticky top-0 z-30 bg-gradient-to-l from-teal-800 via-teal-700 to-emerald-800 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950 text-white shadow-lg">
          <div className="max-w-lg mx-auto px-3.5 pt-3.5 pb-3.5 space-y-3">
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-black/25 dark:bg-slate-950/70 border border-white/10">
              {allDictionaries.map((dict) => {
                const isSelected = dict.id === currentDict.id;
                return (
                  <button
                    key={dict.id}
                    onClick={() => {
                      setSelectedDictId(dict.id);
                      setSelectedLetter('الكل');
                    }}
                    className={`py-3 px-2 rounded-xl text-sm sm:text-base font-extrabold text-center transition-all ${
                      isSelected
                        ? 'bg-white text-teal-900 shadow-md scale-[1.02]'
                        : 'text-teal-50/90 hover:bg-white/10'
                    }`}
                  >
                    {dict.category}
                  </button>
                );
              })}
            </div>

            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-teal-200 absolute right-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setPinnedEntryId(null);
                  setSearchQuery(e.target.value);
                }}
                placeholder={`ابحث في ${currentDict.category}...`}
                className="w-full pr-12 pl-12 py-3.5 rounded-2xl bg-white/15 dark:bg-slate-800/95 text-white placeholder-teal-100/85 border border-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base font-bold"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setPinnedEntryId(null);
                    setSearchQuery('');
                  }}
                  className="absolute left-3.5 p-1.5 text-teal-100 hover:text-white bg-black/20 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedLetter !== 'الكل' && (
              <div className="flex items-center justify-between bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-sm font-extrabold">
                <span>التصفح الحالي: باب حرف {selectedLetter}</span>
                <button
                  onClick={() => setSelectedLetter('الكل')}
                  className="px-2.5 py-0.5 rounded-lg bg-slate-950/15 text-xs"
                >
                  إلغاء الفلتر ✕
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* المحتوى الرئيسي */}
      <main className="flex-1 max-w-lg w-full mx-auto px-3.5 pt-4 pb-36">
        {/* ١. الواجهة الرئيسية */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800 dark:from-slate-900 dark:to-teal-950 text-white p-6 shadow-xl border border-teal-600/30 text-center space-y-1.5">
              <h1 className="text-3xl font-extrabold">المعجم</h1>
              <p className="text-sm text-teal-100/90 font-medium">{currentDict.title}</p>
            </div>

            <div className="space-y-3">
              {allDictionaries.map((dict) => (
                <button
                  key={dict.id}
                  onClick={() => {
                    setSelectedDictId(dict.id);
                    setSelectedLetter('الكل');
                    setActiveTab('dictionary');
                  }}
                  className="w-full p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-teal-500 active:scale-[0.99] transition text-right flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="inline-block px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 text-xs font-extrabold">
                      {dict.category}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{dict.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">{dict.author}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-md">
                    ←
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ٢. شاشة المعجم والمحفوظات */}
        {(activeTab === 'dictionary' || activeTab === 'bookmarks') && renderEntryCards(filteredEntries)}

        {/* ٣. خانة الفهرست */}
        {activeTab === 'fehrest' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                الفهرست الأبجدي ({currentDict.category})
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                اختر الحرف لعرض جميع مصطلحاته
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {ARABIC_CHAPTERS.map((chap) => {
                const isSelected = selectedLetter === chap.letter;
                return (
                  <button
                    key={chap.letter}
                    onClick={() => {
                      setSelectedLetter(chap.letter);
                      setActiveTab('dictionary');
                    }}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl font-extrabold">{chap.short}</span>
                    <span className="text-xs font-bold">
                      {chap.letter === 'الكل' ? 'جميع الحروف' : `حرف ${chap.letter}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ٤. شاشة الإعدادات */}
        {activeTab === 'about' && (
          <div className="space-y-4 select-text">
            {/* أ. إعدادات المظهر والخط */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">إعدادات المظهر والخط</h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDarkMode(false)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-extrabold text-base transition ${
                    !darkMode
                      ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <Sun className="w-7 h-7 text-amber-500" />
                  <span>ثيم أبيض</span>
                </button>

                <button
                  onClick={() => setDarkMode(true)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-extrabold text-base transition ${
                    darkMode
                      ? 'border-teal-500 bg-slate-800 text-white shadow-sm'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Moon className="w-7 h-7 text-teal-400" />
                  <span>ثيم أسود</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <Type className="w-5 h-5 text-teal-600" />
                  <span>حجم الخط في التطبيق:</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'sm', label: 'عادي' },
                    { id: 'md', label: 'كبير' },
                    { id: 'lg', label: 'كبير جداً' }
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      onClick={() => {
                        setFontSize(sz.id);
                        localStorage.setItem(STORAGE_KEYS.FONT_SIZE, sz.id);
                      }}
                      className={`py-3.5 rounded-2xl font-extrabold text-base border-2 transition ${
                        fontSize === sz.id
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ب. شاشة إعدادات الذكاء الاصطناعي (AI Settings - OpenAI Responses API & Vector Store) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-teal-500/40 dark:border-teal-500/30 shadow-md space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sparkles className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    إعدادات الذكاء الاصطناعي (AI Settings)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                    OpenAI Responses API + File Search (Cloud Vector Store RAG)
                  </p>
                </div>
              </div>

              {/* 1. اختيار المزود (OpenAI افتراضياً مع دعم التبديل للتجربة) */}
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  مزود الذكاء الاصطناعي (Provider):
                </label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => updateAiConfig({ provider: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. حقل API Key */}
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>مفتاح API Key الخاص بـ ({activeProviderObj.name}):</span>
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={aiConfig.apiKeysByProvider[aiConfig.provider] || ''}
                  onChange={(e) =>
                    updateAiConfig((prev) => ({
                      ...prev,
                      apiKeysByProvider: {
                        ...prev.apiKeysByProvider,
                        [prev.provider]: e.target.value
                      }
                    }))
                  }
                  placeholder="sk-proj-..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* 3. حقل اسم النموذج (Model Name): القيمة الافتراضية gpt-4o-mini مع مقترحات gpt-4o, o3-mini */}
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-teal-600" />
                  <span>اسم النموذج (Model Name):</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={aiConfig.modelsByProvider[aiConfig.provider] || ''}
                  onChange={(e) =>
                    updateAiConfig((prev) => ({
                      ...prev,
                      modelsByProvider: {
                        ...prev.modelsByProvider,
                        [prev.provider]: e.target.value
                      }
                    }))
                  }
                  placeholder="gpt-4o-mini"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2" dir="ltr">
                  {activeProviderObj.suggestedModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        updateAiConfig((prev) => ({
                          ...prev,
                          modelsByProvider: { ...prev.modelsByProvider, [prev.provider]: m }
                        }))
                      }
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border transition ${
                        aiConfig.modelsByProvider[aiConfig.provider] === m
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. حقل معرف مخزن المتجهات (Vector Store ID) */}
              <div className="space-y-2 pt-1">
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-teal-600" />
                  <span>معرف مخزن المتجهات الأساسي (Vector Store ID):</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={aiConfig.vectorStoreId}
                    onChange={(e) => updateAiConfig({ vectorStoreId: e.target.value })}
                    placeholder={DEFAULT_VECTOR_STORE_ID}
                    className="flex-1 px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateAiConfig({ vectorStoreId: DEFAULT_VECTOR_STORE_ID });
                      showToast('تمت استعادة معرف الـ Vector Store الافتراضي');
                    }}
                    className="px-3 py-2 rounded-2xl bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-slate-700 text-xs font-extrabold shrink-0"
                  >
                    الافتراضي
                  </button>
                </div>

                <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 pt-1">
                  معرفات Vector Store إضافية للأصولي واللغوي (اختياري - افصل بفاصلة):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={aiConfig.extraVectorStoreIds || ''}
                  onChange={(e) => updateAiConfig({ extraVectorStoreIds: e.target.value })}
                  placeholder="vs_xxx, vs_yyy"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                />
              </div>

              {/* 5. حقل رقمي لتحديد الحد الأقصى لنتائج البحث السحابي (max_num_results): الافتراضي 8 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    الحد الأقصى لنتائج البحث السحابي (max_num_results):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    dir="ltr"
                    value={aiConfig.maxNumResults}
                    onChange={(e) =>
                      updateAiConfig({ maxNumResults: Math.max(1, Math.min(15, Number(e.target.value) || 8)) })
                    }
                    className="w-20 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-slate-800 border border-teal-300 dark:border-slate-700 text-center font-mono font-extrabold text-base text-teal-800 dark:text-teal-300"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  القيمة الافتراضية 8 لاسترجاع نتائج دقيقة وشاملة من الـ Vector Store.
                </p>
              </div>

              {/* 6. حقل نصي لتعديل برومبت النظام (System Instructions) مع زر استعادة البرومبت الافتراضي */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    برومبت النظام المقيد (System Instructions):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      updateAiConfig({ systemPrompt: DEFAULT_SYSTEM_PROMPT });
                      showToast('تمت استعادة البرومبت الافتراضي');
                    }}
                    className="flex items-center gap-1 text-xs font-extrabold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة البرومبت الافتراضي</span>
                  </button>
                </div>
                <textarea
                  rows="7"
                  value={aiConfig.systemPrompt}
                  onChange={(e) => updateAiConfig({ systemPrompt: e.target.value })}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* 7. الأزرار الـ 3 لإدارة ملف التجارب (ai_search_benchmarks.json) */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  إدارة ملف التجارب `ai_search_benchmarks.json` ({benchmarkLogs.length} تجربة):
                </div>

                {/* زر 1: تصدير ومشاركة الملف (Export JSON / CSV) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleExportBenchmarkLogs('json')}
                    className="py-3.5 px-3 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>١. تصدير ومشاركة JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportBenchmarkLogs('csv')}
                    className="py-3.5 px-3 rounded-2xl bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>تصدير ومشاركة CSV</span>
                  </button>
                </div>

                {/* زر 2: استيراد ملف تجارب (Import JSON) */}
                <label className="w-full py-3.5 px-4 rounded-2xl bg-amber-500/15 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-400/40 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>٢. استيراد ملف تجارب (Import JSON)</span>
                  <input type="file" accept=".json" onChange={handleImportBenchmarkLogs} className="hidden" />
                </label>

                {/* زر 3: ملخص أداء النماذج */}
                <button
                  type="button"
                  onClick={() => setShowStatsModal(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>٣. ملخص أداء النماذج</span>
                </button>
              </div>
            </div>

            {/* ج. بطاقة الكتاب والمؤلف الحقيقية */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                بطاقة الكتاب والمؤلف
              </h2>

              <div className="space-y-2.5 text-base">
                <div>
                  <span className="font-extrabold text-teal-700 dark:text-teal-400">اسم الكتاب: </span>
                  <span className="font-bold">الاصطلاحات الفقهية في الرسائل العملية</span>
                </div>
                <div>
                  <span className="font-extrabold text-teal-700 dark:text-teal-400">المؤلف: </span>
                  <span className="font-bold">الشيخ ياسين حسن عيسى العاملي</span>
                </div>
                <div>
                  <span className="font-extrabold text-teal-700 dark:text-teal-400">الناشر: </span>
                  <span className="font-bold">
                    دار البلاغة للطباعة والنشر والتوزيع (بيروت) / مؤسسة النشر الإسلامي التابعة لجماعة المدرسين بقم المشرفة
                  </span>
                </div>
                <div>
                  <span className="font-extrabold text-teal-700 dark:text-teal-400">الطبعة: </span>
                  <span className="font-bold">الطبعة الأولى (١٤١٣ هـ - ١٩٩٣ م)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 font-serif text-base leading-relaxed text-slate-700 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white">
                  من مقدمة المؤلف الشيخ ياسين حسن عيسى العاملي:
                </p>
                <p>
                  «فهذا كتيب ذكرت فيه أكثر من ألف كلمة تحتوي على أغلب ما يحتاجه المتعلم والمبلغ لفهم عبائر العلماء الأجلاء الواردة في رسائلهم العملية. وقد رتبته على الأحرف الأبجدية وراعيت الحرف الأول والثاني من الكلمة بما هي واردة في لسان العلماء، ولم أنظر إلى الاشتقاقات اللغوية لأن هذا بنظري أسهل أخذاً وتناولاً».
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* الزر العائم للبحث الدلالي بالذكاء الاصطناعي (FAB) */}
      <button
        onClick={() => setAiSheetOpen(true)}
        className="fixed bottom-28 left-4 z-40 flex items-center gap-2 px-5 py-4 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-extrabold text-sm shadow-2xl border-2 border-white/30 active:scale-95 transition"
      >
        <Sparkles className="w-5 h-5 text-amber-300" />
        <span>البحث الدلالي AI</span>
      </button>

      {/* واجهة البحث العائمة (Floating AI Search BottomSheet) */}
      {aiSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* هيدر النافذة العائمة */}
            <div className="p-4 bg-gradient-to-l from-teal-800 to-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-base font-extrabold">البحث الدلالي السحابي (OpenAI File Search)</h3>
                  <p className="text-[11px] text-teal-100 font-mono">
                    {aiConfig.modelsByProvider[aiConfig.provider]} • {aiConfig.vectorStoreId.slice(0, 18)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiSheetOpen(false)}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى النافذة العائمة */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 select-text">
              {/* شريط فلاتر علوي (الكل، الفقهي، الأصولي، اللغوي) */}
              <div>
                <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-2">
                  نطاق البحث في المعجم:
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'fiqhi_main', label: 'الفقهي' },
                    { id: 'usuli_dict', label: 'الأصولي' },
                    { id: 'lughawi_dict', label: 'اللغوي' }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setAiScope(chip.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-extrabold transition ${
                        aiScope === chip.id
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* مربع إدخال السؤال وزر البحث */}
              <div className="space-y-2.5">
                <textarea
                  rows="2"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="اكتب سؤالك باللهجة العامية العراقية أو الفصحى (مثلاً: شنو يعني الصعيد الطيب؟ أو حكم الشك بعد الفراغ)..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-base font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleRunAiSearch}
                  className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-base shadow-md transition flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  <span>{aiLoading ? 'جاري البحث في المعجم...' : 'بحث دلالي في المعجم'}</span>
                </button>
              </div>

              {/* مؤشر التحميل */}
              {aiLoading && (
                <div className="p-6 rounded-3xl bg-teal-50/70 dark:bg-slate-800/60 border border-teal-500/30 text-center space-y-2 animate-pulse">
                  <Sparkles className="w-8 h-8 text-teal-600 dark:text-teal-400 mx-auto animate-spin" />
                  <p className="text-base font-extrabold text-teal-900 dark:text-teal-200">
                    جاري البحث في المعجم...
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    يتم الآن فحص مخزن المتجهات ({aiConfig.vectorStoreId}) واستخراج المصطلحات المطابقة
                  </p>
                </div>
              )}

              {/* عرض الخطأ إن وجد */}
              {aiError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-bold">
                  ⚠️ {aiError}
                </div>
              )}

              {/* عرض النتائج المقترحة على شكل بطاقات أنيقة (Cards) */}
              {aiResult && !aiLoading && (
                <div className="space-y-3.5">
                  {aiResult.message && (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-xs font-extrabold text-teal-800 dark:text-teal-300">
                      💡 {aiResult.message}
                    </div>
                  )}

                  {aiResult.results.length === 0 ? (
                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                      <p className="text-base font-extrabold text-slate-700 dark:text-slate-200">
                        لم يتم العثور على مصطلحات مطابقة في المعجم
                      </p>
                      <p className="text-xs text-slate-500">جرّب صياغة السؤال بكلمات أخرى أو أضف المصطلح يدوياً بالأسفل.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>المصطلحات المقترحة ({aiResult.results.length}) - اضغط على أي بطاقة لعرض التعريف الكامل:</span>
                      </div>

                      {aiResult.results.map((item, idx) => (
                        <div
                          key={`${item.id || item.term}_${idx}`}
                          onClick={() => handleOpenSuggestedCardFullView(item)}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800/95 border-2 border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 shadow-sm transition cursor-pointer active:scale-[0.99] space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                {item.term}
                              </h4>
                              <span className="px-2.5 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-xs font-extrabold">
                                {getDictionaryLabel(item.dictionaryId)} • ص {item.page || 1}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleRemoveSuggestedCard(idx, e)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                              title="حذف هذه البطاقة من المقترحات"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <p className="text-sm text-slate-700 dark:text-slate-200 font-bold leading-relaxed line-clamp-2">
                            {item.short_meaning}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                            <span>المصدر: {item.source || 'المعجم'}</span>
                            <span className="text-teal-600 dark:text-teal-400 font-extrabold flex items-center gap-1">
                              <span>عرض النص الكامل</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* إمكانية إضافة مصطلح لتصحيح القائمة المقترحة قبل التقييم */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={manualTermInput}
                      onChange={(e) => setManualTermInput(e.target.value)}
                      placeholder="إضافة مصطلح للقائمة المقترحة قبل التقييم..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualSuggestedCard}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-extrabold flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  </div>

                  {/* شريط المعلومات والتقييم الفوري (اسم النموذج | عدد التوكنات | الوقت + جيد 👍 / سيء 👎) */}
                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="text-xs font-extrabold text-center text-slate-700 dark:text-slate-200 dir-rtl">
                      ({aiResult.model} | عدد التوكنات: {aiResult.totalTokens} | الوقت: {aiResult.responseTimeSec} ثانية)
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleRateAiResult('good')}
                        className={`py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-1.5 border-2 transition ${
                          feedbackGiven === 'good'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>جيد 👍</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRateAiResult('bad')}
                        className={`py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-1.5 border-2 transition ${
                          feedbackGiven === 'bad'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                            : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 border-rose-500/40'
                        }`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span>سيء 👎</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة منبثقة لعرض التعريف الكامل والأصلي من المعجم عند الضغط على أي بطاقة مقترحة */}
      {selectedFullEntryModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border-2 border-teal-500 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-gradient-to-l from-teal-800 to-emerald-800 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-amber-300">
                  {selectedFullEntryModal.dict?.category || 'المعجم الفقهي'} • صفحة {selectedFullEntryModal.entry.page || 1}
                </span>
                <h3 className="text-xl font-extrabold mt-0.5">{selectedFullEntryModal.entry.term}</h3>
              </div>
              <button
                onClick={() => setSelectedFullEntryModal(null)}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 select-text">
              <div
                style={{ fontSize: currentFont.defSize, lineHeight: currentFont.lineHeight }}
                className="font-serif text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"
              >
                {selectedFullEntryModal.entry.definition}
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-extrabold">
                <span className="px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  باب حرف {selectedFullEntryModal.entry.letter}
                </span>
                {selectedFullEntryModal.entry.id && (
                  <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                    ID: {selectedFullEntryModal.entry.id}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={(e) =>
                    handleCopy(
                      selectedFullEntryModal.entry,
                      selectedFullEntryModal.dict?.category,
                      e
                    )
                  }
                  className="py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Copy className="w-4 h-4" />
                  <span>نسخ النص الكامل</span>
                </button>

                <button
                  type="button"
                  onClick={(e) =>
                    jumpToTerm(
                      selectedFullEntryModal.entry.term,
                      selectedFullEntryModal.dict?.id,
                      selectedFullEntryModal.entry.id,
                      e
                    )
                  }
                  className="py-3.5 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-md"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>فتح في المعجم</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة ملخص أداء النماذج (Model Performance Summary Modal) */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            <div className="p-4 bg-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-extrabold">
                  ملخص أداء النماذج ({benchmarkLogs.length} تجربة)
                </h3>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-1.5 rounded-full bg-white/15 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 select-text">
              {stats.models.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8 font-bold">
                  لم يتم تسجيل أي تجارب في `ai_search_benchmarks.json` بعد. جرّب البحث الدلالي واضغط (جيد 👍 أو سيء 👎) لتظهر الإحصائيات هنا.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    {stats.bestAccuracyModel && (
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs font-extrabold">
                        🏆 أعلى نسبة تقييم جيد:{' '}
                        <span className="text-emerald-700 dark:text-emerald-300">
                          {stats.bestAccuracyModel.model} ({stats.bestAccuracyModel.goodRate}%)
                        </span>
                      </div>
                    )}
                    {stats.fastestModel && (
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs font-extrabold">
                        ⚡ أسرع متوسط استجابة:{' '}
                        <span className="text-amber-700 dark:text-amber-300">
                          {stats.fastestModel.model} ({stats.fastestModel.avgTimeSec} ثانية)
                        </span>
                      </div>
                    )}
                    {stats.lowestTokensModel && (
                      <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 text-xs font-extrabold">
                        🪙 أقل متوسط استهلاك للتوكنات:{' '}
                        <span className="text-teal-700 dark:text-teal-300">
                          {stats.lowestTokensModel.model} ({stats.lowestTokensModel.avgTokens} توكن)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {stats.models.map((m) => (
                      <div
                        key={m.key}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-extrabold text-sm">
                          <span className="font-mono">{m.model}</span>
                          <span className="text-teal-600 dark:text-teal-400">
                            نسبة التقييم الجيد: {m.goodRate}%
                          </span>
                        </div>
                        <div className="flex flex-wrap justify-between text-slate-600 dark:text-slate-300 font-bold gap-2">
                          <span>إجمالي التجارب: {m.totalRuns} (👍 {m.goodCount} | 👎 {m.badCount})</span>
                          <span>متوسط التوكنات: {m.avgTokens}</span>
                          <span>متوسط السرعة: {m.avgTimeSec} ثانية</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* شريط التنقل السفلي بحجم كبير وواضح للموبايل */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto px-2 py-2.5 grid grid-cols-5 gap-1.5">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${
              activeTab === 'home'
                ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]'
                : 'text-slate-600 dark:text-slate-300 font-bold'
            }`}
          >
            <Home className="w-7 h-7 mb-1" />
            <span className="text-sm leading-tight">الرئيسية</span>
          </button>

          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${
              activeTab === 'dictionary'
                ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]'
                : 'text-slate-600 dark:text-slate-300 font-bold'
            }`}
          >
            <BookOpen className="w-7 h-7 mb-1" />
            <span className="text-sm leading-tight">المعجم</span>
          </button>

          <button
            onClick={() => setActiveTab('fehrest')}
            className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${
              activeTab === 'fehrest'
                ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]'
                : 'text-slate-600 dark:text-slate-300 font-bold'
            }`}
          >
            <ListFilter className="w-7 h-7 mb-1" />
            <span className="text-sm leading-tight">الفهرست</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${
              activeTab === 'bookmarks'
                ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]'
                : 'text-slate-600 dark:text-slate-300 font-bold'
            }`}
          >
            <Bookmark className="w-7 h-7 mb-1" />
            <span className="text-sm leading-tight">المحفوظات</span>
            {bookmarks.length > 0 && (
              <span className="absolute top-1.5 right-3 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-extrabold flex items-center justify-center shadow">
                {bookmarks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${
              activeTab === 'about'
                ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]'
                : 'text-slate-600 dark:text-slate-300 font-bold'
            }`}
          >
            <Info className="w-7 h-7 mb-1" />
            <span className="text-sm leading-tight">الإعدادات</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
