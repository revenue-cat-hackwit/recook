import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Share,
  ActivityIndicator,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Keyboard,
  ScrollView,
  Modal,
} from 'react-native';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, TickCircle, ArrowLeft, Filter, SearchNormal1, CloseCircle, Book, AddCircle, Calendar, Box, ShoppingCart, Add, Clock, TextalignJustifycenter, Timer1, Flash, Heart } from 'iconsax-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Recipe } from '@/lib/types';
import { useRecipeStorage } from '@/lib/hooks/useRecipeStorage';
import { useRecipeGenerator } from '@/lib/hooks/useRecipeGenerator';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { ProButton } from '@/components/ProButton';

// Components
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeDetailModal } from '@/components/recipes/RecipeDetailModal';
import Toast, { ToastRef } from '@/components/Toast';
import { CollectionCard } from '@/components/recipes/CollectionCard';
import { CollectionSelectorModal } from '@/components/recipes/CollectionSelectorModal';
import { CreateCollectionModal } from '@/components/recipes/CreateCollectionModal';
import { CustomAlertModal } from '@/components/CustomAlertModal';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function SavedRecipesScreen() {
  const router = useRouter();
  const {
    savedRecipes,
    isLoading,
    isLoadingMore,
    hasMore,
    refreshRecipes,
    loadMore,
    deleteRecipe,
    saveRecipe,
    updateRecipe,
  } = useRecipeStorage();

  // Toast ref for error handling
  const toastRef = useRef<ToastRef>(null);

  // Use generator hook for completing recipes
  const { completeRecipe } = useRecipeGenerator({ toastRef });

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort & Filter state
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'time' | 'calories'>('recent');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>(
    'all',
  );
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Menu state

  // Manual Creation State
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [tempManualRecipe, setTempManualRecipe] = useState<Recipe | null>(null);

  // Create Collection State
  const [createCollectionModalVisible, setCreateCollectionModalVisible] = useState(false);

  // Collection Selector (Single Recipe)
  const [collectionSelectorVisible, setCollectionSelectorVisible] = useState(false);
  const [recipeForCollection, setRecipeForCollection] = useState<Recipe | null>(null);

  // Custom Alert Modal State
  const [deleteCollectionAlertVisible, setDeleteCollectionAlertVisible] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);

  const [deleteRecipeAlertVisible, setDeleteRecipeAlertVisible] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
  const [recipeTitleToDelete, setRecipeTitleToDelete] = useState<string>('');

  const handleToggleCollection = async (collectionName: string) => {
    if (!recipeForCollection) return;
    const current = recipeForCollection.collections || [];
    let newCol;
    if (current.includes(collectionName)) {
      newCol = current.filter((c) => c !== collectionName);
    } else {
      newCol = [...current, collectionName];
    }
    const updated = { ...recipeForCollection, collections: newCol };
    setRecipeForCollection(updated);
    await updateRecipe(updated);
  };

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useFocusEffect(
    useCallback(() => {
      refreshRecipes();
    }, []),
  );

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await refreshRecipes();
    setRefreshing(false);
  };

  const toggleSearch = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (showSortMenu) setShowSortMenu(false);

    if (showSearch) {
      Keyboard.dismiss();
      setSearchQuery('');
    }
    setShowSearch(!showSearch);
  };

  const toggleSortMenu = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (showSearch) {
      setShowSearch(false);
      Keyboard.dismiss();
      setSearchQuery('');
    }
    setShowSortMenu(!showSortMenu);
  };

  // VIEW MODE: Collections vs List
  const [viewMode, setViewMode] = useState<'collections' | 'list'>('collections');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  // Group recipes into collections
  // RENAMED from 'collections' to 'recipeGroups' to avoid ReferenceError with property names
  const recipeGroups = useMemo(() => {
    const groups: Record<string, Recipe[]> = {};

    // Default collection
    groups['All Recipes'] = savedRecipes;

    // Group by collections
    savedRecipes.forEach((recipe) => {
      if (recipe.collections && recipe.collections.length > 0) {
        recipe.collections.forEach((collection) => {
          if (!groups[collection]) groups[collection] = [];
          groups[collection].push(recipe);
        });
      }
    });

    return Object.entries(groups).map(([name, recipes]) => ({
      name,
      count: recipes.length,
      thumbnails: recipes
        .filter((r) => r.imageUrl)
        .map((r) => r.imageUrl!)
        .slice(0, 4), // Changed from 3 to 4 for better grid
    }));
  }, [savedRecipes]);

  // Filter logic based on active collection
  const filteredRecipes = useMemo(() => {
    let result = savedRecipes;

    // 1. Filter by Collection
    if (activeCollection && activeCollection !== 'All Recipes') {
      result = result.filter((r) => r.collections?.includes(activeCollection));
    }

    // 2. Filter by Difficulty
    if (filterDifficulty !== 'all') {
      result = result.filter((r) => r.difficulty === filterDifficulty);
    }

    // 3. Filter by Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(query) ||
          (recipe.description && recipe.description.toLowerCase().includes(query)) ||
          (recipe.ingredients &&
            recipe.ingredients.some((ing) => ing.item.toLowerCase().includes(query))),
      );
    }

    // 4. Sort
    const sorted = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'time':
          return parseInt(a.time_minutes || '0') - parseInt(b.time_minutes || '0');
        case 'calories':
          return parseInt(a.calories_per_serving || '0') - parseInt(b.calories_per_serving || '0');
        case 'recent':
        default:
          // Sort by createdAt if available, otherwise keep original order
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return 0;
      }
    });

    return sorted;
  }, [savedRecipes, searchQuery, activeCollection, sortBy, filterDifficulty]);

  // Back handler for collection view
  const handleBackToCollections = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode('collections');
    setActiveCollection(null);
  };

  const handleCreateCollection = async (name: string, ids: string[]) => {
    try {
      const collectionName = name.trim();
      const updatePromises = ids.map(async (id) => {
        const recipe = savedRecipes.find((r) => r.id === id);
        if (recipe) {
          const currentCollections = recipe.collections || [];
          if (!currentCollections.includes(collectionName)) {
            await updateRecipe({
              ...recipe,
              collections: [...currentCollections, collectionName],
            });
          }
        }
      });

      await Promise.all(updatePromises);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreateCollectionModalVisible(false);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to create collection.', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
    }
  };

  const handleDeleteCollection = (collectionName: string) => {
    if (collectionName === 'All Recipes') return;
    setCollectionToDelete(collectionName);
    setDeleteCollectionAlertVisible(true);
  };

  const confirmDeleteCollection = async () => {
    if (!collectionToDelete) return;

    try {
      const recipesToUpdate = savedRecipes.filter((r) =>
        r.collections?.includes(collectionToDelete),
      );

      const updatePromises = recipesToUpdate.map(async (recipe) => {
        const newCollections = recipe.collections?.filter((c) => c !== collectionToDelete) || [];
        await updateRecipe({
          ...recipe,
          collections: newCollections,
        });
      });

      await Promise.all(updatePromises);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to delete collection.', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
    }
  };

  const confirmDeleteRecipe = async () => {
    if (!recipeToDelete) return;
    await deleteRecipe(recipeToDelete);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleStartManualCreate = () => {
    const blankRecipe: Recipe = {
      title: '',
      description: '',
      ingredients: [],
      steps: [],
      time_minutes: '15',
      calories_per_serving: '0',
      servings: '1',
      difficulty: 'Easy',
      createdAt: new Date().toISOString(),
      collections: [],
    };
    setTempManualRecipe(blankRecipe);
    setManualModalVisible(true);
  };

  const handleSaveManual = async (recipe: Recipe) => {
    await saveRecipe(recipe);
    setManualModalVisible(false);
    setTempManualRecipe(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert('Success', 'Recipe created successfully!', undefined, {
      icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
    });
  };

  const handleShareRecipe = async (recipe: Recipe) => {
    const ingredientsList = recipe.ingredients
      .map((i) => `• ${i.quantity} ${i.unit} ${i.item}`)
      .join('\n');
    const stepsList = recipe.steps.map((s) => `${s.step}. ${s.instruction}`).join('\n\n');

    const message =
      `🍳 *${recipe.title}*\n\n` +
      `⏱️ Time: ${recipe.time_minutes}m | 🔥 Calories: ${recipe.calories_per_serving}\n\n` +
      `🛒 *Ingredients:*\n${ingredientsList}\n\n` +
      `👨‍🍳 *Instructions:*\n${stepsList}\n\n` +
      `_Made with Recook App_ 📲`;

    try {
      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="mt-20 items-center justify-center">
          <ActivityIndicator size="large" color="#8BD65E" />
        </View>
      );
    }

    if (searchQuery) {
      return (
        <View className="mt-20 items-center justify-center opacity-70">
          <SearchNormal1 size={80} color="#ccc" />
          <Text className="mt-4 font-visby-bold text-lg text-gray-500 dark:text-gray-400">
            No recipes found
          </Text>
          <Text className="w-3/4 text-center text-gray-400">
            Try finding a different recipe or checking your spelling.
          </Text>
        </View>
      );
    }

    return (
      <View className="mt-20 items-center justify-center opacity-70">
        <Book size={80} color="#ccc" />
        <Text className="mt-4 font-visby-bold text-lg text-gray-500 dark:text-gray-400">
          No recipes saved yet
        </Text>
        <Text className="mb-6 w-3/4 text-center font-visby text-gray-400 dark:text-gray-500">
          Create your first AI-powered recipe from any video or photo!
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/generate')}
          className="flex-row items-center rounded-full bg-[#8BD65E] px-6 py-3 shadow-lg shadow-green-200 dark:shadow-none"
        >
          <AddCircle size={20} color="white" variant="Bold" />
          <Text className="ml-2 font-visby-bold text-white">Create My First Recipe</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#0F0F0F]">
      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onUpdate={updateRecipe}
        onDelete={deleteRecipe}
        onShare={handleShareRecipe}
        onGenerateFull={async (r) => {
          await completeRecipe(r);
        }}
        availableCollections={recipeGroups.map((c) => c.name).filter((n) => n !== 'All Recipes')}
        key={selectedRecipe ? `view-${selectedRecipe.id}` : 'view-hidden'}
      />

      <RecipeDetailModal
        recipe={tempManualRecipe}
        visible={manualModalVisible}
        onClose={() => setManualModalVisible(false)}
        initialMode="edit"
        onUpdate={handleSaveManual}
        onDelete={() => setManualModalVisible(false)}
        onShare={() => {}}
        key={manualModalVisible ? 'manual-visible' : 'manual-hidden'}
      />

      {/* HEADER - AppBar */}
      <View className="flex-row items-center justify-between bg-white px-4 pb-3 pt-2 dark:bg-[#0F0F0F]">
        <View className="flex-1 flex-row items-center">
          {viewMode === 'list' && (
            <TouchableOpacity onPress={handleBackToCollections} className="mr-3">
              <ArrowLeft size={24} color={isDark ? 'white' : '#8BD65E'} variant="Outline" />
            </TouchableOpacity>
          )}
          <Text className="font-visby-bold text-xl text-[#8BD65E]">
            {viewMode === 'list' && activeCollection ? activeCollection : 'My Kitchen'}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">


          <TouchableOpacity
            onPress={toggleSearch}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <SearchNormal1 size={20} color={isDark ? '#9CA3AF' : '#666'} variant="Outline" />
          </TouchableOpacity>

          <ProButton />
        </View>
      </View>



      {/* Quick Actions */}
      <View className="mb-4 flex-row justify-around px-5 pb-2 pt-1">
        <TouchableOpacity onPress={() => router.push('/meal-planner')} className="items-center">
          <View className="mb-1 h-12 w-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20">
            <Calendar size={24} color="#F97316" />
          </View>
          <Text className="font-visby-bold text-xs text-gray-700 dark:text-gray-300">Planner</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/pantry')} className="items-center">
          <View className="mb-1 h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
            <Box size={24} color="#8BD65E" />
          </View>
          <Text className="font-visby-bold text-xs text-gray-700 dark:text-gray-300">Pantry</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/nutrition-analyzer')} className="items-center">
          <View className="mb-1 h-12 w-12 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/20">
            <Heart size={24} color="#8B5CF6" variant="Bold" />
          </View>
          <Text className="font-visby-bold text-xs text-gray-700 dark:text-gray-300">
            Nutrition
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/shopping-list')} className="items-center">
          <View className="mb-1 h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <ShoppingCart size={24} color="#3B82F6" />
          </View>
          <Text className="font-visby-bold text-xs text-gray-700 dark:text-gray-300">
            Shop List
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH OVERLAY MODAL */}
      <Modal
        visible={showSearch}
        animationType="fade"
        transparent={true}
        onRequestClose={toggleSearch}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0F0F0F]">
          <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-800">
             {/* Back Button */}
            <TouchableOpacity onPress={toggleSearch} className="mr-3">
              <ArrowLeft size={24} color={isDark ? 'white' : 'black'} />
            </TouchableOpacity>

            {/* Search Input */}
            <View className="flex-1 flex-row items-center rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
              <SearchNormal1 size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Search recipes..."
                placeholderTextColor="#9CA3AF"
                className="ml-2 h-full flex-1 font-visby text-base text-gray-900 dark:text-white"
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <CloseCircle size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filters in Search Modal */}
          <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
               {/* Sort Options */}
               <View className="mr-4 flex-row gap-2 border-r border-gray-100 pr-4 dark:border-gray-800">
                  <TouchableOpacity
                    onPress={() => { setSortBy('recent'); Haptics.selectionAsync(); }}
                    className={`rounded-full border px-3 py-1.5 ${sortBy === 'recent' ? 'get-blue-500 border-blue-500 bg-blue-500' : 'border-gray-200 bg-transparent dark:border-gray-700'}`}
                  >
                    <Text className={`font-visby-bold text-xs ${sortBy === 'recent' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>Recent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setSortBy('name'); Haptics.selectionAsync(); }}
                    className={`rounded-full border px-3 py-1.5 ${sortBy === 'name' ? 'border-blue-500 bg-blue-500' : 'border-gray-200 bg-transparent dark:border-gray-700'}`}
                  >
                    <Text className={`font-visby-bold text-xs ${sortBy === 'name' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>Name</Text>
                  </TouchableOpacity>
               </View>
               
               {/* Difficulty Options */}
               {[
                  { value: 'all', label: 'All Diff' },
                  { value: 'Easy', label: 'Easy' },
                  { value: 'Medium', label: 'Med' },
                  { value: 'Hard', label: 'Hard' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setFilterDifficulty(option.value as any);
                      Haptics.selectionAsync();
                    }}
                    className={`rounded-full border px-3 py-1.5 ${
                      filterDifficulty === option.value
                        ? 'border-orange-500 bg-orange-500'
                        : 'border-gray-200 bg-transparent dark:border-gray-700'
                    }`}
                  >
                    <Text
                      className={`font-visby-bold text-xs ${
                        filterDifficulty === option.value
                          ? 'text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>

          {/* Search Results */}
            <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => item.id || Math.random().toString()}
            renderItem={({ item }) => (
                <RecipeCard
                recipe={item}
                onPress={() => {
                    setSelectedRecipe(item);
                   // Optionally close search or keep it open
                }}
                onCollectionPress={() => {
                    setRecipeForCollection(item);
                    setCollectionSelectorVisible(true);
                }}
                onDelete={(id) => {
                    setRecipeToDelete(id);
                    setRecipeTitleToDelete(item.title);
                    setDeleteRecipeAlertVisible(true);
                }}
                onShare={handleShareRecipe}
                />
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10 }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled" 
            ListEmptyComponent={
                <View className="mt-20 items-center justify-center opacity-70">
                    <SearchNormal1 size={64} color="#ccc" />
                    <Text className="mt-4 font-visby-bold text-lg text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No recipes found' : 'Start typing to search'}
                    </Text>
                </View>
            }
            />
        </SafeAreaView>
      </Modal>

      {/* VIEW CONTENT */}
      {viewMode === 'collections' ? (
        <ScrollView className="flex-1 px-5 pt-2">
          <View className="flex-row flex-wrap justify-between pb-10">
            {recipeGroups.map((collection, index) => (
              <CollectionCard
                key={collection.name}
                name={collection.name}
                count={collection.count}
                images={collection.thumbnails}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveCollection(collection.name);
                  setViewMode('list');
                }}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleDeleteCollection(collection.name);
                }}
              />
            ))}
            <TouchableOpacity
              onPress={() => setCreateCollectionModalVisible(true)}
              className="mb-6 mr-4 aspect-square w-[45%] items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700"
            >
              <Add size={40} color={isDark ? '#555' : '#ccc'} />
              <Text className="mt-2 font-visby-bold text-gray-400">New Collection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => setSelectedRecipe(item)}
              onCollectionPress={() => {
                setRecipeForCollection(item);
                setCollectionSelectorVisible(true);
              }}
              onDelete={(id) => {
                setRecipeToDelete(id);
                setRecipeTitleToDelete(item.title);
                setDeleteRecipeAlertVisible(true);
              }}
              onShare={handleShareRecipe}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
         // ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        />
      )}

      <CollectionSelectorModal
        visible={collectionSelectorVisible}
        onClose={() => setCollectionSelectorVisible(false)}
        recipe={recipeForCollection}
        availableCollections={recipeGroups.map((c) => c.name).filter((n) => n !== 'All Recipes')}
        onToggleCollection={handleToggleCollection}
        onCreateCollection={(name) => {
          handleToggleCollection(name);
        }}
      />

      <CreateCollectionModal
        visible={createCollectionModalVisible}
        onClose={() => setCreateCollectionModalVisible(false)}
        recipes={savedRecipes}
        onCreate={handleCreateCollection}
      />

      {/* Custom Confirmation Modals */}
      <CustomAlertModal
        visible={deleteCollectionAlertVisible}
        title="Delete Collection"
        message={`Are you sure you want to delete "${collectionToDelete}"? This will remove the collection tag but keep your recipes.`}
        onClose={() => setDeleteCollectionAlertVisible(false)}
        onConfirm={confirmDeleteCollection}
        confirmText="Delete"
        type="destructive"
        icon="trash-outline"
      />

      <CustomAlertModal
        visible={deleteRecipeAlertVisible}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${recipeTitleToDelete}"? This action cannot be undone.`}
        onClose={() => setDeleteRecipeAlertVisible(false)}
        onConfirm={confirmDeleteRecipe}
        confirmText="Delete"
        type="destructive"
        icon="trash-outline"
      />

      {/* Floating Action Button for New Recipe */}
      <TouchableOpacity
        onPress={handleStartManualCreate}
        className="absolute bottom-6 right-6 z-50 h-16 w-16 items-center justify-center rounded-full bg-[#8BD65E] shadow-lg shadow-green-200 dark:shadow-none"
        style={{ elevation: 5 }}
      >
        <Add size={36} color="white" />
      </TouchableOpacity>

      {/* Toast for error/success notifications */}
      <Toast ref={toastRef} />
    </SafeAreaView>
  );
}
