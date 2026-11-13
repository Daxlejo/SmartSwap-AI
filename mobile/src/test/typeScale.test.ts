import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard for the type scale (tailwind.config.ts): no text under 14 px and no
 * single-line ellipsis on names. The runtime check is `npm run audit:ui`;
 * this catches the classes before they reach a screen.
 */
const SRC = join(__dirname, '..');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });

const findAll = (pattern: RegExp): string[] =>
  sourceFiles(SRC).flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        pattern.test(line) ? [`${relative(SRC, file)}:${index + 1}: ${line.trim()}`] : [],
      ),
  );

describe('type scale guard', () => {
  it('never uses text-xs, with or without a variant prefix (sm:, hover:, !)', () => {
    expect(findAll(/(^|[\s"'`:!])text-xs\b/)).toEqual([]);
  });

  it('defines no font size under 14 px in the Tailwind theme', () => {
    const config = readFileSync(join(SRC, '..', 'tailwind.config.ts'), 'utf8');
    const sizes = [...config.matchAll(/\['(\d+)px', \{ lineHeight/g)].map((match) => Number(match[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.filter((size) => size < 14)).toEqual([]);
  });

  it('never uses an arbitrary font size under 14 px', () => {
    expect(findAll(/\btext-\[(?:[0-9]|1[0-3])(?:\.\d+)?px\]/)).toEqual([]);
  });

  it('never cuts text to one line with truncate (use line-clamp-2)', () => {
    expect(findAll(/(^|[\s"'`:!])truncate\b/)).toEqual([]);
  });
});
