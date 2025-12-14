# Rematch Feature - Code Examples & Recipes

## Quick Start Examples

### Example 1: Simple Rematch Flow

```javascript
// When user clicks "Try Another Match"
async function handleRematchRequest(currentMatch) {
  const userId = firebase.auth().currentUser.uid;
  const rejectedUserId = currentMatch.user.uid;
  
  // Step 1: Track the rejection
  await FirebaseHelpers.rejectMatch(userId, rejectedUserId);
  
  // Step 2: Get all previously rejected IDs
  const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
  
  // Step 3: Find alternatives excluding rejected users
  const result = Matching.findRematch(
    AppState.currentUser,
    AppState.allProfiles,
    rejectedIds,
    10  // Get up to 10 alternatives
  );
  
  // Step 4: Display result
  if (result.status === 'success') {
    displayRematchResult(result.matches[0]);
  } else {
    displayNoMoreMatches(result.message);
  }
}
```

### Example 2: Direct Matching with Exclusions

```javascript
// Find best match excluding specific users
const excludedUserIds = ['user123', 'user456'];
const matches = Matching.findBestMatch(
  currentUser,
  allCandidates,
  excludedUserIds  // ← NEW parameter
);

if (matches && matches.length > 0) {
  console.log('Found', matches.length, 'matches');
  const bestMatch = matches[0];
  console.log('Score:', bestMatch.score);
  console.log('Reasons:', bestMatch.breakdown.reasons);
}
```

### Example 3: Check Match Quality Before Display

```javascript
async function findAndDisplayMatch() {
  const userId = firebase.auth().currentUser.uid;
  const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
  
  const result = Matching.findRematch(
    AppState.currentUser,
    AppState.allProfiles,
    rejectedIds
  );
  
  if (result.status === 'no_matches') {
    // Show fallback UI
    showNoMatchesMessage();
    return;
  }
  
  const match = result.matches[0];
  
  // Display with quality badge
  const badge = Matching.getMatchQualityBadge(match.score);
  console.log(`Match Quality: ${badge.text} (${badge.emoji})`);
  
  displayMatchCard(match);
}
```

## Firebase Integration Examples

### Example 4: Track Rejection and Log Analytics

```javascript
async function rejectMatchWithAnalytics(userId, rejectedUserId, reason = null) {
  // Track in rejection system
  const success = await FirebaseHelpers.rejectMatch(userId, rejectedUserId);
  
  if (success) {
    // Optionally log reason for analytics
    if (reason) {
      await firebase.database().ref(`rejectionReasons/${userId}/${rejectedUserId}`).set({
        reason,
        timestamp: Date.now()
      });
    }
    
    return true;
  }
  
  return false;
}

// Usage:
await rejectMatchWithAnalytics(currentUser.uid, match.user.uid, 'not_interested');
```

### Example 5: Allow Users to View Rejection History

```javascript
async function showRejectionHistory(userId) {
  const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
  
  if (rejectedIds.length === 0) {
    console.log('No rejected matches yet');
    return;
  }
  
  // Fetch details of rejected users
  const rejectedUsers = await Promise.all(
    rejectedIds.map(id => 
      firebase.database().ref(`profiles/${id}`).once('value')
        .then(snap => snap.val())
    )
  );
  
  // Display as list
  rejectedUsers.forEach(user => {
    console.log(`Rejected: ${user.name}`);
  });
}
```

### Example 6: Reset Rejection History (Admin/User Feature)

```javascript
async function resetRejectionHistory(userId) {
  const success = await FirebaseHelpers.clearRejectedMatches(userId);
  
  if (success) {
    console.log('Rejection history cleared');
    // Now user can match with previously rejected partners again
    return true;
  }
  
  return false;
}

// Usage:
if (userWantsToReset) {
  await resetRejectionHistory(currentUser.uid);
  // Trigger new search
  findMatch();
}
```

## Advanced Examples

### Example 7: Batch Process Multiple Rejections

```javascript
async function rejectMultipleMatches(userId, matchIds) {
  const results = await Promise.all(
    matchIds.map(matchId => 
      FirebaseHelpers.rejectMatch(userId, matchId)
    )
  );
  
  const successCount = results.filter(r => r).length;
  console.log(`Rejected ${successCount}/${matchIds.length} matches`);
  
  return successCount === matchIds.length;
}

// Usage:
const matchesToReject = [
  matches[0].user.uid,
  matches[1].user.uid,
  matches[2].user.uid
];
await rejectMultipleMatches(currentUser.uid, matchesToReject);
```

### Example 8: Implement "Not Right Now" Feature

```javascript
async function deferMatch(userId, matchUserId, deferMinutes = 60) {
  // Track as temporary rejection
  await FirebaseHelpers.rejectMatch(userId, matchUserId);
  
  // Set timer to remove from rejection list after X minutes
  setTimeout(async () => {
    const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
    const updatedIds = rejectedIds.filter(id => id !== matchUserId);
    
    await firebase.database().ref(`profiles/${userId}`).update({
      rejected_match_ids: updatedIds
    });
    
    console.log('Match re-enabled after deferral period');
  }, deferMinutes * 60 * 1000);
  
  return true;
}

// Usage:
await deferMatch(currentUser.uid, match.user.uid, 120); // Defer for 2 hours
```

### Example 9: Implement Smart Rematch with Filters

```javascript
async function findRematchWithFilters(userId, filters = {}) {
  const user = AppState.currentUser;
  const candidates = AppState.allProfiles;
  const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
  
  // Get basic rematch results
  const baseResult = Matching.findRematch(user, candidates, rejectedIds);
  
  if (baseResult.status === 'no_matches') {
    return baseResult;
  }
  
  // Apply additional filters if provided
  let filtered = baseResult.matches;
  
  if (filters.minScore) {
    filtered = filtered.filter(m => m.score >= filters.minScore);
  }
  
  if (filters.availability) {
    filtered = filtered.filter(
      m => m.user.availability === filters.availability
    );
  }
  
  if (filters.maxDistance) {
    // Assuming timezone distance calculation
    filtered = filtered.filter(m => {
      const distance = calculateTimezoneDistance(
        user.timeZone,
        m.user.timeZone
      );
      return distance <= filters.maxDistance;
    });
  }
  
  return {
    ...baseResult,
    matches: filtered,
    message: `Found ${filtered.length} matches with applied filters`
  };
}

// Usage:
const result = await findRematchWithFilters(userId, {
  minScore: 100,
  availability: '6AM-10AM'
});
```

### Example 10: Track Rematch Metrics

```javascript
async function trackRematchMetrics(userId, matchId, action) {
  const timestamp = Date.now();
  const data = {
    userId,
    matchId,
    action,  // 'rejected', 'accepted', 'deferred'
    timestamp,
    timestamp_formatted: new Date(timestamp).toISOString()
  };
  
  // Save to Firebase
  await firebase.database()
    .ref(`rematchMetrics/${userId}/${timestamp}`)
    .set(data);
  
  // Optionally calculate stats
  const allMetrics = await firebase.database()
    .ref(`rematchMetrics/${userId}`)
    .once('value');
  
  const metrics = allMetrics.val() || {};
  const rejectionRate = Object.values(metrics)
    .filter(m => m.action === 'rejected').length / Object.keys(metrics).length;
  
  console.log(`Rejection rate: ${(rejectionRate * 100).toFixed(1)}%`);
  
  return data;
}

// Usage:
await trackRematchMetrics(userId, match.user.uid, 'rejected');
```

## UI Component Examples

### Example 11: Custom Match Card with Rematch

```javascript
function renderMatchCard(match) {
  const badge = Matching.getMatchQualityBadge(match.score);
  
  return `
    <div class="match-card">
      <div class="match-header">
        <h3>Best Match Found!</h3>
        <div class="match-score">
          <p>${match.score} points</p>
          <span class="badge" style="background: ${badge.color};">
            ${badge.emoji} ${badge.text}
          </span>
        </div>
      </div>
      
      <div class="match-user">
        <strong>${match.user.name || match.user.username}</strong>
      </div>
      
      <div class="match-reasons">
        <h4>Why you match:</h4>
        <ul>
          ${match.breakdown.reasons
            .map(reason => `<li>${reason}</li>`)
            .join('')
          }
        </ul>
      </div>
      
      <div class="match-actions">
        <button onclick="sendMatchRequest(this, ${match.user.uid})">
          📩 Send Request
        </button>
        <button onclick="tryAnotherMatch(this, ${JSON.stringify(match)})">
          🔄 Try Another
        </button>
      </div>
    </div>
  `;
}
```

### Example 12: No Matches Fallback UI

```javascript
function renderNoMatchesFallback() {
  return `
    <div class="no-matches-card">
      <h3>⚠️ No More Matches</h3>
      <p>You've reviewed all compatible users. Check back later as more students join!</p>
      
      <div class="no-matches-actions">
        <button onclick="startNewSearch()">
          🔄 Start New Search
        </button>
        <button onclick="clearRejections()">
          🗑️ Clear Rejection History
        </button>
      </div>
      
      <p class="text-muted">
        💡 Tip: New compatible matches will appear when other students join PeerFuse.
      </p>
    </div>
  `;
}
```

### Example 13: Match Summary with Statistics

```javascript
async function renderMatchSummary(userId) {
  const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
  const matches = Matching.findBestMatch(
    AppState.currentUser,
    AppState.allProfiles,
    rejectedIds
  );
  
  return `
    <div class="match-summary">
      <h3>Your Matching Statistics</h3>
      
      <div class="stats-grid">
        <div class="stat">
          <h4>${matches ? matches.length : 0}</h4>
          <p>Available Matches</p>
        </div>
        
        <div class="stat">
          <h4>${rejectedIds.length}</h4>
          <p>Reviewed</p>
        </div>
        
        <div class="stat">
          <h4>${matches ? (rejectedIds.length / (rejectedIds.length + matches.length) * 100).toFixed(0) : 0}%</h4>
          <p>Review Rate</p>
        </div>
      </div>
    </div>
  `;
}
```

## Testing Examples

### Example 14: Unit Test for Rematch Function

```javascript
// test-rematch.js
describe('Rematch Feature', () => {
  let testUser, testCandidates, testMatch;
  
  beforeEach(() => {
    testUser = {
      uid: 'user1',
      name: 'John',
      strengths: ['Math', 'Physics'],
      weaknesses: ['Chemistry'],
      availability: '6AM-10AM'
    };
    
    testCandidates = [
      {
        uid: 'user2',
        name: 'Jane',
        strengths: ['Chemistry'],
        weaknesses: ['Math'],
        availability: '6AM-10AM'
      },
      {
        uid: 'user3',
        name: 'Bob',
        strengths: ['Chemistry'],
        weaknesses: ['Physics'],
        availability: '6AM-10AM'
      },
      {
        uid: 'user4',
        name: 'Alice',
        strengths: ['Chemistry'],
        weaknesses: ['Biology'],
        availability: '6AM-10AM'
      }
    ];
  });
  
  test('should exclude rejected matches', () => {
    const rejectedIds = ['user2']; // Exclude Jane
    const result = Matching.findRematch(testUser, testCandidates, rejectedIds);
    
    expect(result.status).toBe('success');
    expect(result.matches.length).toBe(2); // Bob and Alice
    expect(result.matches[0].user.uid).not.toBe('user2');
  });
  
  test('should return no_matches when all are excluded', () => {
    const rejectedIds = ['user2', 'user3', 'user4'];
    const result = Matching.findRematch(testUser, testCandidates, rejectedIds);
    
    expect(result.status).toBe('no_matches');
    expect(result.matches).toHaveLength(0);
    expect(result.message).toContain('No alternative matches');
  });
  
  test('should handle empty rejection list', () => {
    const result = Matching.findRematch(testUser, testCandidates, []);
    
    expect(result.status).toBe('success');
    expect(result.matches.length).toBeGreaterThan(0);
  });
});
```

### Example 15: Integration Test with Firebase

```javascript
// test-rematch-firebase.js
describe('Rematch with Firebase', () => {
  const userId = 'test-user-123';
  
  beforeEach(async () => {
    // Setup: Create test user
    await FirebaseHelpers.saveProfile(userId, {
      name: 'Test User',
      rejected_match_ids: []
    });
  });
  
  afterEach(async () => {
    // Cleanup
    await FirebaseHelpers.clearRejectedMatches(userId);
  });
  
  test('should track rejection in Firebase', async () => {
    const rejectedUserId = 'match-123';
    
    const success = await FirebaseHelpers.rejectMatch(userId, rejectedUserId);
    expect(success).toBe(true);
    
    const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
    expect(rejectedIds).toContain(rejectedUserId);
  });
  
  test('should exclude tracked rejections from results', async () => {
    await FirebaseHelpers.rejectMatch(userId, 'user2');
    const rejectedIds = await FirebaseHelpers.getRejectedMatchIds(userId);
    
    const result = Matching.findRematch(testUser, testCandidates, rejectedIds);
    
    result.matches.forEach(match => {
      expect(match.user.uid).not.toBe('user2');
    });
  });
});
```

---

**Document Version:** 1.0  
**Last Updated:** December 14, 2025  
**Audience:** Developers implementing or extending the Rematch feature

Use these examples as templates for your specific use cases!
