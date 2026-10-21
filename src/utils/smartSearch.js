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
  'بول': ['سلس', 'مسلوس', 'استبراء', 'استنجاء', 'حدث', 'خبث', 'مخرج'],
  'غائط': ['مبطون', 'بطن', 'عذره', 'نجو', 'حدث', 'خبث'],
  'غايط': ['مبطون', 'بطن', 'عذره', 'نجو', 'حدث', 'خبث'],
  'يفقد': ['سلس', 'مسلوس', 'مبطون', 'ضبط', 'استمساك', 'يستمسكه', 'منعه', 'يقدر', 'داء'],
  'فقد': ['سلس', 'مسلوس', 'مبطون', 'ضبط', 'استمساك', 'يستمسكه', 'منعه'],
  'سيطره': ['ضبط', 'استمساك', 'يستمسكه', 'منعه', 'سلس', 'مسلوس', 'مبطون', 'يقدر'],
  'يتحكم': ['ضبط', 'استمساك', 'يستمسكه', 'منعه', 'سلس', 'مسلوس', 'مبطون'],
  'تحكم': ['ضبط', 'استمساك', 'يستمسكه', 'منعه', 'سلس', 'مسلوس', 'مبطون'],
  'يمسك': ['ضبط', 'استمساك', 'يستمسكه', 'منعه', 'سلس', 'مسلوس', 'مبطون'],
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
  const normDef = normalizeArabic([entry.definition, ...(entry.aliases || [])].join(' '));
  const normSources = normalizeArabic((entry.sources || []).join(' '));
  return {
    ...entry,
    _normTerm: normTerm,
    _stemTerm: stemTerm,
    _normDef: normDef,
    _normTermTokens: normTerm.split(/\s+/).filter(Boolean),
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

  const STOP_WORDS = new Set([
    'ما', 'ماذا', 'من', 'هل', 'كيف', 'اين', 'متي', 'لماذا', 'كم', 'اي',
    'هو', 'هي', 'هم', 'ها', 'ان', 'كان', 'يكون', 'تكون', 'في', 'من',
    'الي', 'علي', 'عن', 'مع', 'او', 'ام', 'ثم', 'بل', 'لا', 'لم', 'لن',
    'هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي', 'الذين', 'معني', 'تفسير',
    'شرح', 'مراد', 'حكم', 'كلمه', 'مصطلح', 'عباره', 'يعني', 'شنو', 'شو', 'ايش'
  ]);

  const rawTokens = normQuery.split(' ').filter(Boolean);
  const meaningfulTokens = rawTokens.filter((t) => !STOP_WORDS.has(t));
  const queryTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;
  const queryStems = queryTokens.map(stemArabicWord);

  // توسيع البحث بالمرادفات الدلالية
  const expandedStems = new Set();
  for (const token of [...queryTokens, ...queryStems]) {
    if (SEMANTIC_EXPANSIONS[token]) {
      for (const syn of SEMANTIC_EXPANSIONS[token]) {
        expandedStems.add(normalizeArabic(syn));
        expandedStems.add(stemArabicWord(normalizeArabic(syn)));
      }
    }
  }

  const stripTashkeelOnly = (s) => (s || '').toString().replace(/[\u064B-\u065F\u0670\u0640]/g, '').trim();
  const cleanRawQuery = stripTashkeelOnly(rawQuery).replace(/^[«"(\[]+|[»")\].،؛:]+$/g, '').trim();

  const scoredResults = [];

  for (const entry of filtered) {
    const normTerm = entry._normTerm ?? normalizeArabic(entry.term);
    const stemTerm = entry._stemTerm ?? normTerm.split(' ').map(stemArabicWord).join(' ');
    const normDef = entry._normDef ?? normalizeArabic(entry.definition);
    const rawTermClean = stripTashkeelOnly(entry.term);
    const rawTermTokens = rawTermClean.split(/[\s()،,/-]+/).filter(Boolean);
    const normTermTokens = entry._normTermTokens || normTerm.split(/\s+/).filter(Boolean);
    const isReferralStub = /^(?:انظر|راجع|يراجع)\b/.test(stripTashkeelOnly(entry.definition));

    // Rank matching headwords ahead of matches that occur only in definitions.
    const titleTokenMatches = queryTokens.filter((token, index) =>
      normTerm.includes(token) || (queryStems[index]?.length >= 2 && stemTerm.includes(queryStems[index]))
    ).length;
    const titleMatchLevel = normTerm === normQuery
      ? 4
      : normTerm.includes(normQuery)
        ? 3
        : titleTokenMatches === queryTokens.length && titleTokenMatches > 0
          ? 2
          : titleTokenMatches > 0
            ? 1
            : 0;

    let score = 0;

    // 0. تطابق دقيق جداً مع الجذر أو أحد صيغه (مع الحفاظ على الهمزات أولاً ثم بالتطبيع)
    if (rawTermClean === cleanRawQuery) {
      score += isReferralStub ? 3500 : 5000;
    } else if (rawTermTokens.includes(cleanRawQuery)) {
      score += isReferralStub ? 3000 : 4500;
    } else if (normTerm === normQuery) {
      score += isReferralStub ? 2000 : 3200;
    } else if (normTermTokens.includes(normQuery)) {
      score += isReferralStub ? 1800 : 2800;
    }

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
    const termWords = normTermTokens;

    for (let i = 0; i < queryTokens.length; i++) {
      const qToken = queryTokens[i];
      const qStem = queryStems[i];
      let tokenMatched = false;

      if (normTerm.includes(qToken) || (qStem.length >= 2 && stemTerm.includes(qStem))) {
        score += 180;
        tokenMatched = true;
      } else if (
        searchScope !== 'termOnly' &&
        (normDef.includes(qToken) || (qStem.length >= 3 && normDef.includes(qStem)))
      ) {
        score += 35;
        tokenMatched = true;
      } else if (searchScope !== 'termOnly' && qStem.length >= 3 && normDef.includes(qStem)) {
        score += 22;
        tokenMatched = true;
      } else {
        // فحص التسامح الإملائي (Fuzzy Matching) مع كلمات المصطلح للكلمات الطويلة فقط (>= 4 أحرف)
        if (matchedTokensCount === 0 && qStem.length >= 4) {
          for (const tw of termWords) {
            const dist = levenshteinDistance(stemArabicWord(tw), qStem);
            if (dist === 1) {
              score += 15;
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

    // 4. فحص المرادفات الدلالية دائماً لتعزيز المصطلحات المطابقة للمعنى (مثل: يفقد السيطرة -> سلس، مسلوس، مبطون، ضبط)
    if (expandedStems.size > 0) {
      let synBonus = 0;
      for (const syn of expandedStems) {
        if (syn.length >= 3) {
          if (normTerm === syn || stemTerm === syn || termWords.includes(syn)) {
            synBonus += 42;
            matchedTokensCount++;
          } else if (normTerm.includes(syn)) {
            synBonus += 28;
            matchedTokensCount++;
          } else if (searchScope !== 'termOnly' && normDef.includes(syn)) {
            synBonus += 18;
          }
        }
      }
      score += Math.min(synBonus, 110);
    }

    // مكافأة إضافية إذا تحققت كلمات البحث في العنصر
    if (queryTokens.length > 1 && matchedTokensCount >= queryTokens.length) {
      score += 35;
    }

    if (score > 0) {
      scoredResults.push({ entry, score, titleMatchLevel });
    }
  }

  scoredResults.sort((a, b) =>
    b.titleMatchLevel - a.titleMatchLevel || b.score - a.score || a.entry.page - b.entry.page
  );
  return scoredResults.map((item) => item.entry);
}
