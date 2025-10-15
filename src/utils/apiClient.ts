/**
 * Enhanced API Client
 * Improved version with better error handling, typing, and interceptors
 * @version 0.8.0
 */

import { AppError, parseApiError } from './errorHandler';
import { API_CONFIG, STORAGE_KEYS } from '../constants/appConstants';
import { sessionManager } from './sessionManager';

// ========== Types ==========
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  skipAuth?: boolean;
}

// ========== Token Management ==========
class TokenManager {
  private static readonly TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static hasToken(): boolean {
    return !!this.getToken();
  }
}

// ========== API Client ==========
class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private onUnauthorized: (() => void) | null = null;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    this.defaultTimeout = API_CONFIG.TIMEOUT;
  }

  /**
   * Set callback for unauthorized (401/403) responses
   */
  setUnauthorizedCallback(callback: () => void): void {
    this.onUnauthorized = callback;
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(path: string, params?: Record<string, string | number | boolean>): string {
    const url = `${this.baseURL}${path}`;
    
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });

    return `${url}?${searchParams.toString()}`;
  }

  /**
   * Build headers for request
   */
  private buildHeaders(config: RequestConfig): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((config.headers as Record<string, string>) || {}),
    };

    if (!config.skipAuth) {
      const token = TokenManager.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    config: RequestConfig
  ): Promise<Response> {
    const timeout = config.timeout || this.defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError('Request timeout', 'TIMEOUT', 408);
      }
      
      throw error;
    }
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type') || '';
    const isJSON = contentType.includes('application/json');

    let data: unknown;
    try {
      data = isJSON ? await response.json() : await response.text();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || response.statusText;
      throw new AppError(
        errorMessage,
        'API_ERROR',
        response.status,
        data
      );
    }

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  }

  /**
   * Main request method
   */
  async request<T = any>(
    path: string,
    config: RequestConfig = {}
  ): Promise<T> {
    // Notify session manager of API activity (resets inactivity timer)
    try {
      sessionManager.notifyApiCall();
    } catch (error) {
      // Silently fail - don't break API calls if session manager isn't initialized
      console.debug('[API] Session manager notification skipped');
    }

    try {
      const url = this.buildURL(path, config.params);
      const headers = this.buildHeaders(config);

      const response = await this.fetchWithTimeout(url, {
        ...config,
        headers,
      });

      const result = await this.handleResponse<T>(response);
      return result.data;
    } catch (error: unknown) {
      // Handle token expiration - ONLY on auth endpoints
      // Don't force logout on 403 (permission denied) or non-auth 401s
      if (error instanceof AppError && error.statusCode === 401) {
        // Only auto-logout if this is an authentication error (not permission or other API errors)
        if (path.includes('/auth/') || path.includes('/users/me')) {
          console.error('[API] Authentication failed, logging out user');
          TokenManager.removeToken();
          
          // Trigger logout callback if set
          if (this.onUnauthorized) {
            this.onUnauthorized();
          }
        } else {
          console.warn('[API] 401 error on non-auth endpoint, not forcing logout:', path);
        }
      }

      throw error;
    }
  }

  // ========== Convenience Methods ==========
  get<T = unknown>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  post<T = unknown>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T = unknown>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch<T = unknown>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T = any>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  /**
   * Upload file with form data
   */
  async upload<T = any>(
    path: string,
    data: Record<string, any>,
    file: File,
    fileFieldName: string = 'file',
    method: 'POST' | 'PUT' = 'POST'
  ): Promise<T> {
    try {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      // Add file
      formData.append(fileFieldName, file);

      const token = TokenManager.getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${path}`, {
        method,
        headers,
        body: formData,
      });

      const result = await this.handleResponse<T>(response);
      return result.data;
    } catch (error: unknown) {
      // Handle token expiration - ONLY on auth endpoints
      if (error instanceof AppError && error.statusCode === 401) {
        // Only auto-logout if this is an authentication error
        if (path.includes('/auth/') || path.includes('/users/me')) {
          console.error('[API] Authentication failed in upload, logging out user');
          TokenManager.removeToken();
          
          // Trigger logout callback if set
          if (this.onUnauthorized) {
            this.onUnauthorized();
          }
        } else {
          console.warn('[API] 401 error on upload to non-auth endpoint, not forcing logout:', path);
        }
      }

      throw error;
    }
  }
}

// ========== Export Singleton Instance ==========
export const apiClient = new ApiClient();
export { TokenManager };

