import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const databasePromises = new Map();
let sqlRuntimePromise;
const stopWords = new Set(['ما', 'ماذا', 'من', 'هل', 'كيف', 'أين', 'متى', 'لماذا', 'كم', 'أي', 'هو', 'هي', 'هم', 'ها', 'كان', 'يكون', 'في', 'على', 'عن', 'مع', 'أو', 'ثم', 'لا', 'لم', 'لن', 'هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي', 'الذين', 'شرح', 'معنى', 'كلمة', 'مصطلح', 'شيء']);

function normalizeArabic(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0621-\u064A0-9\u0660-\u0669\u06F0-\u06F9a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getDatabase(dictionaryId, url) {
  if (databasePromises.has(dictionaryId)) return databasePromises.get(dictionaryId);
  const task = (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`SQLite fetch failed (${response.status})`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!sqlRuntimePromise) sqlRuntimePromise = initSqlJs({ locateFile: () => sqlWasmUrl });
    const SQL = await sqlRuntimePromise;
    return new SQL.Database(bytes);
  })();
  databasePromises.set(dictionaryId, task);
  task.catch(() => databasePromises.delete(dictionaryId));
  return task;
}

function rowsFromStatement(database, sql, parameters = []) {
  const statement = database.prepare(sql);
  const rows = [];
  try {
    statement.bind(parameters);
    while (statement.step()) rows.push(statement.getAsObject());
  } finally {
    statement.free();
  }
  return rows;
}

async function loadEntries(database, requestId) {
  const countRows = database.exec('SELECT COUNT(*) AS count FROM entries');
  const total = Number(countRows[0]?.values?.[0]?.[0] || 0);
  const pageSize = 400;
  for (let offset = 0; offset < total; offset += pageSize) {
    const rows = rowsFromStatement(
      database,
      'SELECT id, dictionary_id, term, definition, letter, page, sources_json, aliases_json FROM entries ORDER BY row_id LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    self.postMessage({ type: 'batch', requestId, rows, total });
    self.postMessage({ type: 'progress', requestId, progress: Math.min(99, Math.round(((offset + rows.length) / total) * 100)) });
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
  self.postMessage({ type: 'complete', requestId, total });
}

function searchEntries(database, payload) {
  const normalized = normalizeArabic(payload.query);
  const tokens = normalized.split(/\s+/).filter((token) => token.length >= 2 && !stopWords.has(token));
  if (!tokens.length) return [];

  const uniqueTokens = [...new Set(tokens)];
  const match = uniqueTokens.map((token) => `${token.replace(/["*]/g, '')}*`).join(' OR ');
  const conditions = ['row_id IN (SELECT docid FROM entries_fts WHERE entries_fts MATCH ?)'];
  const parameters = [match];
  if (payload.letterFilter && payload.letterFilter !== 'الكل') {
    conditions.push('letter = ?');
    parameters.push(payload.letterFilter);
  }
  if (Array.isArray(payload.bookmarks)) {
    if (!payload.bookmarks.length) return [];
    conditions.push(`id IN (${payload.bookmarks.map(() => '?').join(',')})`);
    parameters.push(...payload.bookmarks);
  }

  const titleOverlapSql = uniqueTokens.map(() => 'CASE WHEN term_norm LIKE ? THEN 1 ELSE 0 END').join(' + ') || '0';
  parameters.push(
    normalized,
    `${normalized}%`,
    `%${normalized}%`,
    ...uniqueTokens.map((token) => `%${token}%`),
    Math.max(1, Math.min(Number(payload.limit) || 900, 1200))
  );
  const sql = `SELECT id, dictionary_id, term, definition, letter, page, sources_json, aliases_json
    FROM entries WHERE ${conditions.join(' AND ')}
    ORDER BY CASE WHEN term_norm = ? THEN 0 WHEN term_norm LIKE ? THEN 1 WHEN term_norm LIKE ? THEN 2 ELSE 3 END,
      (${titleOverlapSql}) DESC, row_id LIMIT ?`;
  return rowsFromStatement(database, sql, parameters);
}

self.onmessage = async ({ data }) => {
  const { requestId, dictionaryId, url, type } = data;
  try {
    const database = await getDatabase(dictionaryId, url);
    if (type === 'load') await loadEntries(database, requestId);
    else if (type === 'search') self.postMessage({ type: 'searchResults', requestId, rows: searchEntries(database, data) });
  } catch (error) {
    self.postMessage({ type: 'error', requestId, message: error?.message || 'SQLite worker failed' });
  }
};
