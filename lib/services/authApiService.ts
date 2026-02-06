import apiClient, { TokenStorage } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSyncService } from './userSyncService';
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
    GoogleSignInRequest,
    GoogleSignInResponse,
    ProfileResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
    PersonalizationResponse,
    UpdatePersonalizationRequest,
    UpdatePersonalizationResponse,
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
            // Save user ID for later use
            if (response.data.data.user?.id) {
                await AsyncStorage.setItem('pirinku_user_id', response.data.data.user.id);
            }
            // Sync custom_user_id to Supabase
            await UserSyncService.syncCustomUserId();
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
            // Save user ID for later use
            if (response.data.data.user?.id) {
                await AsyncStorage.setItem('pirinku_user_id', response.data.data.user.id);
            }
            // Sync custom_user_id to Supabase
            await UserSyncService.syncCustomUserId();
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

    /**
     * Sign in with Google (Supabase auth)
     * POST /api/auth/google-supabase
     */
    async googleSignIn(userData: GoogleSignInRequest): Promise<GoogleSignInResponse> {
        console.log('🔵 [AuthApiService] Calling backend /api/auth/google-supabase...', {
            userId: userData.user.id,
            email: userData.user.email,
        });
        
        const response = await apiClient.post<GoogleSignInResponse>(
            '/api/auth/google-supabase',
            userData
        );

        console.log('✅ [AuthApiService] Backend response received:', {
            success: response.data.success,
            hasToken: !!response.data.data?.token,
            userId: response.data.data?.user?.id,
        });

        // Save token to storage
        if (response.data.success && response.data.data.token) {
            await TokenStorage.saveToken(response.data.data.token);
            console.log('✅ [AuthApiService] Token saved to storage');
            
            // Save user ID for later use
            if (response.data.data.user?.id) {
                await AsyncStorage.setItem('pirinku_user_id', response.data.data.user.id);
                console.log('✅ [AuthApiService] User ID saved to storage');
            }
            // Sync custom_user_id to Supabase
            await UserSyncService.syncCustomUserId();
        }

        return response.data;
    },

    /**
     * Get User Profile (Basic Info)
     * GET /api/profile
     */
    async getProfile(): Promise<ProfileResponse> {
        const response = await apiClient.get<ProfileResponse>('/api/profile');
        return response.data;
    },

    /**
     * Update User Profile
     * PATCH /api/profile
     */
    async updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
        const response = await apiClient.patch<UpdateProfileResponse>('/api/profile', data);
        return response.data;
    },

    /**
     * Get User Personalization (Allergies, Preferences)
     * GET /api/personalization
     */
    async getPersonalization(): Promise<PersonalizationResponse | null> {
        try {
            const response = await apiClient.get<PersonalizationResponse>('/api/personalization');
            return response.data;
        } catch (error) {
            console.log('No personalization found or error:', error);
            return null;
        }
    },

    /**
     * Create User Personalization
     * POST /api/personalization
     */
    async createPersonalization(data: UpdatePersonalizationRequest): Promise<UpdatePersonalizationResponse> {
        const response = await apiClient.post<UpdatePersonalizationResponse>('/api/personalization', data);
        return response.data;
    },

    /**
     * Update User Personalization
     * PATCH /api/personalization
     */
    async updatePersonalization(data: UpdatePersonalizationRequest): Promise<UpdatePersonalizationResponse> {
        const response = await apiClient.patch<UpdatePersonalizationResponse>('/api/personalization', data);
        return response.data;
    },
};

