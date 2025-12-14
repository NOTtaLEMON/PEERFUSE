/**
 * Matching Algorithm Module
 * Implements the peer matching logic based on complementary skills and preferences
 */

/**
 * Parse UTC offset from timezone string (e.g., "UTC+05:30 (India)" -> 5.5)
 * @param {string} timezone - Timezone string
 * @returns {number} UTC offset in hours
 */
function parseUTCOffset(timezone) {
  if (!timezone) return 0;
  const match = timezone.match(/UTC([+-])(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2]);
  const minutes = parseInt(match[3]);
  return sign * (hours + minutes / 60);
}

/**
 * Check if timezones are compatible based on availability overlap
 * @param {string} tzA - User A's timezone
 * @param {string} tzB - User B's timezone
 * @param {string} availA - User A's availability window
 * @param {string} availB - User B's availability window
 * @returns {Object} {compatible: boolean, score: number}
 */
function checkTimezoneCompatibility(tzA, tzB, availA, availB) {
  const offsetA = parseUTCOffset(tzA);
  const offsetB = parseUTCOffset(tzB);
  const timeDiff = Math.abs(offsetA - offsetB);

  // If timezones are 12+ hours apart, incompatible (opposite sides of world)
  if (timeDiff >= 12) {
    return { compatible: false, score: -500 }; // Heavy penalty
  }

  // Same timezone = perfect
  if (timeDiff === 0) {
    return { compatible: true, score: 10 };
  }

  // Within 1-3 hours: check if availability windows can overlap
  if (timeDiff <= 3) {
    // Map availability to approximate hours
    const availMap = {
      '6am-10am': 8,
      '10am-2pm': 12,
      '2pm-6pm': 16,
      '6pm-10pm': 20,
      'late night (10pm+)': 23
    };

    const normAvailA = (availA || '').toLowerCase().trim();
    const normAvailB = (availB || '').toLowerCase().trim();
    const hourA = availMap[normAvailA] || 12;
    const hourB = availMap[normAvailB] || 12;

    // Adjust hourB to user A's timezone
    const adjustedHourB = hourB - (offsetB - offsetA);

    // Check if there's overlap potential (within 2 hours)
    const hourDiff = Math.abs(hourA - adjustedHourB);
    if (hourDiff <= 2) {
      return { compatible: true, score: 8 }; // Close timezone + overlapping availability
    } else {
      return { compatible: true, score: 3 }; // Close timezone but different hours
    }
  }

  // 4-11 hours apart: possible but difficult
  if (timeDiff <= 11) {
    return { compatible: true, score: 0 }; // No bonus, no penalty
  }

  return { compatible: false, score: -500 };
}

// Unified matching weights (skills-first configuration)
const MATCHING_WEIGHTS = window.PEERFUSE_CONFIG?.app?.matchingWeights || {
  compPerMatch: 80,
  availability: 30,
  preferredMode: 15,
  primaryGoal: 12,
  preferredFrequency: 12,
  partnerPreference: 10,
  sessionLength: 10,
  timeZone: 10,
  studyPersonality: 10
};

/**
 * Calculate match score between two users
 * @param {Object} userA - First user object
 * @param {Object} userB - Second user object
 * @returns {number} Match score
 */
function calculateMatchScore(userA, userB) {
  const weights = MATCHING_WEIGHTS;

  // Normalize strings for comparison
  const norm = (s) => (s || '').toString().toLowerCase().trim();
  const normArr = (arr) => (
    Array.isArray(arr) 
      ? arr.map(s => norm(s)).filter(Boolean)
      : []
  );

  const aStrengths = normArr(userA.strengths);
  const aWeaknesses = normArr(userA.weaknesses);
  const bStrengths = normArr(userB.strengths);
  const bWeaknesses = normArr(userB.weaknesses);

  let score = 0;
  let matchCount = 0; // Track total number of matching factors

  // 1. Availability match (highest priority - must align for scheduling)
  if (norm(userA.availability) && norm(userA.availability) === norm(userB.availability)) {
    score += weights.availability;
    matchCount++;
  }

  // 2. Complementary strengths/weaknesses (core matching logic)
  // Consider quiz performance to adjust matching
  const aQuizResults = userA.preQuizResults || {};
  const bQuizResults = userB.preQuizResults || {};
  
  // If user A scored <50% on their strengths, they need someone who's also not expert-level
  // (complementary learning where both are still developing)
  const aStrugglingInStrengths = aQuizResults.strugglingInStrengths === true;
  const bStrugglingInStrengths = bQuizResults.strugglingInStrengths === true;
  
  // If user A scored <50% on weaknesses, they already know those topics decently
  // Match with someone who's also not super strong (peer-level learning)
  const aStrugglingInWeaknesses = aQuizResults.strugglingInWeaknesses === true;
  const bStrugglingInWeaknesses = bQuizResults.strugglingInWeaknesses === true;
  
  let complementaryMatches = 0;
  let complementaryScore = 0;
  const MAX_COMPLEMENTARY_SCORE = 80; // Maximum 80 points for complementary skills
  
  // A's weaknesses that match B's strengths
  aWeaknesses.forEach(weakness => {
    if (bStrengths.includes(weakness) && complementaryScore < MAX_COMPLEMENTARY_SCORE) {
      let matchScore = weights.compPerMatch; // 40 points per match
      
      // If A is struggling in weaknesses AND B is struggling in their strengths,
      // they're at similar levels - good for peer learning
      if (aStrugglingInWeaknesses && bStrugglingInStrengths) {
        matchScore *= 1.2; // 20% bonus for similar skill levels
      }
      
      // Cap the total at MAX_COMPLEMENTARY_SCORE
      const scoreToAdd = Math.min(matchScore, MAX_COMPLEMENTARY_SCORE - complementaryScore);
      complementaryScore += scoreToAdd;
      score += scoreToAdd;
      complementaryMatches++;
    }
  });

  // B's weaknesses that match A's strengths
  bWeaknesses.forEach(weakness => {
    if (aStrengths.includes(weakness) && complementaryScore < MAX_COMPLEMENTARY_SCORE) {
      let matchScore = weights.compPerMatch; // 40 points per match
      
      // If B is struggling in weaknesses AND A is struggling in their strengths,
      // they're at similar levels - good for peer learning
      if (bStrugglingInWeaknesses && aStrugglingInStrengths) {
        matchScore *= 1.2; // 20% bonus for similar skill levels
      }
      
      // Cap the total at MAX_COMPLEMENTARY_SCORE
      const scoreToAdd = Math.min(matchScore, MAX_COMPLEMENTARY_SCORE - complementaryScore);
      complementaryScore += scoreToAdd;
      score += scoreToAdd;
      complementaryMatches++;
    }
  });

  // Note: Pairs with 0 complementary skills are filtered out in findBestMatch
  // No need to penalize here since they won't be shown to users

  // 3. Other preference matches
  if (norm(userA.preferredMode) && norm(userA.preferredMode) === norm(userB.preferredMode)) {
    score += weights.preferredMode;
    matchCount++;
  }

  if (norm(userA.primaryGoal) && norm(userA.primaryGoal) === norm(userB.primaryGoal)) {
    score += weights.primaryGoal;
    matchCount++;
  }

  if (norm(userA.preferredFrequency) && norm(userA.preferredFrequency) === norm(userB.preferredFrequency)) {
    score += weights.preferredFrequency;
    matchCount++;
  }

  if (norm(userA.partnerPreference) && norm(userA.partnerPreference) === norm(userB.partnerPreference)) {
    score += weights.partnerPreference;
    matchCount++;
  }

  if (norm(userA.sessionLength) && norm(userA.sessionLength) === norm(userB.sessionLength)) {
    score += weights.sessionLength;
    matchCount++;
  }

  // Timezone compatibility (intricate check with availability overlap)
  const tzCompat = checkTimezoneCompatibility(
    userA.timeZone,
    userB.timeZone,
    userA.availability,
    userB.availability
  );
  if (tzCompat.compatible) {
    score += tzCompat.score;
    if (tzCompat.score > 0) {
      matchCount++;
    }
  } else {
    // Incompatible timezones (12+ hours apart)
    score += tzCompat.score; // Apply -500 penalty
  }

  if (norm(userA.studyPersonality) && norm(userA.studyPersonality) === norm(userB.studyPersonality)) {
    score += weights.studyPersonality;
    matchCount++;
  }

  // PENALTY: If only 1 factor matches out of all (9 total factors), subtract 50
  // This prevents poor matches where users only share one thing in common
  if (matchCount === 1) {
    score -= 50;
  }

  return score;
}

/**
 * Get detailed score breakdown for explanation
 * @param {Object} userA - First user object
 * @param {Object} userB - Second user object
 * @returns {Object} Score details with reasons
 */
function getScoreBreakdown(userA, userB) {
  const weights = MATCHING_WEIGHTS;

  const norm = (s) => (s || '').toString().toLowerCase().trim();
  const normArr = (arr) => (
    Array.isArray(arr) 
      ? arr.map(s => norm(s)).filter(Boolean)
      : []
  );

  const aStrengths = normArr(userA.strengths);
  const aWeaknesses = normArr(userA.weaknesses);
  const bStrengths = normArr(userB.strengths);
  const bWeaknesses = normArr(userB.weaknesses);

  let total = 0;
  const reasons = [];

  // Availability
  if (norm(userA.availability) && norm(userA.availability) === norm(userB.availability)) {
    total += weights.availability;
    reasons.push(`✓ Same availability: ${userA.availability} (+${weights.availability})`);
  }

  // Complementary skills
  let compCount = 0;
  const compMatches = [];
  
  aWeaknesses.forEach(weakness => {
    if (bStrengths.includes(weakness)) {
      compCount++;
      compMatches.push(`${weakness} (A needs, B teaches)`);
    }
  });

  bWeaknesses.forEach(weakness => {
    if (aStrengths.includes(weakness)) {
      compCount++;
      compMatches.push(`${weakness} (B needs, A teaches)`);
    }
  });

  if (compCount > 0) {
    const MAX_COMPLEMENTARY_SCORE = 80; // Maximum 80 points for complementary skills
    const compScore = Math.min(compCount * weights.compPerMatch, MAX_COMPLEMENTARY_SCORE);
    total += compScore;
    reasons.push(`✓ ${compCount} complementary skill(s): ${compMatches.join(', ')} (+${compScore})`);
  }

  // Other preferences
  if (norm(userA.preferredMode) && norm(userA.preferredMode) === norm(userB.preferredMode)) {
    total += weights.preferredMode;
    reasons.push(`✓ Same mode: ${userA.preferredMode} (+${weights.preferredMode})`);
  }

  if (norm(userA.primaryGoal) && norm(userA.primaryGoal) === norm(userB.primaryGoal)) {
    total += weights.primaryGoal;
    reasons.push(`✓ Same goal: ${userA.primaryGoal} (+${weights.primaryGoal})`);
  }

  if (norm(userA.preferredFrequency) && norm(userA.preferredFrequency) === norm(userB.preferredFrequency)) {
    total += weights.preferredFrequency;
    reasons.push(`✓ Same frequency: ${userA.preferredFrequency} (+${weights.preferredFrequency})`);
  }

  if (norm(userA.sessionLength) && norm(userA.sessionLength) === norm(userB.sessionLength)) {
    total += weights.sessionLength;
    reasons.push(`✓ Same session length: ${userA.sessionLength} (+${weights.sessionLength})`);
  }

  // Timezone compatibility
  const tzCompat = checkTimezoneCompatibility(
    userA.timeZone,
    userB.timeZone,
    userA.availability,
    userB.availability
  );
  if (tzCompat.compatible) {
    if (tzCompat.score === 10) {
      total += tzCompat.score;
      reasons.push(`✓ Same timezone (+${tzCompat.score})`);
    } else if (tzCompat.score > 0) {
      total += tzCompat.score;
      reasons.push(`✓ Compatible timezones with overlap (+${tzCompat.score})`);
    }
  } else {
    total += tzCompat.score;
    reasons.push(`✗ Incompatible timezones (12+ hours apart) (${tzCompat.score})`);
  }

  if (norm(userA.studyPersonality) && norm(userA.studyPersonality) === norm(userB.studyPersonality)) {
    total += weights.studyPersonality;
    reasons.push(`✓ Same study style: ${userA.studyPersonality} (+${weights.studyPersonality})`);
  }

  return {
    total,
    reasons,
    complementaryCount: compCount
  };
}

/**
 * Find the best match for a target user from a list of candidates
 * @param {Object} targetUser - User to find match for
 * @param {Array} candidates - Array of potential matches
 * @returns {Object|null} Best match with score details
 */
function findBestMatch(targetUser, candidates) {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // Don't match user with themselves
  const validCandidates = candidates.filter(candidate => {
    const candidateName = (candidate.name || candidate.username || '').toLowerCase().trim();
    const targetName = (targetUser.name || targetUser.username || '').toLowerCase().trim();
    return candidateName !== targetName;
  });

  if (validCandidates.length === 0) {
    return null;
  }

  // Calculate scores for all candidates
  const scoredMatches = validCandidates.map(candidate => {
    const score = calculateMatchScore(targetUser, candidate);
    const breakdown = getScoreBreakdown(targetUser, candidate);
    
    return {
      user: candidate,
      score,
      breakdown
    };
  });

  // HARD REQUIREMENT: Filter out pairs with zero complementary skills
  // Students can't help each other if they have no complementary strengths/weaknesses
  const viableMatches = scoredMatches.filter(match => {
    return match.breakdown && match.breakdown.complementaryCount > 0;
  });

  // Sort by score (highest first)
  viableMatches.sort((a, b) => b.score - a.score);

  // Return only viable matches (at least 1 complementary skill)
  return viableMatches;
}

/**
 * Get top N matches
 * @param {Object} targetUser - User to find matches for
 * @param {Array} candidates - Array of potential matches
 * @param {number} limit - Maximum number of matches to return
 * @returns {Array} Top N matches
 */
function getTopMatches(targetUser, candidates, limit = 10) {
  const allMatches = findBestMatch(targetUser, candidates);
  
  if (!allMatches) {
    return [];
  }

  return allMatches.slice(0, limit);
}

/**
 * Check if two users are compatible (minimum threshold)
 * @param {Object} userA - First user
 * @param {Object} userB - Second user
 * @param {number} minScore - Minimum score threshold
 * @returns {boolean} Whether users are compatible
 */
function areUsersCompatible(userA, userB, minScore = 100) {
  const score = calculateMatchScore(userA, userB);
  return score >= minScore;
}

/**
 * Get match quality badge based on score
 * @param {number} score - Match score
 * @returns {Object} Badge with text, color, and emoji
 */
function getMatchQualityBadge(score) {
  if (score >= 150) {
    return { text: 'Excellent Match', color: '#10b981', emoji: '🌟' };
  } else if (score >= 120) {
    return { text: 'Great Match', color: '#3b82f6', emoji: '✨' };
  } else if (score >= 100) {
    return { text: 'Good Match', color: '#8b5cf6', emoji: '👍' };
  } else if (score >= 80) {
    return { text: 'Fair Match', color: '#f59e0b', emoji: '🤝' };
  } else {
    return { text: 'Low Compatibility', color: '#ef4444', emoji: '⚠️' };
  }
}

// Export functions to global scope
window.Matching = {
  calculateMatchScore,
  getScoreBreakdown,
  findBestMatch,
  getTopMatches,
  areUsersCompatible,
  getMatchQualityBadge
};

window.MatchingAlgorithm = window.Matching; // Alias for convenience
