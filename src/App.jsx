import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Sun,
  Moon,
  Copy,
  Share2,
  ChevronDown,
  Bookmark,
  ListFilter,
  Sparkles,
  Check,
  X,
  Info,
  ArrowUpRight
} from 'lucide-react';
import initialData from './data/dictionaries.json';
import { prepareEntryForSearch, smartSearchEntries } from './utils/smartSearch.js';

const STORAGE_KEYS = {
  THEME: 'almogam_theme_v1',
  BOOKMARKS: 'almogam_bookmarks_v1',
  FONT_SIZE: 'almogam_font_size_v1'
};

const ARABIC_CHAPTERS = [
  { letter: 'الكل', short: 'الكل', startPage: 9 },
  { letter: 'الهمزة', short: 'أ', startPage: 9 },
  { letter: 'الباء', short: 'ب', startPage: 27 },
  { letter: 'التاء', short: 'ت', startPage: 37 },
  { letter: 'الثاء', short: 'ث', startPage: 51 },
  { letter: 'الجيم', short: 'ج', startPage: 55 },
  { letter: 'الحاء', short: 'ح', startPage: 63 },
  { letter: 'الخاء', short: 'خ', startPage: 75 },
  { letter: 'الدال', short: 'د', startPage: 83 },
  { letter: 'الذال', short: 'ذ', startPage: 89 },
  { letter: 'الراء', short: 'ر', startPage: 93 },
  { letter: 'الزاي', short: 'ز', startPage: 101 },
  { letter: 'السين', short: 'س', startPage: 103 },
  { letter: 'الشين', short: 'ش', startPage: 113 },
  { letter: 'الصاد', short: 'ص', startPage: 121 },
  { letter: 'الضاد', short: 'ض', startPage: 127 },
  { letter: 'الطاء', short: 'ط', startPage: 129 },
  { letter: 'الظاء', short: 'ظ', startPage: 135 },
  { letter: 'العين', short: 'ع', startPage: 137 },
  { letter: 'الغين', short: 'غ', startPage: 151 },
  { letter: 'الفاء', short: 'ف', startPage: 155 },
  { letter: 'القاف', short: 'ق', startPage: 164 },
  { letter: 'الكاف', short: 'ك', startPage: 175 },
  { letter: 'اللام', short: 'ل', startPage: 183 },
  { letter: 'الميم', short: 'م', startPage: 189 },
  { letter: 'النون', short: 'ن', startPage: 215 },
  { letter: 'الهاء', short: 'هـ', startPage: 223 },
  { letter: 'الواو', short: 'و', startPage: 227 },
  { letter: 'الياء', short: 'ي', startPage: 233 }
];

export default function App() {
  // 1. حالة الثيم (أبيض / أسود)
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

  // 2. حجم الخط
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'md';
  });

  const cycleFontSize = () => {
    const next = fontSize === 'sm' ? 'md' : fontSize === 'md' ? 'lg' : 'sm';
    setFontSize(next);
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, next);
  };

  // 3. المفضلة (للمستخدم)
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

  // 4. تحضير المعاجم الثلاثة من ملف البيانات (معجم فقهي، معجم أصولي، معجم لغوي)
  const allDictionaries = useMemo(() => {
    return initialData.dictionaries.map((d) => ({
      ...d,
      preparedEntries: d.entries.map(prepareEntryForSearch)
    }));
  }, []);

  // 5. حالة التنقل والفلاتر والبحث
  const [activeTab, setActiveTab] = useState('dictionary'); // 'dictionary' | 'index' | 'bookmarks' | 'about'
  const [selectedDictId, setSelectedDictId] = useState('fiqhi_main');
  const [selectedLetter, setSelectedLetter] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState('all'); // 'all' | 'termOnly'
  const [expandedIds, setExpandedIds] = useState(() => new Set(['fiqh_1', 'fiqh_6']));
  const [visibleCount, setVisibleCount] = useState(40);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2200);
  }, []);

  const currentDict = useMemo(() => {
    return allDictionaries.find((d) => d.id === selectedDictId) || allDictionaries[0];
  }, [allDictionaries, selectedDictId]);

  useEffect(() => {
    setVisibleCount(40);
  }, [searchQuery, selectedLetter, selectedDictId, activeTab]);

  // نتائج البحث الذكي
  const filteredEntries = useMemo(() => {
    if (!currentDict) return [];
    return smartSearchEntries(currentDict.preparedEntries, searchQuery, {
      letterFilter: selectedLetter,
      searchScope,
      onlyBookmarks: activeTab === 'bookmarks',
      bookmarksSet
    });
  }, [currentDict, searchQuery, selectedLetter, searchScope, activeTab, bookmarksSet]);

  // إحصاءات الفهرس لكل حرف
  const chapterCounts = useMemo(() => {
    const counts = { 'الكل': currentDict?.preparedEntries?.length || 0 };
    if (currentDict?.preparedEntries) {
      for (const e of currentDict.preparedEntries) {
        counts[e.letter] = (counts[e.letter] || 0) + 1;
      }
    }
    return counts;
  }, [currentDict]);

  // فتح/إغلاق البوكس عند الضغط
  const toggleCard = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // نسخ المصطلح والجواب
  const handleCopy = useCallback(async (entry, e) => {
    if (e) e.stopPropagation();
    const formatted = `📘 [${currentDict.category} - ${currentDict.title}]\n🔹 المصطلح: ${entry.term}\n📖 الجواب: ${entry.definition}\n📄 (باب حرف ${entry.letter} - صفحة ${entry.page})`;
    try {
      await navigator.clipboard.writeText(formatted);
      showToast(`تم نسخ "${entry.term}" مع الجواب`);
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

  // مشاركة المصطلح والجواب
  const handleShare = useCallback(async (entry, e) => {
    if (e) e.stopPropagation();
    const formatted = `📘 ${entry.term}\n\n${entry.definition}\n\n— من: ${currentDict.title} (ص ${entry.page}) عبر تطبيق المعجم`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `المعجم: ${entry.term}`,
          text: formatted
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopy(entry);
    showToast(`تم تجهيز ونسخ "${entry.term}" للمشاركة`);
  }, [currentDict, handleCopy, showToast]);

  // القفز إلى مصطلح مُحال إليه (مثل: راجع «التعوذ»)
  const jumpToTerm = useCallback((refTerm, e) => {
    if (e) e.stopPropagation();
    const cleaned = refTerm.replace(/[«»"()]/g, '').trim();
    setSelectedLetter('الكل');
    setActiveTab('dictionary');
    setSearchQuery(cleaned);
    showToast(`البحث الذكي عن: ${cleaned}`);
  }, [showToast]);

  const fontSizeClass =
    fontSize === 'sm' ? 'text-sm leading-relaxed' : fontSize === 'lg' ? 'text-xl leading-loose' : 'text-base leading-relaxed';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 select-none">
      {/* إشعار عائم سريع (Toast) */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-teal-700 dark:bg-teal-600 text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs sm:text-sm font-bold">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* الهيدر العلوي بتصميم تطبيق موبايل احترافي */}
      <header className="sticky top-0 z-30 bg-gradient-to-l from-teal-800 via-teal-700 to-emerald-800 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950 text-white shadow-lg border-b border-teal-600/30 dark:border-slate-800">
        <div className="max-w-md sm:max-w-2xl mx-auto px-3.5 pt-3 pb-2.5">
          {/* الصف الأول: اسم التطبيق + أزرار الثيم الأبيض/الأسود والخط */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                <BookOpen className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">المعجم</h1>
                <p className="text-[11px] text-teal-100/85 line-clamp-1">
                  {currentDict?.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={cycleFontSize}
                title="تغيير حجم الخط"
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-xs font-bold border border-white/15"
              >
                ع{fontSize === 'sm' ? '-' : fontSize === 'lg' ? '+' : ''}
              </button>

              <button
                onClick={() => setDarkMode(!darkMode)}
                aria-label="تبديل الثيم الأبيض والأسود"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-xs font-bold border border-white/15"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-300" />
                    <span>ثيم أبيض</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-teal-100" />
                    <span>ثيم أسود</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* التابات الرئيسية الثلاثة المطلوبة بالضبط: (معجم فقهي) (معجم أصولي) (معجم لغوي) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/20 dark:bg-slate-950/60 border border-white/10 mb-2.5">
            {allDictionaries.map((dict) => {
              const isSelected = dict.id === currentDict.id;
              return (
                <button
                  key={dict.id}
                  onClick={() => {
                    setSelectedDictId(dict.id);
                    setSelectedLetter('الكل');
                    if (activeTab === 'about') setActiveTab('dictionary');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold text-center transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-white text-teal-900 shadow-md scale-[1.01]'
                      : 'text-teal-50/90 hover:bg-white/10'
                  }`}
                >
                  <span>{dict.category}</span>
                </button>
              );
            })}
          </div>

          {/* شريط البحث الذكي (يبحث بالكلمة أو بالمعنى أو بجزء من المحتوى) */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-teal-200 absolute right-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'dictionary' && activeTab !== 'bookmarks') {
                  setActiveTab('dictionary');
                }
              }}
              placeholder="ابحث بالكلمة أو بالمعنى أو داخل المحتوى..."
              className="w-full pr-10 pl-24 py-2.5 rounded-2xl bg-white/15 dark:bg-slate-800/90 text-white placeholder-teal-100/75 dark:placeholder-slate-400 border border-white/20 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs sm:text-sm backdrop-blur-md transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-20 p-1 text-teal-100 hover:text-white"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setSearchScope(searchScope === 'all' ? 'termOnly' : 'all')}
              className="absolute left-2 px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold bg-teal-950/60 hover:bg-teal-950 text-amber-300 border border-white/15 transition"
            >
              {searchScope === 'all' ? 'شامل للمحتوى' : 'الكلمة فقط'}
            </button>
          </div>
        </div>

        {/* شريط الحروف الأبجدية السريع حسب فهرس الكتاب */}
        {(activeTab === 'dictionary' || activeTab === 'bookmarks') && (
          <div className="bg-teal-900/50 dark:bg-slate-900/90 border-t border-white/10 dark:border-slate-800">
            <div className="max-w-md sm:max-w-2xl mx-auto px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {ARABIC_CHAPTERS.map((chap) => {
                const active = selectedLetter === chap.letter;
                const count = chapterCounts[chap.letter] || 0;
                return (
                  <button
                    key={chap.letter}
                    onClick={() => setSelectedLetter(chap.letter)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                      active
                        ? 'bg-amber-400 text-slate-950 shadow-sm scale-105'
                        : 'bg-white/10 dark:bg-slate-800 text-teal-50 dark:text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    <span>{chap.letter === 'الكل' ? 'الكل' : `باب ${chap.letter}`}</span>
                    <span className={`text-[10px] px-1 rounded ${
                      active ? 'bg-slate-950/15 text-slate-950' : 'text-teal-200/80 dark:text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* المحتوى الرئيسي بنسق الموبايل */}
      <main className="flex-1 max-w-md sm:max-w-2xl w-full mx-auto px-3 pt-3 pb-24">
        {(activeTab === 'dictionary' || activeTab === 'bookmarks') && (
          <div>
            {/* شريط عدد النتائج وزر فتح/طي الكل */}
            <div className="flex items-center justify-between gap-2 mb-2.5 px-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>
                  {activeTab === 'bookmarks' ? 'المحفوظات: ' : 'النتائج: '}
                  <strong className="text-slate-900 dark:text-white">{filteredEntries.length}</strong> مصطلح
                  {selectedLetter !== 'الكل' && ` • باب ${selectedLetter}`}
                </span>
              </div>

              <button
                onClick={() => {
                  const visibleIds = filteredEntries.slice(0, visibleCount).map((e) => e.id);
                  const allOpen = visibleIds.every((id) => expandedIds.has(id));
                  setExpandedIds(allOpen ? new Set() : new Set(visibleIds));
                }}
                className="text-[11px] font-bold text-teal-700 dark:text-teal-400 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-slate-800 border border-teal-200/60 dark:border-slate-700"
              >
                {filteredEntries.slice(0, visibleCount).every((e) => expandedIds.has(e.id)) && filteredEntries.length > 0
                  ? 'طي الكل'
                  : 'فتح الكل'}
              </button>
            </div>

            {/* البوكسات التفاعلية (تضغط عليها يطلع الجواب مع نسخ ومشاركة) */}
            {filteredEntries.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 shadow-sm my-4">
                <Search className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {activeTab === 'bookmarks'
                    ? 'لا توجد مصطلحات محفوظة في المفضلة بعد'
                    : 'لم يتم العثور على نتائج مطابقة'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {activeTab === 'bookmarks'
                    ? 'اضغط على نجمة الحفظ بجانب أي مصطلح للرجوع إليه سريعاً.'
                    : 'جرب البحث بكلمة أخرى أو اختر "الكل" من شريط الحروف.'}
                </p>
                {(selectedLetter !== 'الكل' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedLetter('الكل');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
                  >
                    عرض جميع المصطلحات
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredEntries.slice(0, visibleCount).map((entry) => {
                  const isExpanded = expandedIds.has(entry.id);
                  const isBookmarked = bookmarksSet.has(entry.id);
                  const refMatch = entry.definition.match(/راجع\s+(?:لفظ|كلمة)?\s*[«"(\[]?([^»")\].،]{2,25})[»")\]]?/);

                  return (
                    <div
                      key={entry.id}
                      onClick={() => toggleCard(entry.id)}
                      className={`rounded-2xl transition-all duration-200 cursor-pointer border ${
                        isExpanded
                          ? 'bg-white dark:bg-slate-900 border-teal-500/60 dark:border-teal-500/50 shadow-md ring-1 ring-teal-500/20'
                          : 'bg-white/95 dark:bg-slate-900/85 hover:bg-white dark:hover:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm active:scale-[0.99]'
                      }`}
                    >
                      {/* رأس البوكس */}
                      <div className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                              isExpanded
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-slate-700'
                            }`}
                          >
                            {entry.term.replace(/^ال/, '').charAt(0) || 'أ'}
                          </div>

                          <div className="min-w-0">
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                              {entry.term}
                            </h2>
                            {!isExpanded && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                اضغط لعرض الجواب • باب {entry.letter} (ص {entry.page})
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            ص {entry.page}
                          </span>

                          <button
                            onClick={(e) => toggleBookmark(entry.id, e)}
                            className={`p-2 rounded-xl transition ${
                              isBookmarked
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                          </button>

                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-teal-600 dark:text-teal-400' : 'text-slate-400'
                            }`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* الجواب عند فتح البوكس + أزرار النسخ والمشاركة */}
                      {isExpanded && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50 rounded-b-2xl cursor-auto select-text"
                        >
                          <p
                            className={`font-serif text-slate-800 dark:text-slate-200 ${fontSizeClass} bg-white dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-inner`}
                          >
                            {entry.definition}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 mb-3">
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-teal-100/80 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">
                              باب حرف {entry.letter} • صفحة {entry.page}
                            </span>

                            {entry.sources?.map((src, i) => (
                              <span
                                key={i}
                                className="text-[11px] px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                📚 {src}
                              </span>
                            ))}

                            {refMatch && (
                              <button
                                onClick={(e) => jumpToTerm(refMatch[1], e)}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center gap-1"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                                <span>راجع: {refMatch[1]}</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={(e) => handleCopy(entry, e)}
                              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold shadow-sm transition"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الجواب</span>
                            </button>

                            <button
                              onClick={(e) => handleShare(entry, e)}
                              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold shadow-sm transition"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>مشاركة</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredEntries.length > visibleCount && (
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 50)}
                    className="w-full py-3.5 rounded-2xl bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    عرض المزيد من المصطلحات ({filteredEntries.length - visibleCount} متبقية)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* التبويب ٢: فهرس الكتاب الكامل */}
        {activeTab === 'index' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    فهرس {currentDict.category}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentDict.title} • مفهرس حسب الحروف الأبجدية والصفحات
                  </p>
                </div>
                <ListFilter className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ARABIC_CHAPTERS.slice(1).map((chap) => {
                  const count = chapterCounts[chap.letter] || 0;
                  return (
                    <button
                      key={chap.letter}
                      onClick={() => {
                        setSelectedLetter(chap.letter);
                        setActiveTab('dictionary');
                      }}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200/80 dark:border-slate-700/80 transition text-right"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-teal-600/10 text-teal-700 dark:text-teal-300 font-extrabold flex items-center justify-center text-sm">
                          {chap.short}
                        </span>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            باب {chap.letter}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            ص {chap.startPage}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 border border-slate-200 dark:border-slate-700">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {currentDict.sourcesList && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2">
                  مصادر ومراجع المعجم ({currentDict.sourcesList.length} مصدراً)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {currentDict.sourcesList.map((src, idx) => (
                    <span
                      key={idx}
                      onClick={() => {
                        setSearchQuery(src.split(' ')[0]);
                        setActiveTab('dictionary');
                      }}
                      className="cursor-pointer text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                    >
                      {idx + 1}. {src}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* التبويب ٤: عن الكتاب */}
        {activeTab === 'about' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {currentDict.title}
                </h2>
                <p className="text-xs text-teal-700 dark:text-teal-400 font-bold">
                  {currentDict.author} • {currentDict.publisher}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-serif">
              <p>{currentDict.description}</p>
              <p>
                رُتبت مصطلحات المعجم على الأحرف الأبجدية بمراعاة الحرف الأول والثاني من الكلمة بما هي واردة في لسان العلماء والفقهاء، مع دعم البحث الذكي الشامل للكلمات والمحتوى.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* شريط التنقل السفلي للموبايل (٤ أزرار نظيفة للمستخدم النهائي فقط بدون أي إضافة أو تعديل) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="max-w-md sm:max-w-2xl mx-auto px-3 py-1.5 grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
              activeTab === 'dictionary'
                ? 'text-teal-700 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/50 font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">المعجم</span>
          </button>

          <button
            onClick={() => setActiveTab('index')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
              activeTab === 'index'
                ? 'text-teal-700 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/50 font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ListFilter className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">فهرس الكتاب</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
              activeTab === 'bookmarks'
                ? 'text-teal-700 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/50 font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Bookmark className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">المحفوظات</span>
            {bookmarks.length > 0 && (
              <span className="absolute top-1 right-6 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
              activeTab === 'about'
                ? 'text-teal-700 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/50 font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Info className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">عن المعجم</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
