# Rematch Feature - Technical Specification

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (app.js)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Match Display Card                                  │  │
│  │  ├─ Score & Badge                                   │  │
│  │  ├─ User Info                                       │  │
│  │  ├─ Why You Match (reasons)                         │  │
│  │  └─ Button Actions:                                 │  │
│  │     ├─ Send Match Request → sendMatchRequest()      │  │
│  │     └─ Try Another Match  → handleRematchRequest()  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│                handleRematchRequest()                        │
│                          ↓                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │  State & Data Management             │
        │  (AppState + Firebase)               │
        │                                      │
        │  ┌──────────────────────────────┐   │
        │  │ AppState                     │   │
        │  │ - currentMatches: []         │   │
        │  │ - currentMatchIndex: 0       │   │
        │  │ - currentUser: {}            │   │
        │  │ - allProfiles: []            │   │
        │  └──────────────────────────────┘   │
        │                                      │
        │  ┌──────────────────────────────┐   │
        │  │ Firebase                     │   │
        │  │ profiles/{uid}/              │   │
        │  │  - rejected_match_ids: []    │   │
        │  │  - last_match_rejection      │   │
        │  └──────────────────────────────┘   │
        └──────────────────────────────────────┘
                     ↓
    ┌────────────────────────────────────────────┐
    │  Matching Engine (matching.js)             │
    │                                            │
    │  ┌────────────────────────────────────┐   │
    │  │ findRematch()                      │   │
    │  │ ├─ Input: user, candidates,       │   │
    │  │ │         rejectedIds             │   │
    │  │ ├─ Call: findBestMatch() with     │   │
    │  │ │         exclusions              │   │
    │  │ └─ Output: {                      │   │
    │  │    matches, status, message       │   │
    │  │    }                              │   │
    │  └────────────────────────────────────┘   │
    │                                            │
    │  ┌────────────────────────────────────┐   │
    │  │ findBestMatch()                    │   │
    │  │ ├─ Filters self-matches           │   │
    │  │ ├─ Filters excluded IDs ★NEW★    │   │
    │  │ ├─ Scores remaining candidates    │   │
    │  │ ├─ Filters zero-skill matches     │   │
    │  │ └─ Sorts by score (highest first) │   │
    │  └────────────────────────────────────┘   │
    │                                            │
    │  ┌────────────────────────────────────┐   │
    │  │ getTopMatches()                    │   │
    │  │ ├─ Updated to support exclusions  │   │
    │  │ │  ★NEW★                          │   │
    │  │ └─ Returns top N matches          │   │
    │  └────────────────────────────────────┘   │
    └────────────────────────────────────────────┘
                     ↓
    ┌────────────────────────────────────────────┐
    │  Database Layer (firebase-helpers.js)      │
    │                                            │
    │  ┌────────────────────────────────────┐   │
    │  │ rejectMatch() ★NEW★               │   │
    │  │ └─ Updates: rejected_match_ids     │   │
    │  └────────────────────────────────────┘   │
    │                                            │
    │  ┌────────────────────────────────────┐   │
    │  │ getRejectedMatchIds() ★NEW★       │   │
    │  │ └─ Fetches: rejected_match_ids     │   │
    │  └────────────────────────────────────┘   │
    │                                            │
    │  ┌────────────────────────────────────┐   │
    │  │ clearRejectedMatches() ★NEW★      │   │
    │  │ └─ Resets: rejected_match_ids      │   │
    │  └────────────────────────────────────┘   │
    └────────────────────────────────────────────┘
```

## Flow Diagrams

### Rematch Request Flow
```
User clicks "Try Another Match"
         ↓
    Call handleRematchRequest(currentMatch)
         ↓
    Track rejection: rejectMatch(userId, currentMatch.user.id)
         ↓
    Fetch rejected list: getRejectedMatchIds(userId)
         ↓
    Find alternatives: findRematch(user, candidates, rejectedIds)
         ↓
    ┌─────────────────────────────┐
    │ Alternative matches found?  │
    └──────────┬──────────────────┘
               │
      ┌────────┴─────────┐
      │YES               │NO
      ↓                  ↓
  Display       Show "No More Matches"
  Next Match    Card with reset option
      ↓
  Attach listeners
  to new buttons
```

### Exclusion Filter Logic
```
All Candidates [U1, U2, U3, U4, U5, ...]
         ↓
    Filter Logic:
    1. Remove self-matches
    2. Remove excluded IDs ★NEW★
         ↓
Valid Candidates [U2, U4, ...]
         ↓
    Score & Filter:
    1. Calculate match scores
    2. Remove zero-skill pairs
         ↓
Viable Matches (sorted by score)
         ↓
    Return Top N
```

## API Specifications

### 1. findRematch() - Main Rematch API

**Signature:**
```javascript
function findRematch(targetUser, candidates, rejectedIds = [], limit = 10)
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `targetUser` | Object | Required | User to find matches for |
| `candidates` | Array | Required | All potential match candidates |
| `rejectedIds` | Array\|String | `[]` | Previously rejected user IDs |
| `limit` | Number | `10` | Max matches to return |

**Returns:**
```javascript
{
  matches: Array<{
    user: Object,              // User object
    score: Number,             // Match score
    breakdown: {
      total: Number,           // Total score
      reasons: String[],       // Match reasons
      complementaryCount: Number
    }
  }>,
  status: 'success' | 'no_matches',  // Operation status
  message: String                    // User-friendly message
}
```

**Example:**
```javascript
const rejectedIds = ['user_id_123', 'user_id_456'];
const result = Matching.findRematch(currentUser, allCandidates, rejectedIds, 10);

if (result.status === 'success') {
  console.log(`Found ${result.matches.length} matches`);
  displayMatch(result.matches[0]);
} else {
  console.log(result.message); // "No alternative matches..."
}
```

### 2. findBestMatch() - Updated Signature

**Signature:**
```javascript
function findBestMatch(targetUser, candidates, excludedIds = [])
```

**New Parameter:**
```javascript
excludedIds: Array<String>  // User IDs to exclude from results
```

**Usage:**
```javascript
// Old way (still works)
const matches = Matching.findBestMatch(user, candidates);

// New way with exclusions
const excludedIds = ['rejected_user_1', 'rejected_user_2'];
const matches = Matching.findBestMatch(user, candidates, excludedIds);
```

### 3. rejectMatch() - Track Rejection

**Signature:**
```javascript
async function rejectMatch(userId, rejectedUserId)
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | String | Current user's UID |
| `rejectedUserId` | String | ID of rejected match |

**Returns:**
```javascript
Promise<Boolean>  // Success status
```

**Firebase Update:**
```javascript
// Updates this path:
profiles/{userId}/rejected_match_ids
// Adds rejectedUserId to array

// Also updates:
profiles/{userId}/last_match_rejection = timestamp
```

**Example:**
```javascript
const success = await FirebaseHelpers.rejectMatch(
  'user_123',
  'rejected_user_456'
);

if (success) {
  console.log('Rejection tracked');
} else {
  console.log('Failed to track rejection');
}
```

### 4. getRejectedMatchIds() - Fetch Exclusions

**Signature:**
```javascript
async function getRejectedMatchIds(userId)
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | String | User's UID |

**Returns:**
```javascript
Promise<Array<String>>  // Array of rejected user IDs
```

**Example:**
```javascript
const rejectedIds = await FirebaseHelpers.getRejectedMatchIds('user_123');
console.log(rejectedIds); // ['user_456', 'user_789']
```

### 5. clearRejectedMatches() - Reset Rejections

**Signature:**
```javascript
async function clearRejectedMatches(userId)
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | String | User's UID |

**Returns:**
```javascript
Promise<Boolean>  // Success status
```

**Use Case:** Optional feature to allow users to reset their rejection history

**Example:**
```javascript
await FirebaseHelpers.clearRejectedMatches('user_123');
// Now user can be matched with previously rejected partners
```

### 6. handleRematchRequest() - UI Handler

**Signature:**
```javascript
async function handleRematchRequest(currentMatch)
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `currentMatch` | Object | Current match object with `.user` property |

**Behavior:**
1. Tracks rejection in Firebase
2. Fetches updated rejected list
3. Finds alternatives using `findRematch()`
4. Updates UI with result or fallback message
5. Attaches event listeners to new buttons

**Example:**
```javascript
document.getElementById('rematch-btn').addEventListener('click', () => {
  handleRematchRequest(bestMatch);
});
```

## State Transitions

```
Initial State
    ↓
Find Match → Display Match
    ↓
User Action
  ↙   ↖
Reject  Accept
  ↓     ↓
  │   Start Session
  │     ↓
  │   Session Active
  ↓
Get Rejected List
    ↓
Find Rematch
    ↓
┌───────────────────┐
│ Matches Available?│
└────┬──────────────┘
     │
  Yes│ No
     ↓ ↓
  Display Show
  Next    No More
  Match   Message
     ↓
  (Loop back to User Action)
```

## Database Schema Changes

### Before
```javascript
profiles/{uid}
  ├─ name
  ├─ email
  ├─ strengths: []
  ├─ weaknesses: []
  ├─ availability
  └─ ... other fields
```

### After (★NEW★ fields)
```javascript
profiles/{uid}
  ├─ name
  ├─ email
  ├─ strengths: []
  ├─ weaknesses: []
  ├─ availability
  ├─ rejected_match_ids: []        ★NEW★
  ├─ last_match_rejection: Number  ★NEW★
  └─ ... other fields
```

## Performance Analysis

### Time Complexity
| Operation | Complexity | Notes |
|-----------|-----------|-------|
| findBestMatch() | O(m log m) | m = candidates, sorting dominant |
| Filter excluded IDs | O(n) | n = rejected IDs (small) |
| rejectMatch() | O(1) | Array push + Firebase write |
| getRejectedMatchIds() | O(1) | Single Firebase read |
| findRematch() | O(m log m) | Calls findBestMatch() |

### Space Complexity
| Structure | Complexity | Impact |
|-----------|-----------|--------|
| rejected_match_ids | O(n) | Small array per user |
| AppState.currentMatches | O(m) | Limited by `limit` param |
| Match scoring | O(m) | Temporary, cleaned up |

### Optimization Tips
1. **Cache rejected list** during session
2. **Reuse candidate list** instead of re-fetching
3. **Batch Firebase operations** when possible
4. **Limit rematch result count** with `limit` parameter
5. **Use pagination** for large candidate pools

## Error Handling Map

```
Error Scenario                     → Handling
─────────────────────────────────────────────────
No candidates                     → Return null
Firebase offline                  → Log warning, fallback
Missing user UID                  → Show error toast
No more matches (exhausted)       → Return no_matches status
Network timeout                   → Retry logic (could add)
Concurrent modifications          → Last-write-wins (Firebase)
Invalid rejected list format      → Normalize to array
```

## Testing Matrix

| Test Case | Input | Expected Output | Status |
|-----------|-------|-----------------|--------|
| Normal rematch | Match 1 of 5 | Returns matches 2-5 | ✓ |
| Exhaust matches | Match 1 of 1 | Returns `no_matches` | ✓ |
| Firebase error | Any | Graceful error msg | ✓ |
| Empty rejection list | Match, [] | No exclusions applied | ✓ |
| Rapid rejections | 3 clicks | All tracked correctly | ✓ |
| Offline → Online | Transition | Syncs rejection list | ✓ |

---

**Document Version:** 1.0  
**Last Updated:** December 14, 2025  
**Status:** ✅ Complete Implementation
