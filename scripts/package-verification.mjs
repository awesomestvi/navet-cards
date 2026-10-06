import { mkdir, readFile, writeFile, copyFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const manifest = JSON.parse(await readFile('hacs.json', 'utf8'));
const resource = await readFile('dist/navet-cards.js');
if (!resource.toString().startsWith(`/* Navet Cards ${version} |`)) throw new Error('Build the matching resource first');
if (manifest.filename !== 'navet-cards.js') throw new Error('HACS filename must match the resource');
const output = `dist/verification-${version}`;
await mkdir(output, { recursive: true });
await mkdir(`${output}/docs`, { recursive: true });
await copyFile('dist/navet-cards.js', `${output}/navet-cards.js`);
for (const [source, target] of [
  ['README.md', 'README.md'], ['LICENSE', 'LICENSE'], ['hacs.json', 'hacs.json'],
  ...['human-verification', 'verification-status', 'release-notes', 'release-checklist', 'implementation'].map((name) => [`docs/${name}.md`, `docs/${name}.md`]),
]) await copyFile(source, `${output}/${target}`);
await cp('docs/images', `${output}/docs/images`, { recursive: true });
const hash = createHash('sha256').update(resource).digest('hex');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
await writeFile(`${output}/SHA256SUMS`, `${hash}  navet-cards.js\n`);
await writeFile(`${output}/build.json`, JSON.stringify({ version, commit, dirty, bytes: resource.length, sha256: hash }, null, 2) + '\n');
console.log(`Verification bundle: ${output}/`);
console.log(`SHA-256: ${hash}`);
execFileSync('zip', ['-qr', `../navet-cards-${version}.zip`, '.'], { cwd: output });
console.log(`Archive: dist/navet-cards-${version}.zip`);
