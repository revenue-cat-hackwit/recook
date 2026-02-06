import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize: string;
  foodName: string;
  confidence: number;
  healthScore: number;
  dietaryFlags: string[];
  warnings?: string[];
}

export interface NutritionAnalysisResult {
  success: boolean;
  nutrition?: NutritionInfo;
  error?: string;
  message?: string;
}

export const NutritionAnalyzerService = {
  /**
   * Analyze nutrition from a food image
   */
  async analyzeFromImage(imageUrl: string): Promise<NutritionInfo> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error('No active session found');
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-nutrition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Nutrition analysis API error:', errorText);
        throw new Error(`Analysis failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to analyze nutrition');
      }

      return data.nutrition;
    } catch (error: any) {
      console.error('Nutrition Analysis Error:', error);
      throw error;
    }
  },

  /**
   * Upload image and analyze nutrition
   */
  async uploadAndAnalyze(imageUri: string): Promise<NutritionInfo> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    // Upload image to Supabase Storage
    const fileName = `nutrition-${Date.now()}.jpg`;
    const filePath = `${userData.user.id}/${fileName}`;

    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload image');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Analyze the uploaded image
    return this.analyzeFromImage(publicUrl);
  },

  /**
   * Get health recommendations based on nutrition
   */
  getHealthRecommendations(nutrition: NutritionInfo): string[] {
    const recommendations: string[] = [];

    if (nutrition.healthScore >= 80) {
      recommendations.push('✅ Great nutritional balance!');
    } else if (nutrition.healthScore >= 60) {
      recommendations.push('⚠️ Good nutrition, but could be improved');
    } else {
      recommendations.push('❌ Consider healthier alternatives');
    }

    if (nutrition.protein < 10) {
      recommendations.push('Consider adding protein sources');
    }

    if (nutrition.fiber < 3) {
      recommendations.push('Low in fiber - add vegetables or whole grains');
    }

    if (nutrition.sugar > 25) {
      recommendations.push('High in sugar - consume in moderation');
    }

    if (nutrition.sodium > 800) {
      recommendations.push('High in sodium - watch your salt intake');
    }

    if (nutrition.fat > 30) {
      recommendations.push('High in fat - balance with other meals');
    }

    return recommendations;
  },
  /**
   * Analyze nutrition from a Recipe object using AI text analysis
   */
  async analyzeRecipe(recipe: any): Promise<NutritionInfo> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const ingredientsList = recipe.ingredients
      .map((i: any) => `- ${i.quantity} ${i.unit} ${i.item}`)
      .join('\n');

    const prompt = `
      Please analyze the nutrition for this recipe:
      Title: ${recipe.title}
      Servings: ${recipe.servings}
      Ingredients:
      ${ingredientsList}

      Provide a detailed nutritional analysis per serving.
      
      Return ONLY a valid JSON object matching this structure:
      {
        "foodName": "${recipe.title}",
        "servingSize": "1 serving",
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fiber": 0,
        "sugar": 0,
        "sodium": 0,
        "confidence": 0.9,
        "healthScore": 0,
        "dietaryFlags": ["Gluten-Free", "Vegan", etc],
        "warnings": ["High Sodium", etc]
      }
      
      Rules:
      - Calculate values based on ingredients and servings.
      - Health Score is 0-100 based on overall nutritional balance.
      - Do not include markdown formatting like \`\`\`json.
    `;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze recipe nutrition');
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      // Parse JSON
      let content = data.data.message.trim();
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const result = JSON.parse(content);
      return result as NutritionInfo;
    } catch (error: any) {
      console.error('Recipe Analysis Error:', error);
      throw new Error('Failed to analyze recipe. Please try again.');
    }
  },
};

export default NutritionAnalyzerService;
