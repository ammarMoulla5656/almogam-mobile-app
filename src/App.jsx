import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Trash2
} from 'lucide-react';
import fiqhiDictionary from '../database/processed/unified_fiqhi.json';
import usuliDictionary from '../database/processed/unified_usuli.json';
import lughawiDictionary from '../database/processed/unified_lughawi.json';
import { normalizeArabic, prepareEntryForSearch, smartSearchEntries } from './utils/smartSearch.js';
import {
  getDictionaryLabel,
  retrieveLocalCandidates,
  findFullEntryInDictionaries,
  convertLogsToCsv,
  computeBenchmarkStats
} from './utils/aiRagEngine.js';

const STORAGE_KEYS = {
  THEME: 'almogam_theme_v1',
  BOOKMARKS: 'almogam_bookmarks_v1',
  FONT_SIZE: 'almogam_font_size_v1',
  AI_LOGS: 'ai_search_benchmarks'
};

const AI_API_URL = window.ALMOGAM_AI_API_URL || import.meta.env.VITE_AI_API_URL || '';
const AI_MODEL = 'gpt-4o-mini';
const AI_MAX_CHARS = 50;
const AI_MAX_RESULTS = 5;
const AI_SEARCH_RESULTS = 15;
const countSearchLetters = (value) => (String(value || '').normalize('NFC').match(/\p{L}/gu) || []).length;
const countSearchCharacters = (value) => Array.from(String(value || '')).length;
const cleanDisplayedText = (value) => String(value || '').replace(/\\r\\n|\\n|\\r/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();

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

  useEffect(() => {
    // Remove API keys saved by the former browser-side AI settings.
    localStorage.removeItem('almogam_ai_config_v3');
  }, []);

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
    return [fiqhiDictionary, usuliDictionary, lughawiDictionary].map((d) => ({
      ...d,
      preparedEntries: d.entries.map(prepareEntryForSearch)
    }));
  }, []);
  const dictionaryTermLookups = useMemo(
    () => new Map(allDictionaries.map((dict) => {
      const lookup = new Map();
      const aliasMatches = new Map();
      for (const entry of dict.preparedEntries) {
        const termKey = entry._normTerm || normalizeArabic(entry.term);
        if (termKey && !lookup.has(termKey)) lookup.set(termKey, entry);
        for (const alias of entry.aliases || []) {
          const aliasKey = normalizeArabic(alias);
          if (!aliasKey || lookup.has(aliasKey)) continue;
          const matches = aliasMatches.get(aliasKey) || new Map();
          matches.set(entry.id, entry);
          aliasMatches.set(aliasKey, matches);
        }
      }
      for (const [aliasKey, matches] of aliasMatches) {
        if (matches.size === 1 && !lookup.has(aliasKey)) lookup.set(aliasKey, matches.values().next().value);
      }
      return [dict.id, lookup];
    })),
    [allDictionaries]
  );

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

  const handleRunAiSearch = async () => {
    if (!aiQuery.trim()) {
      showToast('يرجى كتابة سؤالك أو المعنى المراد البحث عنه أولاً');
      return;
    }
    const query = aiQuery.trim();
    if (countSearchCharacters(query) > AI_MAX_CHARS) {
      showToast(`الحد الأقصى للبحث ${AI_MAX_CHARS} حرفاً`);
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setFeedbackGiven(null);
    const buildLocalResult = () => {
      const candidates = retrieveLocalCandidates(
        allDictionaries,
        query,
        aiScope,
        AI_MAX_RESULTS
      );
      return {
        results: candidates.map((entry) => ({
          id: entry.id,
          term: entry.term,
          dictionaryId: entry.dictionaryId,
          page: entry.page || null,
          short_meaning: entry.definition || '',
          source: Array.isArray(entry.sources) ? entry.sources[0] || '' : entry.sources || ''
        })),
        message: candidates.length
          ? (!navigator.onLine
              ? 'هذه نتائج البحث المحلي، ويمكن استخدامها دون اتصال بالإنترنت.'
              : !AI_API_URL
                ? 'خدمة البحث السحابي لم تُربط بعد؛ هذه النتائج من البحث المحلي.'
                : 'هذه نتائج البحث المحلي.')
          : 'لم يعثر البحث المحلي على نتائج مطابقة.'
      };
    };

    try {
      if (!navigator.onLine || !AI_API_URL) {
        const localResult = buildLocalResult();
        setAiResult({
          ...localResult,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          responseTimeSec: 0,
          provider: navigator.onLine ? 'البحث المحلي' : 'البحث المحلي دون اتصال',
          providerId: 'local',
          model: navigator.onLine ? 'غير مهيأ' : 'البحث المحلي',
          vectorStoreId: '',
          query,
          scope: aiScope
        });
        return;
      }

      const installId = localStorage.getItem('almogam_install_id') || (() => {
        const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('almogam_install_id', id);
        return id;
      })();
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Install-ID': installId },
        body: JSON.stringify({ query, scope: aiScope, maxResults: AI_SEARCH_RESULTS })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) {
          setAiError(data.message || 'وصلت إلى حد البحث اليومي. حاول غداً.');
          return;
        }
        throw new Error(data.message || 'تعذر الاتصال بخدمة البحث الدلالي.');
      }

      setAiResult({
        results: data.results || [],
        message: data.message || '',
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        totalTokens: data.totalTokens || 0,
        responseTimeSec: data.responseTimeSec || 0,
        provider: 'OpenAI',
        providerId: 'openai',
        model: AI_MODEL,
        vectorStoreId: '',
        query,
        scope: aiScope
      });
    } catch (err) {
      const localResult = buildLocalResult();
      if (localResult.results.length > 0) {
        setAiResult({
          ...localResult,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          responseTimeSec: 0,
          provider: 'البحث المحلي',
          providerId: 'local',
          model: 'البحث المحلي',
          vectorStoreId: '',
          query,
          scope: aiScope
        });
      } else {
        setAiError(err.message || 'تعذر الاتصال، ولم يعثر البحث المحلي على نتائج.');
      }
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
      vectorStoreId: aiResult.vectorStoreId || '',
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
  const loadMoreRef = useRef(null);
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

  useEffect(() => {
    let previousY = window.scrollY;
    const closeExpandedOnScrollUp = () => {
      const currentY = window.scrollY;
      if (currentY < previousY) setExpandedIds((current) => current.size ? new Set() : current);
      previousY = currentY;
    };
    window.addEventListener('scroll', closeExpandedOnScrollUp, { passive: true });
    return () => window.removeEventListener('scroll', closeExpandedOnScrollUp);
  }, []);

  const filteredEntries = useMemo(() => {
    if (!currentDict) return [];
    const results = smartSearchEntries(currentDict.preparedEntries, searchQuery, {
      letterFilter: activeTab === 'home' ? 'الكل' : selectedLetter,
      searchScope: 'all',
      onlyBookmarks: activeTab === 'bookmarks',
      bookmarksSet
    });
    if (pinnedEntryId) {
      const pinned =
        results.find((e) => e.id === pinnedEntryId) ||
        currentDict.preparedEntries.find((e) => e.id === pinnedEntryId);
      if (pinned) {
        return [pinned, ...results.filter((e) => e.id !== pinnedEntryId)];
      }
    }
    return results;
  }, [currentDict, searchQuery, selectedLetter, activeTab, bookmarksSet, pinnedEntryId]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || visibleCount >= filteredEntries.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisibleCount((count) => Math.min(count + 12, filteredEntries.length));
      }
    }, { rootMargin: '240px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredEntries.length]);

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
      const formatted = `📘 ${entry.term}\n\n${entry.definition}\n\n— (${cat})`;
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

  const extractCrossReferences = useCallback((definition, dictionary) => {
    if (!definition || !dictionary?.preparedEntries) return [];
    definition = cleanDisplayedText(definition);
    const referencePattern = /(أنظر|انظر|راجع|يراجع|ينظر)\s*(?:(?:أيضا|أيضاً)\s+)?(?:ما\s+(?:يأتي|سبق)\s+(?:(?:أيضا|أيضاً)\s+)?(?:في\s+)?)?(?:(?:في|إلى|الى)\s+)?(?:مادة|لفظ|كلمة|باب)?\s*[:：]?\s*[«"(\[]?\s*([^»")\].،؛:؛.!؟\n]{1,80})/g;
    const entriesByTerm = dictionaryTermLookups.get(dictionary.id);
    if (!entriesByTerm) return [];
    const references = [];

    for (const match of definition.matchAll(referencePattern)) {
      const target = match[2].replace(/[«»"()[\]]/g, '').trim();
      if (!target) continue;
      const entry = entriesByTerm.get(normalizeArabic(target));
      if (!entry || references.some((reference) => reference.entry.id === entry.id)) continue;
      references.push({
        verb: match[1] === 'راجع' || match[1] === 'يراجع' ? 'راجع' : 'انظر',
        target: entry.term,
        entry
      });
    }

    return references;
  }, [dictionaryTermLookups]);

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
        setTimeout(() => {
          document.getElementById(`entry-card-${targetEntry?.id || entryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }

      showToast(targetEntry ? `عرض: ${targetEntry.term}` : `عرض: ${cleaned}`);
    },
    [allDictionaries, currentDict, selectedDictId, showToast]
  );

  const stats = useMemo(() => computeBenchmarkStats(benchmarkLogs), [benchmarkLogs]);

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
          const refInfos = extractCrossReferences(entry.definition, currentDict);

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
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        style={{ fontSize: currentFont.termSize }}
                        className="font-extrabold text-slate-900 dark:text-white leading-snug"
                      >
                        {entry.term}
                      </h2>
                      {!isExpanded && refInfos.map((refInfo) => (
                        <button
                          key={`${entry.id}_${refInfo.entry.id}`}
                          onClick={(e) => jumpToTerm(refInfo.target, currentDict.id, refInfo.entry.id, e)}
                          className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center gap-1 transition shadow-xs"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>{refInfo.verb}: {refInfo.target}</span>
                        </button>
                      ))}
                    </div>
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
                    {cleanDisplayedText(entry.definition)}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-3 mb-4">
                    {refInfos.map((refInfo) => (
                      <button
                        key={`${entry.id}_${refInfo.entry.id}_expanded`}
                        onClick={(e) => jumpToTerm(refInfo.target, currentDict.id, refInfo.entry.id, e)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 active:scale-95 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center gap-1 transition shadow-xs"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{refInfo.verb}: {refInfo.target}</span>
                      </button>
                    ))}
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

        {entriesList.length > visibleCount && <div ref={loadMoreRef} className="h-4" aria-hidden="true" />}
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
                      setSearchQuery('');
                      setPinnedEntryId(null);
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

            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-teal-50 shadow-inner">
                <BookOpen className="h-4 w-4 text-amber-200" />
                <span>{currentDict.category}</span>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-teal-900 tabular-nums">
                  {currentDict.entries.length.toLocaleString('ar-IQ')} معنى
                </span>
              </div>
            </div>

            <div className="space-y-1">
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
              {searchQuery && <div className="text-[11px] text-teal-100/90 px-2">عدد الأحرف: {countSearchLetters(searchQuery)}</div>}
            </div>

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
            </div>

            <div className="space-y-3">
              {allDictionaries.map((dict) => (
                <button
                  key={dict.id}
                  onClick={() => {
                    setSelectedDictId(dict.id);
                    setSelectedLetter('الكل');
                    setSearchQuery('');
                    setPinnedEntryId(null);
                    setActiveTab('dictionary');
                  }}
                  className="w-full p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-teal-500 active:scale-[0.99] transition text-right flex items-center justify-between gap-4"
                >
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{getDictionaryLabel(dict.id)}</h3>
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
                      setSearchQuery('');
                      setPinnedEntryId(null);
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
                  <h3 className="text-base font-extrabold">{AI_API_URL ? 'البحث الدلالي السحابي (OpenAI File Search)' : 'البحث الدلالي في المعجم'}</h3>
                  <p className="text-[11px] text-teal-100 font-mono">
                    {AI_MODEL} • {aiScope === 'all' ? 'كل المعاجم' : getDictionaryLabel(aiScope)}
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
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (countSearchCharacters(nextValue) > AI_MAX_CHARS) {
                      setAiQuery(Array.from(nextValue).slice(0, AI_MAX_CHARS).join(''));
                      showToast(`تم تطبيق الحد الأقصى: ${AI_MAX_CHARS} حرفاً`);
                    } else {
                      setAiQuery(nextValue);
                    }
                  }}
                  placeholder="اكتب سؤالك باللهجة العامية العراقية أو الفصحى (مثلاً: شنو يعني الصعيد الطيب؟ أو حكم الشك بعد الفراغ)..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-base font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="text-left text-xs text-slate-500" dir="rtl">
                  {countSearchCharacters(aiQuery)} / {AI_MAX_CHARS} حرفاً
                </div>

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
                    يتم البحث في فهرس المعجم المحدد
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
                                {getDictionaryLabel(item.dictionaryId)}
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
                            {cleanDisplayedText(item.short_meaning)}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
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
                  {selectedFullEntryModal.dict?.category || 'المعجم الفقهي'}
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
                {cleanDisplayedText(selectedFullEntryModal.entry.definition)}
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-extrabold">
                <span className="px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
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
            onClick={() => {
              setSelectedLetter('الكل');
              setSearchQuery('');
              setPinnedEntryId(null);
              setActiveTab('dictionary');
            }}
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

