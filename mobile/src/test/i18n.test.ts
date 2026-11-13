import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import i18n from '@/i18n';
import { es } from '@/i18n/es';
import { en } from '@/i18n/en';

type Tree = { [key: string]: string | Tree };

const flattenKeys = (tree: Tree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flattenKeys(value, `${prefix}${key}.`),
  );

describe('i18n', () => {
  afterEach(async () => {
    await i18n.changeLanguage('es');
  });

  it('starts in Spanish by default', () => {
    expect(i18n.language).toBe('es');
    expect(i18n.t('nav.home')).toBe('Inicio');
  });

  it('switches to English on demand', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('nav.home')).toBe('Home');
    expect(i18n.t('home.greeting', { name: 'Alex' })).toBe('Hi, Alex');
  });

  it('resolves plurals in both languages', async () => {
    expect(i18n.t('home.activeRoutes.circuits', { count: 1 })).toBe('1 ruta en curso');
    expect(i18n.t('home.activeRoutes.circuits', { count: 3 })).toBe('3 rutas en curso');
    await i18n.changeLanguage('en');
    expect(i18n.t('home.activeRoutes.circuits', { count: 3 })).toBe('3 routes in progress');
  });

  it('translates catalog values while keeping the stored Spanish value as the key', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('catalog.categories.Tecnología')).toBe('Technology');
    expect(i18n.t('catalog.conditions.Como nuevo')).toBe('Like new');
  });

  it('defines exactly the same keys in Spanish and English', () => {
    expect(flattenKeys(en as Tree).sort()).toEqual(flattenKeys(es as Tree).sort());
  });

  it('has no empty translations', () => {
    const emptyKeys = [es, en].flatMap((tree) => {
      const keys = flattenKeys(tree as Tree);
      return keys.filter((key) => {
        const value = key.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part], tree as Tree);
        return typeof value === 'string' && value.trim() === '';
      });
    });
    expect(emptyKeys).toEqual([]);
  });

  it('defines every literal key the code asks for', () => {
    // t('some.key'), t("some.key") and t(`some.key`) calls with a plain literal (no interpolation)
    const KEY_CALL = new RegExp(String.raw`\bt\((['"\x60])([a-zA-Z0-9_.]+)\1`, 'g');
    const sourceFiles = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return name === 'test' || name === 'i18n' ? [] : sourceFiles(path);
        return /\.tsx?$/.test(name) ? [path] : [];
      });
    const keys = new Set(
      sourceFiles(join(__dirname, '..')).flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(KEY_CALL)].map((match) => match[2]),
      ),
    );
    const defined = new Set(flattenKeys(es as Tree));
    const missing = [...keys].filter(
      (key) => !defined.has(key) && !defined.has(`${key}_one`) && !defined.has(`${key}_other`),
    );
    expect(missing).toEqual([]);
  });
});
