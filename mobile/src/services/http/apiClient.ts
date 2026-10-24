import { env } from '@/config/env';
import { tokenStorage } from '@/services/storage/tokenStorage';

export interface NestErrorEnvelope {
  statusCode: number;
  error?: string;
  message?: string | string[];
  timestamp?: string;
  path?: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly error: string;
  public readonly details?: string[];
  public readonly path?: string;
  public readonly timestamp?: string;

  constructor(params: {
    statusCode: number;
    message: string;
    error?: string;
    details?: string[];
    path?: string;
    timestamp?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.statusCode = params.statusCode;
    this.error = params.error || 'Error';
    this.details = params.details;
    this.path = params.path;
    this.timestamp = params.timestamp;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

type UnauthorizedHandler = () => void;
let onUnauthorizedCallback: UnauthorizedHandler | null = null;

export const setOnUnauthorizedHandler = (handler: UnauthorizedHandler | null): void => {
  onUnauthorizedCallback = handler;
};

const buildUrl = (
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string => {
  const baseUrl = env.apiUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`;

  if (!params) {
    return fullUrl;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) {
    return fullUrl;
  }

  return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${queryString}`;
};

const parseResponseError = async (response: Response): Promise<ApiError> => {
  let payload: Partial<NestErrorEnvelope> | null = null;

  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = (await response.json()) as Partial<NestErrorEnvelope>;
    } else {
      const text = await response.text();
      if (text) {
        payload = { message: text };
      }
    }
  } catch {
    // Fallback if body is not valid JSON
  }

  const statusCode = payload?.statusCode ?? response.status;
  const rawMessage = payload?.message;
  const details = Array.isArray(rawMessage) ? rawMessage : undefined;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(', ')
    : typeof rawMessage === 'string' && rawMessage.trim().length > 0
      ? rawMessage
      : response.statusText || `HTTP Error ${statusCode}`;

  return new ApiError({
    statusCode,
    message,
    error: payload?.error || response.statusText || 'ApiError',
    details,
    path: payload?.path,
    timestamp: payload?.timestamp,
  });
};

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { params, skipAuth = false, headers: customHeaders, ...restOptions } = options;
  const url = buildUrl(endpoint, params);

  const headers = new Headers(customHeaders);

  if (!skipAuth) {
    const token = tokenStorage.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
      ...restOptions,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'No se pudo conectar con el servidor. Verifica tu conexión.';
    throw new ApiError({
      statusCode: 0,
      message,
      error: 'NetworkError',
    });
  }

  if (!response.ok) {
    const apiError = await parseResponseError(response);

    if (response.status === 401) {
      tokenStorage.clearToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('smartswap:unauthorized'));
      }
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    throw apiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const apiClient = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', endpoint, undefined, options);
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', endpoint, body, options);
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PATCH', endpoint, body, options);
  },

  del<T = void>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', endpoint, undefined, options);
  },

  delete<T = void>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', endpoint, undefined, options);
  },
};

export default apiClient;
