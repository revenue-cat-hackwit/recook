# Ingredient Format Update - Migration Guide

## 📋 Overview

Ingredients format telah diubah dari **array of strings** menjadi **array of structured objects** untuk konsistensi dengan shopping list dan kemudahan integrasi.

## 🔄 Changes

### Before (Old Format)

```typescript
ingredients: string[]
// Example:
["200g Chicken breast", "2 cups Rice", "1 tbsp Soy sauce"]
```

### After (New Format)

```typescript
ingredients: Ingredient[]

interface Ingredient {
  item: string;      // Ingredient name
  quantity: number | string;  // Amount needed
  unit: string;      // Unit of measurement (g, ml, cup, tbsp, pcs, etc)
}

// Example:
[
  { item: "Chicken breast", quantity: 200, unit: "g" },
  { item: "Rice", quantity: 2, unit: "cup" },
  { item: "Soy sauce", quantity: 1, unit: "tbsp" }
]
```

## ✅ Benefits

1. **Consistency**: Format yang sama dengan shopping list (item, quantity, unit)
2. **Better UX**: Tampilan yang lebih rapi dengan quantity dan unit terpisah
3. **Data Processing**: Lebih mudah untuk aggregation, filtering, dan calculation
4. **Shopping List Integration**: Direct mapping tanpa parsing
5. **Internationalization**: Unit bisa ditranslate dengan mudah

## 🔧 Technical Changes

### 1. Type Definitions (`lib/types.ts`)

Added new `Ingredient` interface and updated `Recipe` type.

### 2. Database Schema (`schema.sql`)

Updated JSONB comment:

```sql
ingredients JSONB NOT NULL, -- [{item: "Chicken", quantity: 200, unit: "g"}]
```

### 3. Backend - Edge Function (`generate-recipe/index.ts`)

Updated AI JSON schema to return structured ingredients:

```typescript
"ingredients": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "item": { "type": "string" },
      "quantity": { "type": ["number", "string"] },
      "unit": { "type": "string" }
    },
    "required": ["item", "quantity", "unit"]
  }
}
```

### 4. Frontend Components

#### Shopping List Integration

**Before:**

```typescript
const ingredientsToAdd = recipe.ingredients.map((ing) => ({ name: ing }));
```

**After:**

```typescript
const ingredientsToAdd = recipe.ingredients.map((ing) => ({
  name: ing.item,
  quantity: ing.quantity,
  unit: ing.unit,
}));
```

#### Display

**Before:**

```tsx
<Text>{ing}</Text>
```

**After:**

```tsx
<Text>
  <Text className="font-visby-semibold">
    {ing.quantity} {ing.unit}
  </Text>{' '}
  {ing.item}
</Text>
```

#### Editing (RecipeDetailModal)

Updated to show 3 separate TextInputs:

- Quantity input (numeric)
- Unit input (text)
- Item name input (text)

### 5. Migration

Run the migration file to update existing recipes:

```bash
# The migration will automatically:
# 1. Parse old string format "200g Chicken" → {item: "Chicken", quantity: 200, unit: "g"}
# 2. Update user_recipes table
# 3. Update community_posts recipe_snapshot
```

### 6. Chatbot Parsing

Updated to parse AI responses and convert to structured format:

```typescript
// Pattern matching for "200g Chicken" or "2 cups flour"
const match = cleaned.match(/^([\d./]+)\s*([a-zA-Z]+)?\s+(.+)$/);
```

## 📝 Updated Files

### Backend

- ✅ `pirinku-backend/schema.sql`
- ✅ `pirinku-backend/supabase/functions/generate-recipe/index.ts`
- ✅ `pirinku-backend/supabase/migrations/20260203000000_update_ingredients_format.sql`

### Frontend - Types & Services

- ✅ `pirinku/lib/types.ts`
- ✅ `pirinku/lib/services/recipeService.ts` (already compatible)
- ✅ `pirinku/lib/store/shoppingListStore.ts` (already compatible)

### Frontend - Components

- ✅ `pirinku/components/recipes/RecipeDetailModal.tsx`
- ✅ `pirinku/app/(tabs)/generate.tsx`
- ✅ `pirinku/app/(tabs)/recipes.tsx`
- ✅ `pirinku/app/(tabs)/chatbot.tsx`
- ✅ `pirinku/app/meal-planner.tsx`

## 🧪 Testing Checklist

- [ ] Generate recipe from video/image → ingredients displayed correctly
- [ ] Add ingredients to shopping list → all fields (name, quantity, unit) populated
- [ ] Edit recipe manually → 3 input fields work properly
- [ ] Create recipe from chatbot → parsing works for various formats
- [ ] Share recipe → ingredients formatted correctly
- [ ] Meal planner → ingredient aggregation works
- [ ] Pantry availability check → ingredient matching works

## 🔍 Common Patterns

### Good Examples

```typescript
{ item: "Chicken breast", quantity: 200, unit: "g" }
{ item: "Flour", quantity: 2, unit: "cup" }
{ item: "Eggs", quantity: 3, unit: "pcs" }
{ item: "Salt", quantity: "1/2", unit: "tsp" }
{ item: "Water", quantity: 500, unit: "ml" }
```

### Unit Standards

- **Weight**: g, kg, oz, lb
- **Volume**: ml, l, cup, tbsp, tsp
- **Count**: pcs, whole
- **Special**: to taste, as needed

## 📞 Support

For questions or issues, please contact the development team or create an issue in the repository.
