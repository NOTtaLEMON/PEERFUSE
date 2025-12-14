# Rematch Feature - Quick Reference Guide

## At a Glance

The **Rematch** feature allows users to reject a match and find alternatives. The system:
- ✅ Tracks rejected matches in Firebase (`rejected_match_ids` array)
- ✅ Excludes rejected users from subsequent searches
- ✅ Provides fallback handling when no matches remain
- ✅ Displays a dual-button UI for each match

## Quick Implementation Summary

### 1. Core Logic Changes

**Before:**
```javascript
findBestMatch(targetUser, candidates)
```

**After:**
```javascript
findBestMatch(targetUser, candidates, excludedIds = [])
findRematch(targetUser, candidates, rejectedIds = [], limit = 10)
```

### 2. Firebase Schema Update

**User Profile now includes:**
```javascript
{
  // ... existing fields ...
  rejected_match_ids: ["uid1", "uid2", ...],  // Track rejected matches
  last_match_rejection: 1702548000000          // Timestamp
}
```

### 3. New Functions

#### matching.js
```javascript
// Find best match with exclusions
findBestMatch(targetUser, candidates, excludedIds = [])
// Returns: Array of viable matches

// Find rematch with structured response
findRematch(targetUser, candidates, rejectedIds = [], limit = 10)
// Returns: { matches: [], status: 'success'|'no_matches', message: string }
```

#### firebase-helpers.js
```javascript
rejectMatch(userId, rejectedUserId)        // Tracks rejection
getRejectedMatchIds(userId)                 // Gets exclusion list
clearRejectedMatches(userId)                // Resets rejections
```

#### app.js
```javascript
handleRematchRequest(currentMatch)           // Main rematch handler
```

### 4. UI Changes

**Match Card Now Has:**
```
┌────────────────────────────────┐
│  Best Match / Next Match       │
│  Score & Badge                 │
│  User Info                     │
├────────────────────────────────┤
│  Why You Match (reasons)       │
├────────────────────────────────┤
│  [Send Request] [Try Another]  │
└────────────────────────────────┘
```

## Usage Examples

### Find Match (Original)
```javascript
const candidates = await FirebaseHelpers.fetchAllProfiles();
const match = Matching.findBestMatch(currentUser, candidates);
```

### Find Rematch (New)
```javascript
const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
const result = Matching.findRematch(currentUser, candidates, rejectedIds);

if (result.status === 'success') {
  // Display result.matches[0]
} else {
  // Show "No more matches" message
}
```

### Reject Match
```javascript
// When user clicks "Try Another Match"
await FirebaseHelpers.rejectMatch(userId, rejectedUserId);
const nextRejected = await FirebaseHelpers.getRejectedMatchIds(userId);
const rematch = Matching.findRematch(user, candidates, nextRejected);
```

## State Management

### AppState Updates
```javascript
// Match state is updated in handleRematchRequest()
AppState.currentMatches = rematchResult.matches;
AppState.currentMatchIndex = 0;
```

### Firebase State
```javascript
// Automatic updates when rejectMatch() is called
profiles/{userId}/rejected_match_ids = [...]
profiles/{userId}/last_match_rejection = timestamp
```

## Error Handling

### Graceful Fallbacks
| Scenario | Handling |
|----------|----------|
| No candidates | Returns null |
| Firebase offline | Logs warning, uses local fallback |
| User UID missing | Shows error toast |
| No more matches | Returns `status: 'no_matches'` |
| Network error | Caught & displayed to user |

### User Feedback
- **Success**: "Found X alternative match(es)!"
- **No more**: "You've reviewed all compatible users. Check back later!"
- **Error**: "Failed to find alternative matches"

## Integration Checklist

- [x] `findBestMatch()` updated with `excludedIds` parameter
- [x] `findRematch()` function added to matching.js
- [x] `rejectMatch()` function added to firebase-helpers.js
- [x] `getRejectedMatchIds()` function added
- [x] `clearRejectedMatches()` function added (optional reset)
- [x] `handleRematchRequest()` function added to app.js
- [x] Dual-button UI implemented (Send Request + Try Another)
- [x] Fallback UI for no matches scenario
- [x] Event listeners attached to rematch button
- [x] Functions exported to window scope

## Testing Checklist

- [ ] User can reject match and see alternative
- [ ] Rejected user doesn't appear in next search
- [ ] "No more matches" message displays correctly
- [ ] Firebase updates rejection tracking
- [ ] UI buttons work on rematch result
- [ ] Network errors handled gracefully
- [ ] Multiple rapid rejections work
- [ ] Rejections persist across sessions

## Common Issues & Solutions

### Issue: Rematch button doesn't work
**Solution:** Check that `handleRematchRequest` is properly attached:
```javascript
document.getElementById('rematch-btn')?.addEventListener('click', async () => {
  await handleRematchRequest(currentMatch);
});
```

### Issue: Rejected matches reappear
**Solution:** Verify `getRejectedMatchIds()` is called before `findRematch()`:
```javascript
const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
const result = Matching.findRematch(user, candidates, rejectedIds);
```

### Issue: Firebase not updating rejected_match_ids
**Solution:** Ensure Firebase structure exists:
```javascript
// User profile must have this path
profiles/{userId}/rejected_match_ids
```

## Performance Tips

1. **Cache rejected IDs** during session to avoid repeated Firebase calls
2. **Batch updates** if rejecting multiple matches
3. **Reuse candidate list** instead of re-fetching after rejection
4. **Limit result set** with the `limit` parameter in `findRematch()`

## Documentation Files

- **REMATCH_FEATURE.md** - Complete feature documentation
- **This file** - Quick reference
- **Source comments** - Implementation details in each file

## Next Steps

1. Test the rematch feature with sample data
2. Verify Firebase schema updates
3. Monitor performance with multiple rejections
4. Gather user feedback on UX
5. Consider enhancements (batch rejection, smart recommendations, etc.)

---

**Last Updated:** December 14, 2025  
**Status:** ✅ Fully Implemented  
**Files Modified:** 3 (matching.js, firebase-helpers.js, app.js)
