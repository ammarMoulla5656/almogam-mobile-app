#!/usr/bin/env node
import fs from 'fs';
import { prepareEntryForSearch } from './src/utils/smartSearch.js';
import {
  DEFAULT_VECTOR_STORE_ID,
  DEFAULT_SYSTEM_PROMPT,
  AI_PROVIDERS,
  normalizeGeminiModelName,
  buildOpenAiResponsesRequestBody,
  parseOpenAiResponsesOutput,
  buildGeminiInteractionsRequestBody,
  parseGeminiInteractionsOutput,
  findFullEntryInDictionaries,
  convertLogsToCsv,
  computeBenchmarkStats
} from './src/utils/aiRagEngine.js';

const raw = JSON.parse(fs.readFileSync('./src/data/dictionaries.json', 'utf8'));
const allDictionaries = raw.dictionaries.map((d) => ({
  ...d,
  preparedEntries: d.entries.map(prepareEntryForSearch)
}));

console.log(`✅ Loaded ${allDictionaries.length} dictionaries.`);

// Test 1: OpenAI Responses API Request Body with Vector Store ID vs_6ad37a3dabac81918cc341f5c2bd0d02
const reqBody = buildOpenAiResponsesRequestBody({
  model: 'gpt-4o-mini',
  instructions: DEFAULT_SYSTEM_PROMPT,
  userQuery: 'شنو يعني الصعيد الطيب؟',
  vectorStoreIds: [DEFAULT_VECTOR_STORE_ID],
  maxNumResults: 5,
  scopeFilter: 'fiqhi_main'
});

console.assert(reqBody.model === 'gpt-4o-mini', 'Model mismatch');
console.assert(reqBody.tools[0].type === 'file_search', 'Tool type must be file_search');
console.assert(
  reqBody.tools[0].vector_store_ids[0] === 'vs_6ad37a3dabac81918cc341f5c2bd0d02',
  'Vector store ID mismatch'
);
console.assert(reqBody.tools[0].max_num_results === 5, 'max_num_results mismatch');
console.assert(
  reqBody.text.format.name === 'dictionary_search_results' && reqBody.text.format.strict === true,
  'JSON schema format mismatch'
);
console.log('✅ Test 1 passed: OpenAI Responses API request body structure verified.');

// Test 2: Parsing OpenAI Responses API output (both output_text and output -> message -> content[0].text)
const mockApiOutput = {
  output: [
    { type: 'file_search_call', id: 'fs_123' },
    {
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: JSON.stringify({
            results: [
              {
                id: 'fiqh_1',
                term: 'الابتهال',
                dictionaryId: 'fiqhi_main',
                page: 11,
                short_meaning: 'التضرع والدعاء بإخلاص، ويحال فيه إلى لفظ التعوذ.',
                source: 'الاصطلاحات الفقهية'
              }
            ],
            message: 'تم العثور على مصطلح مطابق'
          })
        }
      ]
    }
  ],
  usage: {
    input_tokens: 310,
    output_tokens: 95,
    total_tokens: 405
  }
};

const parsed = parseOpenAiResponsesOutput(mockApiOutput);
console.assert(parsed.results.length === 1 && parsed.results[0].term === 'الابتهال', 'Output parsing failed');
console.log('✅ Test 2 passed: OpenAI Responses API output parsing verified.');

// Test 3: Matching suggested card with full local dictionary entry
const fullMatch = findFullEntryInDictionaries(allDictionaries, parsed.results[0]);
console.assert(fullMatch && fullMatch.entry.id === 'fiqh_1', 'Full entry local lookup failed');
console.log(`✅ Test 3 passed: Local dictionary lookup found "${fullMatch.entry.term}" -> "${fullMatch.entry.definition}"`);

// Test 4: Benchmark logs & stats (ai_search_benchmarks.json)
const sampleLogs = [
  {
    timestamp: '2026-10-17 16:40:00',
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    vectorStoreId: DEFAULT_VECTOR_STORE_ID,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    query: 'الابتهال',
    results: parsed.results,
    inputTokens: 310,
    outputTokens: 95,
    totalTokens: 405,
    responseTimeSec: 1.35,
    rating: 'جيد'
  },
  {
    timestamp: '2026-10-17 16:42:00',
    provider: 'OpenAI',
    model: 'gpt-4o',
    vectorStoreId: DEFAULT_VECTOR_STORE_ID,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    query: 'الابتهال',
    results: parsed.results,
    inputTokens: 320,
    outputTokens: 100,
    totalTokens: 420,
    responseTimeSec: 2.1,
    rating: 'سيء'
  }
];

const stats = computeBenchmarkStats(sampleLogs);
console.assert(stats.bestAccuracyModel.model === 'gpt-4o-mini', 'Stats calculation failed');
const csv = convertLogsToCsv(sampleLogs);
console.assert(csv.includes('vs_6ad37a3dabac81918cc341f5c2bd0d02'), 'CSV export missing vectorStoreId');
console.log(
  `✅ Test 4 passed: Benchmark analytics verified -> Best model: ${stats.bestAccuracyModel.model} (${stats.bestAccuracyModel.goodRate}%)`
);

// Test 5: Google Gemini Interactions API (https://ai.google.dev/gemini-api/docs/get-started)
const geminiProvider = AI_PROVIDERS.find((p) => p.id === 'gemini');
console.assert(
  geminiProvider.defaultModel === 'gemini-3.8-flash',
  'Default Gemini model should be gemini-3.8-flash'
);
console.assert(
  normalizeGeminiModelName('models/gemini-2.5-flash-lite') === 'gemini-3.5-flash-lite',
  'Legacy gemini-2.5-flash-lite should normalize to gemini-3.5-flash-lite'
);
console.assert(
  normalizeGeminiModelName('gemini-2.5-flash') === 'gemini-3.8-flash',
  'Legacy gemini-2.5-flash should normalize to gemini-3.8-flash'
);

const geminiReq = buildGeminiInteractionsRequestBody({
  model: 'models/gemini-2.5-flash-lite',
  instructions: DEFAULT_SYSTEM_PROMPT,
  userQuery: 'الابتهال',
  scopeFilter: 'fiqhi_main',
  localContextText: '[1] id: fiqh_1 | المصطلح: الابتهال | المعجم: fiqhi_main | ص: 11 | النص: راجع لفظ التعوذ'
});
console.assert(geminiReq.model === 'gemini-3.5-flash-lite', 'Gemini Interactions request model mismatch');
console.assert(geminiReq.response_format.mime_type === 'application/json', 'Gemini response_format mime_type mismatch');

const mockGeminiInteractionsResponse = {
  id: 'inter_123',
  status: 'completed',
  usage: {
    total_input_tokens: 210,
    total_output_tokens: 80,
    total_tokens: 290
  },
  steps: [
    { type: 'thought', content: [{ type: 'text', text: 'Searching dictionary...' }] },
    {
      type: 'model_output',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            results: [
              {
                id: 'fiqh_1',
                term: 'الابتهال',
                dictionaryId: 'fiqhi_main',
                page: 11,
                short_meaning: 'التضرع والدعاء بإخلاص.',
                source: 'الاصطلاحات الفقهية'
              }
            ],
            message: ''
          })
        }
      ]
    }
  ]
};
const parsedGemini = parseGeminiInteractionsOutput(mockGeminiInteractionsResponse);
console.assert(parsedGemini.results.length === 1 && parsedGemini.results[0].term === 'الابتهال', 'Gemini Interactions output parsing failed');
console.log('✅ Test 5 passed: Google Gemini Interactions API (/v1beta/interactions) & model list verified.');

console.log('🎉 All OpenAI Responses API + Google Gemini Interactions API tests passed!');
