# 🐛 Analisis Bug: Chat History Navigation

> **Bug Report**: Masalah navigasi antara new chat dan existing chat sessions

---

## 📋 **DESKRIPSI BUG**

### **Scenario:**

1. User membuka chat (ada existing sessions)
2. User klik "New Chat" dari sidebar
3. Chat baru dimulai (messages kosong, currentTitleId = null)
4. User membuka sidebar lagi
5. User klik existing chat session
6. **BUG**: ???

---

## 🔍 **ANALISIS KODE**

### **1. State Management di `chatbot.tsx`**

```typescript
// Line 69-72
const [messages, setMessages] = useState<Message[]>([]);
const [chatSessions, setChatSessions] = useState<any[]>([]);
const [currentTitleId, setCurrentTitleId] = useState<string | null>(null);
```

**State yang dikelola:**

- `messages` - Array pesan di chat saat ini
- `chatSessions` - List semua chat sessions
- `currentTitleId` - ID session yang sedang aktif (null = new chat)

---

### **2. Flow "New Chat" Button**

```typescript
// Line 522-531: Handler onNewChat
onNewChat={() => {
  setMessages([]);              // ✅ Clear messages
  setInputText('');             // ✅ Clear input
  setCurrentTitleId(null);      // ✅ Set to null (new chat mode)
  setHistoryDrawerVisible(false); // ✅ Close drawer
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  showAlert('New Chat Started', 'Ready for a fresh conversation! 🍳', undefined, {
    icon: <TickCircle size={32} color="#10B981" variant="Bold" />
  });
}}
```

**✅ Flow ini BENAR:**

- Clear messages
- Clear input
- Set currentTitleId ke null
- Close drawer
- Show notification

---

### **3. Flow "Select Existing Session"**

```typescript
// Line 488-493: Handler onSelectSession
onSelectSession={(id) => {
  console.log('Selected session:', id);
  setCurrentTitleId(id);        // ✅ Set current session ID
  loadHistory(id);              // ✅ Load messages
  setHistoryDrawerVisible(false); // ✅ Close drawer
}}
```

**✅ Flow ini juga BENAR:**

- Set currentTitleId ke session ID
- Load history dari database
- Close drawer

---

### **4. Function `loadHistory`**

```typescript
// Line 135-146
const loadHistory = async (sessionId: string) => {
    setLoading(true);
    try {
        const history = await AIService.getHistory(sessionId);
        setMessages(history); // ✅ Update messages
    } catch (e) {
        console.error("Failed to load history", e);
        setMessages([]); // ⚠️ Fallback: empty messages
    } finally {
        setLoading(false);
    }
};
```

**Potential Issue:**

- Jika `AIService.getHistory()` gagal, messages di-set ke `[]`
- Tapi `currentTitleId` tetap ada (tidak di-reset)
- **Inconsistent state**: currentTitleId ada, tapi messages kosong

---

### **5. Function `sendMessage` - New Session Logic**

```typescript
// Line 188-201: New session handling
let sessionId = currentTitleId;

// 3. New Session Handling (if no session selected)
if (!sessionId) {
    // Create session in DB first to get a real ID
    const newSessionId = await AIService.createSession(
        userMessageContent.slice(0, 50),
    );
    if (newSessionId) {
        sessionId = newSessionId;
        setCurrentTitleId(sessionId); // ✅ Update state
    } else {
        throw new Error("Failed to start new conversation");
    }
}
```

**Potential Issue:**

- Ketika user di "New Chat" mode (currentTitleId = null)
- Lalu user send message
- Session baru dibuat dan currentTitleId di-update
- **TAPI**: Jika user sudah load existing session sebelumnya, lalu klik "New
  Chat", lalu send message...
  - State sudah benar (currentTitleId = null)
  - Session baru akan dibuat ✅

---

### **6. Initial Load Logic**

```typescript
// Line 98-102: useEffect on mount
useEffect(() => {
    loadSessions();
    loadSavedRecipes();
}, []);

// Line 111-133: loadSessions function
const loadSessions = async () => {
    setChatHistoryLoading(true);
    try {
        const sessions = await AIService.getSessions();
        setChatSessions(sessions);

        // ⚠️ POTENTIAL BUG HERE
        if (sessions.length > 0 && !currentTitleId) {
            setCurrentTitleId(sessions[0].id); // Auto-select first session
            loadHistory(sessions[0].id); // Auto-load its history
        } else if (sessions.length === 0) {
            setCurrentTitleId(null);
            setMessages([]);
        }
        return sessions;
    } catch (error) {
        console.error("Failed to load chat sessions:", error);
        return [];
    } finally {
        setChatHistoryLoading(false);
    }
};
```

**🔴 FOUND THE BUG!**

**Problem:**

```typescript
// Line 118-120
if (sessions.length > 0 && !currentTitleId) {
    setCurrentTitleId(sessions[0].id);
    loadHistory(sessions[0].id);
}
```

**Scenario yang bermasalah:**

1. **Initial load:**
   - `loadSessions()` dipanggil
   - `currentTitleId` = null
   - Condition `sessions.length > 0 && !currentTitleId` = TRUE
   - Auto-select first session ✅

2. **User klik "New Chat":**
   - `setCurrentTitleId(null)` ✅
   - `setMessages([])` ✅
   - Drawer closed ✅

3. **User membuka sidebar lagi:**
   - `useEffect` di line 105-109 triggered:
   ```typescript
   useEffect(() => {
       if (historyDrawerVisible) {
           loadSessions(); // ⚠️ CALLED AGAIN
       }
   }, [historyDrawerVisible]);
   ```

4. **`loadSessions()` dipanggil lagi:**
   - `currentTitleId` = null (karena new chat)
   - `sessions.length > 0` = true
   - Condition `sessions.length > 0 && !currentTitleId` = TRUE
   - **🔴 AUTO-SELECT FIRST SESSION AGAIN!**
   - **🔴 LOAD HISTORY AUTOMATICALLY!**
   - **User's "New Chat" state is LOST!**

---

## 🎯 **ROOT CAUSE**

**Bug terjadi karena:**

1. `loadSessions()` dipanggil setiap kali drawer dibuka (line 105-109)
2. `loadSessions()` memiliki logic auto-select first session jika
   `currentTitleId = null` (line 118-120)
3. Ketika user di "New Chat" mode (`currentTitleId = null`), membuka drawer akan
   trigger `loadSessions()`
4. `loadSessions()` melihat `currentTitleId = null` dan auto-select first
   session
5. **User's intention untuk "New Chat" di-override!**

---

## 🔧 **SOLUSI**

### **Option 1: Tambah Flag untuk Intentional New Chat** ⭐ **RECOMMENDED**

```typescript
// Add new state
const [isIntentionalNewChat, setIsIntentionalNewChat] = useState(false);

// Update onNewChat handler
onNewChat={() => {
  setMessages([]);
  setInputText('');
  setCurrentTitleId(null);
  setIsIntentionalNewChat(true);  // ✅ Mark as intentional
  setHistoryDrawerVisible(false);
  // ... notifications
}}

// Update loadSessions logic
const loadSessions = async () => {
  setChatHistoryLoading(true);
  try {
    const sessions = await AIService.getSessions();
    setChatSessions(sessions);
    
    // ✅ Only auto-select if NOT intentional new chat
    if (sessions.length > 0 && !currentTitleId && !isIntentionalNewChat) {
      setCurrentTitleId(sessions[0].id);
      loadHistory(sessions[0].id);
    } else if (sessions.length === 0) {
      setCurrentTitleId(null);
      setMessages([]);
    }
    return sessions;
  } catch (error) {
    console.error('Failed to load chat sessions:', error);
    return [];
  } finally {
    setChatHistoryLoading(false);
  }
};

// Reset flag when user selects a session
onSelectSession={(id) => {
  console.log('Selected session:', id);
  setCurrentTitleId(id);
  setIsIntentionalNewChat(false);  // ✅ Reset flag
  loadHistory(id);
  setHistoryDrawerVisible(false);
}}

// Reset flag when new session is created (after sending first message)
// In sendMessage function, after creating new session:
if (newSessionId) {
    sessionId = newSessionId;
    setCurrentTitleId(sessionId);
    setIsIntentionalNewChat(false);  // ✅ Reset flag
}
```

**Pros:**

- ✅ Explicit intent tracking
- ✅ Clear separation between auto-load and manual new chat
- ✅ Minimal code changes

**Cons:**

- ⚠️ Adds one more state variable

---

### **Option 2: Remove Auto-Select Logic**

```typescript
const loadSessions = async () => {
    setChatHistoryLoading(true);
    try {
        const sessions = await AIService.getSessions();
        setChatSessions(sessions);

        // ❌ REMOVE auto-select logic
        // if (sessions.length > 0 && !currentTitleId) {
        //   setCurrentTitleId(sessions[0].id);
        //   loadHistory(sessions[0].id);
        // }

        // Only clear if no sessions
        if (sessions.length === 0) {
            setCurrentTitleId(null);
            setMessages([]);
        }

        return sessions;
    } catch (error) {
        console.error("Failed to load chat sessions:", error);
        return [];
    } finally {
        setChatHistoryLoading(false);
    }
};
```

**Pros:**

- ✅ Simplest solution
- ✅ No extra state needed
- ✅ User always starts with empty chat

**Cons:**

- ⚠️ User harus manually select session setiap kali buka app
- ⚠️ Worse UX for returning users

---

### **Option 3: Only Auto-Select on Initial Mount**

```typescript
// Add ref to track if initial load happened
const hasInitiallyLoaded = useRef(false);

const loadSessions = async () => {
    setChatHistoryLoading(true);
    try {
        const sessions = await AIService.getSessions();
        setChatSessions(sessions);

        // ✅ Only auto-select on FIRST load
        if (
            sessions.length > 0 && !currentTitleId &&
            !hasInitiallyLoaded.current
        ) {
            setCurrentTitleId(sessions[0].id);
            loadHistory(sessions[0].id);
            hasInitiallyLoaded.current = true; // ✅ Mark as loaded
        } else if (sessions.length === 0) {
            setCurrentTitleId(null);
            setMessages([]);
        }
        return sessions;
    } catch (error) {
        console.error("Failed to load chat sessions:", error);
        return [];
    } finally {
        setChatHistoryLoading(false);
    }
};
```

**Pros:**

- ✅ Good UX on first load
- ✅ Preserves user's "New Chat" intent

**Cons:**

- ⚠️ Uses ref (slightly less clean than state)
- ⚠️ Still has edge case: if user deletes all sessions then creates new one

---

### **Option 4: Don't Reload Sessions on Drawer Open** ⭐ **ALSO GOOD**

```typescript
// ❌ REMOVE this useEffect
// useEffect(() => {
//   if (historyDrawerVisible) {
//     loadSessions();
//   }
// }, [historyDrawerVisible]);

// Instead, only reload sessions when:
// 1. Component mounts (already exists)
// 2. After creating new session (already exists - line 227)
// 3. After deleting session (already exists - line 503)
```

**Pros:**

- ✅ Fixes the bug completely
- ✅ Better performance (less API calls)
- ✅ Simpler code

**Cons:**

- ⚠️ Sessions list might be slightly stale when drawer opens
- ⚠️ But this is acceptable since we reload after create/delete

---

## 🎖️ **REKOMENDASI**

### **🏆 Best Solution: Kombinasi Option 1 + Option 4**

```typescript
// 1. Remove reload on drawer open (Option 4)
// Delete useEffect at line 105-109

// 2. Add intentional new chat flag (Option 1)
const [isIntentionalNewChat, setIsIntentionalNewChat] = useState(false);

// 3. Update loadSessions
const loadSessions = async () => {
  setChatHistoryLoading(true);
  try {
    const sessions = await AIService.getSessions();
    setChatSessions(sessions);
    
    // Only auto-select if:
    // - Has sessions
    // - No current session
    // - NOT intentional new chat
    if (sessions.length > 0 && !currentTitleId && !isIntentionalNewChat) {
      setCurrentTitleId(sessions[0].id);
      loadHistory(sessions[0].id);
    } else if (sessions.length === 0) {
      setCurrentTitleId(null);
      setMessages([]);
    }
    return sessions;
  } catch (error) {
    console.error('Failed to load chat sessions:', error);
    return [];
  } finally {
    setChatHistoryLoading(false);
  }
};

// 4. Update onNewChat
onNewChat={() => {
  setMessages([]);
  setInputText('');
  setCurrentTitleId(null);
  setIsIntentionalNewChat(true);  // ✅ Set flag
  setHistoryDrawerVisible(false);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  showAlert('New Chat Started', 'Ready for a fresh conversation! 🍳', undefined, {
    icon: <TickCircle size={32} color="#10B981" variant="Bold" />
  });
}}

// 5. Update onSelectSession
onSelectSession={(id) => {
  console.log('Selected session:', id);
  setCurrentTitleId(id);
  setIsIntentionalNewChat(false);  // ✅ Reset flag
  loadHistory(id);
  setHistoryDrawerVisible(false);
}}

// 6. Reset flag after creating new session (in sendMessage)
if (newSessionId) {
    sessionId = newSessionId;
    setCurrentTitleId(sessionId);
    setIsIntentionalNewChat(false);  // ✅ Reset flag
}
```

**Why this is best:**

- ✅ Fixes the bug completely
- ✅ Better performance (less API calls)
- ✅ Clear intent tracking
- ✅ Good UX for all scenarios

---

## 🧪 **TEST CASES**

### **Test 1: New Chat Flow**

```
1. User opens app
   → Should auto-load first session ✅

2. User clicks "New Chat"
   → Messages cleared ✅
   → currentTitleId = null ✅
   → isIntentionalNewChat = true ✅

3. User opens sidebar
   → Sessions list shown ✅
   → Current chat still empty ✅ (BUG FIXED)

4. User sends message in new chat
   → New session created ✅
   → isIntentionalNewChat = false ✅
```

### **Test 2: Switch Between Sessions**

```
1. User in Session A
   → Messages from A shown ✅

2. User opens sidebar, selects Session B
   → Messages from B loaded ✅
   → currentTitleId = B.id ✅
   → isIntentionalNewChat = false ✅

3. User opens sidebar again
   → Still in Session B ✅
```

### **Test 3: Delete Current Session**

```
1. User in Session A
2. User deletes Session A
   → Messages cleared ✅
   → currentTitleId = null ✅
   → Sessions reloaded ✅
   → Auto-select first session (if exists) ✅
```

---

## 📊 **SUMMARY**

### **Bug:**

- Opening sidebar after "New Chat" auto-loads first session
- User's "New Chat" intent is lost

### **Root Cause:**

- `loadSessions()` called every time drawer opens
- Auto-select logic triggers when `currentTitleId = null`
- No distinction between "intentional new chat" vs "no session selected"

### **Fix:**

1. Remove reload on drawer open (better performance)
2. Add `isIntentionalNewChat` flag (track user intent)
3. Only auto-select if NOT intentional new chat
4. Reset flag when user selects session or creates new session

### **Impact:**

- ✅ Bug fixed
- ✅ Better UX
- ✅ Better performance
- ✅ Clearer code intent

---

**Status:** 🐛 Bug Analyzed - Ready for Fix **Priority:** High (affects core
chat UX) **Estimated Fix Time:** 15-30 minutes
