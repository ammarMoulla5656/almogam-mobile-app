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
    return localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'lg';
  });

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

  // التبويبات المبسطة: 'home' (الرئيسية) | 'dictionary' (المعاجم) | 'bookmarks' (المحفوظات) | 'about' (عن المعجم والثيم)
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDictId, setSelectedDictId] = useState('fiqhi_main');
  const [selectedLetter, setSelectedLetter] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(() => new Set(['fiqh_1']));
  const [visibleCount, setVisibleCount] = useState(15);
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
    setVisibleCount(15);
  }, [searchQuery, selectedLetter, selectedDictId, activeTab]);

  const filteredEntries = useMemo(() => {
    if (!currentDict) return [];
    return smartSearchEntries(currentDict.preparedEntries, searchQuery, {
      letterFilter: selectedLetter,
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

  // نسخ المصطلح والجواب بدون أرقام صفحات
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

  // مشاركة المصطلح والجواب عبر نافذة مشاركة أندرويد الأصلية (Native Share Sheet)
  const handleShare = useCallback(async (entry, e) => {
    if (e) e.stopPropagation();
    const title = `المعجم: ${entry.term}`;
    const formatted = `📘 ${entry.term}\n\n${entry.definition}\n\n— (${currentDict.category} - تطبيق المعجم)`;

    // 1. الجسر الأصلي للأندرويد (MainActivity.java -> AndroidShare)
    if (window.AndroidShare && typeof window.AndroidShare.share === 'function') {
      window.AndroidShare.share(title, formatted);
      return;
    }
    // 2. إضافة Capacitor Share الرسمية إن توفرت
    if (window.Capacitor?.Plugins?.Share) {
      try {
        await window.Capacitor.Plugins.Share.share({
          title,
          text: formatted,
          dialogTitle: title
        });
        return;
      } catch {
        // user cancelled or error
      }
    }
    // 3. Web Share API القياسية
    if (navigator.share) {
      try {
        await navigator.share({ title, text: formatted });
        return;
      } catch {
        // user cancelled
      }
    }
    await handleCopy(entry);
  }, [currentDict, handleCopy]);

  const jumpToTerm = useCallback((refTerm, e) => {
    if (e) e.stopPropagation();
    const cleaned = refTerm.replace(/[«»"()]/g, '').trim();
    setSelectedLetter('الكل');
    setActiveTab('dictionary');
    setSearchQuery(cleaned);
    showToast(`البحث عن: ${cleaned}`);
  }, [showToast]);

  const fontSizeClass =
    fontSize === 'sm' ? 'text-base leading-relaxed' : fontSize === 'lg' ? 'text-xl leading-loose' : 'text-lg leading-relaxed';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 select-none">
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-teal-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* الهيدر المبسط والكبير (يظهر في شاشات المعاجم والمحفوظات بدون أي زحمة علوية) */}
      {(activeTab === 'dictionary' || activeTab === 'bookmarks') && (
        <header className="sticky top-0 z-30 bg-gradient-to-l from-teal-800 via-teal-700 to-emerald-800 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950 text-white shadow-lg">
          <div className="max-w-lg mx-auto px-3.5 pt-3.5 pb-3 space-y-3">
            {/* التابات الثلاثة بحجم كبير وواضح جداً */}
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

            {/* شريط البحث الذكي بحجم كبير ومبسط */}
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-teal-200 absolute right-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن أي كلمة أو معنى أو محتوى..."
                className="w-full pr-12 pl-12 py-3.5 rounded-2xl bg-white/15 dark:bg-slate-800/95 text-white placeholder-teal-100/80 dark:placeholder-slate-400 border border-white/25 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base font-medium backdrop-blur-md transition"
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
          </div>

          {/* شريط الحروف المبسط والواضح */}
          <div className="bg-teal-900/60 dark:bg-slate-900/95 border-t border-white/10">
            <div className="max-w-lg mx-auto px-3 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {ARABIC_CHAPTERS.map((chap) => {
                const active = selectedLetter === chap.letter;
                return (
                  <button
                    key={chap.letter}
                    onClick={() => setSelectedLetter(chap.letter)}
                    className={`px-4 py-1.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition-all ${
                      active
                        ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                        : 'bg-white/10 dark:bg-slate-800 text-teal-50 dark:text-slate-300'
                    }`}
                  >
                    {chap.letter === 'الكل' ? 'الكل' : `باب ${chap.letter}`}
                  </button>
                );
              })}
            </div>
          </div>
        </header>
      )}

      {/* المحتوى الرئيسي */}
      <main className="flex-1 max-w-lg w-full mx-auto px-3.5 pt-4 pb-28">
        {/* ١. الواجهة الرئيسية البسيطة التي توضح كل البرنامج */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* بطاقة الترحيب والبحث السريع المباشر */}
            <div className="rounded-3xl bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800 dark:from-slate-900 dark:to-teal-950 text-white p-6 shadow-xl border border-teal-600/30">
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25 text-2xl shadow-inner">
                  📘
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold">تطبيق المعجم</h1>
                  <p className="text-sm text-teal-100/90 mt-0.5">
                    موسوعتك المبسطة للمصطلحات الفقهية والأصولية واللغوية
                  </p>
                </div>
              </div>

              {/* بحث كبير مباشر من الواجهة الرئيسية */}
              <div className="relative flex items-center mt-4">
                <Search className="w-5 h-5 text-teal-700 absolute right-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveTab('dictionary');
                  }}
                  placeholder="ابحث هنا مباشرة عن أي مصطلح أو معنى..."
                  className="w-full pr-12 pl-4 py-4 rounded-2xl bg-white text-slate-900 placeholder-slate-400 font-bold text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* بطاقات المعاجم الثلاثة الكبيرة للوصول المباشر بضغطة واحدة */}
            <div className="space-y-3">
              <h2 className="text-base font-extrabold text-slate-700 dark:text-slate-300 px-1">
                اختر المعجم للتصفح:
              </h2>
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
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {dict.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {dict.description}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-md">
                    ←
                  </div>
                </button>
              ))}
            </div>

            {/* شرح مبسط وسريع لطريقة عمل البرنامج */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                كيف تستخدم التطبيق ببساطة؟
              </h3>
              <div className="grid grid-cols-1 gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  🔍 <strong>بحث ذكي وشامل:</strong> اكتب الكلمة أو معناها في شريط البحث وسيظهر لك المصطلح فوراً حتى بدون كتابة دقيقة.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  📦 <strong>بوكسات كبيرة وواضحة:</strong> اضغط على أي مصطلح ليفتح لك الشرح الكامل بخط كبير ومريح مع أزرار <strong>النسخ والمشاركة</strong>.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  🌙 <strong>تخصيص المظهر والخط:</strong> من تبويب <strong>"عن المعجم"</strong> بالأسفل يمكنك التبديل بين الثيم الأبيض والأسود وتكبير الخط.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ٢. شاشة المعجم والمحفوظات (بوكسات كبيرة وواضحة وعدد أقل في الصفحة بدون أرقام صفحات) */}
        {(activeTab === 'dictionary' || activeTab === 'bookmarks') && (
          <div className="space-y-3.5">
            {filteredEntries.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 shadow-sm my-4">
                <Search className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                  {activeTab === 'bookmarks'
                    ? 'لا توجد مصطلحات محفوظة بعد'
                    : 'لم يتم العثور على نتائج مطابقة'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  {activeTab === 'bookmarks'
                    ? 'اضغط على نجمة الحفظ بجانب أي مصطلح للرجوع إليه هنا.'
                    : 'جرب البحث بكلمة أخرى أو اختر "الكل" من شريط الحروف.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredEntries.slice(0, visibleCount).map((entry) => {
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
                      {/* رأس البوكس بحجم كبير ومبسط جداً بدون رقم صفحة */}
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
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                              {entry.term}
                            </h2>
                            {!isExpanded && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                اضغط لعرض الجواب • باب {entry.letter}
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

                      {/* الجواب عند فتح البوكس بخط واضح وكبير + نسخ ومشاركة أصلية */}
                      {isExpanded && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50 rounded-b-3xl cursor-auto select-text"
                        >
                          <p
                            className={`font-serif text-slate-800 dark:text-slate-100 ${fontSizeClass} bg-white dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-inner`}
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

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={(e) => handleCopy(entry, e)}
                              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-sm font-extrabold shadow-md transition"
                            >
                              <Copy className="w-4 h-4" />
                              <span>نسخ الجواب</span>
                            </button>

                            <button
                              onClick={(e) => handleShare(entry, e)}
                              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 active:scale-95 text-white text-sm font-extrabold shadow-md transition"
                            >
                              <Share2 className="w-4 h-4" />
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
                    onClick={() => setVisibleCount((prev) => prev + 15)}
                    className="w-full py-4 rounded-3xl bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 font-extrabold text-base border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    عرض المزيد ({filteredEntries.length - visibleCount} متبقية)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ٣. شاشة عن المعجم + التحكم بالثيم (أبيض / أسود) وحجم الخط كما طلبت */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            {/* بطاقة معلومات الكتاب */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {currentDict.title}
                  </h2>
                  <p className="text-sm text-teal-700 dark:text-teal-400 font-bold mt-0.5">
                    {currentDict.author} • {currentDict.publisher}
                  </p>
                </div>
              </div>
              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300 font-serif">
                {currentDict.description}
              </p>
            </div>

            {/* بطاقة اختيار الثيم (أبيض / أسود) وتكبير الخط المنقولة إلى هنا بحجم كبير وواضح */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                مظهر التطبيق والثيم
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
                  <span>ثيم أبيض (نهاري)</span>
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
                  <span>ثيم أسود (ليلي)</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2.5 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  <span>حجم خط الشرح والجواب:</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sm', label: 'متوسط' },
                    { id: 'md', label: 'كبير' },
                    { id: 'lg', label: 'كبير جداً' }
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      onClick={() => {
                        setFontSize(sz.id);
                        localStorage.setItem(STORAGE_KEYS.FONT_SIZE, sz.id);
                      }}
                      className={`py-3 rounded-xl font-extrabold text-sm border transition ${
                        fontSize === sz.id
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
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

      {/* شريط التنقل السفلي المبسط والكبير بدون تبويب الفهرس الملغى */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="max-w-lg mx-auto px-3 py-2 grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-2 rounded-2xl transition ${
              activeTab === 'home'
                ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-xs">الرئيسية</span>
          </button>

          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex flex-col items-center justify-center py-2 rounded-2xl transition ${
              activeTab === 'dictionary'
                ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-xs">المعجم</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`relative flex flex-col items-center justify-center py-2 rounded-2xl transition ${
              activeTab === 'bookmarks'
                ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Bookmark className="w-5 h-5 mb-0.5" />
            <span className="text-xs">المحفوظات</span>
            {bookmarks.length > 0 && (
              <span className="absolute top-1.5 right-6 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex flex-col items-center justify-center py-2 rounded-2xl transition ${
              activeTab === 'about'
                ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Info className="w-5 h-5 mb-0.5" />
            <span className="text-xs">عن المعجم</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
