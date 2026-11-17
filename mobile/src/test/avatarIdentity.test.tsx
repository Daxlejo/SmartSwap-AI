import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '@/i18n';
import { Avatar } from '@/components/ui/Avatar';
import { ItemImage } from '@/components/ui/ItemImage';
import { avatarColorFor, hashSeed, initialsFor } from '@/utils/avatarIdentity';
import { categoryIcon, itemIcon } from '@/utils/categoryIcon';

describe('avatar identity', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsFor('Valeria Gómez Ruiz')).toBe('VG');
    expect(initialsFor('  alex  ')).toBe('A');
    expect(initialsFor('Ángela ñandú')).toBe('ÁÑ');
    expect(initialsFor('')).toBe('');
  });

  it('gives the same person the same colour every time', () => {
    expect(hashSeed('user-1')).toBe(hashSeed(' USER-1 '));
    expect(avatarColorFor('user-1')).toBe(avatarColorFor('user-1'));
  });

  it('spreads different people over several colours', () => {
    const ids = ['u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'u-6', 'u-7', 'u-8', 'u-9', 'u-10'];
    expect(new Set(ids.map(avatarColorFor)).size).toBeGreaterThan(3);
  });

  it('shows initials instead of an illustration when there is no photo', () => {
    const html = renderToStaticMarkup(<Avatar alt="Mateo Vargas" seed="u-3" />);
    expect(html).toContain('data-testid="avatar-initials"');
    expect(html).toContain('>MV<');
    expect(html).toContain(`background-color:${avatarColorFor('u-3')}`);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('svg+xml');
  });

  it('shows the photo when there is one', () => {
    const html = renderToStaticMarkup(<Avatar alt="Mateo" src="https://example.com/m.jpg" />);
    expect(html).toContain('src="https://example.com/m.jpg"');
    expect(html).not.toContain('avatar-initials');
  });
});

describe('item placeholder icon', () => {
  it('follows what the item is before its category', () => {
    expect(itemIcon('Bicicleta de montaña Trek', 'Deportes')).toBe('pedal_bike');
    expect(itemIcon('Mochila Totto Dayhike', 'Hogar')).toBe('backpack');
    expect(itemIcon('Cafetera Oster', 'Hogar')).toBe('coffee_maker');
    expect(itemIcon('Control PS5 nuevo', 'Videojuegos')).toBe('sports_esports');
    expect(itemIcon('iPhone 12', 'Tecnología')).toBe('smartphone');
  });

  it('falls back to the category, and never shows a ball or a sofa for a whole category', () => {
    expect(itemIcon('Algo raro', 'Deportes')).toBe('directions_run');
    expect(itemIcon('Algo raro', 'Hogar')).toBe('home');
    expect(itemIcon(undefined, undefined)).toBe('inventory_2');
    expect(categoryIcon('Deportes')).not.toBe('sports_soccer');
    expect(categoryIcon('Hogar')).not.toBe('chair');
  });

  it('uses the photo when there is one and the item icon when there is not', () => {
    const withPhoto = renderToStaticMarkup(
      <ItemImage src="https://example.com/bike.jpg" alt="" itemName="Bicicleta" category="Deportes" />,
    );
    expect(withPhoto).toContain('<img');
    const withoutPhoto = renderToStaticMarkup(
      <ItemImage alt="" itemName="Mochila Totto" category="Hogar" />,
    );
    expect(withoutPhoto).toContain('backpack');
    expect(withoutPhoto).toContain('aria-hidden="true"');
  });
});
