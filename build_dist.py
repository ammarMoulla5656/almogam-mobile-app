#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, 'src/data/dictionaries.json'), 'r', encoding='utf-8') as f:
    db_json_str = f.read()

with open(os.path.join(BASE_DIR, 'src/utils/smartSearch.js'), 'r', encoding='utf-8') as f:
    smart_search_code = f.read().replace('export function ', 'function ')

with open(os.path.join(BASE_DIR, 'src/utils/aiRagEngine.js'), 'r', encoding='utf-8') as f:
    ai_rag_code = f.read()
    ai_rag_code = re.sub(r'^import\s+.*?;?\s*$', '', ai_rag_code, flags=re.MULTILINE)
    ai_rag_code = ai_rag_code.replace('export const ', 'const ').replace('export function ', 'function ').replace('export async function ', 'async function ')

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
  <div id="modals-root"></div>

  <script>
    window.ALMOGAM_INITIAL_DATA = {db_json_str};
  </script>

  <script>
    {smart_search_code}
    {ai_rag_code}

    const STORAGE_KEYS = {{
      THEME: 'almogam_theme_v1',
      BOOKMARKS: 'almogam_bookmarks_v1',
      FONT_SIZE: 'almogam_font_size_v1',
      AI_CONFIG: 'almogam_ai_config_v1',
      AI_LOGS: 'ai_benchmark_logs'
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

    const FONT_STYLES = {{
      sm: {{ termSize: '18px', defSize: '16px', lineHeight: '1.75' }},
      md: {{ termSize: '22px', defSize: '20px', lineHeight: '1.9' }},
      lg: {{ termSize: '26px', defSize: '24px', lineHeight: '2.05' }}
    }};

    const DEFAULT_AI_CONFIG = {{
      provider: 'gemini',
      modelsByProvider: {{
        gemini: 'gemini-2.5-flash',
        openai: 'gpt-4o-mini',
        deepseek: 'deepseek-chat',
        claude: 'claude-3-7-sonnet-latest',
        custom: 'gpt-4o-mini'
      }},
      apiKeysByProvider: {{
        gemini: '',
        openai: '',
        deepseek: '',
        claude: '',
        custom: ''
      }},
      customUrl: 'https://api.openai.com/v1/chat/completions',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      maxCandidates: 6
    }};

    function loadAiConfig() {{
      try {{
        const saved = localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
        if (!saved) return JSON.parse(JSON.stringify(DEFAULT_AI_CONFIG));
        const parsed = JSON.parse(saved);
        return {{
          ...DEFAULT_AI_CONFIG,
          ...parsed,
          modelsByProvider: {{ ...DEFAULT_AI_CONFIG.modelsByProvider, ...(parsed.modelsByProvider || {{}}) }},
          apiKeysByProvider: {{ ...DEFAULT_AI_CONFIG.apiKeysByProvider, ...(parsed.apiKeysByProvider || {{}}) }}
        }};
      }} catch {{
        return JSON.parse(JSON.stringify(DEFAULT_AI_CONFIG));
      }}
    }}

    const state = {{
      darkMode: localStorage.getItem(STORAGE_KEYS.THEME) === 'dark',
      fontSize: localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'md',
      bookmarks: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]'),
      aiConfig: loadAiConfig(),
      benchmarkLogs: JSON.parse(localStorage.getItem(STORAGE_KEYS.AI_LOGS) || '[]'),
      activeTab: 'home', // 'home' | 'dictionary' | 'fehrest' | 'bookmarks' | 'about'
      selectedDictId: 'fiqhi_main',
      selectedLetter: 'الكل',
      searchQuery: '',
      expandedIds: new Set(['fiqh_1']),
      visibleCount: 12,
      allDictionaries: [],
      // Floating AI Sheet state
      aiSheetOpen: false,
      aiScope: 'auto',
      aiQuery: '',
      aiCandidates: [],
      manualTermInput: '',
      aiLoading: false,
      aiResult: null,
      aiError: null,
      feedbackNote: '',
      feedbackGiven: null,
      showStatsModal: false
    }};

    function saveAiConfig() {{
      localStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify(state.aiConfig));
    }}

    function persistBenchmarkLogs(logs) {{
      state.benchmarkLogs = logs;
      const jsonStr = JSON.stringify(logs, null, 2);
      const csvStr = convertLogsToCsv(logs);
      localStorage.setItem(STORAGE_KEYS.AI_LOGS, jsonStr);
      localStorage.setItem(STORAGE_KEYS.AI_LOGS + '_csv', csvStr);
      if (window.AndroidShare && typeof window.AndroidShare.saveBenchmarkFiles === 'function') {{
        try {{
          window.AndroidShare.saveBenchmarkFiles(jsonStr, csvStr);
        }} catch {{}}
      }}
    }}

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
        toast.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[70] bg-teal-700 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold transition-all';
        document.body.appendChild(toast);
      }}
      toast.textContent = '✓ ' + msg;
      toast.style.display = 'block';
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => {{ toast.style.display = 'none'; }}, 2300);
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
      showToast('تم تغيير حجم الخط');
      renderApp();
    }};

    window.openDictionaryFull = function(id) {{
      state.selectedDictId = id;
      state.selectedLetter = 'الكل';
      state.visibleCount = 12;
      state.activeTab = 'dictionary';
      renderApp();
    }};

    window.selectLetterFromFehrest = function(letter) {{
      state.selectedLetter = letter;
      state.visibleCount = 12;
      state.activeTab = 'dictionary';
      renderApp();
    }};

    window.clearLetterFilter = function() {{
      state.selectedLetter = 'الكل';
      state.visibleCount = 12;
      renderApp();
    }};

    window.switchTab = function(tab) {{
      state.activeTab = tab;
      state.visibleCount = 12;
      renderApp();
    }};

    window.onDictSearchInput = function(val) {{
      state.searchQuery = val;
      state.visibleCount = 12;
      renderContentOnly();
    }};

    window.clearSearch = function() {{
      state.searchQuery = '';
      state.visibleCount = 12;
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

    window.jumpToTerm = function(term, ev) {{
      if (ev) ev.stopPropagation();
      const cleaned = term.replace(/[«»"()]/g, '').trim();
      state.selectedLetter = 'الكل';
      state.activeTab = 'dictionary';
      state.searchQuery = cleaned;
      state.aiSheetOpen = false;
      renderApp();
      renderModals();
      showToast(`عرض: ${{cleaned}}`);
    }};

    window.loadMore = function() {{
      state.visibleCount += 12;
      renderContentOnly();
    }};

    // دوال إعدادات الذكاء الاصطناعي (AI Settings Handlers)
    window.onAiProviderChange = function(providerId) {{
      state.aiConfig.provider = providerId;
      saveAiConfig();
      renderContentOnly();
    }};

    window.onAiModelChange = function(val) {{
      state.aiConfig.modelsByProvider[state.aiConfig.provider] = val;
      saveAiConfig();
    }};

    window.selectSuggestedModel = function(modelName) {{
      state.aiConfig.modelsByProvider[state.aiConfig.provider] = modelName;
      saveAiConfig();
      renderContentOnly();
    }};

    window.onAiApiKeyChange = function(val) {{
      state.aiConfig.apiKeysByProvider[state.aiConfig.provider] = val;
      saveAiConfig();
    }};

    window.onAiCustomUrlChange = function(val) {{
      state.aiConfig.customUrl = val;
      saveAiConfig();
    }};

    window.onAiMaxCandidatesChange = function(val) {{
      state.aiConfig.maxCandidates = Number(val) || 6;
      saveAiConfig();
      const badge = document.getElementById('max-cand-badge');
      if (badge) badge.textContent = state.aiConfig.maxCandidates + ' كلمات';
    }};

    window.onAiSystemPromptChange = function(val) {{
      state.aiConfig.systemPrompt = val;
      saveAiConfig();
    }};

    window.restoreDefaultPrompt = function() {{
      state.aiConfig.systemPrompt = DEFAULT_SYSTEM_PROMPT;
      saveAiConfig();
      renderContentOnly();
      showToast('تمت استعادة الرسالة الافتراضية');
    }};

    // دوال النافذة العائمة للذكاء الاصطناعي (Floating AI Sheet Handlers)
    window.openAiSheet = function() {{
      state.aiSheetOpen = true;
      renderModals();
    }};

    window.closeAiSheet = function() {{
      state.aiSheetOpen = false;
      renderModals();
    }};

    window.setAiScope = function(scope) {{
      state.aiScope = scope;
      if (state.aiQuery.trim()) {{
        state.aiCandidates = retrieveLocalCandidates(state.allDictionaries, state.aiQuery, state.aiScope, state.aiConfig.maxCandidates);
      }}
      renderModals();
    }};

    window.onAiQueryInput = function(val) {{
      state.aiQuery = val;
      if (!val.trim()) {{
        state.aiCandidates = [];
      }} else {{
        state.aiCandidates = retrieveLocalCandidates(state.allDictionaries, val, state.aiScope, state.aiConfig.maxCandidates);
      }}
      const candBox = document.getElementById('ai-candidates-box');
      if (candBox) candBox.innerHTML = renderAiCandidatesBoxHtml();
    }};

    window.removeAiCandidate = function(id) {{
      state.aiCandidates = state.aiCandidates.filter(c => c.id !== id);
      const candBox = document.getElementById('ai-candidates-box');
      if (candBox) candBox.innerHTML = renderAiCandidatesBoxHtml();
    }};

    window.addManualAiCandidate = function() {{
      const inp = document.getElementById('manual-cand-input');
      const val = inp ? inp.value.trim() : '';
      if (!val) return;
      const found = retrieveLocalCandidates(state.allDictionaries, val, 'all', 1);
      if (found.length > 0) {{
        if (!state.aiCandidates.some(c => c.id === found[0].id)) {{
          state.aiCandidates.push(found[0]);
          showToast(`تمت إضافة "${{found[0].term}}" للمقترحات`);
        }}
      }} else {{
        state.aiCandidates.push({{
          id: 'custom_' + Date.now(),
          term: val,
          definition: val,
          letter: 'مضاف',
          page: 1,
          dictionaryId: 'fiqhi_main',
          dictionaryLabel: 'مضاف يدوياً',
          sources: []
        }});
      }}
      if (inp) inp.value = '';
      const candBox = document.getElementById('ai-candidates-box');
      if (candBox) candBox.innerHTML = renderAiCandidatesBoxHtml();
    }};

    window.runAiSearch = async function() {{
      if (!state.aiQuery.trim()) {{
        showToast('يرجى كتابة السؤال أو المعنى أولاً');
        return;
      }}
      state.aiLoading = true;
      state.aiError = null;
      state.aiResult = null;
      state.feedbackGiven = null;
      state.feedbackNote = '';
      renderModals();

      const providerId = state.aiConfig.provider;
      const providerObj = AI_PROVIDERS.find(p => p.id === providerId) || AI_PROVIDERS[0];
      const modelName = state.aiConfig.modelsByProvider[providerId] || providerObj.defaultModel;
      const apiKey = state.aiConfig.apiKeysByProvider[providerId] || '';

      try {{
        const res = await callAiProvider({{
          provider: providerId,
          model: modelName,
          apiKey,
          customUrl: state.aiConfig.customUrl,
          systemPrompt: state.aiConfig.systemPrompt,
          userQuery: state.aiQuery,
          candidates: state.aiCandidates
        }});

        state.aiResult = {{
          answer: res.answer,
          tokens: res.tokens,
          responseTimeSec: res.responseTimeSec,
          provider: providerObj.name,
          providerId,
          model: modelName,
          candidatesSent: [...state.aiCandidates],
          query: state.aiQuery,
          scope: state.aiScope
        }};
      }} catch (err) {{
        state.aiError = err.message || 'حدث خطأ أثناء الاتصال بالنموذج';
      }} finally {{
        state.aiLoading = false;
        renderModals();
      }}
    }};

    window.rateAiResult = function(type) {{
      if (!state.aiResult) return;
      const noteEl = document.getElementById('ai-feedback-note');
      const noteVal = noteEl ? noteEl.value.trim() : '';
      const logItem = {{
        id: 'log_' + Date.now(),
        timestamp: new Date().toLocaleString('sv-SE'),
        provider: state.aiResult.provider,
        model: state.aiResult.model,
        systemPrompt: state.aiConfig.systemPrompt,
        dictionaryScope: state.aiResult.scope,
        query: state.aiResult.query,
        candidatesSent: state.aiResult.candidatesSent.map(c => ({{
          id: c.id,
          term: c.term,
          page: c.page,
          dictionaryId: c.dictionaryId
        }})),
        answer: state.aiResult.answer,
        tokens: state.aiResult.tokens,
        responseTimeSec: state.aiResult.responseTimeSec,
        rating: type === 'good' ? 'جيد' : 'سيء',
        note: noteVal
      }};

      const nextLogs = [logItem, ...state.benchmarkLogs];
      persistBenchmarkLogs(nextLogs);
      state.feedbackGiven = type;
      state.feedbackNote = noteVal;
      renderModals();
      if (state.activeTab === 'about') renderContentOnly();
      showToast(`تم حفظ التقييم (${{logItem.rating}}) في ai_benchmark_logs.json`);
    }};

    window.openStatsModal = function() {{
      state.showStatsModal = true;
      renderModals();
    }};

    window.closeStatsModal = function() {{
      state.showStatsModal = false;
      renderModals();
    }};

    window.exportBenchmarkLogs = function(format) {{
      if (state.benchmarkLogs.length === 0) {{
        showToast('لا توجد سجلات تقييم محفوظة بعد');
        return;
      }}
      const isCsv = format === 'csv';
      const content = isCsv ? convertLogsToCsv(state.benchmarkLogs) : JSON.stringify(state.benchmarkLogs, null, 2);
      const filename = isCsv ? 'ai_benchmark_logs.csv' : 'ai_benchmark_logs.json';

      if (window.AndroidShare && typeof window.AndroidShare.share === 'function') {{
        window.AndroidShare.saveBenchmarkFiles(
          JSON.stringify(state.benchmarkLogs, null, 2),
          convertLogsToCsv(state.benchmarkLogs)
        );
        window.AndroidShare.share(filename, content);
        return;
      }}

      const blob = new Blob([content], {{
        type: isCsv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'
      }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`تم تصدير ${{filename}} بنجاح`);
    }};

    window.importBenchmarkLogs = function(ev) {{
      const file = ev.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {{
        try {{
          const parsed = JSON.parse(e.target.result);
          const imported = Array.isArray(parsed) ? parsed : (parsed.logs || []);
          if (!imported.length) {{
            showToast('الملف لا يحتوي على سجلات صالحة');
            return;
          }}
          const merged = [...imported, ...state.benchmarkLogs];
          persistBenchmarkLogs(merged);
          renderContentOnly();
          state.showStatsModal = true;
          renderModals();
          showToast(`تم استيراد ${{imported.length}} تجربة بنجاح!`);
        }} catch {{
          showToast('تأكد من اختيار ملف JSON صالح');
        }}
      }};
      reader.readAsText(file);
    }};

    function getFilteredData() {{
      const currentDict = state.allDictionaries.find(d => d.id === state.selectedDictId) || state.allDictionaries[0];
      const bookmarksSet = new Set(state.bookmarks);
      const filtered = smartSearchEntries(currentDict.preparedEntries, state.searchQuery, {{
        letterFilter: state.activeTab === 'home' ? 'الكل' : state.selectedLetter,
        searchScope: 'all',
        onlyBookmarks: state.activeTab === 'bookmarks',
        bookmarksSet
      }});
      return {{ currentDict, filtered, bookmarksSet }};
    }}

    function renderCardsHtml(entriesList, bookmarksSet) {{
      const currentFont = FONT_STYLES[state.fontSize] || FONT_STYLES.md;
      const slice = entriesList.slice(0, state.visibleCount);
      if (slice.length === 0) {{
        return `
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 my-4">
            <p class="text-lg font-extrabold">${{state.activeTab === 'bookmarks' ? 'لا توجد مصطلحات محفوظة بعد' : 'لا توجد نتائج مطابقة'}}</p>
          </div>
        `;
      }}

      const cards = slice.map(entry => {{
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
                  <h2 style="font-size: ${{currentFont.termSize}};" class="font-extrabold text-slate-900 dark:text-white leading-snug">${{escapeHtml(entry.term)}}</h2>
                  ${{!isOpen ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">باب ${{escapeHtml(entry.letter)}}</p>` : ''}}
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
                <p style="font-size: ${{currentFont.defSize}}; line-height: ${{currentFont.lineHeight}};" class="font-serif text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-inner">
                  ${{escapeHtml(entry.definition)}}
                </p>
                <div class="flex flex-wrap items-center gap-2 mt-3 mb-4">
                  <span class="text-xs font-bold px-3 py-1 rounded-xl bg-teal-100/80 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">باب حرف ${{escapeHtml(entry.letter)}}</span>
                  ${{refMatch ? `<button onclick="jumpToTerm('${{escapeHtml(refMatch[1])}}', event)" class="text-xs font-bold px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">↗ راجع: ${{escapeHtml(refMatch[1])}}</button>` : ''}}
                </div>
                <button onclick="copyEntry('${{entry.id}}', event)" class="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-sm font-extrabold shadow-md transition">📋 نسخ الجواب</button>
              </div>
            ` : ''}}
          </div>
        `;
      }}).join('');

      return `
        <div class="space-y-3.5">${{cards}}</div>
        ${{entriesList.length > state.visibleCount ? `
          <button onclick="loadMore()" class="mt-4 w-full py-4 rounded-3xl bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 font-extrabold text-base border border-slate-200 dark:border-slate-800 shadow-sm">
            عرض المزيد
          </button>
        ` : ''}}
      `;
    }}

    function renderMainSection() {{
      const {{ currentDict, filtered, bookmarksSet }} = getFilteredData();
      const currentFont = FONT_STYLES[state.fontSize] || FONT_STYLES.md;
      const activeProviderObj = AI_PROVIDERS.find(p => p.id === state.aiConfig.provider) || AI_PROVIDERS[0];

      // ١. الواجهة الرئيسية
      if (state.activeTab === 'home') {{
        return `
          <div class="space-y-4">
            <div class="rounded-3xl bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800 dark:from-slate-900 dark:to-teal-950 text-white p-6 shadow-xl border border-teal-600/30 text-center space-y-1.5">
              <h1 class="text-3xl font-extrabold">المعجم</h1>
              <p class="text-sm text-teal-100/90 font-medium">${{escapeHtml(currentDict.title)}}</p>
            </div>

            <div class="space-y-3">
              ${{state.allDictionaries.map(dict => `
                <button onclick="openDictionaryFull('${{dict.id}}')" class="w-full p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-teal-500 active:scale-[0.99] transition text-right flex items-center justify-between gap-4">
                  <div class="space-y-1">
                    <span class="inline-block px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 text-xs font-extrabold">${{escapeHtml(dict.category)}}</span>
                    <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">${{escapeHtml(dict.title)}}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 font-bold">${{escapeHtml(dict.author)}}</p>
                  </div>
                  <div class="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-md">←</div>
                </button>
              `).join('')}}
            </div>
          </div>
        `;
      }}

      // ٢. شاشة المعجم والمحفوظات
      if (state.activeTab === 'dictionary' || state.activeTab === 'bookmarks') {{
        return renderCardsHtml(filtered, bookmarksSet);
      }}

      // ٣. خانة الفهرست
      if (state.activeTab === 'fehrest') {{
        return `
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div class="text-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 class="text-xl font-extrabold text-slate-900 dark:text-white">الفهرست الأبجدي (${{escapeHtml(currentDict.category)}})</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">اختر الحرف لعرض مصطلحاته</p>
            </div>
            <div class="grid grid-cols-3 gap-3">
              ${{ARABIC_CHAPTERS.map(c => `
                <button onclick="selectLetterFromFehrest('${{c.letter}}')" class="p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${{state.selectedLetter === c.letter ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-700'}}">
                  <span class="text-2xl font-extrabold">${{c.short}}</span>
                  <span class="text-xs font-bold">${{c.letter === 'الكل' ? 'جميع الحروف' : 'حرف ' + c.letter}}</span>
                </button>
              `).join('')}}
            </div>
          </div>
        `;
      }}

      // ٤. شاشة الإعدادات (تضم: المظهر والخط + إعدادات الذكاء الاصطناعي والمقارنة + بطاقة الكتاب والمؤلف)
      return `
        <div class="space-y-4 select-text">
          <!-- أ. إعدادات المظهر والخط -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">إعدادات المظهر والخط</h3>
            <div class="grid grid-cols-2 gap-3">
              <button onclick="setThemeMode(false)" class="p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-extrabold text-base transition ${{!state.darkMode ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-500'}}">
                <span class="text-2xl">☀️</span>
                <span>ثيم أبيض</span>
              </button>
              <button onclick="setThemeMode(true)" class="p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-extrabold text-base transition ${{state.darkMode ? 'border-teal-500 bg-slate-800 text-white shadow-sm' : 'border-slate-200 text-slate-600'}}">
                <span class="text-2xl">🌙</span>
                <span>ثيم أسود</span>
              </button>
            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div class="text-base font-extrabold text-slate-800 dark:text-slate-200 mb-3">حجم الخط في التطبيق:</div>
              <div class="grid grid-cols-3 gap-2.5">
                <button onclick="setFontSize('sm')" class="py-3.5 rounded-2xl font-extrabold text-base border-2 ${{state.fontSize === 'sm' ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}}">عادي</button>
                <button onclick="setFontSize('md')" class="py-3.5 rounded-2xl font-extrabold text-base border-2 ${{state.fontSize === 'md' ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}}">كبير</button>
                <button onclick="setFontSize('lg')" class="py-3.5 rounded-2xl font-extrabold text-base border-2 ${{state.fontSize === 'lg' ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}}">كبير جداً</button>
              </div>
            </div>
          </div>

          <!-- ب. إعدادات الذكاء الاصطناعي (AI Settings) والمقارنة -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-teal-500/40 dark:border-teal-500/30 shadow-md space-y-4">
            <h3 class="text-xl font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              ✨ إعدادات الذكاء الاصطناعي (AI Settings)
            </h3>

            <div>
              <label class="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">المزود (Provider):</label>
              <select onchange="onAiProviderChange(this.value)" class="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-base">
                ${{AI_PROVIDERS.map(p => `<option value="${{p.id}}" ${{state.aiConfig.provider === p.id ? 'selected' : ''}}>${{escapeHtml(p.name)}}</option>`).join('')}}
              </select>
            </div>

            ${{state.aiConfig.provider === 'custom' ? `
              <div>
                <label class="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">رابط الـ API المخصص (Custom OpenAI URL):</label>
                <input type="text" dir="ltr" value="${{escapeHtml(state.aiConfig.customUrl)}}" oninput="onAiCustomUrlChange(this.value)" class="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-mono" />
              </div>
            ` : ''}}

            <div>
              <label class="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">اسم النموذج (Model Name):</label>
              <input type="text" dir="ltr" value="${{escapeHtml(state.aiConfig.modelsByProvider[state.aiConfig.provider] || '')}}" oninput="onAiModelChange(this.value)" class="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold" />
              <div class="flex flex-wrap gap-1.5 mt-2" dir="ltr">
                ${{activeProviderObj.suggestedModels.map(m => `
                  <button type="button" onclick="selectSuggestedModel('${{m}}')" class="px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${{state.aiConfig.modelsByProvider[state.aiConfig.provider] === m ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'}}">${{m}}</button>
                `).join('')}}
              </div>
            </div>

            <div>
              <label class="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">🔑 مفتاح الـ API لـ (${{escapeHtml(activeProviderObj.name)}}) - يُحفظ تلقائياً:</label>
              <input type="password" dir="ltr" value="${{escapeHtml(state.aiConfig.apiKeysByProvider[state.aiConfig.provider] || '')}}" oninput="onAiApiKeyChange(this.value)" placeholder="أدخل مفتاح الـ API هنا..." class="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm" />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm font-extrabold text-slate-700 dark:text-slate-300">عدد مقترحات المعجم المرسلة في كل بحث:</label>
                <span id="max-cand-badge" class="px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-extrabold text-sm">${{state.aiConfig.maxCandidates}} كلمات</span>
              </div>
              <input type="range" min="3" max="10" value="${{state.aiConfig.maxCandidates}}" oninput="onAiMaxCandidatesChange(this.value)" class="w-full accent-teal-600 h-2 bg-slate-200 rounded-lg cursor-pointer" />
              <div class="flex justify-between text-xs text-slate-400 mt-1">
                <span>3 (توفير أقصى)</span>
                <span>6 (الافتراضي)</span>
                <span>10 (تغطية أوسع)</span>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm font-extrabold text-slate-700 dark:text-slate-300">الرسالة التوجيهية (System Prompt):</label>
                <button type="button" onclick="restoreDefaultPrompt()" class="text-xs font-extrabold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-slate-700">↺ استعادة الرسالة الافتراضية</button>
              </div>
              <textarea rows="6" oninput="onAiSystemPromptChange(this.value)" class="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm leading-relaxed">${{escapeHtml(state.aiConfig.systemPrompt)}}</textarea>
            </div>

            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div class="text-sm font-extrabold text-slate-800 dark:text-slate-200">سجل التجارب ومقارنة النماذج (${{state.benchmarkLogs.length}} تجربة مسجلة):</div>
              <button type="button" onclick="openStatsModal()" class="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md">📊 ١. إحصائيات ومقارنة النماذج</button>
              <div class="grid grid-cols-2 gap-2.5">
                <button type="button" onclick="exportBenchmarkLogs('json')" class="py-3 px-3 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white font-extrabold text-xs">📥 ٢. تصدير JSON</button>
                <button type="button" onclick="exportBenchmarkLogs('csv')" class="py-3 px-3 rounded-2xl bg-emerald-700 text-white font-extrabold text-xs">📥 تصدير CSV</button>
              </div>
              <label class="w-full py-3 px-4 rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/40 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer">
                <span>📂 ٣. استيراد ملف تجارب (Import JSON)</span>
                <input type="file" accept=".json" onchange="importBenchmarkLogs(event)" class="hidden" />
              </label>
            </div>
          </div>

          <!-- ج. بطاقة الكتاب والمؤلف -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">بطاقة الكتاب والمؤلف</h2>
            <div class="space-y-2.5 text-base">
              <div><span class="font-extrabold text-teal-700 dark:text-teal-400">اسم الكتاب: </span><span class="font-bold">الاصطلاحات الفقهية في الرسائل العملية</span></div>
              <div><span class="font-extrabold text-teal-700 dark:text-teal-400">المؤلف: </span><span class="font-bold">الشيخ ياسين حسن عيسى العاملي</span></div>
              <div><span class="font-extrabold text-teal-700 dark:text-teal-400">الناشر: </span><span class="font-bold">دار البلاغة للطباعة والنشر والتوزيع (بيروت) / مؤسسة النشر الإسلامي التابعة لجماعة المدرسين بقم المشرفة</span></div>
              <div><span class="font-extrabold text-teal-700 dark:text-teal-400">الطبعة: </span><span class="font-bold">الطبعة الأولى (١٤١٣ هـ - ١٩٩٣ م)</span></div>
            </div>
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 font-serif text-base leading-relaxed text-slate-700 dark:text-slate-300">
              <p class="font-bold text-slate-900 dark:text-white">من مقدمة المؤلف الشيخ ياسين حسن عيسى العاملي:</p>
              <p>«فهذا كتيب ذكرت فيه أكثر من ألف كلمة تحتوي على أغلب ما يحتاجه المتعلم والمبلغ لفهم عبائر العلماء الأجلاء الواردة في رسائلهم العملية. وقد رتبته على الأحرف الأبجدية وراعيت الحرف الأول والثاني من الكلمة بما هي واردة في لسان العلماء، ولم أنظر إلى الاشتقاقات اللغوية لأن هذا بنظري أسهل أخذاً وتناولاً».</p>
            </div>
          </div>
        </div>
      `;
    }}

    function renderAiCandidatesBoxHtml() {{
      if (state.aiCandidates.length === 0) {{
        return `<p class="text-xs text-slate-400">اكتب سؤالك بالأعلى لاستخراج أقرب المصطلحات محلياً (مع فك الإحالات) قبل إرسالها للنموذج...</p>`;
      }}
      return `
        <div class="flex flex-wrap gap-1.5">
          ${{state.aiCandidates.map(cand => `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-teal-500/40 text-xs font-extrabold text-teal-800 dark:text-teal-300">
              <span>${{escapeHtml(cand.term)}}</span>
              <button onclick="removeAiCandidate('${{cand.id}}')" class="text-rose-500 font-bold">✕</button>
            </span>
          `).join('')}}
        </div>
      `;
    }}

    function renderModals() {{
      const root = document.getElementById('modals-root');
      if (!root) return;
      const currentFont = FONT_STYLES[state.fontSize] || FONT_STYLES.md;
      const activeProviderObj = AI_PROVIDERS.find(p => p.id === state.aiConfig.provider) || AI_PROVIDERS[0];
      let html = '';

      if (state.aiSheetOpen) {{
        html += `
          <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div class="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
              <div class="p-4 bg-gradient-to-l from-teal-800 to-emerald-800 text-white flex items-center justify-between">
                <div>
                  <h3 class="text-base font-extrabold">✨ البحث الذكي بالذكاء الاصطناعي (RAG)</h3>
                  <p class="text-[11px] text-teal-100">${{escapeHtml(activeProviderObj.name)}} • ${{escapeHtml(state.aiConfig.modelsByProvider[state.aiConfig.provider])}}</p>
                </div>
                <button onclick="closeAiSheet()" class="px-3 py-1 rounded-full bg-white/15 text-white font-bold">✕</button>
              </div>

              <div class="p-4 overflow-y-auto space-y-4 flex-1 select-text">
                <div>
                  <div class="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-2">نطاق البحث في المعاجم:</div>
                  <div class="flex flex-wrap gap-1.5">
                    ${{[
                      {{ id: 'auto', label: '✨ تحديد تلقائي ذكي' }},
                      {{ id: 'all', label: 'الكل' }},
                      {{ id: 'fiqhi_main', label: 'المعجم الفقهي' }},
                      {{ id: 'usuli_dict', label: 'المعجم الأصولي' }},
                      {{ id: 'lughawi_dict', label: 'المعجم اللغوي' }}
                    ].map(chip => `
                      <button onclick="setAiScope('${{chip.id}}')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold ${{state.aiScope === chip.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}}">${{chip.label}}</button>
                    `).join('')}}
                  </div>
                </div>

                <div class="space-y-2">
                  <textarea rows="2" oninput="onAiQueryInput(this.value)" placeholder="اكتب سؤالك أو المعنى بالعامية أو الفصحى..." class="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-base font-bold focus:outline-none focus:ring-2 focus:ring-teal-500">${{escapeHtml(state.aiQuery)}}</textarea>

                  <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div class="text-xs font-extrabold text-slate-600 dark:text-slate-300">المقترحات المبدئية المرسلة للنموذج (موفرة للتوكنات):</div>
                    <div id="ai-candidates-box">${{renderAiCandidatesBoxHtml()}}</div>
                    <div class="flex items-center gap-2 pt-1">
                      <input id="manual-cand-input" type="text" placeholder="إضافة مصطلح آخر للمقترحات..." class="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                      <button type="button" onclick="addManualAiCandidate()" class="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-extrabold">+ إضافة</button>
                    </div>
                  </div>

                  <button type="button" onclick="runAiSearch()" ${{state.aiLoading ? 'disabled' : ''}} class="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-base shadow-md">
                    ${{state.aiLoading ? '⏳ جاري التحليل والإجابة...' : '✨ إرسال للنموذج والبحث الذكي'}}
                  </button>
                </div>

                ${{state.aiError ? `
                  <div class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-bold">
                    ⚠️ ${{escapeHtml(state.aiError)}}
                  </div>
                ` : ''}}

                ${{state.aiResult ? `
                  <div class="p-4 rounded-3xl bg-teal-50/60 dark:bg-slate-800/90 border-2 border-teal-500/40 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold pb-2 border-b border-teal-200/60 dark:border-slate-700">
                      <span class="px-2.5 py-1 rounded-lg bg-teal-600 text-white">🤖 ${{escapeHtml(state.aiResult.model)}}</span>
                      <span class="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">⏱️ ${{state.aiResult.responseTimeSec}} ثانية</span>
                      <span class="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">🪙 ~${{state.aiResult.tokens}} توكن</span>
                    </div>

                    <div style="font-size: ${{currentFont.defSize}}; line-height: ${{currentFont.lineHeight}};" class="font-serif whitespace-pre-wrap text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">${{escapeHtml(state.aiResult.answer)}}</div>

                    ${{state.aiResult.candidatesSent?.length > 0 ? `
                      <div class="space-y-1.5">
                        <div class="text-xs font-extrabold text-slate-600 dark:text-slate-300">اضغط على أي مصطلح لفتحه في المعجم:</div>
                        <div class="flex flex-wrap gap-1.5">
                          ${{state.aiResult.candidatesSent.map(c => `
                            <button onclick="jumpToTerm('${{escapeHtml(c.term)}}', event)" class="px-3 py-1.5 rounded-xl bg-teal-600/15 hover:bg-teal-600 hover:text-white text-teal-800 dark:text-teal-300 text-xs font-extrabold">📘 ${{escapeHtml(c.term)}} ↗</button>
                          `).join('')}}
                        </div>
                      </div>
                    ` : ''}}

                    <div class="pt-3 border-t border-teal-200/60 dark:border-slate-700 space-y-2">
                      <div class="text-xs font-extrabold text-slate-700 dark:text-slate-300">قيّم إجابة هذا النموذج لحفظها في سجل المقارنة:</div>
                      <input id="ai-feedback-note" type="text" value="${{escapeHtml(state.feedbackNote)}}" placeholder="ملاحظة اختيارية على الإجابة..." class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                      <div class="grid grid-cols-2 gap-2.5">
                        <button onclick="rateAiResult('good')" class="py-2.5 rounded-xl font-extrabold text-sm border-2 ${{state.feedbackGiven === 'good' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 text-emerald-700 border-emerald-500/40'}}">جيد 👍</button>
                        <button onclick="rateAiResult('bad')" class="py-2.5 rounded-xl font-extrabold text-sm border-2 ${{state.feedbackGiven === 'bad' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white dark:bg-slate-900 text-rose-700 border-rose-500/40'}}">سيء 👎</button>
                      </div>
                    </div>
                  </div>
                ` : ''}}
              </div>
            </div>
          </div>
        `;
      }}

      if (state.showStatsModal) {{
        const stats = computeBenchmarkStats(state.benchmarkLogs);
        html += `
          <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
              <div class="p-4 bg-teal-700 text-white flex items-center justify-between">
                <h3 class="text-base font-extrabold">📊 إحصائيات ومقارنة النماذج (${{state.benchmarkLogs.length}} تجربة)</h3>
                <button onclick="closeStatsModal()" class="px-3 py-1 rounded-full bg-white/15 text-white font-bold">✕</button>
              </div>
              <div class="p-4 overflow-y-auto space-y-4 flex-1">
                ${{stats.models.length === 0 ? `
                  <p class="text-center text-sm text-slate-500 py-8 font-bold">لم يتم تسجيل أي تقييمات بعد. جرّب البحث الذكي واضغط (جيد 👍 أو سيء 👎) لتظهر المقارنة هنا.</p>
                ` : `
                  <div class="grid grid-cols-1 gap-2">
                    ${{stats.bestAccuracyModel ? `<div class="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs font-extrabold">🏆 أعلى نسبة تقييم «جيد»: ${{escapeHtml(stats.bestAccuracyModel.model)}} (${{stats.bestAccuracyModel.goodRate}}%)</div>` : ''}}
                    ${{stats.fastestModel ? `<div class="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs font-extrabold">⚡ أسرع وقت استجابة: ${{escapeHtml(stats.fastestModel.model)}} (${{stats.fastestModel.avgTimeSec}} ثانية)</div>` : ''}}
                    ${{stats.lowestTokensModel ? `<div class="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 text-xs font-extrabold">🪙 أقل استهلاك للتوكنات: ${{escapeHtml(stats.lowestTokensModel.model)}} (~${{stats.lowestTokensModel.avgTokens}} توكن)</div>` : ''}}
                  </div>
                  <div class="space-y-2.5">
                    ${{stats.models.map(m => `
                      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                        <div class="flex items-center justify-between font-extrabold text-sm">
                          <span>${{escapeHtml(m.model)}}</span>
                          <span class="text-teal-600 dark:text-teal-400">${{m.goodRate}}% جيد</span>
                        </div>
                        <div class="flex flex-wrap justify-between text-slate-600 dark:text-slate-300 font-bold">
                          <span>التجارب: ${{m.totalRuns}} (👍 ${{m.goodCount}} | 👎 ${{m.badCount}})</span>
                          <span>السرعة: ${{m.avgTimeSec}} ث</span>
                          <span>التوكنات: ~${{m.avgTokens}}</span>
                        </div>
                      </div>
                    `).join('')}}
                  </div>
                `}}
              </div>
            </div>
          </div>
        `;
      }}

      root.innerHTML = html;
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
              <div class="max-w-lg mx-auto px-3.5 pt-3.5 pb-3.5 space-y-3">
                <div class="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-black/25 dark:bg-slate-950/70 border border-white/10">
                  ${{state.allDictionaries.map(d => `
                    <button onclick="openDictionaryFull('${{d.id}}')" class="py-3 px-2 rounded-xl text-sm sm:text-base font-extrabold text-center transition-all ${{d.id === currentDict.id ? 'bg-white text-teal-900 shadow-md scale-[1.02]' : 'text-teal-50/90 hover:bg-white/10'}}">
                      ${{escapeHtml(d.category)}}
                    </button>
                  `).join('')}}
                </div>

                <div class="relative flex items-center">
                  <input
                    id="dict-search-input"
                    type="text"
                    value="${{escapeHtml(state.searchQuery)}}"
                    oninput="onDictSearchInput(this.value)"
                    placeholder="🔍 ابحث في ${{escapeHtml(currentDict.category)}}..."
                    class="w-full px-4 py-3.5 rounded-2xl bg-white/15 dark:bg-slate-800/95 text-white placeholder-teal-100/85 border border-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base font-bold"
                  />
                  ${{state.searchQuery ? `<button onclick="clearSearch()" class="absolute left-3 px-2.5 py-1 rounded-full bg-black/30 text-white text-xs font-bold">✕</button>` : ''}}
                </div>

                ${{state.selectedLetter !== 'الكل' ? `
                  <div class="flex items-center justify-between bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-sm font-extrabold">
                    <span>التصفح الحالي: باب حرف ${{escapeHtml(state.selectedLetter)}}</span>
                    <button onclick="clearLetterFilter()" class="px-2.5 py-0.5 rounded-lg bg-slate-950/15 text-xs">إلغاء الفلتر ✕</button>
                  </div>
                ` : ''}}
              </div>
            </header>
          ` : ''}}

          <main id="main-content" class="flex-1 max-w-lg w-full mx-auto px-3.5 pt-4 pb-36">
            ${{renderMainSection()}}
          </main>

          <!-- الزر العائم للبحث الذكي بالذكاء الاصطناعي (FAB) -->
          <button onclick="openAiSheet()" class="fixed bottom-28 left-4 z-40 flex items-center gap-2 px-5 py-4 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-extrabold text-sm shadow-2xl border-2 border-white/30 active:scale-95 transition">
            <span>✨ البحث الذكي AI</span>
          </button>

          <nav class="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 shadow-2xl" style="padding-bottom: env(safe-area-inset-bottom);">
            <div class="max-w-lg mx-auto px-2 py-2.5 grid grid-cols-5 gap-1.5 text-center">
              <button onclick="switchTab('home')" class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${{state.activeTab === 'home' ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]' : 'text-slate-600 dark:text-slate-300 font-bold'}}">
                <span class="text-2xl mb-1 leading-none">🏠</span>
                <span class="text-sm leading-tight">الرئيسية</span>
              </button>
              <button onclick="switchTab('dictionary')" class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${{state.activeTab === 'dictionary' ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]' : 'text-slate-600 dark:text-slate-300 font-bold'}}">
                <span class="text-2xl mb-1 leading-none">📘</span>
                <span class="text-sm leading-tight">المعجم</span>
              </button>
              <button onclick="switchTab('fehrest')" class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${{state.activeTab === 'fehrest' ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]' : 'text-slate-600 dark:text-slate-300 font-bold'}}">
                <span class="text-2xl mb-1 leading-none">🔤</span>
                <span class="text-sm leading-tight">الفهرست</span>
              </button>
              <button onclick="switchTab('bookmarks')" class="relative flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${{state.activeTab === 'bookmarks' ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]' : 'text-slate-600 dark:text-slate-300 font-bold'}}">
                <span class="text-2xl mb-1 leading-none">★</span>
                <span class="text-sm leading-tight">المحفوظات</span>
                ${{state.bookmarks.length > 0 ? `<span class="absolute top-1.5 right-2.5 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-extrabold flex items-center justify-center shadow">${{state.bookmarks.length}}</span>` : ''}}
              </button>
              <button onclick="switchTab('about')" class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition ${{state.activeTab === 'about' ? 'text-white bg-teal-600 shadow-md font-extrabold scale-[1.03]' : 'text-slate-600 dark:text-slate-300 font-bold'}}">
                <span class="text-2xl mb-1 leading-none">⚙️</span>
                <span class="text-sm leading-tight">الإعدادات</span>
              </button>
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

print("Generated full AI RAG & Benchmarking mobile bundle at dist/index.html")
