import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const sources = [
  ['unified_fiqhi.json', 'fiqhi.txt', 'المعجم الفقهي'],
  ['unified_usuli.json', 'usuli.txt', 'المعجم الأصولي'],
  ['unified_lughawi.json', 'lughawi.txt', 'المعجم اللغوي']
];
const outputDir = resolve(root, 'database/vector_upload');
await mkdir(outputDir, { recursive: true });

for (const [input, output, label] of sources) {
  const dictionary = JSON.parse(await readFile(resolve(root, 'database/processed', input), 'utf8'));
  const body = dictionary.entries.map((entry) =>
    `${label}\nالمصطلح: ${entry.term}\nالتعريف: ${entry.definition}`
  ).join('\n\n');
  await writeFile(resolve(outputDir, output), `${body}\n`, 'utf8');
  console.log(`${output}: ${dictionary.entries.length} entries`);
}
