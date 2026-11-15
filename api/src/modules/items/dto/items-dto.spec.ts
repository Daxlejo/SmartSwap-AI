import { createItemSchema } from './create-item.dto';
import { queryItemsSchema } from './query-items.dto';
import { updateItemSchema } from './update-item.dto';

const validItem = {
  name: 'Control PS5 nuevo',
  category: 'Videojuegos',
  condition: 'LIKE_NEW',
  description: 'Control DualSense blanco, sin uso, con su caja.',
  estimatedValue: 280000,
  images: ['https://example.com/control.jpg'],
  wants: ['Audífonos'],
};

describe('Item DTO limits', () => {
  it('accepts a title of exactly 60 characters and a description of exactly 500', () => {
    const result = createItemSchema.safeParse({
      ...validItem,
      name: 'a'.repeat(60),
      description: 'b'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('rejects a title longer than 60 characters', () => {
    const result = createItemSchema.safeParse({ ...validItem, name: 'a'.repeat(61) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['name']);
  });

  it('rejects a description longer than 500 characters', () => {
    const result = createItemSchema.safeParse({
      ...validItem,
      description: 'b'.repeat(501),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['description']);
  });

  it('applies the same limits when updating an item', () => {
    expect(updateItemSchema.safeParse({ name: 'a'.repeat(61) }).success).toBe(false);
    expect(updateItemSchema.safeParse({ description: 'b'.repeat(501) }).success).toBe(false);
    expect(updateItemSchema.safeParse({ name: 'a'.repeat(60) }).success).toBe(true);
  });
});

describe('Item query price range', () => {
  it('coerces minPrice and maxPrice from the query string', () => {
    const result = queryItemsSchema.parse({ minPrice: '200000', maxPrice: '400000' });
    expect(result.minPrice).toBe(200000);
    expect(result.maxPrice).toBe(400000);
  });

  it('rejects a negative or fractional price', () => {
    expect(queryItemsSchema.safeParse({ minPrice: '-1' }).success).toBe(false);
    expect(queryItemsSchema.safeParse({ maxPrice: '1500.5' }).success).toBe(false);
  });

  it('rejects a range whose minimum is above its maximum', () => {
    const result = queryItemsSchema.safeParse({ minPrice: '500000', maxPrice: '100000' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['minPrice']);
  });
});
