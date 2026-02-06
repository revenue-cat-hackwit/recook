import apiClient, { TokenStorage, API_BASE_URL } from './apiClient';

export interface UserPlanResponse {
  success: boolean;
  data: {
    isSubscribed: boolean;
    subscriptionType: string | null;
    subscriptionExpiry: string | null;
  };
}

export const SubscriptionService = {
  /**
   * Get user subscription plan status
   */
  async getUserPlan(): Promise<UserPlanResponse> {
    try {
      const token = await TokenStorage.getToken();

      if (!token) {
        throw new Error('No active session found');
      }

      const response = await fetch(`${API_BASE_URL}/api/user/plan`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Get user plan error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200),
        });
        throw new Error(`Failed to get user plan: ${response.status}`);
      }

      const data: UserPlanResponse = await response.json();
      
      // Validate response structure
      if (!data || typeof data.data !== 'object') {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Invalid response structure from API');
      }
      
      // Ensure isSubscribed is a boolean
      const isSubscribed = Boolean(data.data.isSubscribed);
      
      console.log('✅ User plan fetched:', isSubscribed ? 'Subscribed' : 'Free', {
        subscriptionType: data.data.subscriptionType,
        expiry: data.data.subscriptionExpiry,
      });
      
      return {
        success: true,
        data: {
          isSubscribed,
          subscriptionType: data.data.subscriptionType || null,
          subscriptionExpiry: data.data.subscriptionExpiry || null,
        }
      };
    } catch (error: any) {
      console.error('Get user plan error:', error);
      throw error;
    }
  },
};

export default SubscriptionService;
