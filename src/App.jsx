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
  Cpu
} from 'lucide-react';
import initialData from './data/dictionaries.json';
import { prepareEntryForSearch, smartSearchEntries } from './utils/smartSearch.js';
import {
  DEFAULT_SYSTEM_PROMPT,
  AI_PROVIDERS,
  retrieveLocalCandidates,
  callAiProvider,
  convertLogsToCsv,
  computeBenchmarkStats
} from './utils/aiRagEngine.js';

const STORAGE_KEYS = {
  THEME: 'almogam_theme_v1',
  BOOKMARKS: 'almogam_bookmarks_v1',
  FONT_SIZE: 'almogam_font_size_v1',
  AI_CONFIG: 'almogam_ai_config_v1',
  AI_LOGS: 'ai_benchmark_logs'
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
  provider: 'gemini',
  modelsByProvider: {
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o-mini',
    deepseek: 'deepseek-chat',
    claude: 'claude-3-7-sonnet-latest',
    custom: 'gpt-4o-mini'
  },
  apiKeysByProvider: {
    gemini: '',
    openai: '',
    deepseek: '',
    claude: '',
    custom: ''
  },
  customUrl: 'https://api.openai.com/v1/chat/completions',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  maxCandidates: 6
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

  // إعدادات الذكاء الاصطناعي وسجل المقارنة
  const [aiConfig, setAiConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
      if (!saved) return DEFAULT_AI_CONFIG;
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_AI_CONFIG,
        ...parsed,
        modelsByProvider: { ...DEFAULT_AI_CONFIG.modelsByProvider, ...(parsed.modelsByProvider || {}) },
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

  // حالة القائمة العائمة للبحث بالذكاء الاصطناعي (Floating AI Search Sheet)
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiScope, setAiScope] = useState('auto'); // 'auto' | 'all' | 'fiqhi_main' | 'usuli_dict' | 'lughawi_dict'
  const [aiQuery, setAiQuery] = useState('');
  const [aiCandidates, setAiCandidates] = useState([]);
  const [manualTermInput, setManualTermInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { answer, tokens, responseTimeSec, provider, model, candidatesSent, query, scope }
  const [aiError, setAiError] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'good' | 'bad'
  const [showStatsModal, setShowStatsModal] = useState(false);

  // تحديث المقترحات المبدئية محلياً بشكل تلقائي فور كتابة السؤال لتوفير التوكنات
  useEffect(() => {
    if (!aiQuery.trim()) {
      setAiCandidates([]);
      return;
    }
    const extracted = retrieveLocalCandidates(
      allDictionaries,
      aiQuery,
      aiScope,
      aiConfig.maxCandidates
    );
    setAiCandidates(extracted);
  }, [aiQuery, aiScope, aiConfig.maxCandidates, allDictionaries]);

  const handleAddManualCandidate = () => {
    if (!manualTermInput.trim()) return;
    const found = retrieveLocalCandidates(allDictionaries, manualTermInput, 'all', 1);
    if (found.length > 0) {
      if (!aiCandidates.some((c) => c.id === found[0].id)) {
        setAiCandidates((prev) => [...prev, found[0]]);
        showToast(`تمت إضافة "${found[0].term}" للمقترحات`);
      }
    } else {
      setAiCandidates((prev) => [
        ...prev,
        {
          id: `custom_${Date.now()}`,
          term: manualTermInput.trim(),
          definition: manualTermInput.trim(),
          letter: 'مضاف',
          page: 1,
          dictionaryId: 'fiqhi_main',
          dictionaryLabel: 'مضاف يدوياً',
          sources: []
        }
      ]);
    }
    setManualTermInput('');
  };

  const handleRunAiSearch = async () => {
    if (!aiQuery.trim()) {
      showToast('يرجى كتابة السؤال أو المعنى أولاً');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setFeedbackGiven(null);
    setFeedbackNote('');

    const providerId = aiConfig.provider;
    const providerObj = AI_PROVIDERS.find((p) => p.id === providerId) || AI_PROVIDERS[0];
    const modelName = aiConfig.modelsByProvider[providerId] || providerObj.defaultModel;
    const apiKey = aiConfig.apiKeysByProvider[providerId] || '';

    try {
      const res = await callAiProvider({
        provider: providerId,
        model: modelName,
        apiKey,
        customUrl: aiConfig.customUrl,
        systemPrompt: aiConfig.systemPrompt,
        userQuery: aiQuery,
        candidates: aiCandidates
      });

      setAiResult({
        answer: res.answer,
        tokens: res.tokens,
        responseTimeSec: res.responseTimeSec,
        provider: providerObj.name,
        providerId,
        model: modelName,
        candidatesSent: aiCandidates,
        query: aiQuery,
        scope: aiScope
      });
    } catch (err) {
      setAiError(err.message || 'حدث خطأ أثناء الاتصال بالنموذج');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRateAiResult = (ratingType) => {
    if (!aiResult) return;
    const logItem = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString('sv-SE'),
      provider: aiResult.provider,
      model: aiResult.model,
      systemPrompt: aiConfig.systemPrompt,
      dictionaryScope: aiResult.scope,
      query: aiResult.query,
      candidatesSent: aiResult.candidatesSent.map((c) => ({
        id: c.id,
        term: c.term,
        page: c.page,
        dictionaryId: c.dictionaryId
      })),
      answer: aiResult.answer,
      tokens: aiResult.tokens,
      responseTimeSec: aiResult.responseTimeSec,
      rating: ratingType === 'good' ? 'جيد' : 'سيء',
      note: feedbackNote.trim()
    };

    const nextLogs = [logItem, ...benchmarkLogs];
    persistBenchmarkLogs(nextLogs);
    setFeedbackGiven(ratingType);
    showToast(`تم حفظ التقييم (${logItem.rating}) في ai_benchmark_logs.json`);
  };

  const handleExportBenchmarkLogs = (format = 'json') => {
    if (benchmarkLogs.length === 0) {
      showToast('لا توجد سجلات تقييم محفوظة بعد');
      return;
    }
    const isCsv = format === 'csv';
    const content = isCsv ? convertLogsToCsv(benchmarkLogs) : JSON.stringify(benchmarkLogs, null, 2);
    const filename = isCsv ? 'ai_benchmark_logs.csv' : 'ai_benchmark_logs.json';

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
          showToast('الملف لا يحتوي على سجلات صالحة');
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

  // حالة التصفح الرئيسية
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDictId, setSelectedDictId] = useState('fiqhi_main');
  const [selectedLetter, setSelectedLetter] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
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
    return smartSearchEntries(currentDict.preparedEntries, searchQuery, {
      letterFilter: activeTab === 'home' ? 'الكل' : selectedLetter,
      searchScope: 'all',
      onlyBookmarks: activeTab === 'bookmarks',
      bookmarksSet
    });
  }, [currentDict, searchQuery, selectedLetter, activeTab, bookmarksSet]);

  const toggleCard = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCopy = useCallback(async (entry, e) => {
    if (e) e.stopPropagation();
    const formatted = `📘 ${entry.term}\n\n${entry.definition}\n\n— (${currentDict.category} - تطبيق المعجم)`;
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
  }, [currentDict, showToast]);

  const jumpToTerm = useCallback((refTerm, e) => {
    if (e) e.stopPropagation();
    const cleaned = refTerm.replace(/[«»"()]/g, '').trim();
    setSelectedLetter('الكل');
    setActiveTab('dictionary');
    setSearchQuery(cleaned);
    setAiSheetOpen(false);
    showToast(`عرض: ${cleaned}`);
  }, [showToast]);

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
          const refMatch = entry.definition.match(/راجع\s+(?:لفظ|كلمة)?\s*[«"(\[]?([^»")\].،]{2,25})[»")\]]?/);

          return (
            <div
              key={entry.id}
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
                    <h2
                      style={{ fontSize: currentFont.termSize }}
                      className="font-extrabold text-slate-900 dark:text-white leading-snug"
                    >
                      {entry.term}
                    </h2>
                    {!isExpanded && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        باب {entry.letter}
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
                      باب حرف {entry.letter}
                    </span>

                    {refMatch && (
                      <button
                        onClick={(e) => jumpToTerm(refMatch[1], e)}
                        className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center gap-1"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>راجع: {refMatch[1]}</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleCopy(entry, e)}
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
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-teal-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold">
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`ابحث في ${currentDict.category}...`}
                className="w-full pr-12 pl-12 py-3.5 rounded-2xl bg-white/15 dark:bg-slate-800/95 text-white placeholder-teal-100/85 border border-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base font-bold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
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
              <p className="text-sm text-teal-100/90 font-medium">
                {currentDict.title}
              </p>
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
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {dict.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                      {dict.author}
                    </p>
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

        {/* ٤. شاشة الإعدادات (تضم: المظهر والخط + إعدادات الذكاء الاصطناعي والمقارنة + بطاقة الكتاب والمؤلف) */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            {/* أ. إعدادات المظهر والخط */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                إعدادات المظهر والخط
              </h3>

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

            {/* ب. قسم إعدادات الذكاء الاصطناعي (AI Settings) والمقارنة */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-teal-500/40 dark:border-teal-500/30 shadow-md space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sparkles className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  إعدادات الذكاء الاصطناعي (AI Settings)
                </h3>
              </div>

              {/* 1. اختيار المزود (Provider) */}
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  المزود (Provider):
                </label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => updateAiConfig({ provider: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* رابط مخصص في حال اختيار Custom URL */}
              {aiConfig.provider === 'custom' && (
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                    رابط الـ API المخصص (OpenAI-Compatible Endpoint):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={aiConfig.customUrl}
                    onChange={(e) => updateAiConfig({ customUrl: e.target.value })}
                    placeholder="https://api.example.com/v1/chat/completions"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-mono"
                  />
                </div>
              )}

              {/* 2. اسم النموذج يدوياً أو من مقترحات */}
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
                  placeholder={activeProviderObj.defaultModel}
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
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition ${
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

              {/* 3. مفتاح الـ API المحفوظ لكل مزود على حدة */}
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>مفتاح الـ API لـ ({activeProviderObj.name}) - يُحفظ تلقائياً:</span>
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
                  placeholder="أدخل مفتاح الـ API هنا..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* 4. عدد المقترحات المرسلة للنموذج لتوفير التوكنات */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    عدد مقترحات المعجم المرسلة في كل بحث:
                  </label>
                  <span className="px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-extrabold text-sm">
                    {aiConfig.maxCandidates} كلمات
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={aiConfig.maxCandidates}
                  onChange={(e) => updateAiConfig({ maxCandidates: Number(e.target.value) })}
                  className="w-full accent-teal-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>3 (أعلى توفير للتوكنات)</span>
                  <span>6 (الافتراضي المتوازن)</span>
                  <span>10 (تغطية أوسع)</span>
                </div>
              </div>

              {/* 5. الرسالة التوجيهية (System Prompt) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    الرسالة التوجيهية (System Prompt):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      updateAiConfig({ systemPrompt: DEFAULT_SYSTEM_PROMPT });
                      showToast('تمت استعادة الرسالة الافتراضية');
                    }}
                    className="flex items-center gap-1 text-xs font-extrabold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة الرسالة الافتراضية</span>
                  </button>
                </div>
                <textarea
                  rows="6"
                  value={aiConfig.systemPrompt}
                  onChange={(e) => updateAiConfig({ systemPrompt: e.target.value })}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* 6. الأزرار الثلاثة الخاصة بملف التقييم والمقارنة */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  سجل التجارب ومقارنة النماذج ({benchmarkLogs.length} تجربة مسجلة):
                </div>

                <button
                  type="button"
                  onClick={() => setShowStatsModal(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>١. إحصائيات ومقارنة النماذج</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleExportBenchmarkLogs('json')}
                    className="py-3 px-3 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>٢. تصدير JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportBenchmarkLogs('csv')}
                    className="py-3 px-3 rounded-2xl bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>تصدير CSV</span>
                  </button>
                </div>

                <label className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-400/40 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>٣. استيراد ملف تجارب (Import JSON)</span>
                  <input type="file" accept=".json" onChange={handleImportBenchmarkLogs} className="hidden" />
                </label>
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
                  <span className="font-bold">دار البلاغة للطباعة والنشر والتوزيع (بيروت) / مؤسسة النشر الإسلامي التابعة لجماعة المدرسين بقم المشرفة</span>
                </div>
                <div>
                  <span className="font-extrabold text-teal-700 dark:text-teal-400">الطبعة: </span>
                  <span className="font-bold">الطبعة الأولى (١٤١٣ هـ - ١٩٩٣ م)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 font-serif text-base leading-relaxed text-slate-700 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white">من مقدمة المؤلف الشيخ ياسين حسن عيسى العاملي:</p>
                <p>
                  «فهذا كتيب ذكرت فيه أكثر من ألف كلمة تحتوي على أغلب ما يحتاجه المتعلم والمبلغ لفهم عبائر العلماء الأجلاء الواردة في رسائلهم العملية. وقد رتبته على الأحرف الأبجدية وراعيت الحرف الأول والثاني من الكلمة بما هي واردة في لسان العلماء، ولم أنظر إلى الاشتقاقات اللغوية لأن هذا بنظري أسهل أخذاً وتناولاً».
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* الزر العائم للبحث الذكي بالذكاء الاصطناعي (Floating Action Button - FAB) */}
      <button
        onClick={() => setAiSheetOpen(true)}
        className="fixed bottom-28 left-4 z-40 flex items-center gap-2 px-5 py-4 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-extrabold text-sm shadow-2xl border-2 border-white/30 active:scale-95 transition"
      >
        <Sparkles className="w-5 h-5 text-amber-300" />
        <span>البحث الذكي AI</span>
      </button>

      {/* القائمة العائمة للبحث الذكي بالذكاء الاصطناعي (Floating AI Search Sheet) */}
      {aiSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* هيدر النافذة العائمة */}
            <div className="p-4 bg-gradient-to-l from-teal-800 to-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-base font-extrabold">البحث الذكي بالذكاء الاصطناعي (RAG)</h3>
                  <p className="text-[11px] text-teal-100">
                    {activeProviderObj.name} • {aiConfig.modelsByProvider[aiConfig.provider]}
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

            {/* محتوى النافذة العائمة القابل للتمرير */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 select-text">
              {/* أ) شريط فلاتر علوي سريع (Chips) لتحديد نطاق البحث */}
              <div>
                <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-2">
                  نطاق البحث في المعاجم:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'auto', label: '✨ تحديد تلقائي ذكي' },
                    { id: 'all', label: 'الكل' },
                    { id: 'fiqhi_main', label: 'المعجم الفقهي' },
                    { id: 'usuli_dict', label: 'المعجم الأصولي' },
                    { id: 'lughawi_dict', label: 'المعجم اللغوي' }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setAiScope(chip.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
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

              {/* ب) حقل إدخال السؤال أو المعنى المراد البحث عنه */}
              <div className="space-y-2">
                <textarea
                  rows="2"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="اكتب سؤالك أو المعنى بالعامية أو الفصحى (مثال: ما هو الإثمد؟ أو حكم الشك بعد الفراغ)..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-base font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                {/* ج) المقترحات المستخرجة محلياً (Local Hybrid Retrieval) مع فك إحالات "راجع" لتوفير التوكنات */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-300">
                    <span>
                      المقترحات المبدئية المرسلة للنموذج ({aiCandidates.length} كلمات - موفرة للتوكنات):
                    </span>
                  </div>

                  {aiCandidates.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      اكتب سؤالك بالأعلى لاستخراج أقرب المصطلحات محلياً قبل إرسالها للنموذج...
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {aiCandidates.map((cand) => (
                        <span
                          key={cand.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-teal-500/40 text-xs font-extrabold text-teal-800 dark:text-teal-300"
                        >
                          <span>{cand.term}</span>
                          <button
                            onClick={() =>
                              setAiCandidates((prev) => prev.filter((item) => item.id !== cand.id))
                            }
                            className="text-rose-500 hover:text-rose-700 font-bold"
                            title="حذف من المقترحات"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* إضافة كلمة يدوياً إلى المقترحات قبل الإرسال */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={manualTermInput}
                      onChange={(e) => setManualTermInput(e.target.value)}
                      placeholder="إضافة مصطلح آخر للمقترحات..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualCandidate}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-extrabold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleRunAiSearch}
                  className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-base shadow-md transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{aiLoading ? 'جاري التحليل والإجابة...' : 'إرسال للنموذج والبحث الذكي'}</span>
                </button>
              </div>

              {/* رسالة الخطأ إن وجدت */}
              {aiError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-bold">
                  ⚠️ {aiError}
                </div>
              )}

              {/* هـ) عرض إجابة النموذج + شريط المعلومات + الكلمات المرشحة + التقييم (جيد / سيء) */}
              {aiResult && (
                <div className="p-4 rounded-3xl bg-teal-50/60 dark:bg-slate-800/90 border-2 border-teal-500/40 space-y-3">
                  {/* شريط معلومات النموذج والزمن والتوكنات */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold pb-2 border-b border-teal-200/60 dark:border-slate-700">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-600 text-white">
                      🤖 {aiResult.model}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      ⏱️ {aiResult.responseTimeSec} ثانية
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      🪙 ~{aiResult.tokens} توكن
                    </span>
                  </div>

                  {/* نص إجابة النموذج */}
                  <div
                    style={{ fontSize: currentFont.defSize, lineHeight: currentFont.lineHeight }}
                    className="font-serif whitespace-pre-wrap text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"
                  >
                    {aiResult.answer}
                  </div>

                  {/* أزرار الكلمات المرشحة لفتح تفاصيل الكلمة في المعجم */}
                  {aiResult.candidatesSent?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                        اضغط على أي مصطلح لفتحه في المعجم:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {aiResult.candidatesSent.map((cand) => (
                          <button
                            key={cand.id}
                            onClick={(e) => jumpToTerm(cand.term, e)}
                            className="px-3 py-1.5 rounded-xl bg-teal-600/15 hover:bg-teal-600 hover:text-white text-teal-800 dark:text-teal-300 text-xs font-extrabold transition flex items-center gap-1"
                          >
                            <span>📘 {cand.term}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* نظام التقييم الفوري (Feedback: جيد / سيء) */}
                  <div className="pt-3 border-t border-teal-200/60 dark:border-slate-700 space-y-2">
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      قيّم إجابة هذا النموذج لحفظها في سجل المقارنة:
                    </div>
                    <input
                      type="text"
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                      placeholder="ملاحظة اختيارية على الإجابة..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleRateAiResult('good')}
                        className={`py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-1.5 border-2 transition ${
                          feedbackGiven === 'good'
                            ? 'bg-emerald-600 text-white border-emerald-600'
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
                            ? 'bg-rose-600 text-white border-rose-600'
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

      {/* نافذة إحصائيات ومقارنة النماذج (Benchmarking Analytics Modal) */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            <div className="p-4 bg-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-extrabold">إحصائيات ومقارنة النماذج ({benchmarkLogs.length} تجربة)</h3>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-1.5 rounded-full bg-white/15 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {stats.models.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8 font-bold">
                  لم يتم تسجيل أي تقييمات بعد. جرّب البحث الذكي واضغط (جيد 👍 أو سيء 👎) لتظهر المقارنة هنا.
                </p>
              ) : (
                <>
                  {/* ملخص الأفضل */}
                  <div className="grid grid-cols-1 gap-2">
                    {stats.bestAccuracyModel && (
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs font-extrabold">
                        🏆 أعلى نسبة تقييم «جيد»: <span className="text-emerald-700 dark:text-emerald-300">{stats.bestAccuracyModel.model} ({stats.bestAccuracyModel.goodRate}%)</span>
                      </div>
                    )}
                    {stats.fastestModel && (
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs font-extrabold">
                        ⚡ أسرع وقت استجابة: <span className="text-amber-700 dark:text-amber-300">{stats.fastestModel.model} ({stats.fastestModel.avgTimeSec} ثانية)</span>
                      </div>
                    )}
                    {stats.lowestTokensModel && (
                      <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 text-xs font-extrabold">
                        🪙 أقل استهلاك للتوكنات: <span className="text-teal-700 dark:text-teal-300">{stats.lowestTokensModel.model} (~{stats.lowestTokensModel.avgTokens} توكن)</span>
                      </div>
                    )}
                  </div>

                  {/* جدول تفاصيل كل نموذج */}
                  <div className="space-y-2.5">
                    {stats.models.map((m) => (
                      <div
                        key={m.key}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-extrabold text-sm">
                          <span>{m.model}</span>
                          <span className="text-teal-600 dark:text-teal-400">{m.goodRate}% جيد</span>
                        </div>
                        <div className="flex flex-wrap justify-between text-slate-600 dark:text-slate-300 font-bold">
                          <span>التجارب: {m.totalRuns} (👍 {m.goodCount} | 👎 {m.badCount})</span>
                          <span>السرعة: {m.avgTimeSec} ث</span>
                          <span>التوكنات: ~{m.avgTokens}</span>
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

      {/* شريط التنقل السفلي بحجم كبير وواضح جداً للموبايل */}
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
