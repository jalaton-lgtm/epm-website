// Ported from design_handoff_epm_brand/brand-tokens.jsx → BRAND.contexts
// Category → accent color mapping. A blog post's `category` frontmatter
// field selects one of these; `photo: true` on a post just adds the photo
// badge alongside the category badge (per EP's confirmation — photo posts
// keep their category color, they don't get a separate neutral treatment).

export interface CategoryMeta {
  key: string;
  label: string;      // English label
  labelFi: string;     // Finnish label
  cssVar: string;      // CSS custom property holding the true brand accent color
  dotVar: string;      // CSS custom property to use for small dots against --bg
                        // (lightened for categories that fail 3:1 contrast otherwise)
  chipTextOnColor: 'light' | 'dark'; // text color needed on the chip background
                                      // to clear 4.5:1 (verified per-category; only
                                      // Race Day needs 'dark', all others 'light')
}

export const CATEGORIES: Record<string, CategoryMeta> = {
  competition: {
    key: "competition",
    label: "COMPETITION",
    labelFi: "KILPAILU",
    cssVar: "--accent-competition",
    dotVar: "--accent-competition",
    chipTextOnColor: 'light',
  },
  raceday: {
    key: "raceday",
    label: "RACE DAY",
    labelFi: "KILPAPÄIVÄ",
    cssVar: "--accent-raceday",
    dotVar: "--accent-raceday",
    chipTextOnColor: 'dark', // white-on-orange measured 3.59:1 — fails AA
  },
  training: {
    key: "training",
    label: "TRAINING",
    labelFi: "HARJOITTELU",
    cssVar: "--accent-training",
    dotVar: "--accent-training-ondark", // original measured 2.48:1 vs --bg — fails
    chipTextOnColor: 'light',
  },
  commercial: {
    key: "commercial",
    label: "COMMERCIAL",
    labelFi: "YHTEISTYÖ",
    cssVar: "--accent-commercial",
    dotVar: "--accent-commercial-ondark", // original measured 2.54:1 vs --bg — fails
    chipTextOnColor: 'light',
  },
  personal: {
    key: "personal",
    label: "PERSONAL",
    labelFi: "HENKILÖKOHTAINEN",
    cssVar: "--accent-personal",
    dotVar: "--accent-personal-ondark",
    chipTextOnColor: 'light',
  },
};

export function getCategory(key: string): CategoryMeta {
  return CATEGORIES[key] ?? CATEGORIES.personal;
}
