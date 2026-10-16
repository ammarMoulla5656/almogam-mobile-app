#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os

with open('/mnt/d/almogam/src/data/dictionaries.json', 'r', encoding='utf-8') as f:
    db_json_str = f.read()

with open('/mnt/d/almogam/src/utils/smartSearch.js', 'r', encoding='utf-8') as f:
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

  <!-- قاعدة البيانات الكاملة (تُدار من قبل المطور فقط عبر ملف dictionaries.json) -->
  <script>
    window.ALMOGAM_INITIAL_DATA = {db_json_str};
  </script>

  <!-- محرك البحث الذكي وواجهة تطبيق الموبايل للمستخدم النهائي -->
  <script>
    {smart_search_code}

    const STORAGE_KEYS = {{
      THEME: 'almogam_theme_v1',
      BOOKMARKS: 'almogam_bookmarks_v1',
      FONT_SIZE: 'almogam_font_size_v1'
    }};

    const ARABIC_CHAPTERS = [
      {{ letter: 'الكل', short: 'الكل', startPage: 9 }},
      {{ letter: 'الهمزة', short: 'أ', startPage: 9 }},
      {{ letter: 'الباء', short: 'ب', startPage: 27 }},
      {{ letter: 'التاء', short: 'ت', startPage: 37 }},
      {{ letter: 'الثاء', short: 'ث', startPage: 51 }},
      {{ letter: 'الجيم', short: 'ج', startPage: 55 }},
      {{ letter: 'الحاء', short: 'ح', startPage: 63 }},
      {{ letter: 'الخاء', short: 'خ', startPage: 75 }},
      {{ letter: 'الدال', short: 'د', startPage: 83 }},
      {{ letter: 'الذال', short: 'ذ', startPage: 89 }},
      {{ letter: 'الراء', short: 'ر', startPage: 93 }},
      {{ letter: 'الزاي', short: 'ز', startPage: 101 }},
      {{ letter: 'السين', short: 'س', startPage: 103 }},
      {{ letter: 'الشين', short: 'ش', startPage: 113 }},
      {{ letter: 'الصاد', short: 'ص', startPage: 121 }},
      {{ letter: 'الضاد', short: 'ض', startPage: 127 }},
      {{ letter: 'الطاء', short: 'ط', startPage: 129 }},
      {{ letter: 'الظاء', short: 'ظ', startPage: 135 }},
      {{ letter: 'العين', short: 'ع', startPage: 137 }},
      {{ letter: 'الغين', short: 'غ', startPage: 151 }},
      {{ letter: 'الفاء', short: 'ف', startPage: 155 }},
      {{ letter: 'القاف', short: 'ق', startPage: 164 }},
      {{ letter: 'الكاف', short: 'ك', startPage: 175 }},
      {{ letter: 'اللام', short: 'ل', startPage: 183 }},
      {{ letter: 'الميم', short: 'م', startPage: 189 }},
      {{ letter: 'النون', short: 'ن', startPage: 215 }},
      {{ letter: 'الهاء', short: 'هـ', startPage: 223 }},
      {{ letter: 'الواو', short: 'و', startPage: 227 }},
      {{ letter: 'الياء', short: 'ي', startPage: 233 }}
    ];

    const state = {{
      darkMode: localStorage.getItem(STORAGE_KEYS.THEME) === 'dark',
      fontSize: localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'md',
      bookmarks: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]'),
      activeTab: 'dictionary', // 'dictionary' | 'index' | 'bookmarks' | 'about'
      selectedDictId: 'fiqhi_main',
      selectedLetter: 'الكل',
      searchQuery: '',
      searchScope: 'all',
      expandedIds: new Set(['fiqh_1', 'fiqh_6']),
      visibleCount: 40,
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
        toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-teal-700 text-white px-5 py-2.5 rounded-full shadow-xl text-xs sm:text-sm font-bold transition-all';
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

    window.toggleTheme = function() {{
      state.darkMode = !state.darkMode;
      localStorage.setItem(STORAGE_KEYS.THEME, state.darkMode ? 'dark' : 'light');
      applyTheme();
      renderApp();
    }};

    window.cycleFontSize = function() {{
      state.fontSize = state.fontSize === 'sm' ? 'md' : state.fontSize === 'md' ? 'lg' : 'sm';
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, state.fontSize);
      renderApp();
    }};

    window.selectDictionary = function(id) {{
      state.selectedDictId = id;
      state.selectedLetter = 'الكل';
      state.visibleCount = 40;
      if (state.activeTab === 'about') state.activeTab = 'dictionary';
      renderApp();
    }};

    window.selectLetter = function(letter) {{
      state.selectedLetter = letter;
      state.visibleCount = 40;
      state.activeTab = 'dictionary';
      renderApp();
    }};

    window.switchTab = function(tab) {{
      state.activeTab = tab;
      state.visibleCount = 40;
      renderApp();
    }};

    window.onSearchInput = function(val) {{
      state.searchQuery = val;
      state.visibleCount = 40;
      if (state.activeTab !== 'dictionary' && state.activeTab !== 'bookmarks') {{
        state.activeTab = 'dictionary';
      }}
      renderContentOnly();
    }};

    window.toggleSearchScope = function() {{
      state.searchScope = state.searchScope === 'all' ? 'termOnly' : 'all';
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

    window.toggleAllVisible = function() {{
      const {{ filtered }} = getFilteredData();
      const visibleIds = filtered.slice(0, state.visibleCount).map(e => e.id);
      const allOpen = visibleIds.length > 0 && visibleIds.every(id => state.expandedIds.has(id));
      if (allOpen) {{
        state.expandedIds.clear();
      }} else {{
        visibleIds.forEach(id => state.expandedIds.add(id));
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

    window.copyEntry = function(id, ev) {{
      if (ev) ev.stopPropagation();
      const dict = state.allDictionaries.find(d => d.id === state.selectedDictId) || state.allDictionaries[0];
      const entry = dict.preparedEntries.find(e => e.id === id);
      if (!entry) return;
      const text = `📘 [${{dict.category}} - ${{dict.title}}]\\n🔹 المصطلح: ${{entry.term}}\\n📖 الجواب: ${{entry.definition}}\\n📄 (باب حرف ${{entry.letter}} - صفحة ${{entry.page}})`;
      navigator.clipboard?.writeText(text).catch(() => {{}});
      showToast(`تم نسخ "${{entry.term}}" مع الجواب!`);
    }};

    window.shareEntry = function(id, ev) {{
      if (ev) ev.stopPropagation();
      const dict = state.allDictionaries.find(d => d.id === state.selectedDictId) || state.allDictionaries[0];
      const entry = dict.preparedEntries.find(e => e.id === id);
      if (!entry) return;
      const text = `📘 ${{entry.term}}\\n\\n${{entry.definition}}\\n\\n— من: ${{dict.title}} (ص ${{entry.page}}) عبر تطبيق المعجم`;
      if (navigator.share) {{
        navigator.share({{ title: `المعجم: ${{entry.term}}`, text }}).catch(() => {{}});
      }} else {{
        navigator.clipboard?.writeText(text).catch(() => {{}});
        showToast(`تم تجهيز ونسخ "${{entry.term}}" للمشاركة!`);
      }}
    }};

    window.jumpToTerm = function(term, ev) {{
      if (ev) ev.stopPropagation();
      state.selectedLetter = 'الكل';
      state.activeTab = 'dictionary';
      state.searchQuery = term;
      renderApp();
      showToast(`البحث الذكي عن: ${{term}}`);
    }};

    window.loadMore = function() {{
      state.visibleCount += 50;
      renderContentOnly();
    }};

    function getFilteredData() {{
      const currentDict = state.allDictionaries.find(d => d.id === state.selectedDictId) || state.allDictionaries[0];
      const bookmarksSet = new Set(state.bookmarks);
      const filtered = smartSearchEntries(currentDict.preparedEntries, state.searchQuery, {{
        letterFilter: state.selectedLetter,
        searchScope: state.searchScope,
        onlyBookmarks: state.activeTab === 'bookmarks',
        bookmarksSet
      }});
      const counts = {{ 'الكل': currentDict.preparedEntries.length }};
      for (const e of currentDict.preparedEntries) {{
        counts[e.letter] = (counts[e.letter] || 0) + 1;
      }}
      return {{ currentDict, filtered, counts, bookmarksSet }};
    }}

    function renderMainSection() {{
      const {{ currentDict, filtered, counts, bookmarksSet }} = getFilteredData();
      const fontClass = state.fontSize === 'sm' ? 'text-sm leading-relaxed' : state.fontSize === 'lg' ? 'text-xl leading-loose' : 'text-base leading-relaxed';

      if (state.activeTab === 'dictionary' || state.activeTab === 'bookmarks') {{
        const slice = filtered.slice(0, state.visibleCount);
        const allOpen = slice.length > 0 && slice.every(e => state.expandedIds.has(e.id));

        const cardsHtml = slice.length === 0
          ? `<div class="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 my-4">
               <p class="text-sm font-bold mb-1">${{state.activeTab === 'bookmarks' ? 'لا توجد مصطلحات محفوظة في المفضلة بعد' : 'لم يتم العثور على نتائج مطابقة'}}</p>
               <p class="text-xs text-slate-500 dark:text-slate-400">جرب البحث بكلمة أخرى أو اختر "الكل" من شريط الحروف.</p>
             </div>`
          : slice.map(entry => {{
              const isOpen = state.expandedIds.has(entry.id);
              const isFav = bookmarksSet.has(entry.id);
              const firstChar = entry.term.replace(/^ال/, '').charAt(0) || 'أ';
              const refMatch = entry.definition.match(/راجع\\s+(?:لفظ|كلمة)?\\s*[«"(\\[]?([^»")\\].،]{{2,25}})[»")\\]]?/);

              return `
                <div onclick="toggleCard('${{entry.id}}')" class="rounded-2xl transition-all duration-200 cursor-pointer border ${{isOpen ? 'bg-white dark:bg-slate-900 border-teal-500/60 shadow-md ring-1 ring-teal-500/20' : 'bg-white/95 dark:bg-slate-900/85 hover:bg-white dark:hover:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm active:scale-[0.99]'}}">
                  <div class="p-3.5 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${{isOpen ? 'bg-teal-600 text-white shadow-sm' : 'bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-slate-700'}}">
                        ${{escapeHtml(firstChar)}}
                      </div>
                      <div class="min-w-0">
                        <h2 class="text-base font-extrabold text-slate-900 dark:text-white leading-snug">${{escapeHtml(entry.term)}}</h2>
                        ${{!isOpen ? `<p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">اضغط لعرض الجواب • باب ${{escapeHtml(entry.letter)}} (ص ${{entry.page}})</p>` : ''}}
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">ص ${{entry.page}}</span>
                      <button onclick="toggleBookmark('${{entry.id}}', event)" class="p-2 rounded-xl ${{isFav ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}}" title="حفظ">
                        ${{isFav ? '★' : '☆'}}
                      </button>
                      <span class="w-6 h-6 flex items-center justify-center text-xs transition-transform ${{isOpen ? 'rotate-180 text-teal-600 font-bold' : 'text-slate-400'}}">▼</span>
                    </div>
                  </div>
                  ${{isOpen ? `
                    <div onclick="event.stopPropagation()" class="px-3.5 pb-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 rounded-b-2xl cursor-auto select-text">
                      <p class="font-serif text-slate-800 dark:text-slate-200 ${{fontClass}} bg-white dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-inner">
                        ${{escapeHtml(entry.definition)}}
                      </p>
                      <div class="flex flex-wrap items-center gap-1.5 mt-2.5 mb-3">
                        <span class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-teal-100/80 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">باب حرف ${{escapeHtml(entry.letter)}} • صفحة ${{entry.page}}</span>
                        ${{(entry.sources || []).map(s => `<span class="text-[11px] px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">📚 ${{escapeHtml(s)}}</span>`).join('')}}
                        ${{refMatch ? `<button onclick="jumpToTerm('${{escapeHtml(refMatch[1])}}', event)" class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">↗ راجع: ${{escapeHtml(refMatch[1])}}</button>` : ''}}
                      </div>
                      <div class="grid grid-cols-2 gap-2">
                        <button onclick="copyEntry('${{entry.id}}', event)" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold shadow-sm transition">📋 نسخ الجواب</button>
                        <button onclick="shareEntry('${{entry.id}}', event)" class="py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold shadow-sm transition">📤 مشاركة</button>
                      </div>
                    </div>
                  ` : ''}}
                </div>
              `;
            }}).join('');

        return `
          <div class="flex items-center justify-between mb-2.5 px-1 text-xs text-slate-600 dark:text-slate-400">
            <span>${{state.activeTab === 'bookmarks' ? 'المحفوظات: ' : 'النتائج: '}}<strong class="text-slate-900 dark:text-white">${{filtered.length}}</strong> مصطلح ${{state.selectedLetter !== 'الكل' ? `• باب ${{state.selectedLetter}}` : ''}}</span>
            <button onclick="toggleAllVisible()" class="text-[11px] font-bold text-teal-700 dark:text-teal-400 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-slate-800 border border-teal-200/60 dark:border-slate-700">
              ${{allOpen ? 'طي الكل' : 'فتح الكل'}}
            </button>
          </div>
          <div class="space-y-2.5">${{cardsHtml}}</div>
          ${{filtered.length > state.visibleCount ? `
            <button onclick="loadMore()" class="mt-3 w-full py-3.5 rounded-2xl bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-800 shadow-sm">
              عرض المزيد من المصطلحات (${{filtered.length - state.visibleCount}} متبقية)
            </button>
          ` : ''}}
        `;
      }}

      if (state.activeTab === 'index') {{
        return `
          <div class="space-y-4">
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 class="text-base sm:text-lg font-extrabold mb-1">فهرس ${{escapeHtml(currentDict.category)}}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">${{escapeHtml(currentDict.title)}} • مفهرس حسب الحروف الأبجدية والصفحات</p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                ${{ARABIC_CHAPTERS.slice(1).map(c => `
                  <button onclick="selectLetter('${{c.letter}}')" class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200/80 dark:border-slate-700/80 text-right">
                    <div class="flex items-center gap-2">
                      <span class="w-8 h-8 rounded-xl bg-teal-600/10 text-teal-700 dark:text-teal-300 font-extrabold flex items-center justify-center text-sm">${{c.short}}</span>
                      <div>
                        <div class="font-bold text-xs sm:text-sm">باب ${{c.letter}}</div>
                        <div class="text-[10px] text-slate-500">ص ${{c.startPage}}</div>
                      </div>
                    </div>
                    <span class="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 border border-slate-200 dark:border-slate-700">${{counts[c.letter] || 0}}</span>
                  </button>
                `).join('')}}
              </div>
            </div>
          </div>
        `;
      }}

      return `
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h2 class="text-base font-extrabold">${{escapeHtml(currentDict.title)}}</h2>
          <p class="text-xs text-teal-700 dark:text-teal-400 font-bold">${{escapeHtml(currentDict.author)}} • ${{escapeHtml(currentDict.publisher)}}</p>
          <p class="text-sm leading-relaxed font-serif text-slate-700 dark:text-slate-300">
            ${{escapeHtml(currentDict.description)}}
          </p>
        </div>
      `;
    }}

    function renderContentOnly() {{
      const mainEl = document.getElementById('main-content');
      if (mainEl) mainEl.innerHTML = renderMainSection();
    }}

    function renderApp() {{
      const {{ currentDict, counts }} = getFilteredData();
      const appEl = document.getElementById('app');
      appEl.innerHTML = `
        <div class="min-h-screen flex flex-col">
          <header class="sticky top-0 z-30 bg-gradient-to-l from-teal-800 via-teal-700 to-emerald-800 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950 text-white shadow-lg border-b border-teal-600/30 dark:border-slate-800">
            <div class="max-w-md sm:max-w-2xl mx-auto px-3.5 pt-3 pb-2.5">
              <div class="flex items-center justify-between gap-2 mb-2.5">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 text-lg">📘</div>
                  <div>
                    <h1 class="text-lg sm:text-xl font-extrabold leading-tight">المعجم</h1>
                    <p class="text-[11px] text-teal-100/85 line-clamp-1">${{escapeHtml(currentDict.title)}}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1.5">
                  <button onclick="cycleFontSize()" class="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/15">ع+</button>
                  <button onclick="toggleTheme()" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/15">
                    ${{state.darkMode ? '☀️ ثيم أبيض' : '🌙 ثيم أسود'}}
                  </button>
                </div>
              </div>

              <!-- التابات الثلاثة الرئيسية: (معجم فقهي) (معجم أصولي) (معجم لغوي) -->
              <div class="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/20 dark:bg-slate-950/60 border border-white/10 mb-2.5">
                ${{state.allDictionaries.map(d => `
                  <button onclick="selectDictionary('${{d.id}}')" class="py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold text-center transition-all ${{d.id === currentDict.id ? 'bg-white text-teal-900 shadow-md scale-[1.01]' : 'text-teal-50/90 hover:bg-white/10'}}">
                    ${{escapeHtml(d.category)}}
                  </button>
                `).join('')}}
              </div>

              <div class="relative flex items-center">
                <input
                  id="search-input"
                  type="text"
                  value="${{escapeHtml(state.searchQuery)}}"
                  oninput="onSearchInput(this.value)"
                  placeholder="ابحث بالكلمة أو بالمعنى أو داخل المحتوى..."
                  class="w-full pr-4 pl-28 py-2.5 rounded-2xl bg-white/15 dark:bg-slate-800/90 text-white placeholder-teal-100/75 border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs sm:text-sm"
                />
                <button onclick="toggleSearchScope()" class="absolute left-2 px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold bg-teal-950/60 text-amber-300 border border-white/15">
                  ${{state.searchScope === 'all' ? 'شامل للمحتوى' : 'الكلمة فقط'}}
                </button>
              </div>
            </div>

            <div class="bg-teal-900/50 dark:bg-slate-900/90 border-t border-white/10">
              <div class="max-w-md sm:max-w-2xl mx-auto px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                ${{ARABIC_CHAPTERS.map(c => `
                  <button onclick="selectLetter('${{c.letter}}')" class="px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 ${{state.selectedLetter === c.letter ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-white/10 text-teal-50 hover:bg-white/20'}}">
                    <span>${{c.letter === 'الكل' ? 'الكل' : 'باب ' + c.letter}}</span>
                    <span class="text-[10px] opacity-80">${{counts[c.letter] || 0}}</span>
                  </button>
                `).join('')}}
              </div>
            </div>
          </header>

          <main id="main-content" class="flex-1 max-w-md sm:max-w-2xl w-full mx-auto px-3 pt-3 pb-24">
            ${{renderMainSection()}}
          </main>

          <nav class="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl">
            <div class="max-w-md sm:max-w-2xl mx-auto px-3 py-1.5 grid grid-cols-4 gap-1 text-center">
              <button onclick="switchTab('dictionary')" class="py-1.5 rounded-2xl text-xs ${{state.activeTab === 'dictionary' ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 font-extrabold' : 'text-slate-500'}}">📘 المعجم</button>
              <button onclick="switchTab('index')" class="py-1.5 rounded-2xl text-xs ${{state.activeTab === 'index' ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 font-extrabold' : 'text-slate-500'}}">📑 الفهرس</button>
              <button onclick="switchTab('bookmarks')" class="py-1.5 rounded-2xl text-xs ${{state.activeTab === 'bookmarks' ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 font-extrabold' : 'text-slate-500'}}">★ المحفوظات (${{state.bookmarks.length}})</button>
              <button onclick="switchTab('about')" class="py-1.5 rounded-2xl text-xs ${{state.activeTab === 'about' ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 font-extrabold' : 'text-slate-500'}}">ℹ️ عن المعجم</button>
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

os.makedirs('/mnt/d/almogam/dist', exist_ok=True)
with open('/mnt/d/almogam/dist/index.html', 'w', encoding='utf-8') as f:
    f.write(html_template)

print("Generated mobile user-only bundle at /mnt/d/almogam/dist/index.html")
