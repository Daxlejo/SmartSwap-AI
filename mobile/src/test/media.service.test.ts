import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/http/apiClient';
import { itemsService, normalizeItem } from '@/services/items/items.service';
import { authService } from '@/services/auth/auth.service';

describe('media services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uploadImage returns the stored URL', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ url: 'https://cdn/x.jpg' });
    await expect(itemsService.uploadImage('data:image/jpeg;base64,AAAA')).resolves.toBe(
      'https://cdn/x.jpg',
    );
    expect(post).toHaveBeenCalledWith('/items/upload-image', {
      imageBase64: 'data:image/jpeg;base64,AAAA',
    });
  });

  it('uploadImage never falls back to the raw data URL', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({});
    await expect(itemsService.uploadImage('data:image/jpeg;base64,AAAA')).rejects.toThrow();

    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('network down'));
    await expect(itemsService.uploadImage('data:image/jpeg;base64,AAAA')).rejects.toThrow(
      'network down',
    );
  });

  it('normalizeItem leaves imageUrl empty instead of inventing a stock photo', () => {
    const item = normalizeItem({
      id: 'i1',
      name: 'Guitarra',
      category: 'Música',
      condition: 'GOOD',
      ownerId: 'u1',
      images: [],
      wants: [],
    } as unknown as Parameters<typeof normalizeItem>[0]);
    expect(item.imageUrl).toBeUndefined();
    expect(item.images).toEqual([]);
  });

  it('uploadAvatar posts the photo and returns the normalized profile', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      id: 'u1',
      name: 'Alex Rivera',
      email: 'a@b.co',
      avatarUrl: 'https://cdn/avatars/u1/a.jpg',
    });
    const user = await authService.uploadAvatar('data:image/jpeg;base64,BBBB');
    expect(post).toHaveBeenCalledWith('/users/me/avatar', {
      imageBase64: 'data:image/jpeg;base64,BBBB',
    });
    expect(user.avatarUrl).toBe('https://cdn/avatars/u1/a.jpg');
  });
});
