import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const writeJson = async (path, value) => writeFile(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`, 'utf8');

function cleanText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\u00A0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim();
}

const equivalents = new Map([
  [0x0622, 0x0627], [0x0623, 0x0627], [0x0625, 0x0627], [0x0671, 0x0627],
  [0x0649, 0x064A], [0x0629, 0x0647], [0x0624, 0x0648], [0x0626, 0x064A]
]);
function normalizeTerm(value) {
  return [...cleanText(value).normalize('NFKC').toLowerCase()]
    .filter((char) => !/\p{M}/u.test(char) && char.codePointAt(0) !== 0x0640)
    .map((char) => String.fromCodePoint(equivalents.get(char.codePointAt(0)) || char.codePointAt(0)))
    .join('').replace(/[\p{P}\p{S}\s]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

const letterLabels = new Map([
  [0x0627, 'الهمزة'], [0x0622, 'الهمزة'], [0x0623, 'الهمزة'], [0x0625, 'الهمزة'],
  [0x0628, 'الباء'], [0x0629, 'التاء'], [0x062A, 'التاء'], [0x062B, 'الثاء'],
  [0x062C, 'الجيم'], [0x062D, 'الحاء'], [0x062E, 'الخاء'], [0x062F, 'الدال'],
  [0x0630, 'الذال'], [0x0631, 'الراء'], [0x0632, 'الزاي'], [0x0633, 'السين'],
  [0x0634, 'الشين'], [0x0635, 'الصاد'], [0x0636, 'الضاد'], [0x0637, 'الطاء'],
  [0x0638, 'الظاء'], [0x0639, 'العين'], [0x063A, 'الغين'], [0x0641, 'الفاء'],
  [0x0642, 'القاف'], [0x0643, 'الكاف'], [0x0644, 'اللام'], [0x0645, 'الميم'],
  [0x0646, 'النون'], [0x0647, 'الهاء'], [0x0648, 'الواو'], [0x064A, 'الياء']
]);
function letterFor(term) {
  const letters = [...cleanText(term)].filter((char) => /\p{L}/u.test(char));
  if (letters.length >= 3 && letters[0].codePointAt(0) === 0x0627 && letters[1].codePointAt(0) === 0x0644) letters.splice(0, 2);
  return letterLabels.get(letters[0]?.codePointAt(0)) || 'الهمزة';
}

function listAliases(value) {
  return cleanText(value).split(/[\s،,؛;|/]+/u).map((item) => item.trim())
    .filter((item) => normalizeTerm(item).length >= 2);
}
function highlightedTerms(value) {
  return [...String(value || '').matchAll(/<blue>(.*?)<\/blue>/gis)]
    .map((match) => cleanText(match[1])).filter(Boolean);
}
function appendUniqueText(first, second) {
  const left = cleanText(first), right = cleanText(second);
  if (!right) return left;
  if (!left) return right;
  const keyLeft = normalizeTerm(left), keyRight = normalizeTerm(right);
  if (keyLeft === keyRight || keyLeft.includes(keyRight)) return left;
  if (keyRight.includes(keyLeft)) return right;
  return `${left}\n${right}`;
}
function createEntry({ id, term, definition, dictionaryId, sources = [], page = 0, letter, aliases = [] }) {
  const cleanTerm = cleanText(term), cleanDefinition = cleanText(definition);
  if (!normalizeTerm(cleanTerm) || !cleanDefinition) return null;
  const uniqueAliases = [...new Map(aliases.map((alias) => [normalizeTerm(alias), cleanText(alias)])).values()]
    .filter((alias) => normalizeTerm(alias) && normalizeTerm(alias) !== normalizeTerm(cleanTerm));
  return { id: String(id), term: cleanTerm, definition: cleanDefinition,
    letter: cleanText(letter) || letterFor(cleanTerm), page: Number(page) || 0,
    dictionaryId, sources, aliases: uniqueAliases };
}

function mergeIntoDictionary(dictionary, incomingEntries) {
  const entriesByTerm = new Map(), usedIds = new Set(), uniqueEntries = [];
  let merged = 0;
  for (const rawEntry of [...dictionary.entries, ...incomingEntries]) {
    const entry = { ...rawEntry, dictionaryId: dictionary.id };
    const key = normalizeTerm(entry.term);
    if (!key) continue;
    const prior = entriesByTerm.get(key);
    if (prior) {
      prior.definition = appendUniqueText(prior.definition, entry.definition);
      prior.sources = [...new Set([...(prior.sources || []), ...(entry.sources || [])])];
      prior.aliases = [...new Set([...(prior.aliases || []), ...(entry.aliases || [])])];
      merged++;
      continue;
    }
    let id = String(entry.id || `${dictionary.id}_${uniqueEntries.length + 1}`);
    if (usedIds.has(id)) {
      let suffix = 2;
      while (usedIds.has(`${id}_${suffix}`)) suffix++;
      id = `${id}_${suffix}`;
    }
    entry.id = id;
    entry.term = cleanText(entry.term);
    entry.definition = cleanText(entry.definition);
    entry.letter = cleanText(entry.letter) || letterFor(entry.term);
    entry.page = Number(entry.page) || 0;
    entry.sources = Array.isArray(entry.sources) ? entry.sources : entry.sources ? [entry.sources] : [];
    entry.aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
    usedIds.add(id);
    entriesByTerm.set(key, entry);
    uniqueEntries.push(entry);
  }
  dictionary.entries = uniqueEntries;
  return merged;
}

const dictionaries = {
  fiqhi: await readJson('database/processed/unified_fiqhi.json'),
  usuli: await readJson('database/processed/unified_usuli.json'),
  lughawi: await readJson('database/processed/unified_lughawi.json')
};
const incoming = { fiqhi: [], usuli: [], lughawi: [] };

const originalDir = resolve(root, 'database/original_sources');
await mkdir(originalDir, { recursive: true });
for (const file of ['MeaningFiqh.json', 'MeaningLang.json', 'MeaningOsoul.json',
  'kitab_al_ayn_part1.json', 'kitab_al_ayn_part2.json', 'kitab_al_ayn_part3.json', 'kitab_al_ayn_part4.json']) {
  await copyFile(resolve(root, file), resolve(originalDir, file));
}

for (const row of await readJson('MeaningFiqh.json')) {
  const entry = createEntry({ id: `meaning_fiqhi_${row.id}`, term: row.word,
    definition: row.meaning, dictionaryId: 'fiqhi_main' });
  if (entry) incoming.fiqhi.push(entry);
}
for (const row of await readJson('MeaningOsoul.json')) {
  const entry = createEntry({ id: `meaning_osouli_${row.id}`, term: row.word,
    definition: row.meaning, dictionaryId: 'usuli_dict' });
  if (entry) incoming.usuli.push(entry);
}

let currentLanguageEntry = null;
for (const row of await readJson('MeaningLang.json')) {
  if (typeof row.id === 'number' && row.word && row.meaning) {
    currentLanguageEntry = createEntry({ id: `meaning_lang_${row.id}`, term: row.word,
      definition: row.meaning, dictionaryId: 'lughawi_dict',
      aliases: [...listAliases(row.content), ...highlightedTerms(row.meaning)] });
    if (currentLanguageEntry) incoming.lughawi.push(currentLanguageEntry);
    continue;
  }
  if (currentLanguageEntry) {
    const continuation = typeof row.id === 'string' ? row.id : row.meaning || row.definition || row.content;
    currentLanguageEntry.definition = appendUniqueText(currentLanguageEntry.definition, continuation);
    currentLanguageEntry.aliases = [...new Set([
      ...currentLanguageEntry.aliases, ...listAliases(row.word), ...highlightedTerms(continuation)
    ])];
  }
}

const aynBundle = { id: 'lughawi_dict', entries: [] };
for (let part = 1; part <= 4; part++) {
  const rows = await readJson(`kitab_al_ayn_part${part}.json`);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const entry = createEntry({ id: `ayn_part${part}_${row.id || index + 1}`,
      term: row.term, definition: row.definition, letter: row.letter,
      dictionaryId: 'lughawi_dict', sources: row.sources || ['كتاب العين'], page: row.page || 0 });
    if (entry) {
      incoming.lughawi.push(entry);
      aynBundle.entries.push(entry);
    }
  }
}
mergeIntoDictionary(aynBundle, []);
await writeJson('database/processed/kitab_al_ayn.json', aynBundle.entries);

dictionaries.fiqhi.title = 'المعجم الفقهي';
dictionaries.fiqhi.category = 'معجم فقهي';
dictionaries.fiqhi.author = 'مصادر فقهية متعددة';
dictionaries.fiqhi.publisher = 'قاعدة بيانات المعجم';
dictionaries.fiqhi.year = '';
dictionaries.fiqhi.description = 'مصطلحات فقهية مدمجة من مصادر المعجم، مع إزالة التكرار وربط الإحالات الصحيحة.';
dictionaries.usuli.title = 'المعجم الأصولي';
dictionaries.usuli.category = 'معجم أصولي';
dictionaries.usuli.author = 'مصادر أصولية متعددة';
dictionaries.usuli.publisher = 'قاعدة بيانات المعجم';
dictionaries.usuli.year = '';
dictionaries.usuli.description = 'مصطلحات أصولية مدمجة ومنظفة من مصادر المعجم.';
dictionaries.lughawi.title = 'المعجم اللغوي';
dictionaries.lughawi.category = 'معجم لغوي';
dictionaries.lughawi.author = 'مصادر لغوية متعددة';
dictionaries.lughawi.publisher = 'قاعدة بيانات المعجم';
dictionaries.lughawi.year = '';
dictionaries.lughawi.description = 'مواد لغوية تشمل كتاب العين بأجزائه الأربعة وملفات اللغة المضافة، بعد التنظيف وإزالة التكرار.';

const stats = {};
for (const [key, dictionary] of Object.entries(dictionaries)) {
  stats[key] = { before: dictionary.entries.length, incoming: incoming[key].length,
    duplicateTermsMerged: mergeIntoDictionary(dictionary, incoming[key]), after: dictionary.entries.length };
  await writeJson(`database/processed/unified_${key}.json`, dictionary);
}

const exportData = { version: 2, lastUpdated: new Date().toISOString(), dictionaries: Object.values(dictionaries) };
await writeJson('database/app_active_data/dictionaries.json', exportData);
await writeJson('src/data/dictionaries.json', exportData);
await writeJson('database/processed/cleaned_entries.json', dictionaries.fiqhi.entries);
await writeJson('database/processed/fiqhi_terms_complete.json', dictionaries.fiqhi.entries);
await writeFile(resolve(root, 'database/processed/dictionaries.js'),
  `window.ALMOGAM_INITIAL_DATA = ${JSON.stringify(exportData)};\nexport default window.ALMOGAM_INITIAL_DATA;\n`, 'utf8');

const vectorDir = resolve(root, 'database/vector_upload');
await mkdir(vectorDir, { recursive: true });
for (const [key, dictionary] of Object.entries(dictionaries)) {
  const label = key === 'fiqhi' ? 'المعجم الفقهي' : key === 'usuli' ? 'المعجم الأصولي' : 'المعجم اللغوي';
  const content = dictionary.entries.map((entry) =>
    `${label}\nالمصطلح: ${entry.term}${entry.aliases?.length ? `\nصيغ أخرى: ${entry.aliases.join('، ')}` : ''}\nالتعريف: ${entry.definition}`
  ).join('\n\n');
  await writeFile(resolve(vectorDir, `${key}.txt`), `${content}\n`, 'utf8');
}
console.log(JSON.stringify(stats, null, 2));
