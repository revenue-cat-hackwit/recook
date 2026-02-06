// ============= Post Types =============

// Raw API Response Types (from backend)
export interface RawPostUser {
    _id: string;
    username: string;
    fullName: string;
    avatar?: string | null;
}

export interface RawPostComment {
    _id?: string;
    userId: RawPostUser;
    content: string;
    createdAt: string;
}

export interface RawPost {
    _id: string;
    userId: RawPostUser;
    content: string;
    imageUrl?: string | null;
    likes: string[];
    comments: RawPostComment[];
    createdAt: string;
    updatedAt: string;
    __v: number;
    likesCount?: number;
    commentsCount?: number;
}

export interface RawPostsResponse {
    success: boolean;
    data: {
        posts: RawPost[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

// Transformed Types (used in components)
export interface PostUser {
    id: string;
    username: string;
    fullName: string;
    avatar?: string | null;
}

export interface PostComment {
    id?: string;
    userId: PostUser;
    content: string;
    createdAt: string;
}

export interface Post {
    id: string;
    content: string;
    imageUrl?: string | null;
    user: PostUser;
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    createdAt: string;
    updatedAt: string;
    comments?: PostComment[];
}

export interface CurrentUser {
    id: string;
    avatar: string | null;
    fullName: string;
    username: string;
}

export interface FeedsResponse {
    success: boolean;
    message: string;
    data: {
        currentUser: CurrentUser;
        posts: Post[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalPosts: number;
            limit: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    };
}

export interface PostsResponse {
    success: boolean;
    data: {
        posts: Post[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

// ============= My Comments Types =============
export interface MyCommentPost {
    id: string;
    content: string;
    user: {
        id: string;
        username: string;
        fullName: string;
    };
    likesCount: number;
    commentsCount: number;
    createdAt: string;
}

export interface MyComment {
    content: string;
    createdAt: string;
    post: MyCommentPost;
}

export interface MyCommentsResponse {
    success: boolean;
    message: string;
    data: {
        comments: MyComment[];
        total: number;
    };
}

// ============= Saved Posts Types =============
export interface SavedPostsResponse {
    success: boolean;
    message: string;
    data: {
        posts: Post[];
        total: number;
    };
}
