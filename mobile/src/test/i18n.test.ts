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
    expect(i18n.t('home.activeRoutes.circuits', { count: 1 })).toBe('1 circuito');
    expect(i18n.t('home.activeRoutes.circuits', { count: 3 })).toBe('3 circuitos');
    await i18n.changeLanguage('en');
    expect(i18n.t('home.activeRoutes.circuits', { count: 3 })).toBe('3 circuits');
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
});
