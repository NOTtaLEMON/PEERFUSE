# Rematch Feature Documentation

## Overview
The Rematch feature allows users to reject the current match and find alternative matches from the candidate pool. The system intelligently tracks rejected matches to avoid showing the same pair twice.

## Features Implemented

### 1. **Exclusion Logic**
- Maintains a `rejected_match_ids` array in each user's Firebase profile
- Automatically excludes previously rejected users from subsequent searches
- Prevents matching with the same user multiple times in the same session

### 2. **State Management**
- **Firebase Integration**: Rejected matches are persisted in the user's profile
- **Session Storage**: Current match state (`currentMatches`, `currentMatchIndex`) stored in `AppState`
- **Automatic Tracking**: When a user clicks "Try Another Match", the system:
  1. Records the rejection in Firebase
  2. Fetches the updated rejected list
  3. Uses the exclusion list for the next search

### 3. **API/Function Signatures**

#### Matching Functions
```javascript
// Find best match with exclusion support
findBestMatch(targetUser, candidates, excludedIds = [])

// Find rematch with structured response
findRematch(targetUser, candidates, rejectedIds = [], limit = 10)
// Returns: {
//   matches: Array<Match>,
//   status: 'success' | 'no_matches',
//   message: string
// }

// Get top N matches with exclusion
getTopMatches(targetUser, candidates, limit = 10, excludedIds = [])
```

#### Firebase Helper Functions
```javascript
// Track a rejected match
rejectMatch(userId, rejectedUserId) -> Promise<boolean>

// Fetch user's rejected match list
getRejectedMatchIds(userId) -> Promise<Array>

// Clear all rejected matches (optional reset)
clearRejectedMatches(userId) -> Promise<boolean>
```

#### UI Function
```javascript
// Handle rematch request and display next alternative
handleRematchRequest(currentMatch) -> Promise<void>
```

### 4. **Fallback Handling**

When no alternative matches exist:
1. **Status Message**: `status: 'no_matches'`
2. **User Feedback**: 
   - Toast notification: "You've reviewed all compatible matches!"
   - Modal message with explanation
   - "Start New Search" button to reset
3. **Database State**: Rejection tracking remains for future sessions

## Usage Flow

### User Perspective
1. User finds a match and views compatibility details
2. Clicks either:
   - **"Send Match Request"** → Standard match flow
   - **"Try Another Match"** → Rematch flow
3. System finds next best match excluding previous one
4. Display updated match or "no more matches" message

### Technical Flow
```
User clicks "Try Another Match"
    ↓
handleRematchRequest(currentMatch)
    ↓
rejectMatch(userId, rejectedUserId) → Track in Firebase
    ↓
getRejectedMatchIds(userId) → Get updated exclusion list
    ↓
findRematch(user, candidates, rejectedIds)
    ↓
Return alternative matches or "no_matches" status
    ↓
Display result or fallback UI
```

## Data Structure

### User Profile (Firebase)
```javascript
{
  uid: "user123",
  name: "John Doe",
  email: "john@example.com",
  // ... other profile fields ...
  rejected_match_ids: ["user456", "user789"],
  last_match_rejection: 1702548000000
}
```

### Match Response
```javascript
{
  user: { /* User object */ },
  score: 122,
  breakdown: {
    total: 122,
    reasons: [
      "✓ Same availability: 6AM-10AM (+30)",
      "✓ 2 complementary skill(s): ... (+80)",
      "✓ Same goal: Clear basics (+12)"
    ],
    complementaryCount: 2
  }
}
```

### Rematch Result
```javascript
{
  matches: [
    { /* Match 1 */ },
    { /* Match 2 */ },
    // ... up to limit (default 10)
  ],
  status: 'success' | 'no_matches',
  message: 'Found N alternative match(es)' | 'No alternative matches...'
}
```

## UI Components

### Match Display Card (with Rematch)
```
┌─────────────────────────────────┐
│ Best Match Found! / Next Match  │
│ 122 points  ✨ Great Match      │
│ John Doe                        │
└─────────────────────────────────┘

Why you match:
  ✓ Same availability: 6AM-10AM (+30)
  ✓ 2 complementary skills: ... (+80)
  ...

[📩 Send Request] [🔄 Try Another]
```

### No Matches Fallback
```
┌─────────────────────────────────┐
│         ⚠️ No More Matches       │
│ You've reviewed all compatible  │
│ users. Check back later!        │
│                                 │
│      [🔄 Start New Search]     │
└─────────────────────────────────┘
```

## Configuration

The feature works with existing matching weights defined in `config.js`:
```javascript
matchingWeights: {
  compPerMatch: 40,        // Per complementary skill
  availability: 30,
  preferredMode: 15,
  primaryGoal: 12,
  preferredFrequency: 12,
  partnerPreference: 10,
  sessionLength: 10,
  timeZone: 10,
  studyPersonality: 10
}
```

## Edge Cases Handled

1. **No candidates available**: Returns null
2. **User rejects themselves**: Filtered out
3. **All matches exhausted**: Returns "no_matches" status
4. **Firebase not initialized**: Graceful fallback (logs warning)
5. **Missing user UID**: Error message displayed
6. **Network errors**: Caught and displayed to user

## Performance Considerations

- **Exclusion filtering**: O(n) where n = number of rejected IDs (typically small)
- **Candidate scoring**: O(m) where m = number of candidates
- **Firebase calls**: Batched where possible
- **UI rendering**: Reuses existing match card template

## Future Enhancements

1. **Batch Rejection**: Reject multiple matches at once
2. **Rematch History**: View all past rejections
3. **Smart Recommendations**: Suggest when new compatible users join
4. **Feedback System**: "Why didn't this match work?" options
5. **Cache Optimization**: Cache candidate list during session

## Testing

### Test Cases
1. Reject match → Find alternative → Verify exclusion
2. Exhaust all matches → Verify "no_matches" message
3. Clear rejections → Verify re-matching with previously rejected users
4. Concurrent rematch requests → Verify data consistency
5. Firebase offline → Verify graceful fallback

### Test User Scenario
```
User A profile:
- Strengths: [Math, Physics]
- Weaknesses: [Chemistry, Biology]
- Availability: 6AM-10AM

User B profile:
- Strengths: [Chemistry, Biology]
- Weaknesses: [Math, Physics]
- Availability: 6AM-10AM

Result: Score 122 (excellent match)
User rejects → Try another match
System excludes User B → Finds next best alternative
```

## Debugging

Enable console logs for troubleshooting:
```javascript
// In matching.js
console.log('✅ Match rejected and tracked:', rejectedUserId);
console.log('Found alternative matches:', rematchResult);

// In app.js
console.error('Error handling rematch request:', error);
```

## Files Modified

1. **js/matching.js**
   - Updated `findBestMatch()` with `excludedIds` parameter
   - Added `findRematch()` function
   - Updated `getTopMatches()` with exclusion support

2. **js/firebase-helpers.js**
   - Added `rejectMatch()`
   - Added `getRejectedMatchIds()`
   - Added `clearRejectedMatches()`

3. **js/app.js**
   - Added Rematch button to match display
   - Added `handleRematchRequest()` function
   - Updated UI rendering with dual-button layout

## Support & Questions

For issues or questions about the Rematch feature, refer to this documentation or check the implementation comments in the source files.
