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
  compPerMatch: 40,
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
 * Score a pair of users and explain the score. This is the single source of
 * truth: calculateMatchScore and getScoreBreakdown both read from it, so the
 * number and the reasons shown to users can't drift apart.
 * @param {Object} userA - First user object
 * @param {Object} userB - Second user object
 * @returns {Object} {score, reasons, complementaryCount}
 */
function evaluatePair(userA, userB) {
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

  // Quiz flags are saved flat on the profile (preQuizStrugglingInStrengths /
  // preQuizStrugglingInWeaknesses); the nested preQuizResults shape is kept as a fallback
  const isStruggling = (user, which) => {
    const flat = user['preQuizStrugglingIn' + which];
    if (flat !== undefined) return flat === true;
    return (user.preQuizResults || {})['strugglingIn' + which] === true;
  };

  let score = 0;
  let matchCount = 0; // Track total number of matching factors
  const reasons = [];

  // 1. Availability match (highest priority - must align for scheduling)
  if (norm(userA.availability) && norm(userA.availability) === norm(userB.availability)) {
    score += weights.availability;
    matchCount++;
    reasons.push(`✓ Same availability: ${userA.availability} (+${weights.availability})`);
  }

  // 2. Complementary strengths/weaknesses (core matching logic)
  // If both people scored <50% on the side that connects them, they're at a
  // similar level, which is good for peer learning: 20% bonus per match.
  const MAX_COMPLEMENTARY_SCORE = 80; // Maximum 80 points for complementary skills
  const compMatches = [];
  let complementaryScore = 0;
  let similarLevelBonus = false;

  const addComplementary = (label, neederStruggling, teacherStruggling) => {
    compMatches.push(label);
    if (complementaryScore >= MAX_COMPLEMENTARY_SCORE) return;
    let matchScore = weights.compPerMatch; // 40 points per match
    if (neederStruggling && teacherStruggling) {
      matchScore *= 1.2;
      similarLevelBonus = true;
    }
    // Cap the total at MAX_COMPLEMENTARY_SCORE
    complementaryScore += Math.min(matchScore, MAX_COMPLEMENTARY_SCORE - complementaryScore);
  };

  // A's weaknesses that match B's strengths
  aWeaknesses.forEach(weakness => {
    if (bStrengths.includes(weakness)) {
      addComplementary(`${weakness} (A needs, B teaches)`,
        isStruggling(userA, 'Weaknesses'), isStruggling(userB, 'Strengths'));
    }
  });

  // B's weaknesses that match A's strengths
  bWeaknesses.forEach(weakness => {
    if (aStrengths.includes(weakness)) {
      addComplementary(`${weakness} (B needs, A teaches)`,
        isStruggling(userB, 'Weaknesses'), isStruggling(userA, 'Strengths'));
    }
  });

  const complementaryCount = compMatches.length;
  if (complementaryCount > 0) {
    score += complementaryScore;
    reasons.push(`✓ ${complementaryCount} complementary skill(s): ${compMatches.join(', ')} (+${complementaryScore})`);
    if (similarLevelBonus) {
      reasons.push('✓ Similar quiz level on these skills (20% bonus included)');
    }
  }
  // Note: Pairs with 0 complementary skills are filtered out in findBestMatch

  // 3. Other preference matches
  if (norm(userA.preferredMode) && norm(userA.preferredMode) === norm(userB.preferredMode)) {
    score += weights.preferredMode;
    matchCount++;
    reasons.push(`✓ Same mode: ${userA.preferredMode} (+${weights.preferredMode})`);
  }

  if (norm(userA.primaryGoal) && norm(userA.primaryGoal) === norm(userB.primaryGoal)) {
    score += weights.primaryGoal;
    matchCount++;
    reasons.push(`✓ Same goal: ${userA.primaryGoal} (+${weights.primaryGoal})`);
  }

  if (norm(userA.preferredFrequency) && norm(userA.preferredFrequency) === norm(userB.preferredFrequency)) {
    score += weights.preferredFrequency;
    matchCount++;
    reasons.push(`✓ Same frequency: ${userA.preferredFrequency} (+${weights.preferredFrequency})`);
  }

  if (norm(userA.partnerPreference) && norm(userA.partnerPreference) === norm(userB.partnerPreference)) {
    score += weights.partnerPreference;
    matchCount++;
    reasons.push(`✓ Same partner preference: ${userA.partnerPreference} (+${weights.partnerPreference})`);
  }

  if (norm(userA.sessionLength) && norm(userA.sessionLength) === norm(userB.sessionLength)) {
    score += weights.sessionLength;
    matchCount++;
    reasons.push(`✓ Same session length: ${userA.sessionLength} (+${weights.sessionLength})`);
  }

  // Timezone compatibility (intricate check with availability overlap)
  const tzCompat = checkTimezoneCompatibility(
    userA.timeZone,
    userB.timeZone,
    userA.availability,
    userB.availability
  );
  score += tzCompat.score;
  if (tzCompat.compatible) {
    if (tzCompat.score === 10) {
      reasons.push(`✓ Same timezone (+${tzCompat.score})`);
    } else if (tzCompat.score > 0) {
      reasons.push(`✓ Compatible timezones with overlap (+${tzCompat.score})`);
    }
    if (tzCompat.score > 0) {
      matchCount++;
    }
  } else {
    // Incompatible timezones (12+ hours apart): -500 penalty
    reasons.push(`✗ Incompatible timezones (12+ hours apart) (${tzCompat.score})`);
  }

  if (norm(userA.studyPersonality) && norm(userA.studyPersonality) === norm(userB.studyPersonality)) {
    score += weights.studyPersonality;
    matchCount++;
    reasons.push(`✓ Same study style: ${userA.studyPersonality} (+${weights.studyPersonality})`);
  }

  // PENALTY: If only 1 factor matches out of all (9 total factors), subtract 50
  // This prevents poor matches where users only share one thing in common
  if (matchCount === 1) {
    score -= 50;
    reasons.push('✗ Only one preference in common (-50)');
  }

  return { score, reasons, complementaryCount };
}

/**
 * Calculate match score between two users
 * @param {Object} userA - First user object
 * @param {Object} userB - Second user object
 * @returns {number} Match score
 */
function calculateMatchScore(userA, userB) {
  return evaluatePair(userA, userB).score;
}

/**
 * Get detailed score breakdown for explanation
 * @param {Object} userA - First user object
 * @param {Object} userB - Second user object
 * @returns {Object} Score details with reasons
 */
function getScoreBreakdown(userA, userB) {
  const { score, reasons, complementaryCount } = evaluatePair(userA, userB);
  return {
    total: score,
    reasons,
    complementaryCount
  };
}

/**
 * Find the best match for a target user from a list of candidates
 * @param {Object} targetUser - User to find match for
 * @param {Array} candidates - Array of potential matches
 * @param {Array} excludedIds - Optional array of user IDs to exclude
 * @returns {Object|null} Best match with score details
 */
function findBestMatch(targetUser, candidates, excludedIds = []) {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // Don't match user with themselves and exclude specified IDs
  const validCandidates = candidates.filter(candidate => {
    const candidateName = (candidate.name || candidate.username || '').toLowerCase().trim();
    const targetName = (targetUser.name || targetUser.username || '').toLowerCase().trim();
    const candidateId = candidate.id || candidate.username;
    
    // Exclude if it's the same user
    if (candidateName === targetName) {
      return false;
    }
    
    // Exclude if in rejected list
    if (excludedIds.includes(candidateId)) {
      return false;
    }
    
    return true;
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
 * Find alternative matches excluding previously rejected ones
 * @param {Object} targetUser - User to find match for
 * @param {Array} candidates - Array of potential matches
 * @param {Array|string} rejectedIds - Array of rejected user IDs or single ID
 * @param {number} limit - Maximum number of matches to return
 * @returns {Object} {matches: Array, status: string, message: string}
 */
function findRematch(targetUser, candidates, rejectedIds = [], limit = 10) {
  // Normalize rejectedIds to array
  const excludedIds = Array.isArray(rejectedIds) ? rejectedIds : (rejectedIds ? [rejectedIds] : []);
  
  // Get matches excluding rejected IDs
  const allMatches = findBestMatch(targetUser, candidates, excludedIds);
  
  if (!allMatches || allMatches.length === 0) {
    return {
      matches: [],
      status: 'no_matches',
      message: 'No alternative matches available. You\'ve reviewed all compatible users!'
    };
  }
  
  const topMatches = allMatches.slice(0, limit);
  return {
    matches: topMatches,
    status: 'success',
    message: `Found ${topMatches.length} alternative match(es)`
  };
}

/**
 * Get top N matches
 * @param {Object} targetUser - User to find matches for
 * @param {Array} candidates - Array of potential matches
 * @param {number} limit - Maximum number of matches to return
 * @param {Array} excludedIds - Optional array of user IDs to exclude
 * @returns {Array} Top N matches
 */
function getTopMatches(targetUser, candidates, limit = 10, excludedIds = []) {
  const allMatches = findBestMatch(targetUser, candidates, excludedIds);
  
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
  findRematch,
  getTopMatches,
  areUsersCompatible,
  getMatchQualityBadge
};

window.MatchingAlgorithm = window.Matching; // Alias for convenience
