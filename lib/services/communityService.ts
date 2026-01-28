import { supabase } from '@/lib/supabase';
import { Recipe } from '@/lib/types';

export interface FeedPost {
  id: string;
  user_id: string;
  title: string;
  image_url: string;
  likes_count: number;
  created_at: string;
  user: {
    full_name: string;
    avatar_url: string;
  };
  recipe: Recipe;
}

export const CommunityService = {
  /**
   * Fetch Global Feed
   */
  async getFeed(page = 0, limit = 10): Promise<FeedPost[]> {
    const from = page * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('community_posts')
      .select(
        `
        id,
        title,
        image_url,
        likes_count,
        created_at,
        recipe_snapshot,
        user_id,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `,
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching feed:', error);
      throw error;
    }

    // Transform to frontend model
    return data.map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      image_url: item.image_url,
      likes_count: item.likes_count,
      created_at: item.created_at,
      user: {
        full_name: item.profiles?.full_name || 'Chef',
        avatar_url: item.profiles?.avatar_url || 'https://via.placeholder.com/150',
      },
      recipe: item.recipe_snapshot as Recipe,
    }));
  },

  /**
   * Publish a Recipe to the Community
   */
  async publishRecipe(recipe: Recipe): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // extract first image if available
    let imageUrl = 'https://via.placeholder.com/400';
    // TODO: logic to extract image from recipe or source

    const { error } = await supabase.from('community_posts').insert({
      user_id: userData.user.id,
      original_recipe_id: recipe.id,
      title: recipe.title,
      image_url: imageUrl, // In a real app, generate a thumbnail
      recipe_snapshot: recipe,
    });

    if (error) throw error;
  },

  /**
   * Toggle Like (Optimistic logic should happen in UI)
   */
  async getMyLikedPostIds(): Promise<string[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userData.user.id);

    return data?.map((row: any) => row.post_id) || [];
  },

  async toggleLike(postId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    // Check if liked
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('post_id', postId)
      .single();

    if (existing) {
      // Unlike
      await supabase.from('post_likes').delete().eq('id', existing.id);
      // Decrement counter (RP calls or trigger needed, simplified here)
      await supabase.rpc('decrement_likes', { row_id: postId });
      return false;
    } else {
      // Like
      // Ensure profile exists first (Safety)
      await supabase
        .from('profiles')
        .upsert(
          {
            id: userData.user.id,
            email: userData.user.email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id', ignoreDuplicates: true },
        );

      await supabase.from('post_likes').insert({ user_id: userData.user.id, post_id: postId });
      // Increment counter
      await supabase.rpc('increment_likes', { row_id: postId });
      return true;
    }
  },

  /**
   * Comments
   */
  async getComments(postId: string) {
    const { data } = await supabase
      .from('post_comments')
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `,
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    return (
      data?.map((item: any) => ({
        id: item.id,
        content: item.content,
        created_at: item.created_at,
        user: {
          full_name: item.profiles?.full_name || 'Chef',
          avatar_url: item.profiles?.avatar_url,
        },
      })) || []
    );
  },

  async addComment(postId: string, content: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // Ensure profile exists and is up-to-date
    const meta = userData.user.user_metadata;

    // We update even if it exists to sync name/avatar from Auth
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userData.user.id,
        email: userData.user.email,
        full_name: meta?.full_name || userData.user.email?.split('@')[0],
        avatar_url: meta?.avatar_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      console.log('Error ensuring profile exists:', profileError);
    }

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userData.user.id,
        content: content,
      })
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `,
      )
      .single();

    if (error) throw error;

    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

    return {
      id: data.id,
      content: data.content,
      created_at: data.created_at,
      user: {
        full_name: profile?.full_name || 'Chef',
        avatar_url: profile?.avatar_url,
      },
    };
  },
};
