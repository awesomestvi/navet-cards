import { mkdir, readFile, writeFile, copyFile, cp, readdir, utimes, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const { version: packageVersion } = JSON.parse(await readFile('package.json', 'utf8'));
const version = process.env.NAVET_CARDS_BUILD_VERSION || packageVersion;
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:beta|rc|dev)\.[1-9]\d*)?$/.test(version)) throw new Error('Invalid build version');
const manifest = JSON.parse(await readFile('hacs.json', 'utf8'));
const resource = await readFile('dist/navet-cards.js');
if (!resource.toString().startsWith(`/* Navet Cards ${version} |`)) throw new Error('Build the matching resource first');
if (manifest.filename !== 'navet-cards.js') throw new Error('HACS filename must match the resource');
const output = `dist/verification-${version}`;
await rm(output, { recursive: true, force: true });
await rm(`dist/navet-cards-${version}.zip`, { force: true });
await mkdir(output, { recursive: true });
await mkdir(`${output}/docs`, { recursive: true });
await copyFile('dist/navet-cards.js', `${output}/navet-cards.js`);
for (const [source, target] of [
  ['README.md', 'README.md'], ['LICENSE', 'LICENSE'], ['hacs.json', 'hacs.json'],
  ...['human-verification', 'verification-status', 'release-checklist', 'implementation'].map((name) => [`docs/${name}.md`, `docs/${name}.md`]),
]) await copyFile(source, `${output}/${target}`);
await copyFile(process.env.NAVET_CARDS_BUILD_VERSION ? 'dist/release-notes.md' : 'docs/release-notes.md', `${output}/docs/release-notes.md`);
await cp('docs/images', `${output}/docs/images`, { recursive: true });
const hash = createHash('sha256').update(resource).digest('hex');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
await writeFile(`${output}/SHA256SUMS`, `${hash}  navet-cards.js\n`);
await writeFile(`${output}/build.json`, JSON.stringify({ version, commit, dirty, bytes: resource.length, sha256: hash }, null, 2) + '\n');
console.log(`Verification bundle: ${output}/`);
console.log(`SHA-256: ${hash}`);
// Fixed timestamps, sorted entries and stripped metadata make retries reproducible.
const entries = [];
async function collect(directory, relative = '') {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await collect(`${directory}/${entry.name}`, name);
    else { await utimes(`${directory}/${entry.name}`, new Date('1980-01-01T00:00:00Z'), new Date('1980-01-01T00:00:00Z')); entries.push(name); }
  }
}
await collect(output);
execFileSync('zip', ['-Xq', `../navet-cards-${version}.zip`, ...entries], { cwd: output, env: { ...process.env, TZ: 'UTC' } });
console.log(`Archive: dist/navet-cards-${version}.zip`);
