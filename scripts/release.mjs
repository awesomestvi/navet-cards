import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parsePromotionTag, resolvePromotion } from './release-promotion.mjs';

const exec = (bin, args) => execFileSync(bin, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }).trim();
const git = (...args) => exec('git', args);
const gh = (...args) => exec('gh', args);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const output = (values) => {
  console.log(JSON.stringify(values, null, 2));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([k,v]) => `${k}=${v}\n`).join(''));
};
const repository = () => {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) throw new Error('Missing repository');
  return repo;
};
const api = (path) => JSON.parse(gh('api', `repos/${repository()}/${path}`));
const releases = () => JSON.parse(gh('api', '--paginate', '--slurp', `repos/${repository()}/releases?per_page=100`)).flat();
const tagSha = (tag) => {
  if (!parsePromotionTag(tag)) throw new Error('Unsupported tag');
  if (git('cat-file', '-t', `refs/tags/${tag}`) !== 'tag') throw new Error('Tags must be annotated');
  const sha = git('rev-parse', `refs/tags/${tag}^{commit}`);
  git('merge-base', '--is-ancestor', sha, 'refs/remotes/origin/main');
  return sha;
};

export function validatePromotion(sourceTag, releaseTag, { installationTested = false, previewOnly = false } = {}) {
  const source = parsePromotionTag(sourceTag), target = parsePromotionTag(releaseTag);
  if (!source || !target || target.channel === 'dev') throw new Error('Invalid promotion tags');
  if (target.channel === 'beta' && source.channel !== 'dev') throw new Error('Beta must promote Dev');
  if (target.channel === 'stable' && !['beta', 'rc'].includes(source.channel)) throw new Error('Stable must promote beta or RC');
  if (source.channel === 'stable') throw new Error('Stable cannot be a promotion source');
  if (source.channel !== 'dev' && target.base !== source.base) throw new Error('Base versions must match');
  if (target.channel === 'stable' && !installationTested && !previewOnly) throw new Error('Install and test beta/RC before stable');
  return target;
}

export function validateEvidence(evidence, { tag, sha, repo }) {
  const parsed = parsePromotionTag(tag);
  if (!parsed || evidence.schema !== 1 || evidence.repository !== repo || evidence.tag !== tag || evidence.commit !== sha || evidence.version !== (parsed.channel === 'dev' ? `${parsed.base}-dev.${parsed.sequence}` : tag.slice(1)) || !Number.isSafeInteger(evidence.runId) || evidence.runId <= 0 || !/^[a-f0-9]{64}$/.test(evidence.sha256 ?? '')) throw new Error('Invalid publication evidence');
  if (parsed.channel === 'stable' && evidence.installationTested !== true) throw new Error('Missing installation acceptance');
}

function verifySource(release) {
  const tag = release.tag_name, sha = tagSha(tag);
  if (release.draft || !release.prerelease) throw new Error('Source must be a published prerelease');
  const evidenceAsset = release.assets.find(a => a.name === 'navet-cards-release-evidence.json');
  const resource = release.assets.find(a => a.name === 'navet-cards.js');
  if (!evidenceAsset || !resource) throw new Error('Source lacks release evidence or resource');
  const evidence = JSON.parse(gh('api', '-H', 'Accept: application/octet-stream', `repos/${repository()}/releases/assets/${evidenceAsset.id}`));
  validateEvidence(evidence, { tag, sha, repo: repository() });
  const run = api(`actions/runs/${evidence.runId}`);
  if (run.conclusion !== 'success' || !['.github/workflows/release.yml', '.github/workflows/dev-release.yml'].includes(run.path) || run.head_branch !== 'main') throw new Error('Source publication has not completed successfully from main');
  // GitHub supplies a SHA-256 digest for uploaded release assets.
  if (resource.digest !== `sha256:${evidence.sha256}`) throw new Error('Published resource digest differs from evidence');
  return { tag, sha };
}

async function main(command) {
  if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Run release tooling from main');
  const sourceTag = process.env.SOURCE_TAG || '', releaseTag = process.env.RELEASE_TAG || '';
  const installationTested = process.env.INSTALLATION_TESTED === 'true';
  if (command === 'dev') {
    const { version } = JSON.parse(readFileSync('package.json'));
    const base = version.split('-')[0];
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0,14);
    const tag = `navet-cards-dev-${base}-dev.${stamp}`;
    if (!parsePromotionTag(tag)) throw new Error('Invalid Dev version');
    const sha = git('rev-parse', 'HEAD');
    git('config', 'user.name', 'github-actions[bot]');
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
    git('tag', '-a', tag, sha, '-m', `Dev ${tag}`, '-m', 'Source-Branch: main');
    git('push', 'origin', `refs/tags/${tag}:refs/tags/${tag}`);
    output({ release_tag: tag });
  } else if (command === 'promote') {
    const sources = [];
    for (const release of releases()) {
      const parsed = parsePromotionTag(release.tag_name);
      if (!parsed || parsed.channel === 'stable' || release.draft || !release.prerelease || (sourceTag && sourceTag !== release.tag_name)) continue;
      // Legacy releases without evidence are not eligible promotion sources.
      if (!release.assets.some(a => a.name === 'navet-cards-release-evidence.json')) continue;
      sources.push(verifySource(release));
    }
    const plan = resolvePromotion({ channel: process.env.RELEASE_CHANNEL || 'beta', sourceTag, releaseTag, tags: git('tag', '--list').split('\n'), sources });
    validatePromotion(plan.source_tag, plan.release_tag, { installationTested, previewOnly: process.env.PREVIEW_ONLY === 'true' });
    output(plan);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Source: ${plan.source_tag}\n\nTarget: ${plan.release_tag}\n\nCommit: ${plan.source_sha}\n\nPreview only: ${process.env.PREVIEW_ONLY === 'true'}\n`);
    if (process.env.PREVIEW_ONLY !== 'true') {
      git('config', 'user.name', 'github-actions[bot]');
      git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
      git('tag', '-a', plan.release_tag, plan.source_sha, '-m', `Release ${plan.release_tag}`, '-m', `Promoted-From: ${plan.source_tag}`);
      git('push', 'origin', `refs/tags/${plan.release_tag}:refs/tags/${plan.release_tag}`);
      gh('workflow', 'run', 'release.yml', '--ref', 'main', '-f', `release_tag=${plan.release_tag}`, '-f', `source_tag=${plan.source_tag}`, '-f', `installation_tested=${installationTested}`);
    }
  } else if (command === 'context') {
    const sha = tagSha(releaseTag), parsed = parsePromotionTag(releaseTag);
    const annotation = git('for-each-ref', '--format=%(contents)', `refs/tags/${releaseTag}`);
    if (parsed.channel === 'dev') {
      if (sourceTag || !/^Source-Branch: main$/m.test(annotation)) throw new Error('Dev must originate from main');
    } else {
      validatePromotion(sourceTag, releaseTag, { installationTested });
      if (!annotation.split('\n').includes(`Promoted-From: ${sourceTag}`)) throw new Error('Missing promotion provenance');
      const release = releases().find(r => r.tag_name === sourceTag);
      if (!release || verifySource(release).sha !== sha) throw new Error('Promote the exact tested commit');
    }
    // Never publish an older stable version as latest.
    const newerStable = releases().some(r => !r.draft && !r.prerelease && parsePromotionTag(r.tag_name)?.channel === 'stable' && compareBase(parsePromotionTag(r.tag_name).version, parsed.version) > 0);
    if (parsed.channel === 'stable' && newerStable) throw new Error('Refusing stale stable publication');
    output({ release_sha: sha, version: parsed.channel === 'dev' ? `${parsed.base}-dev.${parsed.sequence}` : releaseTag.slice(1), environment: parsed.channel === 'stable' ? 'production' : parsed.channel === 'dev' ? 'edge' : 'beta', prerelease: parsed.channel !== 'stable' });
  } else if (command === 'publish') {
    const version = process.env.NAVET_CARDS_BUILD_VERSION, sha = tagSha(releaseTag);
    const build = JSON.parse(readFileSync(`dist/verification-${version}/build.json`));
    if (build.dirty || build.commit !== sha || build.version !== version) throw new Error('Publication requires a clean build of the tagged source');
    const resource = readFileSync('dist/navet-cards.js');
    if (!resource.toString().startsWith(`/* Navet Cards ${version} |`)) throw new Error('Versioned build required');
    const digest = sha256(resource);
    const evidence = { schema: 1, repository: repository(), tag: releaseTag, sourceTag, commit: sha, version, sha256: digest, runId: Number(process.env.GITHUB_RUN_ID), installationTested };
    validateEvidence(evidence, { tag: releaseTag, sha, repo: repository() });
    writeFileSync('dist/navet-cards-release-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
    const current = releases().find(r => r.tag_name === releaseTag);
    if (!current) gh('release', 'create', releaseTag, '--repo', repository(), '--verify-tag', '--draft', '--title', releaseTag, '--notes-file', 'dist/release-notes.md');
    const existing = current?.assets || [];
    // Never overwrite versioned payloads. Recovery requires byte-for-byte identity.
    const assets = ['dist/navet-cards.js', `dist/navet-cards-${version}.zip`, `dist/verification-${version}/SHA256SUMS`, `dist/verification-${version}/build.json`];
    for (const file of assets) {
      const name = file.split('/').at(-1), remote = existing.find(a => a.name === name);
      if (remote) {
        if (remote.digest !== `sha256:${sha256(readFileSync(file))}`) throw new Error(`Conflicting immutable asset: ${name}. Use a new version.`);
      } else {
        if (current && !current.draft) throw new Error(`Published release is missing ${name}; use a new version`);
        gh('release', 'upload', releaseTag, file, '--repo', repository());
      }
    }
    // Download and inspect the actual published resource before making it installable.
    mkdirSync('dist/published', { recursive: true });
    gh('release', 'download', releaseTag, '--repo', repository(), '--pattern', 'navet-cards.js', '--dir', 'dist/published', '--clobber');
    if (sha256(readFileSync('dist/published/navet-cards.js')) !== digest) throw new Error('Published resource failed checksum verification');
    // Completion metadata may be refreshed on recovery; payloads remain immutable.
    gh('release', 'upload', releaseTag, 'dist/navet-cards-release-evidence.json', '--repo', repository(), '--clobber');
    const prerelease = parsePromotionTag(releaseTag).channel !== 'stable';
    gh('release', 'edit', releaseTag, '--repo', repository(), '--draft=false', `--prerelease=${prerelease}`, `--latest=${!prerelease}`, '--notes-file', 'dist/release-notes.md');
  } else throw new Error('Unknown release command');
}
const compareBase = (a,b) => a[0]-b[0] || a[1]-b[1] || a[2]-b[2];
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv[2]);
