import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiErrorResponse } from '@/lib/types/auth';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://recook.yogawanadityapratama.com';
const TOKEN_STORAGE_KEY = 'pirinku_auth_token';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TIMEOUT_MS = 30000; // 30 seconds

// Type for config with retry metadata
type ConfigWithMetadata = InternalAxiosRequestConfig & {
  metadata?: { retryCount: number };
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token to requests
apiClient.interceptors.request.use(
  async (config: ConfigWithMetadata) => {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Initialize retry count
    if (!config.metadata) {
      config.metadata = { retryCount: 0 };
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally with retry logic
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as ConfigWithMetadata;
    
    // Handle 401 Unauthorized - Clear token and redirect to login
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      // Note: Navigation should be handled in the component/store
    }

    // Determine if error is retryable
    const isRetryable =
      !error.response || // Network error
      error.response.status === 408 || // Request timeout
      error.response.status === 429 || // Too many requests
      error.response.status === 500 || // Server error
      error.response.status === 502 || // Bad gateway
      error.response.status === 503 || // Service unavailable
      error.response.status === 504; // Gateway timeout

    const retryCount = config?.metadata?.retryCount || 0;

    if (isRetryable && retryCount < MAX_RETRIES) {
      if (config) {
        config.metadata = { retryCount: retryCount + 1 };
      }
      console.warn(
        `🔄 [API] Retrying request (${retryCount + 1}/${MAX_RETRIES}): ${config?.method?.toUpperCase()} ${config?.url}`
      );
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return apiClient(config as InternalAxiosRequestConfig);
    }

    // Extract detailed error message
    const statusCode = error.response?.status;
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message;
    
    const detailedError = new Error(
      `[${statusCode || 'NETWORK'}] ${errorMessage || 'Network request failed'}`
    ) as Error & { 
      code?: string;
      status?: number;
      originalError?: AxiosError;
    };
    
    detailedError.code = error.code;
    detailedError.status = statusCode;
    detailedError.originalError = error;

    console.error('❌ [API Error]', {
      status: statusCode,
      message: errorMessage,
      code: error.code,
      url: config?.url,
      method: config?.method,
      retries: retryCount,
    });

    return Promise.reject(detailedError);
  },
);

// Token management utilities
export const TokenStorage = {
  async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  },

  async removeToken(): Promise<void> {
    console.log('🗑️ [TokenStorage] Removing JWT token from storage...');
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  },

  async hasToken(): Promise<boolean> {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    return token !== null;
  },
};

export default apiClient;
