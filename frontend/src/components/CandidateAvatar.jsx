import { useEffect, useMemo, useState } from 'react';

/**
 * CandidateAvatar
 *
 * Renders a candidate's avatar without ever showing a broken image icon.
 * GitHub avatar URLs fail for a lot of ordinary reasons: the account has no
 * profile picture, the CDN is blocked or rate limited, the visitor is offline,
 * or the stored URL is simply an empty string. A raw <img> in those cases leaves
 * the browser's torn-page glyph sitting in the middle of the layout.
 *
 * Behaviour:
 *  - no `src` (null / undefined / blank)  -> straight to the fallback
 *  - `src` fails to load (onError)        -> swaps to the fallback, permanently
 *  - `src` loads                          -> the image, with the name as alt text
 *  - no usable initials                   -> a clean inline SVG person glyph
 *
 * The fallback background is derived deterministically from an FNV-1a hash of the
 * seed (username, when available) so a given candidate always gets the same
 * colour, and different candidates get visibly different colours.
 */

/** Deterministic 32-bit FNV-1a hash. */
const hashString = (value) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

/**
 * Palette drawn from the app's design tokens (see tailwind.config.js) so the
 * generated colours stay on-brand instead of introducing arbitrary hues.
 */
const PALETTE = [
  { bg: '#EBF3FA', fg: '#185FA5' }, // primary.subtle / primary
  { bg: '#E6F4F0', fg: '#0F6E56' }, // secondary.subtle / secondary
  { bg: '#FCEFEA', fg: '#D85A30' }, // accent.subtle / accent
  { bg: '#EFF7E6', fg: '#4E7B1A' }, // success.subtle / success.dark
  { bg: '#FDF5E8', fg: '#B26F0A' }, // warning.subtle / warning
  { bg: '#F1EFE8', fg: '#5F5E5A' }, // surface / text-body
];

const pickPalette = (seed) => {
  if (!seed) return PALETTE[PALETTE.length - 1];
  return PALETTE[hashString(seed) % PALETTE.length];
};

/**
 * Build up to two initials from a display name.
 *
 * The naive `name.slice(0, 2)` breaks on non-Latin names (a CJK name yields two
 * full-width glyphs that blow out the badge) and `name[0]` can yield an empty
 * string for names made only of separators or emoji.
 *
 * Exported for reuse and testing.
 */
export const buildInitials = (name) => {
  const cleaned = String(name ?? '')
    // Keep letters, marks and digits from any script; drop punctuation,
    // separators, symbols and emoji so they cannot render as blank initials.
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();

  if (!cleaned) return '';

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length === 0) return '';

  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : '';

  return (first + last).toUpperCase();
};

/** Size -> box dimensions, fallback text size and glyph size. */
const SIZES = {
  xs: { box: 'w-7 h-7', text: 'text-[10px]', glyph: 'w-3.5 h-3.5' },
  sm: { box: 'w-9 h-9', text: 'text-xs', glyph: 'w-5 h-5' },
  md: { box: 'w-12 h-12', text: 'text-sm', glyph: 'w-6 h-6' },
  lg: { box: 'w-16 h-16', text: 'text-xl', glyph: 'w-7 h-7' },
  xl: { box: 'w-20 h-20', text: 'text-2xl', glyph: 'w-9 h-9' },
};

/** Clean inline person glyph, used when no initials can be derived. */
const PersonGlyph = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.418 0-8 2.239-8 5v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1c0-2.761-3.582-5-8-5Z" />
  </svg>
);

export default function CandidateAvatar({
  src,
  name = '',
  username = '',
  size = 'md',
  rounded = 'rounded-2xl',
  className = '',
  textClassName = '',
}) {
  const [failed, setFailed] = useState(false);

  // A new candidate means a new src; give the image another chance to load.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const trimmedSrc = typeof src === 'string' ? src.trim() : '';
  const showImage = trimmedSrc.length > 0 && !failed;

  const initials = useMemo(() => buildInitials(name) || buildInitials(username), [name, username]);
  const palette = useMemo(() => pickPalette(username || name), [username, name]);
  const scale = SIZES[size] ?? SIZES.md;

  const label = name || username || 'Candidate avatar';

  if (showImage) {
    return (
      <img
        src={trimmedSrc}
        alt={label}
        title={label}
        onError={() => setFailed(true)}
        className={`${scale.box} ${rounded} object-cover border border-border shrink-0 bg-surface ${className}`}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`${scale.box} ${rounded} shrink-0 flex items-center justify-center font-black select-none overflow-hidden ${className}`}
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      {initials ? (
        <span className={`${textClassName || scale.text} leading-none`}>{initials}</span>
      ) : (
        <PersonGlyph className={scale.glyph} />
      )}
    </span>
  );
}