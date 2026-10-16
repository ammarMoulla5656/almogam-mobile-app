#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, 'src/data/dictionaries.json'), 'r', encoding='utf-8') as f:
    db_json_str = f.read()

with open(os.path.join(BASE_DIR, 'src/utils/smartSearch.js'), 'r', encoding='utf-8') as f:
    smart_search_code = f.read().replace('export function ', 'function ')

html_template = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="theme-color" content="#0D9488" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="المعجم" />
  <link rel="manifest" href="./manifest.json" />
  <title>المعجم - معجم فقهي وأصولي ولغوي</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {{
      darkMode: 'class',
      theme: {{
        extend: {{
          fontFamily: {{
            sans: ['Tajawal', 'system-ui', '-apple-system', 'sans-serif'],
            serif: ['Amiri', 'Traditional Arabic', 'serif'],
          }}
        }}
      }}
    }};
  </script>
  <style>
    html {{
      font-family: 'Tajawal', system-ui, -apple-system, sans-serif;
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior-y: none;
    }}
    body {{
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      user-select: none;
    }}
    .no-scrollbar::-webkit-scrollbar {{ display: none; }}
    .no-scrollbar {{ -ms-overflow-style: none; scrollbar-width: none; }}
  </style>
</head>
<body class="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-teal-500 selection:text-white transition-colors duration-200">
  <div id="app"></div>

  <script>
    window.ALMOGAM_INITIAL_DATA = {db_json_str};
  </script>

  <script>
    {smart_search_code}

    const STORAGE_KEYS = {{
      THEME: 'almogam_theme_v1',
      BOOKMARKS: 'almogam_bookmarks_v1',
      FONT_SIZE: 'almogam_font_size_v1'
    }};

    const ARABIC_CHAPTERS = [
      {{ letter: 'الكل', short: 'الكل' }},
      {{ letter: 'الهمزة', short: 'أ' }},
      {{ letter: 'الباء', short: 'ب' }},
      {{ letter: 'التاء', short: 'ت' }},
      {{ letter: 'الثاء', short: 'ث' }},
      {{ letter: 'الجيم', short: 'ج' }},
      {{ letter: 'الحاء', short: 'ح' }},
      {{ letter: 'الخاء', short: 'خ' }},
      {{ letter: 'الدال', short: 'د' }},
      {{ letter: 'الذال', short: 'ذ' }},
      {{ letter: 'الراء', short: 'ر' }},
      {{ letter: 'الزاي', short: 'ز' }},
      {{ letter: 'السين', short: 'س' }},
      {{ letter: 'الشين', short: 'ش' }},
      {{ letter: 'الصاد', short: 'ص' }},
      {{ letter: 'الضاد', short: 'ض' }},
      {{ letter: 'الطاء', short: 'ط' }},
      {{ letter: 'الظاء', short: 'ظ' }},
      {{ letter: 'العين', short: 'ع' }},
      {{ letter: 'الغين', short: 'غ' }},
      {{ letter: 'الفاء', short: 'ف' }},
      {{ letter: 'القاف', short: 'ق' }},
      {{ letter: 'الكاف', short: 'ك' }},
      {{ letter: 'اللام', short: 'ل' }},
      {{ letter: 'الميم', short: 'م' }},
      {{ letter: 'النون', short: 'ن' }},
      {{ letter: 'الهاء', short: 'هـ' }},
      {{ letter: 'الواو', short: 'و' }},
      {{ letter: 'الياء', short: 'ي' }}
    ];

    const state = {{
      darkMode: localStorage.getItem(STORAGE_KEYS.THEME) === 'dark',
      fontSize: localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'lg',
      bookmarks: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]'),
      activeTab: 'home', // 'home' | 'dictionary' | 'bookmarks' | 'about'
      selectedDictId: 'fiqhi_main',
      selectedLetter: 'الكل',
      searchQuery: '',
      expandedIds: new Set(['fiqh_1']),
      visibleCount: 15,
      allDictionaries: []
    }};

    function initDictionaries() {{
      state.allDictionaries = window.ALMOGAM_INITIAL_DATA.dictionaries.map(d => ({{
        ...d,
        preparedEntries: d.entries.map(prepareEntryForSearch)
      }}));
    }}

    function applyTheme() {{
      if (state.darkMode) {{
        document.documentElement.classList.add('dark');
      }} else {{
        document.documentElement.classList.remove('dark');
      }}
    }}

    function showToast(msg) {{
      let toast = document.getElementById('toast-banner');
      if (!toast) {{
        toast = document.createElement('div');
        toast.id = 'toast-banner';
        toast.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-teal-700 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold transition-all';
        document.body.appendChild(toast);
      }}
      toast.textContent = '✓ ' + msg;
      toast.style.display = 'block';
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => {{ toast.style.display = 'none'; }}, 2200);
    }}

    function escapeHtml(str) {{
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }}

    window.setThemeMode = function(isDark) {{
      state.darkMode = isDark;
      localStorage.setItem(STORAGE_KEYS.THEME, state.darkMode ? 'dark' : 'light');
      applyTheme();
      renderApp();
    }};

    window.setFontSize = function(sz) {{
      state.fontSize = sz;
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, sz);
      renderApp();
    }};

    window.selectDictionary = function(id) {{
      state.selectedDictId = id;
      state.selectedLetter = 'الكل';
      state.visibleCount = 15;
      state.activeTab = 'dictionary';
      renderApp();
    }};

    window.selectLetter = function(letter) {{
      state.selectedLetter = letter;
      state.visibleCount = 15;
      state.activeTab = 'dictionary';
      renderApp();
    }};

    window.switchTab = function(tab) {{
      state.activeTab = tab;
      state.visibleCount = 15;
      renderApp();
    }};

    window.onSearchInput = function(val) {{
      state.searchQuery = val;
      state.visibleCount = 15;
      if (state.activeTab !== 'dictionary' && state.activeTab !== 'bookmarks') {{
        state.activeTab = 'dictionary';
        renderApp();
        const input = document.getElementById('search-input');
        if (input) {{
          input.focus();
          input.setSelectionRange(val.length, val.length);
        }}
        return;
      }}
      renderContentOnly();
    }};

    window.clearSearch = function() {{
      state.searchQuery = '';
      state.visibleCount = 15;
      renderApp();
    }};

    window.toggleCard = function(id) {{
      if (state.expandedIds.has(id)) {{
        state.expandedIds.delete(id);
      }} else {{
        state.expandedIds.add(id);
      }}
      renderContentOnly();
    }};

    window.toggleBookmark = function(id, ev) {{
      if (ev) ev.stopPropagation();
      const idx = state.bookmarks.indexOf(id);
      if (idx >= 0) {{
        state.bookmarks.splice(idx, 1);
        showToast('تمت الإزالة من المحفوظات');
      }} else {{
        state.bookmarks.push(id);
        showToast('تم الحفظ في المفضلة');
      }}
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
      renderApp();
    }};

    window.copyEntry = async function(id, ev) {{
      if (ev) ev.stopPropagation();
      const dict = state.allDictionaries.find(d => d.id === state.selectedDictId) || state.allDictionaries[0];
      const entry = dict.preparedEntries.find(e => e.id === id);
      if (!entry) return;
      const text = `📘 ${{entry.term}}\\n\\n${{entry.definition}}\\n\\n— (${{dict.category}} - تطبيق المعجم)`;
      try {{
        if (window.Capacitor?.Plugins?.Clipboard) {{
          await window.Capacitor.Plugins.Clipboard.write({{ string: text }});
        }} else if (navigator.clipboard) {{
          await navigator.clipboard.writeText(text);
        }} else {{
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }}
      }} catch {{}}
      showToast(`تم نسخ "${{entry.term}}" مع الجواب!`);
    }};

    window.shareEntry = async function(id, ev) {{
      if (ev) ev.stopPropagation();
      const dict = state.allDictionaries.find(d => d.id === state.selectedDictId) || state.allDictionaries[0];
      const entry = dict.preparedEntries.find(e => e.id === id);
      if (!entry) return;
      const title = `المعجم: ${{entry.term}}`;
      const text = `📘 ${{entry.term}}\\n\\n${{entry.definition}}\\n\\n— (${{dict.category}} - تطبيق المعجم)`;

      // 1. الجسر الأصلي للأندرويد (Native Share Sheet via MainActivity.java)
      if (window.AndroidShare && typeof window.AndroidShare.share === 'function') {{
        window.AndroidShare.share(title, text);
        return;
      }}
      // 2. Capacitor Share Plugin
      if (window.Capacitor?.Plugins?.Share) {{
        try {{
          await window.Capacitor.Plugins.Share.share({{ title, text, dialogTitle: title }});
          return;
        }} catch {{
          return;
        }}
      }}
      // 3. Web Share API
      if (navigator.share) {{
        try {{
          await navigator.share({{ title, text }});
          return;
        }} catch {{
          return;
        }}
      }}
      window.copyEntry(id, ev);
    }};

    window.jumpToTerm = function(term, ev) {{
      if (ev) ev.stopPropagation();
      state.selectedLetter = 'الكل';
      state.activeTab = 'dictionary';
      state.searchQuery = term;
      renderApp();
      showToast(`البحث عن: ${{term}}`);
    }};

    window.loadMore = function() {{
      state.visibleCount += 15;
      renderContentOnly();
    }};

    function getFilteredData() {{
      const currentDict = state.allDictionaries.find(d => d.id === state.selectedDictId) || state.allDictionaries[0];
      const bookmarksSet = new Set(state.bookmarks);
      const filtered = smartSearchEntries(currentDict.preparedEntries, state.searchQuery, {{
        letterFilter: state.selectedLetter,
        searchScope: 'all',
        onlyBookmarks: state.activeTab === 'bookmarks',
        bookmarksSet
      }});
      return {{ currentDict, filtered, bookmarksSet }};
    }}

    function renderMainSection() {{
      const {{ currentDict, filtered, bookmarksSet }} = getFilteredData();
      const fontClass = state.fontSize === 'sm' ? 'text-base leading-relaxed' : state.fontSize === 'lg' ? 'text-xl leading-loose' : 'text-lg leading-relaxed';

      // ١. الواجهة الرئيسية البسيطة التي توضح كل البرنامج
      if (state.activeTab === 'home') {{
        return `
          <div class="space-y-4">
            <div class="rounded-3xl bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800 dark:from-slate-900 dark:to-teal-950 text-white p-6 shadow-xl border border-teal-600/30">
              <div class="flex items-center gap-3.5 mb-3">
                <div class="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25 text-2xl shadow-inner">📘</div>
                <div>
                  <h1 class="text-2xl font-extrabold">تطبيق المعجم</h1>
                  <p class="text-sm text-teal-100/90 mt-0.5">موسوعتك المبسطة للمصطلحات الفقهية والأصولية واللغوية</p>
                </div>
              </div>

              <div class="relative flex items-center mt-4">
                <input
                  type="text"
                  placeholder="🔍 ابحث هنا مباشرة عن أي مصطلح أو معنى..."
                  oninput="onSearchInput(this.value)"
                  class="w-full px-5 py-4 rounded-2xl bg-white text-slate-900 placeholder-slate-400 font-bold text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-extrabold text-slate-700 dark:text-slate-300 px-1">اختر المعجم للتصفح:</h2>
              ${{state.allDictionaries.map(dict => `
                <button onclick="selectDictionary('${{dict.id}}')" class="w-full p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-teal-500 active:scale-[0.99] transition text-right flex items-center justify-between gap-4">
                  <div class="space-y-1">
                    <span class="inline-block px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 text-xs font-extrabold">${{escapeHtml(dict.category)}}</span>
                    <h3 class="text-lg font-extrabold text-slate-900 dark:text-white">${{escapeHtml(dict.title)}}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">${{escapeHtml(dict.description)}}</p>
                  </div>
                  <div class="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-md">←</div>
                </button>
              `).join('')}}
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">كيف تستخدم التطبيق ببساطة؟</h3>
              <div class="grid grid-cols-1 gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  🔍 <strong>بحث ذكي وشامل:</strong> اكتب الكلمة أو معناها في شريط البحث وسيظهر لك المصطلح فوراً حتى بدون كتابة دقيقة.
                </div>
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  📦 <strong>بوكسات كبيرة وواضحة:</strong> اضغط على أي مصطلح ليفتح لك الشرح الكامل بخط كبير ومريح مع أزرار <strong>النسخ والمشاركة</strong>.
                </div>
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  🌙 <strong>تخصيص المظهر والخط:</strong> من تبويب <strong>"عن المعجم"</strong> بالأسفل يمكنك التبديل بين الثيم الأبيض والأسود وتكبير الخط.
                </div>
              </div>
            </div>
          </div>
        `;
      }}

      // ٢. شاشة المعجم والمحفوظات (بوكسات كبيرة وعدد أقل بدون أرقام صفحات)
      if (state.activeTab === 'dictionary' || state.activeTab === 'bookmarks') {{
        const slice = filtered.slice(0, state.visibleCount);
        const cardsHtml = slice.length === 0
          ? `<div class="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 my-4">
               <p class="text-lg font-extrabold mb-1">${{state.activeTab === 'bookmarks' ? 'لا توجد مصطلحات محفوظة بعد' : 'لم يتم العثور على نتائج مطابقة'}}</p>
               <p class="text-sm text-slate-500 dark:text-slate-400">جرب البحث بكلمة أخرى أو اختر "الكل" من شريط الحروف.</p>
             </div>`
          : slice.map(entry => {{
              const isOpen = state.expandedIds.has(entry.id);
              const isFav = bookmarksSet.has(entry.id);
              const firstChar = entry.term.replace(/^ال/, '').charAt(0) || 'أ';
              const refMatch = entry.definition.match(/راجع\\s+(?:لفظ|كلمة)?\\s*[«"(\\[]?([^»")\\].،]{{2,25}})[»")\\]]?/);

              return `
                <div onclick="toggleCard('${{entry.id}}')" class="rounded-3xl transition-all duration-200 cursor-pointer border ${{isOpen ? 'bg-white dark:bg-slate-900 border-teal-500 shadow-lg ring-2 ring-teal-500/20' : 'bg-white dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 shadow-sm active:scale-[0.99]'}}">
                  <div class="p-5 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3.5 min-w-0">
                      <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 ${{isOpen ? 'bg-teal-600 text-white shadow-md' : 'bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-slate-700'}}">
                        ${{escapeHtml(firstChar)}}
                      </div>
                      <div class="min-w-0">
                        <h2 class="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">${{escapeHtml(entry.term)}}</h2>
                        ${{!isOpen ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">اضغط لعرض الجواب • باب ${{escapeHtml(entry.letter)}}</p>` : ''}}
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <button onclick="toggleBookmark('${{entry.id}}', event)" class="p-2.5 rounded-2xl text-lg ${{isFav ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}}" title="حفظ">
                        ${{isFav ? '★' : '☆'}}
                      </button>
                      <span class="w-8 h-8 flex items-center justify-center text-sm transition-transform ${{isOpen ? 'rotate-180 text-teal-600 font-bold' : 'text-slate-400'}}">▼</span>
                    </div>
                  </div>
                  ${{isOpen ? `
                    <div onclick="event.stopPropagation()" class="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 rounded-b-3xl cursor-auto select-text">
                      <p class="font-serif text-slate-800 dark:text-slate-100 ${{fontClass}} bg-white dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-inner">
                        ${{escapeHtml(entry.definition)}}
                      </p>
                      <div class="flex flex-wrap items-center gap-2 mt-3 mb-4">
                        <span class="text-xs font-bold px-3 py-1 rounded-xl bg-teal-100/80 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">باب حرف ${{escapeHtml(entry.letter)}}</span>
                        ${{refMatch ? `<button onclick="jumpToTerm('${{escapeHtml(refMatch[1])}}', event)" class="text-xs font-bold px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">↗ راجع: ${{escapeHtml(refMatch[1])}}</button>` : ''}}
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                        <button onclick="copyEntry('${{entry.id}}', event)" class="py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-sm font-extrabold shadow-md transition">📋 نسخ الجواب</button>
                        <button onclick="shareEntry('${{entry.id}}', event)" class="py-3.5 rounded-2xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 active:scale-95 text-white text-sm font-extrabold shadow-md transition">📤 مشاركة</button>
                      </div>
                    </div>
                  ` : ''}}
                </div>
              `;
            }}).join('');

        return `
          <div class="space-y-3.5">${{cardsHtml}}</div>
          ${{filtered.length > state.visibleCount ? `
            <button onclick="loadMore()" class="mt-4 w-full py-4 rounded-3xl bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 font-extrabold text-base border border-slate-200 dark:border-slate-800 shadow-sm">
              عرض المزيد (${{filtered.length - state.visibleCount}} متبقية)
            </button>
          ` : ''}}
        `;
      }}

      // ٣. شاشة عن المعجم + اختيار الثيم الأبيض والأسود وحجم الخط
      return `
        <div class="space-y-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h2 class="text-xl font-extrabold">${{escapeHtml(currentDict.title)}}</h2>
            <p class="text-sm text-teal-700 dark:text-teal-400 font-bold">${{escapeHtml(currentDict.author)}} • ${{escapeHtml(currentDict.publisher)}}</p>
            <p class="text-base leading-relaxed font-serif text-slate-700 dark:text-slate-300">
              ${{escapeHtml(currentDict.description)}}
            </p>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 class="text-lg font-extrabold text-slate-900 dark:text-white">مظهر التطبيق والثيم</h3>
            <div class="grid grid-cols-2 gap-3">
              <button onclick="setThemeMode(false)" class="p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-extrabold text-base transition ${{!state.darkMode ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-500'}}">
                <span class="text-2xl">☀️</span>
                <span>ثيم أبيض (نهاري)</span>
              </button>
              <button onclick="setThemeMode(true)" class="p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-extrabold text-base transition ${{state.darkMode ? 'border-teal-500 bg-slate-800 text-white shadow-sm' : 'border-slate-200 text-slate-600'}}">
                <span class="text-2xl">🌙</span>
                <span>ثيم أسود (ليلي)</span>
              </button>
            </div>

            <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div class="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2.5">حجم خط الشرح والجواب:</div>
              <div class="grid grid-cols-3 gap-2">
                <button onclick="setFontSize('sm')" class="py-3 rounded-xl font-extrabold text-sm border ${{state.fontSize === 'sm' ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}}">متوسط</button>
                <button onclick="setFontSize('md')" class="py-3 rounded-xl font-extrabold text-sm border ${{state.fontSize === 'md' ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}}">كبير</button>
                <button onclick="setFontSize('lg')" class="py-3 rounded-xl font-extrabold text-sm border ${{state.fontSize === 'lg' ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}}">كبير جداً</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }}

    function renderContentOnly() {{
      const mainEl = document.getElementById('main-content');
      if (mainEl) mainEl.innerHTML = renderMainSection();
    }}

    function renderApp() {{
      const {{ currentDict }} = getFilteredData();
      const appEl = document.getElementById('app');
      const showHeader = state.activeTab === 'dictionary' || state.activeTab === 'bookmarks';

      appEl.innerHTML = `
        <div class="min-h-screen flex flex-col">
          ${{showHeader ? `
            <header class="sticky top-0 z-30 bg-gradient-to-l from-teal-800 via-teal-700 to-emerald-800 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950 text-white shadow-lg">
              <div class="max-w-lg mx-auto px-3.5 pt-3.5 pb-3 space-y-3">
                <!-- التابات الثلاثة الكبيرة والواضحة بدون أي زحمة فوقها -->
                <div class="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-black/25 dark:bg-slate-950/70 border border-white/10">
                  ${{state.allDictionaries.map(d => `
                    <button onclick="selectDictionary('${{d.id}}')" class="py-3 px-2 rounded-xl text-sm sm:text-base font-extrabold text-center transition-all ${{d.id === currentDict.id ? 'bg-white text-teal-900 shadow-md scale-[1.02]' : 'text-teal-50/90 hover:bg-white/10'}}">
                      ${{escapeHtml(d.category)}}
                    </button>
                  `).join('')}}
                </div>

                <!-- شريط البحث الذكي الكبير والمبسط -->
                <div class="relative flex items-center">
                  <input
                    id="search-input"
                    type="text"
                    value="${{escapeHtml(state.searchQuery)}}"
                    oninput="onSearchInput(this.value)"
                    placeholder="🔍 ابحث عن أي كلمة أو معنى أو محتوى..."
                    class="w-full px-4 py-3.5 rounded-2xl bg-white/15 dark:bg-slate-800/95 text-white placeholder-teal-100/85 border border-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base font-medium"
                  />
                  ${{state.searchQuery ? `<button onclick="clearSearch()" class="absolute left-3 px-2.5 py-1 rounded-full bg-black/30 text-white text-xs font-bold">✕</button>` : ''}}
                </div>
              </div>

              <!-- شريط الحروف الأبجدية المبسط بدون أرقام مزعجة -->
              <div class="bg-teal-900/60 dark:bg-slate-900/95 border-t border-white/10">
                <div class="max-w-lg mx-auto px-3 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  ${{ARABIC_CHAPTERS.map(c => `
                    <button onclick="selectLetter('${{c.letter}}')" class="px-4 py-1.5 rounded-xl text-sm font-extrabold whitespace-nowrap ${{state.selectedLetter === c.letter ? 'bg-amber-400 text-slate-950 shadow-md scale-105' : 'bg-white/10 text-teal-50 hover:bg-white/20'}}">
                      ${{c.letter === 'الكل' ? 'الكل' : 'باب ' + c.letter}}
                    </button>
                  `).join('')}}
                </div>
              </div>
            </header>
          ` : ''}}

          <main id="main-content" class="flex-1 max-w-lg w-full mx-auto px-3.5 pt-4 pb-28">
            ${{renderMainSection()}}
          </main>

          <nav class="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl">
            <div class="max-w-lg mx-auto px-3 py-2 grid grid-cols-4 gap-1.5 text-center">
              <button onclick="switchTab('home')" class="py-2 rounded-2xl text-xs sm:text-sm ${{state.activeTab === 'home' ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-extrabold' : 'text-slate-500'}}">🏠 الرئيسية</button>
              <button onclick="switchTab('dictionary')" class="py-2 rounded-2xl text-xs sm:text-sm ${{state.activeTab === 'dictionary' ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-extrabold' : 'text-slate-500'}}">📘 المعجم</button>
              <button onclick="switchTab('bookmarks')" class="py-2 rounded-2xl text-xs sm:text-sm ${{state.activeTab === 'bookmarks' ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-extrabold' : 'text-slate-500'}}">★ المحفوظات (${{state.bookmarks.length}})</button>
              <button onclick="switchTab('about')" class="py-2 rounded-2xl text-xs sm:text-sm ${{state.activeTab === 'about' ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 font-extrabold' : 'text-slate-500'}}">ℹ️ عن المعجم</button>
            </div>
          </nav>
        </div>
      `;
    }}

    initDictionaries();
    applyTheme();
    renderApp();
  </script>
</body>
</html>
"""

dist_dir = os.path.join(BASE_DIR, 'dist')
os.makedirs(dist_dir, exist_ok=True)
with open(os.path.join(dist_dir, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html_template)

print("Generated simplified large mobile bundle at dist/index.html")
