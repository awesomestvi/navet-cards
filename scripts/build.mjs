import { build, transform } from 'esbuild';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const { version: packageVersion } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const version = process.env.NAVET_CARDS_BUILD_VERSION || packageVersion;
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:beta|rc|dev)\.[1-9]\d*)?$/.test(version)) throw new Error('Invalid build version');
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/navet-cards.js',
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  legalComments: 'eof',
  plugins: [{name:'compact-card-css',setup(builder) {
    builder.onLoad({filter:/\/styles\.ts$/},async ({path})=>{
      const source=await readFile(path,'utf8');
      const start=source.indexOf('css`')+4, end=source.lastIndexOf('`');
      const compact=await transform(source.slice(start,end),{loader:'css',minify:true,target:['chrome111','safari16']});
      return {contents:source.slice(0,start)+compact.code.trim()+source.slice(end),loader:'ts'};
    });
  }}],
  define: { __VERSION__: JSON.stringify(version) },
  banner: {
    js: `/* Navet Cards ${version} | AGPL-3.0-only | github.com/navet-app/navet-cards */`,
  },
});
const bytes = (await stat('dist/navet-cards.js')).size;
const gzip = gzipSync(await readFile('dist/navet-cards.js')).length;
if (bytes > 140_000) throw new Error(`Bundle exceeds 140 kB budget: ${bytes}`);
if (gzip > 40_000) throw new Error(`Bundle exceeds 40 kB gzip budget: ${gzip}`);
console.log(
  `navet-cards.js: ${(bytes / 1000).toFixed(1)} kB (${(gzip / 1000).toFixed(1)} kB gzip)`,
);
