import apiClient from './apiClient';
import { PostsResponse, MyCommentsResponse, SavedPostsResponse, FeedsResponse, RawPostsResponse, RawPost, Post } from '@/lib/types/post';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to get current user ID from token or storage
const getCurrentUserId = async (): Promise<string | null> => {
    try {
        // Try to get user ID from AsyncStorage if it's stored
        const userId = await AsyncStorage.getItem('pirinku_user_id');
        return userId;
    } catch (error) {
        console.error('Failed to get current user ID:', error);
        return null;
    }
};

// Helper function to transform raw post to Post type
const transformPost = async (rawPost: RawPost): Promise<Post> => {
    const currentUserId = await getCurrentUserId();
    
    // Handle missing user data
    if (!rawPost.userId) {
        throw new Error(`Post ${rawPost._id} is missing user data`);
    }

    return {
        id: rawPost._id,
        content: rawPost.content,
        imageUrl: rawPost.imageUrl || null,
        user: {
            id: rawPost.userId._id,
            username: rawPost.userId.username,
            fullName: rawPost.userId.fullName,
            avatar: rawPost.userId.avatar || null,
        },
        likesCount: rawPost.likes?.length || 0,
        commentsCount: rawPost.comments?.length || 0,
        isLiked: currentUserId ? rawPost.likes.includes(currentUserId) : false,
        createdAt: rawPost.createdAt,
        updatedAt: rawPost.updatedAt,
        comments: rawPost.comments?.map(comment => ({
            id: comment._id,
            userId: {
                id: comment.userId._id,
                username: comment.userId.username,
                fullName: comment.userId.fullName,
                avatar: comment.userId.avatar || null,
            },
            content: comment.content,
            createdAt: comment.createdAt,
        })),
    };
};

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
        const response = await apiClient.get<RawPostsResponse>('/api/posts', {
            params: { page, limit },
        });
        
        // Transform raw posts to expected format
        const transformedPosts = await Promise.all(
            response.data.data.posts.map(post => transformPost(post))
        );
        
        return {
            success: response.data.success,
            data: {
                posts: transformedPosts,
                pagination: response.data.data.pagination,
            },
        };
    },

    /**
     * Get single post detail with comments
     * GET /api/posts/{id}
     * Requires Authorization header with Bearer token
     */
    async getPostDetail(postId: string): Promise<{ success: boolean; data: { post: Post } }> {
        const response = await apiClient.get<{ success: boolean; data: { post: RawPost } }>(
            `/api/posts/${postId}`
        );
        
        let transformedPost: Post | null = null;
        if (response.data.success && response.data.data.post) {
            transformedPost = await transformPost(response.data.data.post);
        }

        return {
            success: response.data.success,
            data: {
                post: transformedPost as Post
            }
        };
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

    /**
     * Like or unlike a post
     * POST /api/posts/{id}/like
     * Requires Authorization header with Bearer token
     */
    async likePost(postId: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.post<{ success: boolean; message: string }>(
            `/api/posts/${postId}/like`
        );
        return response.data;
    },

    /**
     * Add a comment to a post
     * POST /api/posts/{id}/comment
     * Requires Authorization header with Bearer token
     */
    async addComment(postId: string, content: string): Promise<{ success: boolean; message: string; data?: any }> {
        const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
            `/api/posts/${postId}/comment`,
            { content }
        );
        return response.data;
    },

    /**
     * Create a new post
     * POST /api/posts
     * Requires Authorization header with Bearer token
     */
    async createPost(content: string, imageUrl?: string): Promise<{ success: boolean; message: string; data?: any }> {
        const body: { content: string; imageUrl?: string } = { content };
        if (imageUrl) {
            body.imageUrl = imageUrl;
        }
        const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
            '/api/posts',
            body
        );
        return response.data;
    },

    /**
     * Publish a recipe as a post
     * POST /api/posts
     */
    async publishRecipe(recipe: any): Promise<{ success: boolean; message: string; data?: any }> {
        const body = { 
            title: recipe.title,
            recipeSnapshot: recipe,
            imageUrl: recipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600',
            content: recipe.description || '' 
        };
        
        const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
            '/api/posts',
            body
        );
        return response.data;
    }
};
