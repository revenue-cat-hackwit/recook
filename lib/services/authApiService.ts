import apiClient, { TokenStorage } from './apiClient';
import {
    CreateAccountRequest,
    CreateAccountResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
    LoginRequest,
    LoginResponse,
    ResendOTPRequest,
    ResendOTPResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
} from '@/lib/types/auth';

export const AuthApiService = {
    /**
     * Create a new account
     * POST /api/auth/create-account
     */
    async createAccount(
        username: string,
        fullName: string,
        email: string,
        password: string
    ): Promise<CreateAccountResponse> {
        const response = await apiClient.post<CreateAccountResponse>('/api/auth/create-account', {
            username,
            fullName,
            email,
            password,
        } as CreateAccountRequest);
        return response.data;
    },

    /**
     * Verify OTP after account creation
     * POST /api/auth/verify-otp
     */
    async verifyOTP(email: string, otp: string): Promise<VerifyOTPResponse> {
        const response = await apiClient.post<VerifyOTPResponse>('/api/auth/verify-otp', {
            email,
            otp,
        } as VerifyOTPRequest);

        // Save token to storage
        if (response.data.success && response.data.data.token) {
            await TokenStorage.saveToken(response.data.data.token);
        }

        return response.data;
    },

    /**
     * Login with email and password
     * POST /api/auth/login
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/api/auth/login', {
            email,
            password,
        } as LoginRequest);

        // Save token to storage
        if (response.data.success && response.data.data.token) {
            await TokenStorage.saveToken(response.data.data.token);
        }

        return response.data;
    },

    /**
     * Resend OTP to email
     * POST /api/auth/resend-otp
     */
    async resendOTP(email: string): Promise<ResendOTPResponse> {
        const response = await apiClient.post<ResendOTPResponse>('/api/auth/resend-otp', {
            email,
        } as ResendOTPRequest);
        return response.data;
    },

    /**
     * Request password reset OTP
     * POST /api/auth/forgot-password
     */
    async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
        const response = await apiClient.post<ForgotPasswordResponse>('/api/auth/forgot-password', {
            email,
        } as ForgotPasswordRequest);
        return response.data;
    },

    /**
     * Reset password with OTP
     * POST /api/auth/reset-password
     */
    async resetPassword(
        email: string,
        otp: string,
        newPassword: string
    ): Promise<ResetPasswordResponse> {
        const response = await apiClient.post<ResetPasswordResponse>('/api/auth/reset-password', {
            email,
            otp,
            newPassword,
        } as ResetPasswordRequest);
        return response.data;
    },

    /**
     * Logout - clear token from storage
     */
    async logout(): Promise<void> {
        await TokenStorage.removeToken();
    },

    /**
     * Check if user has valid token
     */
    async hasValidToken(): Promise<boolean> {
        return await TokenStorage.hasToken();
    },

    /**
     * Get current token
     */
    async getToken(): Promise<string | null> {
        return await TokenStorage.getToken();
    },
};
