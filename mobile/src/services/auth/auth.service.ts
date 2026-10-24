import { apiClient, ApiError } from '@/services/http/apiClient';
import { tokenStorage } from '@/services/storage/tokenStorage';
import type { User } from '@/types';
import alexAvatar from '@/assets/avatar-alex.svg';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  location?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  location?: string;
  avatarUrl?: string;
}

export interface RawUserDto {
  id: string;
  name: string;
  email: string;
  initials?: string;
  avatarUrl?: string | null;
  location?: string | null;
  level?: number;
  rating?: number;
  tradesCompleted?: number;
  co2SavedKg?: number;
  verified?: boolean;
  createdAt?: string | Date;
}

export interface RawAuthResponse {
  accessToken: string;
  refreshToken?: string;
  token?: string;
  user: RawUserDto;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export const normalizeUser = (raw: RawUserDto): User => {
  const name = raw.name || 'Usuario SmartSwap';
  const parts = name.trim().split(/\s+/);
  const computedInitials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return {
    id: raw.id,
    name,
    email: raw.email,
    initials: raw.initials || computedInitials,
    avatarUrl: raw.avatarUrl || alexAvatar,
    location: raw.location || 'Madrid, España',
    level: typeof raw.level === 'number' ? raw.level : 1,
    rating: typeof raw.rating === 'number' ? raw.rating : 5.0,
    tradesCompleted: typeof raw.tradesCompleted === 'number' ? raw.tradesCompleted : 0,
    co2SavedKg: typeof raw.co2SavedKg === 'number' ? raw.co2SavedKg : 0,
    verified: typeof raw.verified === 'boolean' ? raw.verified : true,
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : undefined,
  };
};

export const authService = {
  async login(emailOrPayload: string | LoginPayload, maybePassword?: string): Promise<AuthSession> {
    const payload: LoginPayload =
      typeof emailOrPayload === 'string'
        ? { email: emailOrPayload.trim(), password: maybePassword || '' }
        : { email: emailOrPayload.email.trim(), password: emailOrPayload.password };

    const response = await apiClient.post<RawAuthResponse>('/auth/login', payload, {
      skipAuth: true,
    });

    const accessToken = response.accessToken || response.token || '';
    if (accessToken) {
      tokenStorage.setToken(accessToken);
    }
    if (response.refreshToken) {
      tokenStorage.setRefreshToken(response.refreshToken);
    }

    const user = normalizeUser(response.user);
    return {
      accessToken,
      refreshToken: response.refreshToken,
      user,
    };
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const body: RegisterPayload = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      password: payload.password,
      ...(payload.location?.trim() ? { location: payload.location.trim() } : {}),
    };

    const response = await apiClient.post<RawAuthResponse>('/auth/register', body, {
      skipAuth: true,
    });

    const accessToken = response.accessToken || response.token || '';
    if (accessToken) {
      tokenStorage.setToken(accessToken);
    }
    if (response.refreshToken) {
      tokenStorage.setRefreshToken(response.refreshToken);
    }

    const user = normalizeUser(response.user);
    return {
      accessToken,
      refreshToken: response.refreshToken,
      user,
    };
  },

  async getMe(): Promise<User> {
    try {
      const raw = await apiClient.get<RawUserDto>('/auth/me');
      return normalizeUser(raw);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        const rawFallback = await apiClient.get<RawUserDto>('/users/me');
        return normalizeUser(rawFallback);
      }
      throw err;
    }
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const raw = await apiClient.patch<RawUserDto>('/users/me', payload);
    return normalizeUser(raw);
  },

  logout(): void {
    tokenStorage.clearToken();
  },
};

export default authService;
