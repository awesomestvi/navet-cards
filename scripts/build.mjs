import { build } from 'esbuild';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/navet-cards.js',
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  legalComments: 'eof',
  define: { __VERSION__: JSON.stringify(version) },
  banner: {
    js: `/* Navet Cards ${version} | AGPL-3.0-only | github.com/awesomestvi/navet-cards */`,
  },
});
const bytes = (await stat('dist/navet-cards.js')).size;
const gzip = gzipSync(await readFile('dist/navet-cards.js')).length;
if (bytes > 160_000) throw new Error(`Bundle exceeds 160 kB budget: ${bytes}`);
console.log(
  `navet-cards.js: ${(bytes / 1000).toFixed(1)} kB (${(gzip / 1000).toFixed(1)} kB gzip)`,
);
