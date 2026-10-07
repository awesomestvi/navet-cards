import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
export function validateFragment(fragment) {
  if (!['new','improved','fixed','security','internal'].includes(fragment.type) || typeof fragment.summary !== 'string' || !fragment.summary.trim() || /[\r\n]/.test(fragment.summary) || fragment.summary.trim().split(/\s+/).length > 20) throw new Error('Fragments require a valid type and a one-line summary of at most 20 words');
  return fragment;
}
export function renderNotes(fragments) {
  const sections = [['New features',['new']],['Improvements and bug fixes',['improved','fixed']],['Security',['security']]];
  return sections.map(([heading,types]) => {
    const bullets = [...new Set(fragments.filter(f => types.includes(f.type)).map(f => f.summary.trim()))];
    return bullets.length ? `## ${heading}\n\n${bullets.map(s => `- ${s}`).join('\n')}\n` : '';
  }).filter(Boolean).join('\n') || 'No user-facing changes in this release.\n';
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = process.env.RELEASE_SHA || process.env.GITHUB_SHA || 'HEAD';
  const from = process.env.NOTES_BASE || git('tag','--merged',target,'--sort=-version:refname').split('\n').find(t => /^v\d+\.\d+\.\d+$/.test(t) && t !== process.env.RELEASE_TAG);
  // The first release covers all tracked fragments from the beginning of the repository.
  const files = (from ? git('diff','--name-only','--diff-filter=A',from,target,'--','.changes') : git('ls-tree','-r','--name-only',target,'.changes')).split('\n').filter(f => f.endsWith('.json'));
  if (process.argv[2] === 'check' && !files.length) throw new Error('Add a .changes/<topic>.json fragment to this pull request');
  const fragments = files.map(file => validateFragment(JSON.parse(git('show',`${target}:${file}`))));
  if (process.argv[2] === 'check') console.log(`Validated ${fragments.length} release fragments`);
  else { mkdirSync('dist',{recursive:true}); writeFileSync('dist/release-notes.md',renderNotes(fragments)); }
}
