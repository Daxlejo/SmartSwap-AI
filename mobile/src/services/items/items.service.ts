import { apiClient, ApiError } from '@/services/http/apiClient';
import { compressImageToDataUrl } from '@/utils/imageCompressor';
import type { Item, ItemOwnerSummary } from '@/types';
import bikeImg from '@/assets/item-bike.svg';
import alexAvatar from '@/assets/avatar-alex.svg';

export type PrismaItemCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';

export interface ListItemsParams {
  query?: string;
  category?: string;
  condition?: string;
  ownerId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateItemPayload {
  name: string;
  category: string;
  condition: string;
  description?: string;
  estimatedValue?: number;
  location?: string;
  imageUrl?: string;
  images?: string[];
  wants: string[];
}

export interface UpdateItemPayload {
  name?: string;
  category?: string;
  condition?: string;
  description?: string;
  estimatedValue?: number;
  location?: string;
  imageUrl?: string;
  images?: string[];
  wants?: string[];
  status?: string;
}

export interface UploadImageResponse {
  url: string;
  imageUrl?: string;
  path?: string;
}

export interface RawItemDto {
  id: string;
  name: string;
  category: string;
  condition: string;
  ownerId: string;
  imageUrl?: string | null;
  images?: string[] | null;
  wants?: Array<string | { id?: string; queryText?: string; category?: string }> | null;
  description?: string | null;
  estimatedValue?: number | null;
  location?: string | null;
  status?: string | null;
  aiTags?: string[] | null;
  owner?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
    rating?: number;
    location?: string | null;
    verified?: boolean;
    co2SavedKg?: number;
  } | null;
  createdAt?: string | Date;
}

export interface PaginatedItemsEnvelope {
  data?: RawItemDto[];
  items?: RawItemDto[];
  total?: number;
  limit?: number;
  offset?: number;
}

const CONDITION_TO_DISPLAY: Record<string, string> = {
  NEW: 'Como nuevo',
  LIKE_NEW: 'Excelente estado',
  GOOD: 'Buen estado',
  FAIR: 'Buen estado',
  POOR: 'Para repuesto',
};

const DISPLAY_TO_PRISMA_CONDITION: Record<string, PrismaItemCondition> = {
  'como nuevo': 'NEW',
  'nuevo': 'NEW',
  'new': 'NEW',
  'excelente estado': 'LIKE_NEW',
  'like_new': 'LIKE_NEW',
  'buen estado': 'GOOD',
  'good': 'GOOD',
  'regular': 'FAIR',
  'fair': 'FAIR',
  'para repuesto': 'POOR',
  'poor': 'POOR',
  'colección': 'LIKE_NEW',
};

export const toDisplayCondition = (condition: string): string => {
  if (!condition) return 'Excelente estado';
  const upper = condition.trim().toUpperCase();
  if (CONDITION_TO_DISPLAY[upper]) {
    return CONDITION_TO_DISPLAY[upper];
  }
  return condition;
};

export const toBackendCondition = (condition: string): PrismaItemCondition => {
  if (!condition) return 'GOOD';
  const upper = condition.trim().toUpperCase();
  if (['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'].includes(upper)) {
    return upper as PrismaItemCondition;
  }
  const lower = condition.trim().toLowerCase();
  return DISPLAY_TO_PRISMA_CONDITION[lower] || 'GOOD';
};

export const normalizeItem = (raw: RawItemDto): Item => {
  const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];
  const primaryImage = raw.imageUrl || images[0] || bikeImg;

  const normalizedWants: string[] = Array.isArray(raw.wants)
    ? raw.wants
        .map((w) => {
          if (typeof w === 'string') return w;
          if (w && typeof w === 'object' && typeof w.queryText === 'string') {
            return w.queryText;
          }
          return '';
        })
        .filter((val) => val.trim().length > 0)
    : [];

  let ownerSummary: ItemOwnerSummary | undefined;
  if (raw.owner && typeof raw.owner === 'object') {
    ownerSummary = {
      id: raw.owner.id,
      name: raw.owner.name || 'Usuario SmartSwap',
      email: raw.owner.email,
      avatarUrl: raw.owner.avatarUrl || alexAvatar,
      rating: typeof raw.owner.rating === 'number' ? raw.owner.rating : 5.0,
      location: raw.owner.location || raw.location || 'Madrid, España',
      verified: typeof raw.owner.verified === 'boolean' ? raw.owner.verified : true,
      co2SavedKg: typeof raw.owner.co2SavedKg === 'number' ? raw.owner.co2SavedKg : 0,
    };
  }

  return {
    id: raw.id,
    name: raw.name,
    category: raw.category || 'Otros',
    condition: toDisplayCondition(raw.condition),
    ownerId: raw.ownerId,
    imageUrl: primaryImage,
    images: images.length > 0 ? images : [primaryImage],
    wants: normalizedWants,
    description: raw.description ?? undefined,
    estimatedValue: typeof raw.estimatedValue === 'number' ? raw.estimatedValue : undefined,
    location: raw.location ?? ownerSummary?.location ?? undefined,
    status: raw.status ?? 'AVAILABLE',
    aiTags: Array.isArray(raw.aiTags) ? raw.aiTags : undefined,
    owner: ownerSummary,
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : undefined,
  };
};

const extractItemsArray = (response: RawItemDto[] | PaginatedItemsEnvelope): Item[] => {
  if (Array.isArray(response)) {
    return response.map(normalizeItem);
  }
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) {
      return response.data.map(normalizeItem);
    }
    if (Array.isArray(response.items)) {
      return response.items.map(normalizeItem);
    }
  }
  return [];
};

export const itemsService = {
  async listItems(params?: ListItemsParams): Promise<Item[]> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params?.query) queryParams.query = params.query;
    if (params?.category && params.category !== 'Todos') queryParams.category = params.category;
    if (params?.condition && params.condition !== 'Todos') {
      queryParams.condition = params.condition;
    }
    if (params?.ownerId) queryParams.ownerId = params.ownerId;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;

    const response = await apiClient.get<RawItemDto[] | PaginatedItemsEnvelope>('/items', {
      params: queryParams,
    });
    return extractItemsArray(response);
  },

  async listMyItems(): Promise<Item[]> {
    const response = await apiClient.get<RawItemDto[] | PaginatedItemsEnvelope>('/items/me');
    return extractItemsArray(response);
  },

  async getItemById(id: string): Promise<Item> {
    const raw = await apiClient.get<RawItemDto>(`/items/${id}`);
    return normalizeItem(raw);
  },

  async uploadImage(dataUrlOrFile: string | File): Promise<string> {
    let base64DataUrl: string;
    if (typeof dataUrlOrFile === 'string') {
      base64DataUrl = dataUrlOrFile;
    } else {
      base64DataUrl = await compressImageToDataUrl(dataUrlOrFile);
    }

    try {
      const response = await apiClient.post<UploadImageResponse | { url?: string; imageUrl?: string }>(
        '/items/upload-image',
        {
          image: base64DataUrl,
          dataUrl: base64DataUrl,
          base64: base64DataUrl,
        },
      );
      const uploadedUrl = response?.url || response?.imageUrl;
      if (uploadedUrl) {
        return uploadedUrl;
      }
      return base64DataUrl;
    } catch (err) {
      // If the backend relies on inline base64 images inside POST /items instead of a dedicated upload endpoint
      if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 501)) {
        return base64DataUrl;
      }
      throw err;
    }
  },

  async createItem(payload: CreateItemPayload): Promise<Item> {
    const imagesList =
      payload.images && payload.images.length > 0
        ? payload.images
        : payload.imageUrl
          ? [payload.imageUrl]
          : [];
    const primaryImage = payload.imageUrl || imagesList[0] || bikeImg;

    const body = {
      name: payload.name.trim(),
      category: payload.category,
      condition: toBackendCondition(payload.condition),
      description: payload.description?.trim() || undefined,
      estimatedValue: payload.estimatedValue,
      location: payload.location?.trim() || undefined,
      imageUrl: primaryImage,
      images: imagesList.length > 0 ? imagesList : [primaryImage],
      wants: payload.wants,
    };

    try {
      const raw = await apiClient.post<RawItemDto>('/items', body);
      return normalizeItem(raw);
    } catch (err) {
      // If backend schema expects display condition string instead of enum, retry with original condition
      if (err instanceof ApiError && err.statusCode === 400 && payload.condition !== body.condition) {
        const retryBody = { ...body, condition: payload.condition };
        const raw = await apiClient.post<RawItemDto>('/items', retryBody);
        return normalizeItem(raw);
      }
      throw err;
    }
  },

  async updateItem(id: string, payload: UpdateItemPayload): Promise<Item> {
    const body: Record<string, unknown> = { ...payload };
    if (payload.condition) {
      body.condition = toBackendCondition(payload.condition);
    }

    const raw = await apiClient.patch<RawItemDto>(`/items/${id}`, body);
    return normalizeItem(raw);
  },

  async deleteItem(id: string): Promise<void> {
    await apiClient.del<void>(`/items/${id}`);
  },
};

export default itemsService;
