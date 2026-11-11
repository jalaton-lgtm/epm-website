// Posts for the homepage Instagram strip, from src/data/instagram.json.
//
// That file is gitignored build output from scripts/fetch-instagram.mjs, so
// it is read with node:fs behind existsSync rather than imported: an import
// of a missing file would fail the build. Missing or unreadable → [].
//
// Shared by InstagramStrip.astro and the two homepages, which number the
// Partners section after it (04 with the strip, 03 without).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface InstagramPost {
  id: string;
  href: string;
  src: string;
  width: number | null;
  height: number | null;
  alt: string;
}

export function getInstagramPosts(): InstagramPost[] {
  const file = join(process.cwd(), 'src/data/instagram.json');
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
