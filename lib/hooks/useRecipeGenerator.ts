import { useState } from 'react';
import { Recipe } from '@/lib/types';
import { RecipeService } from '@/lib/services/recipeService';
import { useRecipeStorage } from '@/lib/hooks/useRecipeStorage';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';
import * as Haptics from 'expo-haptics';

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

  // Alert State for Custom Modal
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: () => {},
    type: 'default' as 'default' | 'destructive',
  });

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const generate = async () => {
    /**
     * ERROR HANDLING PRIORITY (Sorted by Importance):
     * 1. 🚨 Quota/Monetization (Blocker) - Check user limit immediately.
     * 2. ⚠️ Input Validation (Preventive) - Check for valid URLs and supported platforms.
     * 3. 💥 Backend Processing (Critical) - Handle AI/Server connection errors gracefully.
     * 4. 📸 Media Upload (Technical) - Handle file size/duration constraints.
     * 5. 🖼️ Image Generation (Enhancement) - Silent fail allows recipe to succeed even if image fails.
     * 6. 🔒 Permissions (System) - Handled in the UI layer (generate.tsx).
     */

    // 1. Check Quota
    if (!checkCanGenerate()) {
      setAlertConfig({
        visible: true,
        title: 'Daily Limit Reached 🍳',
        message:
          'You have used your 3 free recipes for today. Upgrade to Pro for unlimited access!',
        confirmText: 'Upgrade to Pro',
        cancelText: 'Cancel',
        showCancel: true,
        onConfirm: async () => {
          hideAlert();
          await onPaywallRequest();
        },
        type: 'default',
      });
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
        setAlertConfig({
          visible: true,
          title: 'Video Format Not Supported',
          message:
            'Please use YouTube Shorts, TikTok, or Instagram Reels URLs for best results. Long videos are not supported.',
          confirmText: 'OK',
          cancelText: 'Cancel',
          showCancel: false,
          onConfirm: hideAlert,
          type: 'default',
        });
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
      let isNonFoodError = false;

      // Priority 3: Robust Error Parsing
      try {
        // 1. Handle Network/Connection Errors explicitly
        if (
          error.message?.includes('Network request failed') ||
          error.message?.includes('timeout')
        ) {
          friendlyMsg = 'Connection issue. Please check your internet.';
        }
        // 2. Parsed JSON from Backend (Supabase Edge Functions often throw JSON strings)
        else {
          const parsed = JSON.parse(error.message);
          if (parsed.error) friendlyMsg = parsed.error;
          if (parsed.message) friendlyMsg = parsed.message;

          // Check if it's a non-food content error
          if (
            parsed.error === 'No food content detected' ||
            parsed.error === 'No food items detected'
          ) {
            isNonFoodError = true;
          }
        }
      } catch {
        // Fallback to raw message if not JSON, but clean it up
        if (error.message && !error.message.includes('JSON')) {
          friendlyMsg = error.message;
          // Check raw message too
          if (friendlyMsg.toLowerCase().includes('no food')) {
            isNonFoodError = true;
          }
        }
      }

      // Show Alert Modal for non-food content (more prominent than toast)
      if (isNonFoodError) {
        setAlertConfig({
          visible: true,
          title: '🍽️ No Food Detected',
          message:
            friendlyMsg ||
            'The image/video you uploaded does not appear to contain food or cooking content. Please upload a food-related image or video.',
          confirmText: 'Try Again',
          cancelText: '',
          showCancel: false,
          onConfirm: hideAlert,
          type: 'default',
        });
      } else {
        // Truncate if too long (UX Best Practice)
        if (friendlyMsg.length > 80) friendlyMsg = friendlyMsg.substring(0, 77) + '...';
        toastRef.current?.show(friendlyMsg, 'error');
      }
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingMessage('Analyzing...');
    }
  };

  const completeRecipe = async (recipe: Recipe) => {
    console.log('🔥 completeRecipe called with recipe:', recipe.id);

    // 1. Check Quota
    if (!checkCanGenerate()) {
      console.log('🔥 Quota check failed - user cannot generate');
      return {
        success: false,
        error: 'QUOTA_EXCEEDED',
        needsPaywall: true,
      };
    }

    console.log('🔥 Quota check passed, starting generation...');
    setLoading(true);
    setLoadingMessage('Completing your recipe...');

    try {
      console.log('🔥 Calling RecipeService.generateFromVideo...');
      // 2. Generate details using Text-Only mode (Backend handles this switch)
      const generated = await RecipeService.generateFromVideo({
        title: recipe.title,
        description: recipe.description,
      });
      console.log('🔥 Generated recipe:', generated);

      // 2.5 Auto-Generate Image (Enhancement)
      // Only generate if no image exists
      if (!recipe.imageUrl) {
        setLoadingMessage('Plating your dish... (Generating Image)');
        try {
          const imagePrompt = `${generated.title}, ${generated.description?.slice(0, 50)}. Food photography, 8k, highly detailed, delicious, professional lighting.`;
          const generatedImageUrl = await RecipeService.generateImage(imagePrompt);
          if (generatedImageUrl) {
            generated.imageUrl = generatedImageUrl;
          }
        } catch (imgError) {
          console.warn('Auto-image generation failed during completion', imgError);
        }
      }

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

      console.log('🔥 Saving recipe to storage...');
      // 4. Save/Update (Cloud) - and get the REAL ID
      const savedRealRecipe = await saveRecipe(updatedRecipe);
      setCurrentRecipe(savedRealRecipe);

      // 5. Increment Usage
      incrementUsage();

      console.log('🔥 Recipe completed successfully. Real ID:', savedRealRecipe.id);
      return { success: true, data: savedRealRecipe };
    } catch (err: any) {
      console.error('🔥 Complete Recipe Error:', err);
      console.error('🔥 Error message:', err?.message);
      console.error('🔥 Error stack:', err?.stack);
      toastRef.current?.show(err.message || 'Failed to complete recipe', 'error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      showCancel?: boolean;
      onConfirm?: () => void;
      type?: 'default' | 'destructive';
    },
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      confirmText: options?.confirmText || 'OK',
      cancelText: options?.cancelText || 'Cancel',
      showCancel: options?.showCancel ?? false,
      onConfirm: () => {
        hideAlert();
        options?.onConfirm?.();
      },
      type: options?.type || 'default',
    });
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
    alertConfig, // Expose alert config
    hideAlert, // Expose hide function
    showAlert, // Expose generic show function
  };
};
