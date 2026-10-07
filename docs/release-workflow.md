# Release workflow

Navet Cards uses the same promotion stages as Navet: **Dev → beta/RC → stable**. Each release contains a versioned `navet-cards.js`, a verification archive, checksums, build metadata and `navet-cards-release-evidence.json`. GitHub Releases are the published changelog. Source tags are annotated and immutable; promotion retains the tested commit without advancing `main`.

## Download a published build

Open [GitHub Releases](https://github.com/navet-app/navet-cards/releases), select a release, and download `navet-cards.js` from **Assets**. The versioned ZIP includes installation instructions and verification files. Dev, beta, and RC builds are marked **Pre-release**; stable releases are marked as the latest release. Follow the [installation guide](../README.md#install-navet-cards) to register the resource in Home Assistant.

## Configure GitHub

Protect `main` with required pull requests and the Cards validation checks. Configure the **edge**, **beta** and **production** environments to accept deployments from `main`. Keep publication credentials in these environments. The workflows use the repository's GitHub token; no additional token is needed. Enable Actions with read-only default permissions; the publishing jobs request their required write permissions explicitly.

## Development builds

Runtime changes merged into `main` automatically run **Publish Dev**. Changes limited to documentation or automation do not publish a new build. Maintainers can dispatch **Publish Dev** from `main` to test release tooling or recover from a failed build with a new Dev tag.

The workflow creates an annotated `navet-cards-dev-VERSION-dev.TIMESTAMP` tag, runs type, contract, release and browser checks, and packages the resource with its Dev version. It downloads the uploaded resource and verifies its checksum before publishing the prerelease. Automated simulated-browser checks are recorded separately from the live [release checklist](release-checklist.md).

## Promote a tested build

1. Open **Actions → Promote Navet Cards Release → Run workflow**, selecting `main`.
2. Choose `beta`, `rc`, or `stable`. Leave **preview_only** enabled to inspect the selected tags. Blank overrides select the latest eligible published source and next unused target version.
3. Install the selected source resource and complete the relevant [release checklist](release-checklist.md). Record tested Home Assistant, browser and companion-app versions and unresolved issues in the release evidence provided by the maintainer.
4. Run the workflow with the selected tags and **preview_only** disabled. For stable, enable **installation_tested** after installing and testing the selected beta/RC.

Beta promotes Dev. RC promotes Dev, beta or an earlier RC. Stable promotes beta/RC with the same base version. Source eligibility requires an annotated main-backed tag, a published resource matching its evidence digest and a successful publication workflow. A release or tag existing alone does not establish success.

Promotion creates the target annotated tag with `Promoted-From` provenance and dispatches **Publish Release**. Publication rebuilds the exact source with the target version, runs checks, creates a draft, uploads the distribution, downloads and verifies the actual resource, then publishes. Dev, beta and RC remain prereleases; stable updates GitHub's latest release. Installation confirmation is required for stable publication, including recovery.

## Recover publication

Run **Publish Release** from current `main` with the existing **release_tag** and matching **source_tag**. For a Dev tag, leave **source_tag** empty. Recovery validates provenance and source evidence again. Existing distribution assets must match byte for byte and are never overwritten. Completion metadata can be refreshed to identify the successful recovery run. Conflicting assets require a new version.

## Release notes

Every pull request adds `.changes/<topic>.json`:

```json
{
  "type": "fixed",
  "summary": "Fixed room controls when devices become unavailable."
}
```

Use `new`, `improved`, `fixed`, `security`, or `internal`. Write one short user outcome, on one line, in 20 words or fewer. `internal` records consideration of changes that have no user-facing outcome and is omitted from published notes. CI validates new fragments in the pull request range. Candidate and stable notes include the complete range since the previous stable tag; the first release includes all fragments. Fragments remain tracked so published history can be reproduced.

## Refresh README screenshots

Build the current source, start the simulated preview, and capture the catalog and room controls:

```sh
npm run build
npm run dev
# In another terminal:
npm run screenshots:readme
```

With installed Chrome, set `NAVET_BROWSER_CHANNEL=chrome`. Set `NAVET_PREVIEW_PORT` for a different running preview port. Inspect all three images under `docs/images/` before submitting them. Screenshots show simulated devices and do not establish live Home Assistant acceptance.
