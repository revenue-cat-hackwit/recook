# 🛠️ Panduan Implementasi Sistem Agentic - Pirinku

> **Dokumen ini adalah panduan teknis untuk mengimplementasikan sistem agentic
> yang dianalisis di AGENTIC_ARCHITECTURE_ANALYSIS.md**

---

## 📋 **TABLE OF CONTENTS**

1. [Database Schema Changes](#database-schema)
2. [Agent Orchestrator Implementation](#agent-orchestrator)
3. [Tool Calling System](#tool-calling)
4. [Proactive Agents](#proactive-agents)
5. [Context Management](#context-management)
6. [Cost Optimization](#cost-optimization)
7. [Testing Strategy](#testing)

---

## 🗄️ **1. DATABASE SCHEMA CHANGES** {#database-schema}

### **A. Agent Context Store**

```sql
-- ============================================
-- AGENT CONTEXT TABLE
-- Stores persistent context for AI agents
-- ============================================
CREATE TABLE agent_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL, -- 'preference', 'behavior', 'feedback', 'decision'
  context_key TEXT NOT NULL, -- e.g., 'favorite_cuisine', 'cooking_time_preference'
  context_value JSONB NOT NULL,
  confidence_score FLOAT DEFAULT 0.5, -- 0-1, how confident we are in this context
  source TEXT, -- 'explicit' (user told us), 'implicit' (inferred), 'learned'
  relevance_score FLOAT DEFAULT 1.0, -- Decays over time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INT DEFAULT 0,
  
  -- Indexes for fast retrieval
  CONSTRAINT unique_user_context UNIQUE(user_id, context_type, context_key)
);

CREATE INDEX idx_agent_context_user ON agent_context(user_id);
CREATE INDEX idx_agent_context_type ON agent_context(context_type);
CREATE INDEX idx_agent_context_relevance ON agent_context(relevance_score DESC);

-- Auto-update timestamp
CREATE TRIGGER update_agent_context_timestamp
BEFORE UPDATE ON agent_context
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Example data:
-- {
--   "user_id": "123",
--   "context_type": "preference",
--   "context_key": "favorite_cuisines",
--   "context_value": ["Italian", "Japanese", "Mexican"],
--   "confidence_score": 0.9,
--   "source": "explicit"
-- }
```

### **B. Agent Decisions Log**

```sql
-- ============================================
-- AGENT DECISIONS TABLE
-- Tracks all decisions made by agents for learning
-- ============================================
CREATE TABLE agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- 'recipe_suggester', 'meal_planner', 'pantry_monitor'
  decision_type TEXT NOT NULL, -- 'recipe_suggestion', 'shopping_list_update', 'meal_plan_creation'
  
  -- Input context that led to this decision
  input_context JSONB NOT NULL,
  
  -- The decision made
  decision_output JSONB NOT NULL,
  
  -- User response
  user_action TEXT, -- 'accepted', 'rejected', 'modified', 'ignored'
  user_feedback TEXT, -- Optional text feedback
  feedback_score INT CHECK (feedback_score BETWEEN 1 AND 5),
  
  -- Metadata
  reasoning TEXT, -- Agent's reasoning (for debugging/learning)
  confidence_score FLOAT,
  execution_time_ms INT,
  cost_usd DECIMAL(10, 6),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_decisions_user ON agent_decisions(user_id);
CREATE INDEX idx_agent_decisions_type ON agent_decisions(agent_type, decision_type);
CREATE INDEX idx_agent_decisions_feedback ON agent_decisions(user_action);

-- Example data:
-- {
--   "agent_type": "recipe_suggester",
--   "decision_type": "recipe_suggestion",
--   "input_context": {
--     "pantry_items": ["chicken", "tomato"],
--     "time_available": "30min",
--     "user_preferences": ["Italian"]
--   },
--   "decision_output": {
--     "recipe_id": "456",
--     "recipe_title": "Chicken Pomodoro",
--     "reasoning": "Uses available ingredients, matches Italian preference, fits time constraint"
--   },
--   "user_action": "accepted",
--   "confidence_score": 0.85
-- }
```

### **C. Agent Tasks Queue**

```sql
-- ============================================
-- AGENT TASKS TABLE
-- Queue for proactive agent tasks
-- ============================================
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  task_type TEXT NOT NULL, -- 'pantry_expiry_check', 'meal_plan_suggestion', 'shopping_optimization'
  priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=lowest, 10=highest
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Task data
  input_data JSONB,
  result_data JSONB,
  error_message TEXT,
  
  -- Retry logic
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_scheduled ON agent_tasks(scheduled_at);
CREATE INDEX idx_agent_tasks_priority ON agent_tasks(priority DESC);

-- Function to get pending tasks
CREATE FUNCTION get_pending_agent_tasks(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  task_type TEXT,
  priority INT,
  input_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    t.task_type,
    t.priority,
    t.input_data
  FROM agent_tasks t
  WHERE t.status = 'pending'
    AND t.scheduled_at <= NOW()
  ORDER BY t.priority DESC, t.scheduled_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

### **D. Materialized View for User Profiles**

```sql
-- ============================================
-- USER COOKING PROFILE
-- Aggregated view for fast agent context retrieval
-- ============================================
CREATE MATERIALIZED VIEW user_cooking_profile AS
SELECT 
  u.id as user_id,
  u.email,
  
  -- Recipe statistics
  COUNT(DISTINCT r.id) as total_recipes,
  ARRAY_AGG(DISTINCT r.difficulty) FILTER (WHERE r.difficulty IS NOT NULL) as difficulty_levels_tried,
  AVG(CAST(r.time_minutes AS INT)) FILTER (WHERE r.time_minutes ~ '^[0-9]+$') as avg_cooking_time,
  AVG(CAST(r.calories_per_serving AS INT)) FILTER (WHERE r.calories_per_serving ~ '^[0-9]+$') as avg_calories,
  
  -- Most common ingredients (top 20)
  (
    SELECT ARRAY_AGG(ingredient ORDER BY count DESC)
    FROM (
      SELECT UNNEST(r.ingredients) as ingredient, COUNT(*) as count
      FROM user_recipes r2
      WHERE r2.user_id = u.id
      GROUP BY ingredient
      ORDER BY count DESC
      LIMIT 20
    ) top_ingredients
  ) as common_ingredients,
  
  -- Pantry info
  (SELECT COUNT(*) FROM pantry_items WHERE user_id = u.id) as pantry_size,
  (SELECT ARRAY_AGG(DISTINCT category) FROM pantry_items WHERE user_id = u.id) as pantry_categories,
  (
    SELECT COUNT(*) 
    FROM pantry_items 
    WHERE user_id = u.id 
      AND expiry_date IS NOT NULL 
      AND expiry_date <= CURRENT_DATE + INTERVAL '3 days'
  ) as items_expiring_soon,
  
  -- Meal planning
  (SELECT COUNT(*) FROM meal_plans WHERE user_id = u.id) as total_meal_plans,
  (
    SELECT COUNT(*) 
    FROM meal_plans 
    WHERE user_id = u.id 
      AND date >= CURRENT_DATE 
      AND date <= CURRENT_DATE + INTERVAL '7 days'
  ) as upcoming_meals_count,
  
  -- Activity
  (SELECT MAX(created_at) FROM user_recipes WHERE user_id = u.id) as last_recipe_created,
  (SELECT MAX(created_at) FROM meal_plans WHERE user_id = u.id) as last_meal_plan_created,
  
  -- Preferences (from agent_context)
  (
    SELECT jsonb_object_agg(context_key, context_value)
    FROM agent_context
    WHERE user_id = u.id AND context_type = 'preference'
  ) as preferences

FROM auth.users u
LEFT JOIN user_recipes r ON r.user_id = u.id
GROUP BY u.id, u.email;

-- Refresh strategy: Daily or on-demand
CREATE INDEX idx_user_cooking_profile_user ON user_cooking_profile(user_id);

-- Function to refresh profile
CREATE FUNCTION refresh_user_cooking_profile(p_user_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  IF p_user_id IS NULL THEN
    REFRESH MATERIALIZED VIEW user_cooking_profile;
  ELSE
    -- Refresh only specific user (requires partitioning or custom logic)
    REFRESH MATERIALIZED VIEW user_cooking_profile;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### **E. Database Triggers for Event-Driven Behavior**

```sql
-- ============================================
-- TRIGGER: Pantry Item Added/Updated
-- Automatically creates agent task when pantry changes
-- ============================================
CREATE OR REPLACE FUNCTION trigger_pantry_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if item is expiring soon
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN
    INSERT INTO agent_tasks (user_id, task_type, priority, input_data)
    VALUES (
      NEW.user_id,
      'pantry_expiry_alert',
      8, -- High priority
      jsonb_build_object(
        'item_id', NEW.id,
        'item_name', NEW.ingredient_name,
        'expiry_date', NEW.expiry_date,
        'quantity', NEW.quantity
      )
    );
  END IF;
  
  -- Create task to suggest recipes with new ingredient
  INSERT INTO agent_tasks (user_id, task_type, priority, input_data)
  VALUES (
    NEW.user_id,
    'recipe_suggestion_from_pantry',
    5, -- Medium priority
    jsonb_build_object(
      'trigger', 'pantry_update',
      'new_item', NEW.ingredient_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_pantry_item_change
AFTER INSERT OR UPDATE ON pantry_items
FOR EACH ROW
EXECUTE FUNCTION trigger_pantry_analysis();

-- ============================================
-- TRIGGER: Meal Plan Gap Detection
-- Creates task when user has no upcoming meals
-- ============================================
CREATE OR REPLACE FUNCTION trigger_meal_plan_check()
RETURNS TRIGGER AS $$
DECLARE
  upcoming_count INT;
BEGIN
  -- Count upcoming meals for this user
  SELECT COUNT(*) INTO upcoming_count
  FROM meal_plans
  WHERE user_id = NEW.user_id
    AND date >= CURRENT_DATE
    AND date <= CURRENT_DATE + INTERVAL '3 days';
  
  -- If less than 3 meals planned, suggest creating more
  IF upcoming_count < 3 THEN
    INSERT INTO agent_tasks (user_id, task_type, priority, input_data)
    VALUES (
      NEW.user_id,
      'meal_plan_suggestion',
      6,
      jsonb_build_object(
        'trigger', 'meal_plan_gap',
        'upcoming_count', upcoming_count
      )
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicate tasks
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_meal_plan_change
AFTER INSERT OR DELETE ON meal_plans
FOR EACH ROW
EXECUTE FUNCTION trigger_meal_plan_check();
```

### **F. RPC Functions for Agent Context**

```sql
-- ============================================
-- RPC: Get Full Agent Context
-- Returns all relevant context for AI agent
-- ============================================
CREATE OR REPLACE FUNCTION get_agent_context(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  context JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- User profile
    'user_profile', (
      SELECT row_to_json(ucp)
      FROM user_cooking_profile ucp
      WHERE user_id = p_user_id
    ),
    
    -- Current pantry
    'pantry', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', ingredient_name,
          'quantity', quantity,
          'category', category,
          'expiry_date', expiry_date,
          'days_until_expiry', CASE 
            WHEN expiry_date IS NOT NULL 
            THEN EXTRACT(DAY FROM (expiry_date - CURRENT_DATE))
            ELSE NULL
          END
        )
      )
      FROM pantry_items
      WHERE user_id = p_user_id
    ),
    
    -- Upcoming meals
    'upcoming_meals', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date,
          'meal_type', meal_type,
          'recipe_id', recipe_id
        )
        ORDER BY date, meal_type
      )
      FROM meal_plans
      WHERE user_id = p_user_id
        AND date >= CURRENT_DATE
        AND date <= CURRENT_DATE + INTERVAL '7 days'
    ),
    
    -- Shopping list
    'shopping_list', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', name,
          'quantity', quantity,
          'unit', unit,
          'is_checked', is_checked
        )
      )
      FROM shopping_list_items
      WHERE user_id = p_user_id
        AND is_checked = false
    ),
    
    -- Recent decisions (for learning)
    'recent_decisions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'decision_type', decision_type,
          'user_action', user_action,
          'feedback_score', feedback_score
        )
        ORDER BY created_at DESC
      )
      FROM (
        SELECT * FROM agent_decisions
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
      ) recent
    ),
    
    -- Preferences
    'preferences', (
      SELECT jsonb_object_agg(context_key, context_value)
      FROM agent_context
      WHERE user_id = p_user_id
        AND context_type = 'preference'
    ),
    
    -- Behavioral patterns
    'behavior_patterns', (
      SELECT jsonb_object_agg(context_key, context_value)
      FROM agent_context
      WHERE user_id = p_user_id
        AND context_type = 'behavior'
    )
  ) INTO context;
  
  RETURN context;
END;
$$ LANGUAGE plpgsql;

-- Usage:
-- SELECT get_agent_context('user-uuid-here');
```

---

## 🤖 **2. AGENT ORCHESTRATOR IMPLEMENTATION** {#agent-orchestrator}

### **A. Edge Function: Agent Orchestrator**

```typescript
// supabase/functions/agent-orchestrator/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// TYPES
// ============================================
interface AgentContext {
    user_profile: any;
    pantry: any[];
    upcoming_meals: any[];
    shopping_list: any[];
    recent_decisions: any[];
    preferences: Record<string, any>;
    behavior_patterns: Record<string, any>;
}

interface Tool {
    name: string;
    description: string;
    parameters: any;
    execute: (params: any, context: AgentContext) => Promise<any>;
}

// ============================================
// TOOLS REGISTRY
// ============================================
const tools: Tool[] = [
    {
        name: "add_to_shopping_list",
        description: "Add items to user shopping list",
        parameters: {
            type: "object",
            properties: {
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            quantity: { type: "number" },
                            unit: { type: "string" },
                        },
                    },
                },
            },
            required: ["items"],
        },
        execute: async (params, context) => {
            // Implementation in next section
            return { success: true, added: params.items.length };
        },
    },

    {
        name: "suggest_recipe",
        description:
            "Suggest recipe based on available ingredients and preferences",
        parameters: {
            type: "object",
            properties: {
                ingredients: { type: "array", items: { type: "string" } },
                meal_type: {
                    type: "string",
                    enum: ["breakfast", "lunch", "dinner", "snack"],
                },
                max_time_minutes: { type: "number" },
            },
        },
        execute: async (params, context) => {
            // Implementation in next section
            return { recipe_id: "xxx", title: "Suggested Recipe" };
        },
    },

    {
        name: "create_meal_plan",
        description: "Create meal plan for specified dates",
        parameters: {
            type: "object",
            properties: {
                start_date: { type: "string", format: "date" },
                days: { type: "number", minimum: 1, maximum: 7 },
            },
            required: ["start_date", "days"],
        },
        execute: async (params, context) => {
            // Implementation in next section
            return { success: true, meals_created: params.days * 3 };
        },
    },

    {
        name: "analyze_pantry",
        description: "Analyze pantry for expiring items and suggest actions",
        parameters: {
            type: "object",
            properties: {
                days_threshold: { type: "number", default: 3 },
            },
        },
        execute: async (params, context) => {
            const expiringItems = context.pantry.filter(
                (item) =>
                    item.days_until_expiry !== null &&
                    item.days_until_expiry <= params.days_threshold,
            );
            return {
                expiring_items: expiringItems,
                count: expiringItems.length,
            };
        },
    },
];

// ============================================
// AGENT ORCHESTRATOR
// ============================================
serve(async (req) => {
    try {
        const { messages, user_id, agent_type = "general" } = await req.json();

        // Initialize Supabase
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get full agent context
        const { data: contextData } = await supabase.rpc("get_agent_context", {
            p_user_id: user_id,
        });

        const context: AgentContext = contextData;

        // Prepare system prompt with context
        const systemPrompt = `You are an intelligent cooking assistant agent.
    
User Context:
- Total recipes: ${context.user_profile?.total_recipes || 0}
- Pantry items: ${context.pantry?.length || 0}
- Items expiring soon: ${
            context.pantry?.filter((i) => i.days_until_expiry <= 3).length || 0
        }
- Upcoming meals: ${context.upcoming_meals?.length || 0}
- Preferences: ${JSON.stringify(context.preferences || {})}

You have access to these tools:
${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

Use tools when appropriate to help the user. Always explain your reasoning.`;

        // Call LLM with function calling
        const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

        let response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openaiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4-turbo-preview",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...messages,
                    ],
                    tools: tools.map((t) => ({
                        type: "function",
                        function: {
                            name: t.name,
                            description: t.description,
                            parameters: t.parameters,
                        },
                    })),
                    tool_choice: "auto",
                }),
            },
        );

        const completion = await response.json();
        const message = completion.choices[0].message;

        // Execute tool calls if any
        const toolResults = [];
        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                const tool = tools.find((t) =>
                    t.name === toolCall.function.name
                );
                if (tool) {
                    const params = JSON.parse(toolCall.function.arguments);
                    const result = await tool.execute(params, context);
                    toolResults.push({
                        tool: toolCall.function.name,
                        result,
                    });
                }
            }

            // If tools were called, get final response
            if (toolResults.length > 0) {
                const followUpMessages = [
                    { role: "system", content: systemPrompt },
                    ...messages,
                    message,
                    ...message.tool_calls.map((tc: any, i: number) => ({
                        role: "tool",
                        tool_call_id: tc.id,
                        content: JSON.stringify(toolResults[i].result),
                    })),
                ];

                response = await fetch(
                    "https://api.openai.com/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${openaiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: "gpt-4-turbo-preview",
                            messages: followUpMessages,
                        }),
                    },
                );

                const finalCompletion = await response.json();
                message.content = finalCompletion.choices[0].message.content;
            }
        }

        // Log decision
        await supabase.from("agent_decisions").insert({
            user_id,
            agent_type,
            decision_type: "chat_response",
            input_context: { messages },
            decision_output: {
                response: message.content,
                tools_used: toolResults.map((t) => t.tool),
            },
            reasoning: message.content,
        });

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    message: message.content,
                    tools_executed: toolResults,
                },
            }),
            { headers: { "Content-Type": "application/json" } },
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        );
    }
});
```

---

## 🔧 **3. TOOL CALLING SYSTEM** {#tool-calling}

### **Implementation of Tool Executors**

```typescript
// supabase/functions/shared/tools.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export class AgentTools {
    constructor(private supabase: SupabaseClient, private userId: string) {}

    // ============================================
    // TOOL: Add to Shopping List
    // ============================================
    async addToShoppingList(
        items: Array<{ name: string; quantity?: number; unit?: string }>,
    ) {
        const insertData = items.map((item) => ({
            user_id: this.userId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            is_checked: false,
        }));

        const { data, error } = await this.supabase
            .from("shopping_list_items")
            .insert(insertData)
            .select();

        if (error) throw error;

        return {
            success: true,
            added: data.length,
            items: data,
        };
    }

    // ============================================
    // TOOL: Suggest Recipe
    // ============================================
    async suggestRecipe(params: {
        ingredients?: string[];
        meal_type?: string;
        max_time_minutes?: number;
        dietary_restrictions?: string[];
    }) {
        // Get user's recipes
        const { data: recipes } = await this.supabase
            .from("user_recipes")
            .select("*")
            .eq("user_id", this.userId);

        // Filter based on criteria
        let filtered = recipes || [];

        if (params.max_time_minutes) {
            filtered = filtered.filter((r) => {
                const time = parseInt(r.time_minutes);
                return !isNaN(time) && time <= params.max_time_minutes!;
            });
        }

        if (params.ingredients && params.ingredients.length > 0) {
            filtered = filtered.filter((r) => {
                const recipeIngredients = r.ingredients.map((i: string) =>
                    i.toLowerCase()
                );
                return params.ingredients!.some((ing) =>
                    recipeIngredients.some((ri: string) =>
                        ri.includes(ing.toLowerCase())
                    )
                );
            });
        }

        // Score and rank
        const scored = filtered.map((recipe) => ({
            ...recipe,
            score: this.scoreRecipe(recipe, params),
        })).sort((a, b) => b.score - a.score);

        return {
            suggestions: scored.slice(0, 3),
            total_matches: scored.length,
        };
    }

    private scoreRecipe(recipe: any, params: any): number {
        let score = 0;

        // Ingredient match score
        if (params.ingredients) {
            const matches = params.ingredients.filter((ing: string) =>
                recipe.ingredients.some((ri: string) =>
                    ri.toLowerCase().includes(ing.toLowerCase())
                )
            );
            score += (matches.length / params.ingredients.length) * 50;
        }

        // Time preference score
        if (params.max_time_minutes) {
            const time = parseInt(recipe.time_minutes);
            if (!isNaN(time)) {
                score += (1 - (time / params.max_time_minutes)) * 30;
            }
        }

        // Difficulty score (easier = higher score for quick suggestions)
        const difficultyScore = {
            "Easy": 20,
            "Medium": 15,
            "Hard": 10,
        };
        score +=
            difficultyScore[
                recipe.difficulty as keyof typeof difficultyScore
            ] || 10;

        return score;
    }

    // ============================================
    // TOOL: Create Meal Plan
    // ============================================
    async createMealPlan(params: {
        start_date: string;
        days: number;
        preferences?: any;
    }) {
        const mealTypes = ["breakfast", "lunch", "dinner"];
        const plans = [];

        for (let day = 0; day < params.days; day++) {
            const date = new Date(params.start_date);
            date.setDate(date.getDate() + day);
            const dateStr = date.toISOString().split("T")[0];

            for (const mealType of mealTypes) {
                // Get recipe suggestion for this meal
                const { suggestions } = await this.suggestRecipe({
                    meal_type: mealType,
                    ...params.preferences,
                });

                if (suggestions.length > 0) {
                    plans.push({
                        user_id: this.userId,
                        recipe_id: suggestions[0].id,
                        date: dateStr,
                        meal_type: mealType,
                    });
                }
            }
        }

        // Insert meal plans
        const { data, error } = await this.supabase
            .from("meal_plans")
            .insert(plans)
            .select();

        if (error) throw error;

        return {
            success: true,
            meals_created: data.length,
            plan: data,
        };
    }

    // ============================================
    // TOOL: Analyze Pantry
    // ============================================
    async analyzePantry(params: { days_threshold?: number } = {}) {
        const threshold = params.days_threshold || 3;

        const { data: pantryItems } = await this.supabase
            .from("pantry_items")
            .select("*")
            .eq("user_id", this.userId);

        const now = new Date();
        const expiringItems = (pantryItems || []).filter((item) => {
            if (!item.expiry_date) return false;
            const expiry = new Date(item.expiry_date);
            const daysUntil = Math.ceil(
                (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return daysUntil <= threshold && daysUntil >= 0;
        });

        // Get recipe suggestions for expiring items
        const suggestions = [];
        if (expiringItems.length > 0) {
            const ingredients = expiringItems.map((i) => i.ingredient_name);
            const { suggestions: recipes } = await this.suggestRecipe({
                ingredients,
            });
            suggestions.push(...recipes);
        }

        return {
            total_items: pantryItems?.length || 0,
            expiring_items: expiringItems,
            expiring_count: expiringItems.length,
            recipe_suggestions: suggestions,
        };
    }

    // ============================================
    // TOOL: Update Context
    // ============================================
    async updateContext(params: {
        context_type: string;
        context_key: string;
        context_value: any;
        source?: string;
    }) {
        const { error } = await this.supabase
            .from("agent_context")
            .upsert({
                user_id: this.userId,
                context_type: params.context_type,
                context_key: params.context_key,
                context_value: params.context_value,
                source: params.source || "agent",
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "user_id,context_type,context_key",
            });

        if (error) throw error;

        return { success: true };
    }
}
```

---

## ⏰ **4. PROACTIVE AGENTS** {#proactive-agents}

### **Scheduled Edge Function: Daily Agent Tasks**

```typescript
// supabase/functions/daily-agent-tasks/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get all active users
        const { data: users } = await supabase
            .from("auth.users")
            .select("id")
            .limit(100); // Process in batches

        const results = [];

        for (const user of users || []) {
            const userResults = await processUserTasks(supabase, user.id);
            results.push({ user_id: user.id, ...userResults });
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: results.length,
                results,
            }),
            { headers: { "Content-Type": "application/json" } },
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500 },
        );
    }
});

async function processUserTasks(supabase: any, userId: string) {
    const tasks = {
        pantry_check: false,
        meal_plan_check: false,
        shopping_optimization: false,
    };

    // Get user context
    const { data: context } = await supabase.rpc("get_agent_context", {
        p_user_id: userId,
    });

    // ============================================
    // TASK 1: Pantry Expiry Check
    // ============================================
    const expiringItems = context.pantry?.filter(
        (item: any) =>
            item.days_until_expiry !== null && item.days_until_expiry <= 3,
    ) || [];

    if (expiringItems.length > 0) {
        await supabase.from("agent_tasks").insert({
            user_id: userId,
            task_type: "pantry_expiry_alert",
            priority: 8,
            input_data: {
                expiring_items: expiringItems,
                message:
                    `You have ${expiringItems.length} items expiring soon!`,
            },
        });
        tasks.pantry_check = true;
    }

    // ============================================
    // TASK 2: Meal Plan Gap Check
    // ============================================
    const upcomingMeals = context.upcoming_meals?.length || 0;

    if (upcomingMeals < 5) {
        await supabase.from("agent_tasks").insert({
            user_id: userId,
            task_type: "meal_plan_suggestion",
            priority: 6,
            input_data: {
                current_meals: upcomingMeals,
                suggested_action: "create_weekly_plan",
            },
        });
        tasks.meal_plan_check = true;
    }

    // ============================================
    // TASK 3: Shopping List Optimization
    // ============================================
    const shoppingItems = context.shopping_list?.length || 0;
    const pantryItems = context.pantry || [];

    if (shoppingItems > 0) {
        // Check for duplicates with pantry
        const duplicates = context.shopping_list?.filter((shopItem: any) =>
            pantryItems.some((pantryItem: any) =>
                pantryItem.name.toLowerCase().includes(
                    shopItem.name.toLowerCase(),
                )
            )
        ) || [];

        if (duplicates.length > 0) {
            await supabase.from("agent_tasks").insert({
                user_id: userId,
                task_type: "shopping_list_optimization",
                priority: 5,
                input_data: {
                    duplicates,
                    message:
                        `${duplicates.length} items on your shopping list are already in your pantry`,
                },
            });
            tasks.shopping_optimization = true;
        }
    }

    return tasks;
}
```

### **Setup Cron Job (Supabase)**

```sql
-- In Supabase Dashboard > Database > Extensions
-- Enable pg_cron extension

-- Schedule daily agent tasks at 8 AM
SELECT cron.schedule(
  'daily-agent-tasks',
  '0 8 * * *', -- Every day at 8 AM
  $$
  SELECT
    net.http_post(
      url:='https://your-project.supabase.co/functions/v1/daily-agent-tasks',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

---

## 💾 **5. CONTEXT MANAGEMENT** {#context-management}

### **Client-Side Context Service**

```typescript
// lib/services/agentContextService.ts

import { supabase } from "@/lib/supabase";

export class AgentContextService {
    /**
     * Get full agent context for current user
     */
    static async getContext(): Promise<any> {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("Not authenticated");

        const { data, error } = await supabase.rpc("get_agent_context", {
            p_user_id: userData.user.id,
        });

        if (error) throw error;
        return data;
    }

    /**
     * Update user preference context
     */
    static async updatePreference(key: string, value: any) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("Not authenticated");

        const { error } = await supabase.from("agent_context").upsert({
            user_id: userData.user.id,
            context_type: "preference",
            context_key: key,
            context_value: value,
            source: "explicit",
            confidence_score: 1.0,
        }, {
            onConflict: "user_id,context_type,context_key",
        });

        if (error) throw error;
    }

    /**
     * Record agent decision feedback
     */
    static async recordFeedback(params: {
        decisionId: string;
        action: "accepted" | "rejected" | "modified";
        feedbackScore?: number;
        feedbackText?: string;
    }) {
        const { error } = await supabase
            .from("agent_decisions")
            .update({
                user_action: params.action,
                feedback_score: params.feedbackScore,
                user_feedback: params.feedbackText,
                responded_at: new Date().toISOString(),
            })
            .eq("id", params.decisionId);

        if (error) throw error;
    }

    /**
     * Get pending agent tasks for user
     */
    static async getPendingTasks() {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from("agent_tasks")
            .select("*")
            .eq("user_id", userData.user.id)
            .eq("status", "pending")
            .order("priority", { ascending: false })
            .order("scheduled_at", { ascending: true });

        if (error) throw error;
        return data;
    }

    /**
     * Mark task as completed
     */
    static async completeTask(taskId: string, result?: any) {
        const { error } = await supabase
            .from("agent_tasks")
            .update({
                status: "completed",
                completed_at: new Date().toISOString(),
                result_data: result,
            })
            .eq("id", taskId);

        if (error) throw error;
    }
}
```

---

## 💰 **6. COST OPTIMIZATION** {#cost-optimization}

### **Caching Strategy**

```typescript
// lib/services/agentCacheService.ts

import AsyncStorage from "@react-native-async-storage/async-storage";

export class AgentCacheService {
    private static CACHE_PREFIX = "agent_cache_";
    private static DEFAULT_TTL = 3600; // 1 hour

    /**
     * Get cached data
     */
    static async get<T>(key: string): Promise<T | null> {
        try {
            const cached = await AsyncStorage.getItem(this.CACHE_PREFIX + key);
            if (!cached) return null;

            const { data, expiry } = JSON.parse(cached);

            if (Date.now() > expiry) {
                await this.delete(key);
                return null;
            }

            return data as T;
        } catch {
            return null;
        }
    }

    /**
     * Set cached data
     */
    static async set(
        key: string,
        data: any,
        ttlSeconds: number = this.DEFAULT_TTL,
    ) {
        const expiry = Date.now() + (ttlSeconds * 1000);
        await AsyncStorage.setItem(
            this.CACHE_PREFIX + key,
            JSON.stringify({ data, expiry }),
        );
    }

    /**
     * Delete cached data
     */
    static async delete(key: string) {
        await AsyncStorage.removeItem(this.CACHE_PREFIX + key);
    }

    /**
     * Clear all agent cache
     */
    static async clearAll() {
        const keys = await AsyncStorage.getAllKeys();
        const agentKeys = keys.filter((k) => k.startsWith(this.CACHE_PREFIX));
        await AsyncStorage.multiRemove(agentKeys);
    }
}

// Usage in agent service:
export class SmartAgentService {
    static async getContextWithCache(userId: string) {
        // Try cache first
        const cached = await AgentCacheService.get(`context_${userId}`);
        if (cached) return cached;

        // Fetch fresh data
        const context = await AgentContextService.getContext();

        // Cache for 30 minutes
        await AgentCacheService.set(`context_${userId}`, context, 1800);

        return context;
    }
}
```

### **Model Selection Strategy**

```typescript
// lib/services/modelSelector.ts

export class ModelSelector {
    /**
     * Select appropriate model based on task complexity
     */
    static selectModel(task: {
        type: string;
        complexity?: number;
        requiresReasoning?: boolean;
        maxTokens?: number;
    }): string {
        // High complexity or reasoning tasks -> GPT-4
        if (task.complexity && task.complexity > 0.7) {
            return "gpt-4-turbo-preview";
        }

        if (task.requiresReasoning) {
            return "gpt-4-turbo-preview";
        }

        // Simple tasks -> GPT-3.5
        if (task.type === "simple_suggestion" || task.type === "formatting") {
            return "gpt-3.5-turbo";
        }

        // Large outputs -> GPT-4 Turbo (128k context)
        if (task.maxTokens && task.maxTokens > 4000) {
            return "gpt-4-turbo-preview";
        }

        // Default
        return "gpt-3.5-turbo";
    }

    /**
     * Estimate cost for operation
     */
    static estimateCost(
        model: string,
        inputTokens: number,
        outputTokens: number,
    ): number {
        const pricing = {
            "gpt-4-turbo-preview": { input: 0.01 / 1000, output: 0.03 / 1000 },
            "gpt-3.5-turbo": { input: 0.0005 / 1000, output: 0.0015 / 1000 },
        };

        const price = pricing[model as keyof typeof pricing] ||
            pricing["gpt-3.5-turbo"];
        return (inputTokens * price.input) + (outputTokens * price.output);
    }
}
```

---

## 🧪 **7. TESTING STRATEGY** {#testing}

### **Unit Tests for Tools**

```typescript
// __tests__/agentTools.test.ts

import { AgentTools } from "@/lib/services/agentTools";
import { createClient } from "@supabase/supabase-js";

describe("AgentTools", () => {
    let tools: AgentTools;
    let supabase: any;

    beforeEach(() => {
        supabase = createClient("mock-url", "mock-key");
        tools = new AgentTools(supabase, "test-user-id");
    });

    describe("addToShoppingList", () => {
        it("should add items to shopping list", async () => {
            const items = [
                { name: "Tomato", quantity: 2, unit: "kg" },
                { name: "Onion", quantity: 1, unit: "kg" },
            ];

            const result = await tools.addToShoppingList(items);

            expect(result.success).toBe(true);
            expect(result.added).toBe(2);
        });
    });

    describe("suggestRecipe", () => {
        it("should suggest recipes based on ingredients", async () => {
            const result = await tools.suggestRecipe({
                ingredients: ["chicken", "tomato"],
                max_time_minutes: 30,
            });

            expect(result.suggestions).toBeDefined();
            expect(result.suggestions.length).toBeGreaterThan(0);
        });
    });
});
```

### **Integration Tests**

```typescript
// __tests__/agentOrchestrator.test.ts

describe("Agent Orchestrator", () => {
    it("should execute tool calls correctly", async () => {
        const response = await fetch(
            "http://localhost:54321/functions/v1/agent-orchestrator",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: "test-user",
                    messages: [
                        {
                            role: "user",
                            content: "Add tomatoes to my shopping list",
                        },
                    ],
                }),
            },
        );

        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.tools_executed).toContain("add_to_shopping_list");
    });
});
```

---

## 📊 **MONITORING & OBSERVABILITY**

```sql
-- View for agent performance metrics
CREATE VIEW agent_performance_metrics AS
SELECT 
  agent_type,
  decision_type,
  COUNT(*) as total_decisions,
  COUNT(*) FILTER (WHERE user_action = 'accepted') as accepted,
  COUNT(*) FILTER (WHERE user_action = 'rejected') as rejected,
  AVG(feedback_score) as avg_feedback_score,
  AVG(execution_time_ms) as avg_execution_time,
  SUM(cost_usd) as total_cost
FROM agent_decisions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY agent_type, decision_type;

-- Query to monitor
SELECT * FROM agent_performance_metrics;
```

---

**Status:** 🛠️ Implementation Guide Complete **Next:** Begin Phase 1
implementation with database schema changes
