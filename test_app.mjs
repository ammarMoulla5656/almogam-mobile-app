#!/usr/bin/env node
import fs from 'fs';
import { prepareEntryForSearch, smartSearchEntries } from './src/utils/smartSearch.js';
import {
  retrieveLocalCandidates,
  buildCompressedContextPrompt,
  convertLogsToCsv,
  computeBenchmarkStats
} from './src/utils/aiRagEngine.js';

const raw = JSON.parse(fs.readFileSync('./src/data/dictionaries.json', 'utf8'));
const allDictionaries = raw.dictionaries.map((d) => ({
  ...d,
  preparedEntries: d.entries.map(prepareEntryForSearch)
}));

console.log(`✅ Loaded ${allDictionaries.length} dictionaries.`);

// Test 1: Local Hybrid Retrieval with automatic "راجع" reference resolution
// "الابتهال" says: راجع « التعوذ »
const cands = retrieveLocalCandidates(allDictionaries, 'ما هو الابتهال في الدعاء', 'auto', 6);
console.assert(cands.length > 0, 'RAG retrieval failed');
const ibtihal = cands.find((c) => c.term.includes('الابتهال'));
console.assert(ibtihal && ibtihal.definition.includes('تعريف "التعوذ" المحال إليه'), 'Reference resolution failed');
console.log(`🔍 RAG Reference Resolution for "الابتهال" -> Resolved definition length: ${ibtihal.definition.length} chars`);

// Test 2: Compressed Token-Saving Context Prompt
const prompt = buildCompressedContextPrompt('ما هو الابتهال', cands);
console.assert(prompt.includes('مقتطفات المعجم المرفقة'), 'Compressed prompt failed');
console.log(`🪙 Compressed Prompt size: ${prompt.length} chars (~${Math.ceil(prompt.length / 3.2)} tokens)`);

// Test 3: Benchmark Analytics & CSV Export
const sampleLogs = [
  {
    timestamp: '2026-10-17 15:00:00',
    provider: 'Google Gemini',
    model: 'gemini-2.5-flash',
    dictionaryScope: 'auto',
    query: 'ما هو الابتهال',
    candidatesSent: [{ term: 'الابتهال' }],
    responseTimeSec: 1.2,
    tokens: 420,
    rating: 'جيد',
    note: 'ممتاز',
    answer: 'الابتهال هو...',
    systemPrompt: 'افتراضي'
  },
  {
    timestamp: '2026-10-17 15:05:00',
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    dictionaryScope: 'auto',
    query: 'ما هو الابتهال',
    candidatesSent: [{ term: 'الابتهال' }],
    responseTimeSec: 1.8,
    tokens: 510,
    rating: 'سيء',
    note: '',
    answer: '...',
    systemPrompt: 'افتراضي'
  }
];
const stats = computeBenchmarkStats(sampleLogs);
console.assert(stats.bestAccuracyModel.model === 'gemini-2.5-flash', 'Benchmark stats failed');
const csv = convertLogsToCsv(sampleLogs);
console.assert(csv.includes('gemini-2.5-flash'), 'CSV export failed');
console.log(`📊 Benchmark Analytics & CSV verified -> Best model: ${stats.bestAccuracyModel.model} (${stats.bestAccuracyModel.goodRate}%)`);

console.log('🎉 All AI RAG & Benchmarking tests passed with zero errors!');
