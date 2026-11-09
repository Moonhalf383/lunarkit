import { readFileSync } from 'node:fs';

const metadata = JSON.parse(readFileSync('package.json', 'utf8'));
if (process.env.APPROVED_VERSION !== metadata.version) throw new Error('Approved version must match package.json.');
if (!metadata.repository || !metadata.homepage || !metadata.bugs) throw new Error('Configure repository, homepage and bugs before publishing.');
if (metadata.version.includes('-') && process.env.DIST_TAG === 'latest') throw new Error('Prerelease versions use a preview distribution tag.');
if (metadata.license !== 'MIT') throw new Error('Review the approved package license.');
