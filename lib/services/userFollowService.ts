import apiClient from './apiClient';
import { useAuthStore } from '../store/authStore';

export interface FollowResponse {
  success: boolean;
  message: string;
  data: {
    following: boolean;
    followersCount: number;
    followingCount: number;
  };
}

export const UserFollowService = {
  /**
   * Toggle follow/unfollow a user
   */
  toggleFollow: async (userId: string): Promise<FollowResponse> => {
    const response = await apiClient.post<FollowResponse>(
      `/api/users/${userId}/follow`
    );

    return response.data;
  },
};
