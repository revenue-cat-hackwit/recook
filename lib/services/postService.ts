import apiClient from './apiClient';
import { PostsResponse, MyCommentsResponse, SavedPostsResponse, FeedsResponse } from '@/lib/types/post';

export const PostService = {
    /**
     * Get feeds
     * GET /api/feeds
     * Requires Authorization header with Bearer token
     */
    async getFeeds(page: number = 1, limit: number = 10): Promise<FeedsResponse> {
        const response = await apiClient.get<FeedsResponse>('/api/feeds', {
            params: { page, limit },
        });
        return response.data;
    },

    /**
     * Get all posts (feed)
     * GET /api/posts
     * Requires Authorization header with Bearer token
     */
    async getPosts(page: number = 1, limit: number = 10): Promise<PostsResponse> {
        const response = await apiClient.get<PostsResponse>('/api/posts', {
            params: { page, limit },
        });
        return response.data;
    },

    /**
     * Get my comments
     * GET /api/profile/my-comment
     * Requires Authorization header with Bearer token
     */
    async getMyComments(): Promise<MyCommentsResponse> {
        const response = await apiClient.get<MyCommentsResponse>('/api/profile/my-comment');
        return response.data;
    },

    /**
     * Get saved posts
     * GET /api/profile/post-saved
     * Requires Authorization header with Bearer token
     */
    async getSavedPosts(): Promise<SavedPostsResponse> {
        const response = await apiClient.get<SavedPostsResponse>('/api/profile/post-saved');
        return response.data;
    },
};
