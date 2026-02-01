// API Request/Response Types

// ============= Create Account =============
export interface CreateAccountRequest {
    username: string;
    fullName: string;
    email: string;
    password: string;
}

export interface CreateAccountResponse {
    success: boolean;
    message: string;
    data: {
        userId: string;
        email: string;
    };
}

// ============= Verify OTP =============
export interface VerifyOTPRequest {
    email: string;
    otp: string;
}

export interface VerifyOTPResponse {
    success: boolean;
    message: string;
    data: {
        token: string;
        user: AuthUser;
    };
}

// ============= Login =============
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        token: string;
        user: AuthUser;
    };
}

// ============= Resend OTP =============
export interface ResendOTPRequest {
    email: string;
}

export interface ResendOTPResponse {
    success: boolean;
    message: string;
}

// ============= Forgot Password =============
export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordResponse {
    success: boolean;
    message: string;
}

// ============= Reset Password =============
export interface ResetPasswordRequest {
    email: string;
    otp: string;
    newPassword: string;
}

export interface ResetPasswordResponse {
    success: boolean;
    message: string;
}

// ============= Profile =============
export interface ProfileResponse {
    success: boolean;
    data: {
        user: ProfileUser;
    };
}

export interface ProfileUser {
    id: string;
    username: string;
    fullName: string;
    email: string;
    isVerified: boolean;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    createdAt: string;
    updatedAt: string;
    bio?: string;
    avatar?: string; // Changed from avatarUrl to match backend
}

export interface UpdateProfileRequest {
    fullName?: string;
    bio?: string;
    avatar?: string;
}

export interface UpdateProfileResponse {
    success: boolean;
    message: string;
    data: {
        user: ProfileUser;
    };
}

// ============= Upload =============
export interface UploadResponse {
    success: boolean;
    message: string;
    data: {
        url: string;
        publicId: string;
        width: number;
        height: number;
        format: string;
        size: number;
    };
}

// ============= User Types =============
export interface AuthUser {
    id: string;
    username: string;
    fullName?: string;
    email: string;
    isVerified: boolean;
}

// ============= Error Response =============
export interface ApiErrorResponse {
    success: false;
    message: string;
    error?: string;
}
