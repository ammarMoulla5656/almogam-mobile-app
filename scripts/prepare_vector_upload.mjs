import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const sources = [
  ['unified_fiqhi.json', 'fiqhi.txt', '\u0627\u0644\u0645\u0639\u062c\u0645 \u0627\u0644\u0641\u0642\u0647\u064a'],
  ['unified_usuli.json', 'usuli.txt', '\u0627\u0644\u0645\u0639\u062c\u0645 \u0627\u0644\u0623\u0635\u0648\u0644\u064a'],
  ['unified_lughawi.json', 'lughawi.txt', '\u0627\u0644\u0645\u0639\u062c\u0645 \u0627\u0644\u0644\u063a\u0648\u064a']
];
const outputDir = resolve(root, 'database/vector_upload');
await mkdir(outputDir, { recursive: true });

for (const [input, output, label] of sources) {
  const dictionary = JSON.parse(await readFile(resolve(root, 'database/processed', input), 'utf8'));
  const body = dictionary.entries.map((entry) => {
    const aliases = Array.isArray(entry.aliases) ? [...new Set(entry.aliases.map((value) => String(value).trim()).filter(Boolean))] : [];
    return `المعجم: ${label}\nعنوان المدخل: ${entry.term}${aliases.length ? `\nصيغ وأسماء أخرى: ${aliases.join('، ')}` : ''}\nالتعريف: ${entry.definition}`;
  }).join('\n\n---\n\n');
  await writeFile(resolve(outputDir, output), `${body}\n`, 'utf8');
  console.log(`${output}: ${dictionary.entries.length} entries`);
}
