/**
 * محرك البحث الذكي في المعجم (Smart Arabic & Content Search Engine)
 * يدعم:
 * 1. تطبيع الحروف العربية (الهمزات: أ إ آ ا، التاء المربوطة والهاء: ة ه، الياء والألف المقصورة: ي ى، إزالة التشكيل والمد).
 * 2. التجريد الذكي للسوابق واللواحق (ال، بال، وال، فال، كال، لل، ه، ها، هم، ات، ين، ون).
 * 3. البحث في الكلمة والمرادفات والمحتوى الكامل (الشرح والمصادر) حتى لو كتب المستخدم معنى الفكرة أو جزءاً من المحتوى أو أخطأ في حرف (Fuzzy / Levenshtein).
 * 4. ترتيب النتائج حسب الأهمية (درجة التطابق).
 */

export function normalizeArabic(text) {
  if (!text) return '';
  return text
    .toString()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // إزالة التشكيل والـ تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A0-9٠-٩a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function stemArabicWord(word) {
  if (!word || word.length <= 3) return word;
  let w = word;
  // إزالة السوابق الشائعة
  const prefixes = ['وال', 'بال', 'فال', 'كال', 'ولل', 'لل', 'ال'];
  for (const p of prefixes) {
    if (w.startsWith(p) && w.length - p.length >= 2) {
      w = w.slice(p.length);
      break;
    }
  }
  // إزالة اللواحق الشائعة
  const suffixes = ['ات', 'ون', 'ين', 'ان', 'ها', 'هم', 'كم', 'يه', 'ه', 'ي'];
  for (const s of suffixes) {
    if (w.endsWith(s) && w.length - s.length >= 2) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  return w;
}

// حساب مسافة الاختلاف بين كلمتين للتسامح مع الأخطاء الإملائية (Fuzzy Match)
export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > 2) return 99;

  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

// قاموس مترادفات ومفاهيم دلالية لتعزيز البحث الذكي بالمعنى والمحتوى
const SEMANTIC_EXPANSIONS = {
  'زواج': ['نكاح', 'عقد', 'مهر', 'بضع', 'صداق', 'زوجه', 'اهله'],
  'نكاح': ['زواج', 'وطء', 'مهر', 'عقد'],
  'فلوس': ['مال', 'نقد', 'دينار', 'درهم', 'اسكناس', 'عمله', 'ثمن', 'نوط'],
  'مال': ['نقد', 'درهم', 'دينار', 'ثمن', 'تمول'],
  'ميت': ['اموات', 'دفن', 'كفن', 'قبر', 'احتضار', 'تحنيط'],
  'صلاه': ['ركوع', 'سجود', 'قنوت', 'تكبير', 'تشهد', 'قبله', 'نافله'],
  'طهاره': ['وضوء', 'غسل', 'تيمم', 'ماء', 'نجاسه', 'استنجاء', 'استبراء'],
  'بول': ['استبراء', 'استنجاء', 'حدث', 'مسلوس', 'خبث'],
  'حج': ['طواف', 'سعي', 'احرام', 'عرفه', 'مني', 'جمره', 'هدي', 'ميقات'],
  'دم': ['حيض', 'نفاس', 'استحاضه', 'شجاج', 'جرح'],
  'سمك': ['حوت', 'فلس', 'بحر', 'صيد', 'اطعمه'],
  'قمار': ['ميسر', 'شطرنج', 'نرد', 'زهر', 'رهان'],
  'ميراث': ['ارث', 'تركه', 'وارث', 'سهام', 'فرض'],
  'جرح': ['شجاج', 'ديه', 'قصاص', 'ارش'],
  'طلاق': ['عده', 'خلع', 'رجعه', 'فراق', 'تطليق']
};

export function prepareEntryForSearch(entry) {
  const normTerm = normalizeArabic(entry.term);
  const stemTerm = normTerm.split(' ').map(stemArabicWord).join(' ');
  const normDef = normalizeArabic(entry.definition);
  const normSources = normalizeArabic((entry.sources || []).join(' '));
  return {
    ...entry,
    _normTerm: normTerm,
    _stemTerm: stemTerm,
    _normDef: normDef,
    _normSources: normSources
  };
}

export function smartSearchEntries(entries, rawQuery, options = {}) {
  const { letterFilter = 'الكل', searchScope = 'all', onlyBookmarks = false, bookmarksSet = new Set() } = options;

  let filtered = entries;
  if (onlyBookmarks) {
    filtered = filtered.filter((e) => bookmarksSet.has(e.id));
  }
  if (letterFilter && letterFilter !== 'الكل') {
    filtered = filtered.filter((e) => e.letter === letterFilter);
  }

  const normQuery = normalizeArabic(rawQuery);
  if (!normQuery) {
    return filtered;
  }

  const queryTokens = normQuery.split(' ').filter(Boolean);
  const queryStems = queryTokens.map(stemArabicWord);

  // توسيع البحث بالمرادفات الدلالية
  const expandedStems = new Set(queryStems);
  for (const token of [...queryTokens, ...queryStems]) {
    if (SEMANTIC_EXPANSIONS[token]) {
      for (const syn of SEMANTIC_EXPANSIONS[token]) {
        expandedStems.add(normalizeArabic(syn));
        expandedStems.add(stemArabicWord(normalizeArabic(syn)));
      }
    }
  }

  const scoredResults = [];

  for (const entry of filtered) {
    const normTerm = entry._normTerm ?? normalizeArabic(entry.term);
    const stemTerm = entry._stemTerm ?? normTerm.split(' ').map(stemArabicWord).join(' ');
    const normDef = entry._normDef ?? normalizeArabic(entry.definition);

    let score = 0;

    // 1. تطابق تام أو شبه تام مع العنوان (المصطلح)
    if (normTerm === normQuery || stemTerm === normQuery) {
      score += 200;
    } else if (normTerm.startsWith(normQuery) || stemTerm.startsWith(normQuery)) {
      score += 140;
    } else if (normTerm.includes(normQuery)) {
      score += 110;
    }

    // 2. تطابق العبارة كاملة داخل الشرح (المحتوى)
    if (searchScope !== 'termOnly' && normDef.includes(normQuery)) {
      score += 85;
    }

    // 3. فحص كل كلمة من كلمات البحث (مع الجذور، المرادفات، والتسامح الإملائي)
    let matchedTokensCount = 0;
    const termWords = normTerm.split(' ');

    for (let i = 0; i < queryTokens.length; i++) {
      const qToken = queryTokens[i];
      const qStem = queryStems[i];
      let tokenMatched = false;

      if (normTerm.includes(qToken) || (qStem.length >= 2 && stemTerm.includes(qStem))) {
        score += 45;
        tokenMatched = true;
      } else if (searchScope !== 'termOnly' && (normDef.includes(qToken) || (qStem.length >= 2 && normDef.includes(qStem)))) {
        score += 25;
        tokenMatched = true;
      } else {
        // فحص التسامح الإملائي (Fuzzy Matching) مع كلمات المصطلح
        if (qToken.length >= 3) {
          for (const tw of termWords) {
            const dist = levenshteinDistance(stemArabicWord(tw), qStem);
            if (dist === 1) {
              score += 30;
              tokenMatched = true;
              break;
            }
          }
        }
      }

      if (tokenMatched) {
        matchedTokensCount++;
      }
    }

    // 4. فحص المرادفات الدلالية في المصطلح والشرح إذا لم تتطابق الكلمة حرفياً
    if (score === 0) {
      for (const syn of expandedStems) {
        if (syn.length >= 2) {
          if (normTerm.includes(syn)) {
            score += 35;
            matchedTokensCount++;
          } else if (searchScope !== 'termOnly' && normDef.includes(syn)) {
            score += 18;
            matchedTokensCount++;
          }
        }
      }
    }

    // مكافأة إضافية إذا تحققت جميع كلمات البحث في العنصر
    if (queryTokens.length > 1 && matchedTokensCount >= queryTokens.length) {
      score += 50;
    }

    if (score > 0) {
      scoredResults.push({ entry, score });
    }
  }

  scoredResults.sort((a, b) => b.score - a.score || a.entry.page - b.entry.page);
  return scoredResults.map((item) => item.entry);
}
