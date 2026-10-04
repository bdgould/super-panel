// Picks the version for the next release. Used by .github/workflows/release.yml.
//
// - No release tags yet: use package.json's version.
// - package.json is ahead of the latest tag (someone bumped minor/major in a
//   PR): use package.json's version.
// - Otherwise: bump the patch number of the latest tag.
//
// So every merge to main ships a patch release, and a PR that wants a minor
// or major release just raises "version" in package.json.

import { execFileSync } from 'child_process';
import { appendFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

function parse(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!match) throw new Error(`Not a plain x.y.z version: "${version}"`);
  return match.slice(1).map(Number);
}

function compare(a, b) {
  const [pa, pb] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function nextVersion(latestTag, packageVersion) {
  if (!latestTag) return parse(packageVersion).join('.');
  if (compare(packageVersion, latestTag) > 0) return parse(packageVersion).join('.');
  const [major, minor, patch] = parse(latestTag);
  return `${major}.${minor}.${patch + 1}`;
}

function latestReleaseTag() {
  const tags = execFileSync('git', ['tag', '--list', 'v*', '--sort=-v:refname'], { encoding: 'utf8' });
  return tags.split(/\r?\n/).find(tag => /^v\d+\.\d+\.\d+$/.test(tag)) || null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const version = nextVersion(latestReleaseTag(), pkg.version);
  console.log(version);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  }
}
