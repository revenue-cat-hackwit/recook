import { supabase } from '@/lib/supabase';
import { usePreferencesStore } from '@/lib/store/preferencesStore';
import apiClient, { TokenStorage, API_BASE_URL } from './apiClient';

export interface PersonalizationCheckResponse {
  success: boolean;
  message: string;
  data: {
    hasPersonalization: boolean;
    personalizationId?: string;
  };
}

export interface PersonalizationData {
  favoriteCuisines: string[];
  tastePreferences: string[];
  foodAllergies: string[];
  whatsInYourKitchen: string[];
  otherTools: string[];
}

export interface PersonalizationResponse {
  success: boolean;
  message: string;
  data: {
    personalization: {
      id: string;
      userId: string;
      favoriteCuisines: string[];
      tastePreferences: string[];
      foodAllergies: string[];
      whatsInYourKitchen: string[];
      otherTools: string[];
      createdAt: string;
      updatedAt: string;
    };
  };
}

export const PersonalizationService = {
  /**
   * Check if user has filled personalization data
   */
  async checkPersonalization(): Promise<PersonalizationCheckResponse> {
    try {
      // Get token from AsyncStorage (backend auth token, not Supabase JWT)
      const token = await TokenStorage.getToken();

      if (!token) {
        throw new Error('No active session found');
      }

      console.log('📡 Checking personalization at:', `${API_BASE_URL}/api/personalization/check`);

      const response = await fetch(`${API_BASE_URL}/api/personalization/check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Personalization check response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Personalization check error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200), // Log first 200 chars
        });
        throw new Error(`Failed to check personalization: ${response.status} - ${response.statusText}`);
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Unexpected response type:', {
          contentType,
          body: textResponse.substring(0, 200),
        });
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      const data: PersonalizationCheckResponse = await response.json();
      
      // Save to preferences store
      if (data.data.hasPersonalization) {
        usePreferencesStore.getState().setHasOnboarded(true);
      }
      
      console.log('✅ Personalization check successful:', data.data.hasPersonalization);
      return data;
    } catch (error: any) {
      console.error('Personalization check error:', error);
      throw error;
    }
  },

  /**
   * Save user personalization data
   */
  async savePersonalization(data: PersonalizationData): Promise<PersonalizationResponse> {
    try {
      // Get token from AsyncStorage (backend auth token, not Supabase JWT)
      const token = await TokenStorage.getToken();

      if (!token) {
        throw new Error('No active session found');
      }

      console.log('📡 Saving personalization to:', `${API_BASE_URL}/api/personalization`);

      const response = await fetch(`${API_BASE_URL}/api/personalization`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('📡 Save personalization response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Save personalization error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200),
        });
        throw new Error(`Failed to save personalization: ${response.status} - ${response.statusText}`);
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Unexpected response type:', {
          contentType,
          body: textResponse.substring(0, 200),
        });
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      const result: PersonalizationResponse = await response.json();
      
      // Update local state to mark onboarding as complete
      usePreferencesStore.getState().setHasOnboarded(true);
      
      console.log('✅ Personalization saved successfully:', result.data.personalization.id);
      return result;
    } catch (error: any) {
      console.error('Save personalization error:', error);
      throw error;
    }
  },

  /**
   * Update user personalization data (partial update)
   */
  async updatePersonalization(data: Partial<PersonalizationData>): Promise<PersonalizationResponse> {
    try {
      // Get token from AsyncStorage (backend auth token, not Supabase JWT)
      const token = await TokenStorage.getToken();

      if (!token) {
        throw new Error('No active session found');
      }

      console.log('📡 Updating personalization to:', `${API_BASE_URL}/api/personalization`);

      const response = await fetch(`${API_BASE_URL}/api/personalization`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('📡 Update personalization response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update personalization error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200),
        });
        throw new Error(`Failed to update personalization: ${response.status} - ${response.statusText}`);
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Unexpected response type:', {
          contentType,
          body: textResponse.substring(0, 200),
        });
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      const result: PersonalizationResponse = await response.json();
      
      console.log('✅ Personalization updated successfully:', result.data.personalization.id);
      return result;
    } catch (error: any) {
      console.error('Update personalization error:', error);
      throw error;
    }
  },

  /**
   * Save personalization check result to local storage
   */
  async savePersonalizationStatus(hasPersonalization: boolean, personalizationId?: string): Promise<void> {
    try {
      const status = {
        hasPersonalization,
        personalizationId: personalizationId || null,
        lastChecked: new Date().toISOString(),
      };
      // You can use AsyncStorage or any state management to store this
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving personalization status:', error);
    }
  },
};

export default PersonalizationService;
