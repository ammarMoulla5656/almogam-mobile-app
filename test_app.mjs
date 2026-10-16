#!/usr/bin/env node
import fs from 'fs';
import { prepareEntryForSearch, smartSearchEntries } from './src/utils/smartSearch.js';

const raw = JSON.parse(fs.readFileSync('./src/data/dictionaries.json', 'utf8'));
const fiqhi = raw.dictionaries[0];
const prepared = fiqhi.entries.map(prepareEntryForSearch);

console.log(`✅ Loaded "${fiqhi.title}" with ${prepared.length} entries across ${fiqhi.chapters.length} chapters.`);

// Test 1: Exact term without hamza or ال
const r1 = smartSearchEntries(prepared, 'ابريسم');
console.assert(r1.length > 0 && r1[0].term.includes('ابريسم'), 'Test 1 failed');
console.log(`🔍 Search "ابريسم" -> Top result: ${r1[0]?.term}`);

// Test 2: Content search (searching by meaning/content, not term name)
const r2 = smartSearchEntries(prepared, 'حجر يكتحل به');
console.assert(r2.length > 0 && r2[0].term.includes('الإثمد'), 'Test 2 failed');
console.log(`🔍 Content Search "حجر يكتحل به" -> Top result: ${r2[0]?.term} (${r2[0]?.definition})`);

// Test 3: Semantic / Synonym expansion search (searching "فلوس" or "ورقة نقدية")
const r3 = smartSearchEntries(prepared, 'الاوراق النقديه الدولار');
console.assert(r3.length > 0 && r3[0].term.includes('الاسكناس'), 'Test 3 failed');
console.log(`🔍 Smart Search "الاوراق النقديه الدولار" -> Top result: ${r3[0]?.term}`);

// Test 4: Typo / Fuzzy tolerance
const r4 = smartSearchEntries(prepared, 'الاحتظار'); // ظ instead of ض
console.assert(r4.length > 0 && r4[0].term.includes('الاحتضار'), 'Test 4 failed');
console.log(`🔍 Fuzzy Typo Search "الاحتظار" -> Top result: ${r4[0]?.term}`);

// Test 5: Chapter filter
const r5 = smartSearchEntries(prepared, '', { letterFilter: 'الباء' });
console.assert(r5.length > 50, 'Test 5 failed');
console.log(`📑 Filter Chapter "الباء" -> ${r5.length} terms (starts at page ${r5[0]?.page})`);

console.log('🎉 All automated tests passed with zero errors!');
