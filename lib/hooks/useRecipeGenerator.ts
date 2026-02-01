import { useState, useRef } from 'react';
import { Recipe } from '@/lib/types';
import { RecipeService } from '@/lib/services/recipeService';
import { useRecipeStorage } from '@/lib/hooks/useRecipeStorage';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

interface UseRecipeGeneratorProps {
  preferences?: any;
  toastRef?: any;
  onPaywallRequest?: () => Promise<void>;
}

export const useRecipeGenerator = ({
  preferences = {},
  toastRef,
  onPaywallRequest = async () => {},
}: UseRecipeGeneratorProps = {}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing...');
  const [uploading, setUploading] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);

  const { saveRecipe } = useRecipeStorage();
  const { isPro, checkCanGenerate, incrementUsage } = useSubscriptionStore();

  const removeFile = (urlStr: string) => {
    setUploadedFiles((prev) => prev.filter((u) => u !== urlStr));
  };

  const reset = () => {
    setVideoUrl('');
    setUploadedFiles([]);
    setCurrentRecipe(null);
  };

  const handleUploadMultiple = async (assets: any[]) => {
    setUploading(true);
    setVideoUrl('');

    const newUrls: string[] = [];
    let errorCount = 0;

    try {
      const uploadPromises = assets.map(async (asset) => {
        if (asset.type === 'video' && asset.duration && asset.duration > 180000) {
          throw new Error('Video max 3 mins');
        }
        return await RecipeService.uploadMedia(asset.uri);
      });

      const results = await Promise.allSettled(uploadPromises);

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          newUrls.push(res.value);
        } else {
          errorCount++;
        }
      });

      if (newUrls.length > 0) {
        setUploadedFiles((prev) => [...prev, ...newUrls]);
        toastRef.current?.show(`${newUrls.length} files uploaded successfully!`, 'success');
      }

      if (errorCount > 0) {
        toastRef.current?.show(`${errorCount} files failed to upload.`, 'error');
      }
    } catch (error: any) {
      toastRef.current?.show(error.message || 'Upload Failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const generate = async () => {
    // 1. Check Quota
    if (!checkCanGenerate()) {
      Alert.alert(
        'Daily Limit Reached 🍳',
        'You have used your 3 free recipes for today. Upgrade to Pro for unlimited access!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: onPaywallRequest },
        ],
      );
      return;
    }

    let targetUrl = videoUrl.trim();
    if (uploadedFiles.length > 0) {
      targetUrl = uploadedFiles.join(',');
    }

    if (!targetUrl) {
      toastRef.current?.show('Please paste a link or upload media.', 'info');
      return;
    }

    if (uploadedFiles.length === 0 && !targetUrl.match(/^https?:\/\//i)) {
      toastRef.current?.show('Please enter a valid URL (http/https)', 'error');
      return;
    }

    // Strict Platform Check (Short-form content only)
    if (uploadedFiles.length === 0) {
      const isShortForm = targetUrl.match(
        /(youtube\.com\/shorts\/|tiktok\.com\/|instagram\.com\/.*(reel|reels)\/)/i,
      );
      const isDirectVideo = targetUrl.match(/\.(mp4|mov|webm)$/i);

      if (!isShortForm && !isDirectVideo) {
        Alert.alert(
          'Video Format Not Supported',
          'Please use YouTube Shorts, TikTok, or Instagram Reels URLs for best results. Long videos are not supported.',
        );
        return;
      }
    }

    setLoading(true);
    setLoadingMessage('Fetching Media...');
    setCurrentRecipe(null);

    // Dynamic loading messages
    const messages = [
      'Analyzing Visuals...',
      'Chef is identifying ingredients...',
      'Crafting the recipe...',
      'Writing instructions...',
      'Almost ready to serve...',
    ];
    let msgIndex = 0;
    const interval = setInterval(() => {
      if (msgIndex < messages.length) {
        setLoadingMessage(messages[msgIndex]);
        msgIndex++;
      }
    }, 4000);

    try {
      console.log('Starting Recipe Generation Flow...');
      let finalMediaItems: any[] = [];

      // Step A: Handle Social Media URL
      if (uploadedFiles.length === 0 && targetUrl) {
        setLoadingMessage('Downloading Video...');
        // 1. Extract Media
        const extractionResult = await RecipeService.extractMedia(targetUrl);
        finalMediaItems = extractionResult.mediaItems;
      }
      // Step B: Handle Direct Uploads
      else if (uploadedFiles.length > 0) {
        finalMediaItems = uploadedFiles.map((url) => {
          const isVideo = url.toLowerCase().match(/\.(mp4|mov|webm)$/);
          return { type: isVideo ? 'video' : 'image', url };
        });
      }

      setLoadingMessage('Chef is watching your video...');

      // Step 2: Generate Recipe
      const generatedRecipe = await RecipeService.generateFromVideo(
        {
          videoUrl: targetUrl,
          mediaItems: finalMediaItems,
        },
        preferences,
      );

      // Step 3: Auto-Generate Image (Enhancement)
      setLoadingMessage('Plating your dish... (Generating Image)');
      try {
        const imagePrompt = `${generatedRecipe.title}, ${generatedRecipe.description?.slice(0, 50)}. Food photography, 8k, highly detailed, delicious, professional lighting.`;
        const generatedImageUrl = await RecipeService.generateImage(imagePrompt);
        if (generatedImageUrl) {
          generatedRecipe.imageUrl = generatedImageUrl;
        }
      } catch (imgError) {
        console.warn('Auto-image generation failed, utilizing default media.', imgError);
      }

      // Prefer the Clean/Extracted Video URL (Supabase) for playback
      let cleanSourceUrl = targetUrl;
      if (finalMediaItems.length > 0 && finalMediaItems[0].type === 'video') {
        cleanSourceUrl = finalMediaItems[0].url;
      }

      const newRecipe: Recipe = {
        ...generatedRecipe,
        sourceUrl: cleanSourceUrl,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      setCurrentRecipe(newRecipe);
      await saveRecipe(newRecipe);
      incrementUsage();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUploadedFiles([]);
      setVideoUrl('');
      toastRef.current?.show(`Recipe generated! ${!isPro ? '(Free quota used)' : ''}`, 'success');
    } catch (error: any) {
      console.error('Error flow:', error);
      let friendlyMsg = 'Processing failed. Please try again.';
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) friendlyMsg = parsed.error;
        if (parsed.message) friendlyMsg = parsed.message;
      } catch (e) {
        friendlyMsg = error.message || friendlyMsg;
      }
      if (friendlyMsg.length > 60) friendlyMsg = friendlyMsg.substring(0, 57) + '...';
      toastRef.current?.show(friendlyMsg, 'error');
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingMessage('Analyzing...');
    }
  };

  /**
   * Complete a placeholder recipe (Generate full details from Title/Desc)
   */
  const completeRecipe = async (recipe: Recipe) => {
    // 1. Check Quota
    if (!checkCanGenerate()) {
      Alert.alert('Daily Limit Reached 🍳', 'Upgrade to Pro to generate full recipes!', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade to Pro', onPress: onPaywallRequest },
      ]);
      return { success: false };
    }

    setLoading(true);
    setLoadingMessage('Completing your recipe...');

    try {
      // 2. Generate details using Text-Only mode (Backend handles this switch)
      const generated = await RecipeService.generateFromVideo({
        title: recipe.title,
        description: recipe.description,
      });

      // 3. Merge with existing ID (preserve ID, created_at, user_id)
      const updatedRecipe: Recipe = {
        ...generated,
        id: recipe.id,
        // user_id handled by backend/auth context
        imageUrl: generated.imageUrl || recipe.imageUrl, // Prefer generated image if backend returns one, else keep placeholder
        createdAt: recipe.createdAt,
        // Ensure sourceUrl is preserved if it exists
        sourceUrl: recipe.sourceUrl,
      };

      // 4. Save/Update (Cloud)
      await saveRecipe(updatedRecipe);
      setCurrentRecipe(updatedRecipe);

      // 5. Increment Usage
      incrementUsage();

      return { success: true, data: updatedRecipe };
    } catch (err: any) {
      console.error('Complete Recipe Error:', err);
      toastRef.current?.show(err.message || 'Failed to complete recipe', 'error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    videoUrl,
    setVideoUrl,
    uploadedFiles,
    setUploadedFiles, // Needed for reset UI
    loading,
    loadingMessage,
    uploading,
    currentRecipe,
    setCurrentRecipe,
    removeFile,
    handleUploadMultiple,
    generate,
    completeRecipe,
    isPro,
  };
};
