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
  Check,
  X,
  Info,
  Home,
  ArrowUpRight,
  ListFilter,
  Type
} from 'lucide-react';
import initialData from './data/dictionaries.json';
import { prepareEntryForSearch, smartSearchEntries } from './utils/smartSearch.js';

const STORAGE_KEYS = {
  THEME: 'almogam_theme_v1',
  BOOKMARKS: 'almogam_bookmarks_v1',
  FONT_SIZE: 'almogam_font_size_v1'
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

// مقاسات الخط المباشرة (بالبيكسل) لضمان تغير حجم الخط فعلياً في كل البطاقات والشروحات
const FONT_STYLES = {
  sm: {
    termSize: '18px',
    defSize: '16px',
    lineHeight: '1.75'
  },
  md: {
    termSize: '22px',
    defSize: '20px',
    lineHeight: '1.9'
  },
  lg: {
    termSize: '26px',
    defSize: '24px',
    lineHeight: '2.05'
  }
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

  // التبويبات: 'home' (الرئيسية) | 'dictionary' (المعجم) | 'fehrest' (الفهرست) | 'bookmarks' (المحفوظات) | 'about' (الإعدادات والكتاب)
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
    }, 2200);
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCopy = useCallback(async (entry, e) => {
    if (e) e.stopPropagation();
    const formatted = `📘 ${entry.term}\n\n${entry.definition}\n\n— (${currentDict.category} - تطبيق المعجم)`;
    try {
      if (window.Capacitor?.Plugins?.Clipboard) {
        await window.Capacitor.Plugins.Clipboard.write({ string: formatted });
      } else {
        await navigator.clipboard.writeText(formatted);
      }
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

  const handleShare = useCallback(async (entry, e) => {
    if (e) e.stopPropagation();
    const title = `المعجم: ${entry.term}`;
    const formatted = `📘 ${entry.term}\n\n${entry.definition}\n\n— (${currentDict.category} - تطبيق المعجم)`;

    if (window.AndroidShare && typeof window.AndroidShare.share === 'function') {
      window.AndroidShare.share(title, formatted);
      return;
    }
    if (window.Capacitor?.Plugins?.Share) {
      try {
        await window.Capacitor.Plugins.Share.share({
          title,
          text: formatted,
          dialogTitle: title
        });
        return;
      } catch {
        return;
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ title, text: formatted });
        return;
      } catch {
        return;
      }
    }
    await handleCopy(entry);
  }, [currentDict, handleCopy]);

  const jumpToTerm = useCallback((refTerm, e) => {
    if (e) e.stopPropagation();
    const cleaned = refTerm.replace(/[«»"()]/g, '').trim();
    setSelectedLetter('الكل');
    setSearchQuery(cleaned);
    showToast(`البحث عن: ${cleaned}`);
  }, [showToast]);

  // دالة عرض البوكسات المشتركة بين البحث في الواجهة الرئيسية وشاشة المعجم
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

      {/* الهيدر في شاشة المعجم والمحفوظات (بدون شريط الحروف العلوي الملغى) */}
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
      <main className="flex-1 max-w-lg w-full mx-auto px-3.5 pt-4 pb-28">
        {/* ١. الواجهة الرئيسية: عرض المعاجم الثلاثة بشكل نظيف ومبسط بدون شريط بحث */}
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

        {/* ٣. خانة الفهرست الجديدة لترتيب الأحرف الأبجدية بشكل كبير وواضح */}
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

        {/* ٤. شاشة الإعدادات وتفاصيل الكتاب الحقيقية من نص الكتاب الأصلي */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            {/* التحكم بالثيم وحجم الخط الفعلي */}
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
                {/* معاينة حية لحجم الخط المختار */}
                <div
                  style={{ fontSize: currentFont.defSize, lineHeight: currentFont.lineHeight }}
                  className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-serif text-center"
                >
                  نموذج معاينة حجم الخط المختار للقراءة
                </div>
              </div>
            </div>

            {/* بيانات الكتاب ومؤلفه الحقيقية كما وردت في صفحات الكتاب (ص ١ - ٨) */}
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
