import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiErrorResponse } from '@/lib/types/auth';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://recook.yogawanadityapratama.com';
const TOKEN_STORAGE_KEY = 'pirinku_auth_token';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token to requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    // Handle 401 Unauthorized - Clear token and redirect to login
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      // Note: Navigation should be handled in the component/store
    }

    // Extract error message
    const errorMessage =
      error.response?.data?.message || error.message || 'An unexpected error occurred';

    return Promise.reject(new Error(errorMessage));
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
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  },

  async hasToken(): Promise<boolean> {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    return token !== null;
  },
};

export default apiClient;
