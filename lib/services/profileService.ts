import apiClient from './apiClient';
import { ProfileResponse, UpdateProfileRequest, UpdateProfileResponse, UploadResponse } from '@/lib/types/auth';

export const ProfileService = {
    /**
     * Get current user profile
     * GET /api/profile
     * Requires Authorization header with Bearer token
     */
    async getProfile(): Promise<ProfileResponse> {
        const response = await apiClient.get<ProfileResponse>('/api/profile');
        return response.data;
    },

    /**
     * Update user profile
     * PATCH /api/profile
     * Requires Authorization header with Bearer token
     */
    async updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
        const response = await apiClient.patch<UpdateProfileResponse>('/api/profile', data);
        return response.data;
    },

    /**
     * Upload file (avatar, images, etc)
     * POST /api/upload
     * Requires Authorization header with Bearer token
     * Content-Type: multipart/form-data
     */
    async uploadFile(file: FormData): Promise<UploadResponse> {
        const response = await apiClient.post<UploadResponse>('/api/upload', file, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};
