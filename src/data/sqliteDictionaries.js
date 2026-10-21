const DICTIONARY_IDS = ['fiqhi_main', 'usuli_dict', 'lughawi_dict'];
const workerClients = new Map();
let nextRequestId = 0;

function toEntry(row) {
  return {
    id: row.id,
    dictionaryId: row.dictionary_id,
    term: row.term,
    definition: row.definition,
    letter: row.letter,
    page: row.page,
    sources: JSON.parse(row.sources_json || '[]'),
    aliases: JSON.parse(row.aliases_json || '[]')
  };
}

function getWorkerClient(dictionaryId) {
  if (workerClients.has(dictionaryId)) return workerClients.get(dictionaryId);
  const worker = new Worker(new URL('./dictionarySqlite.worker.js', import.meta.url), { type: 'module' });
  const pending = new Map();
  const client = { worker, pending };
  worker.onmessage = ({ data }) => {
    const request = pending.get(data.requestId);
    if (!request) return;
    if (data.type === 'batch') {
      request.onBatch?.(data.rows.map(toEntry), data.total);
    } else if (data.type === 'progress') {
      request.onProgress?.(data.progress);
    } else if (data.type === 'searchResults') {
      pending.delete(data.requestId);
      request.resolve(data.rows.map(toEntry));
    } else if (data.type === 'complete') {
      pending.delete(data.requestId);
      request.onProgress?.(100);
      request.resolve({ id: dictionaryId, entries: undefined, entryCount: data.total });
    } else if (data.type === 'error') {
      pending.delete(data.requestId);
      request.reject(new Error(data.message));
    }
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || 'تعذر تشغيل البحث المحلي');
    for (const request of pending.values()) request.reject(error);
    pending.clear();
    worker.terminate();
    workerClients.delete(dictionaryId);
  };
  workerClients.set(dictionaryId, client);
  return client;
}

function requestWorker(dictionaryId, payload, handlers = {}) {
  const client = getWorkerClient(dictionaryId);
  const requestId = ++nextRequestId;
  const assetUrl = new URL(
    `${import.meta.env.BASE_URL}data/sqlite/${dictionaryId}.sqlite`,
    document.baseURI
  ).href;
  return new Promise((resolve, reject) => {
    client.pending.set(requestId, { ...handlers, resolve, reject });
    client.worker.postMessage({ ...payload, requestId, dictionaryId, url: assetUrl });
  });
}

export async function loadDictionaryPreviews() {
  return Promise.all(DICTIONARY_IDS.map(async (dictionaryId) => {
    const assetUrl = new URL(`${import.meta.env.BASE_URL}data/previews/${dictionaryId}.json`, document.baseURI);
    const response = await fetch(assetUrl);
    if (!response.ok) throw new Error(`تعذر تحميل معاينة ${dictionaryId}`);
    return response.json();
  }));
}

export function loadDictionaryFromSqlite(dictionaryId, onProgress = () => {}, onBatch) {
  return requestWorker(dictionaryId, { type: 'load' }, { onProgress, onBatch });
}

export function searchDictionarySqlite(dictionaryId, query, { letterFilter = 'الكل', bookmarks = [], limit = 900 } = {}) {
  return requestWorker(dictionaryId, { type: 'search', query, letterFilter, bookmarks, limit });
}
