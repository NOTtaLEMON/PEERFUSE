/**
 * Matching Algorithm Module
 * Implements the peer matching logic based on complementary skills and preferences
 */

/**
 * Calculate match score between two users
 * @param {Object} userA - First user object
 * @param {Object} userB - Second user object
 * @returns {number} Match score
 */
function calculateMatchScore(userA, userB) {
  const weights = window.PEERFUSE_CONFIG?.app?.matchingWeights || {
    availability: 100,
    compPerMatch: 30,
    preferredMode: 8,
    primaryGoal: 6,
    preferredFrequency: 6,
    partnerPreference: 4,
    sessionLength: 4,
    timeZone: 3,
    studyPersonality: 3
  };

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

  // 1. Availability match (highest priority - must align for scheduling)
  if (norm(userA.availability) && norm(userA.availability) === norm(userB.availability)) {
    score += weights.availability;
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
  
  // A's weaknesses that match B's strengths
  aWeaknesses.forEach(weakness => {
    if (bStrengths.includes(weakness)) {
      let matchScore = weights.compPerMatch;
      
      // If A is struggling in weaknesses AND B is struggling in their strengths,
      // they're at similar levels - good for peer learning
      if (aStrugglingInWeaknesses && bStrugglingInStrengths) {
        matchScore *= 1.2; // 20% bonus for similar skill levels
      }
      
      score += matchScore;
    }
  });

  // B's weaknesses that match A's strengths
  bWeaknesses.forEach(weakness => {
    if (aStrengths.includes(weakness)) {
      let matchScore = weights.compPerMatch;
      
      // If B is struggling in weaknesses AND A is struggling in their strengths,
      // they're at similar levels - good for peer learning
      if (bStrugglingInWeaknesses && aStrugglingInStrengths) {
        matchScore *= 1.2; // 20% bonus for similar skill levels
      }
      
      score += matchScore;
    }
  });

  // 3. Other preference matches
  if (norm(userA.preferredMode) && norm(userA.preferredMode) === norm(userB.preferredMode)) {
    score += weights.preferredMode;
  }

  if (norm(userA.primaryGoal) && norm(userA.primaryGoal) === norm(userB.primaryGoal)) {
    score += weights.primaryGoal;
  }

  if (norm(userA.preferredFrequency) && norm(userA.preferredFrequency) === norm(userB.preferredFrequency)) {
    score += weights.preferredFrequency;
  }

  if (norm(userA.partnerPreference) && norm(userA.partnerPreference) === norm(userB.partnerPreference)) {
    score += weights.partnerPreference;
  }

  if (norm(userA.sessionLength) && norm(userA.sessionLength) === norm(userB.sessionLength)) {
    score += weights.sessionLength;
  }

  if (norm(userA.timeZone) && norm(userA.timeZone) === norm(userB.timeZone)) {
    score += weights.timeZone;
  }

  if (norm(userA.studyPersonality) && norm(userA.studyPersonality) === norm(userB.studyPersonality)) {
    score += weights.studyPersonality;
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
  const weights = window.PEERFUSE_CONFIG?.app?.matchingWeights || {
    availability: 100,
    compPerMatch: 30,
    preferredMode: 8,
    primaryGoal: 6,
    preferredFrequency: 6,
    partnerPreference: 4,
    sessionLength: 4,
    timeZone: 3,
    studyPersonality: 3
  };

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
    const compScore = compCount * weights.compPerMatch;
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

  if (norm(userA.timeZone) && norm(userA.timeZone) === norm(userB.timeZone)) {
    total += weights.timeZone;
    reasons.push(`✓ Same timezone: ${userA.timeZone} (+${weights.timeZone})`);
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

  // Sort by score (highest first)
  scoredMatches.sort((a, b) => b.score - a.score);

  // Return top matches
  return scoredMatches;
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

// Export functions to global scope
window.Matching = {
  calculateMatchScore,
  getScoreBreakdown,
  findBestMatch,
  getTopMatches,
  areUsersCompatible
};

window.MatchingAlgorithm = window.Matching; // Alias for convenience
