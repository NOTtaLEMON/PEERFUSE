"""
PeerFuse Matching Algorithm Simulation
Tests multiple weight configurations to find optimal balance
"""

import random
import json
from collections import defaultdict

# Weight configurations to test (30 variations)
# Focused on finding optimal variations around Skills First philosophy
WEIGHT_CONFIGS = [
    # BASELINE - Original Skills First
    {
        'name': 'Skills First (Original)',
        'weights': {'compPerMatch': 80, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    
    # VARIATIONS 1-5: Boost availability weight (keep skills at 80)
    {
        'name': 'Skills 80 / Avail 35',
        'weights': {'compPerMatch': 80, 'availability': 35, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 80 / Avail 40',
        'weights': {'compPerMatch': 80, 'availability': 40, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 80 / Avail 45',
        'weights': {'compPerMatch': 80, 'availability': 45, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 80 / Avail 50',
        'weights': {'compPerMatch': 80, 'availability': 50, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    
    # VARIATIONS 6-10: Increase skills weight (keep avail at 30)
    {
        'name': 'Skills 85 / Avail 30',
        'weights': {'compPerMatch': 85, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 90 / Avail 30',
        'weights': {'compPerMatch': 90, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 95 / Avail 30',
        'weights': {'compPerMatch': 95, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 100 / Avail 30',
        'weights': {'compPerMatch': 100, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    
    # VARIATIONS 11-15: Boost secondary factors (mode, goal)
    {
        'name': 'Skills 80 / Mode 20',
        'weights': {'compPerMatch': 80, 'availability': 30, 'preferredMode': 20, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 80 / Goal 20',
        'weights': {'compPerMatch': 80, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 20, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 80 / Freq 20',
        'weights': {'compPerMatch': 80, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 20, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 80 / Mode+Goal 20',
        'weights': {'compPerMatch': 80, 'availability': 30, 'preferredMode': 20, 'primaryGoal': 20, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 80 / All Secondary 15',
        'weights': {'compPerMatch': 80, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 15, 'preferredFrequency': 15, 'partnerPreference': 15, 'sessionLength': 15, 'timeZone': 15, 'studyPersonality': 15}
    },
    
    # VARIATIONS 16-20: Lower minimum weights
    {
        'name': 'Skills 80 / Min 5',
        'weights': {'compPerMatch': 80, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 5, 'sessionLength': 5, 'timeZone': 5, 'studyPersonality': 5}
    },
    {
        'name': 'Skills 80 / Min 8',
        'weights': {'compPerMatch': 80, 'availability': 30, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 8, 'sessionLength': 8, 'timeZone': 8, 'studyPersonality': 8}
    },
    {
        'name': 'Skills 80 / Min 12',
        'weights': {'compPerMatch': 80, 'availability': 30, 'preferredMode': 12, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 12, 'sessionLength': 12, 'timeZone': 12, 'studyPersonality': 12}
    },
    
    # VARIATIONS 21-25: Balanced dual-priority (skills + one other)
    {
        'name': 'Skills 70 / Avail 40',
        'weights': {'compPerMatch': 70, 'availability': 40, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 75 / Avail 35',
        'weights': {'compPerMatch': 75, 'availability': 35, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 75 / Avail 40',
        'weights': {'compPerMatch': 75, 'availability': 40, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 70 / Avail 35 / Mode 20',
        'weights': {'compPerMatch': 70, 'availability': 35, 'preferredMode': 20, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 70 / Avail 35 / Goal 20',
        'weights': {'compPerMatch': 70, 'availability': 35, 'preferredMode': 15, 'primaryGoal': 20, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    
    # VARIATIONS 26-30: Extreme variations to test boundaries
    {
        'name': 'Skills 60 / Avail 50',
        'weights': {'compPerMatch': 60, 'availability': 50, 'preferredMode': 15, 'primaryGoal': 15, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 90 / Avail 40',
        'weights': {'compPerMatch': 90, 'availability': 40, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 85 / Avail 35 / Mode 18',
        'weights': {'compPerMatch': 85, 'availability': 35, 'preferredMode': 18, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 80 / Avail 35 / All 15',
        'weights': {'compPerMatch': 80, 'availability': 35, 'preferredMode': 15, 'primaryGoal': 15, 'preferredFrequency': 15, 'partnerPreference': 15, 'sessionLength': 15, 'timeZone': 15, 'studyPersonality': 15}
    },
    {
        'name': 'Skills 75 / Avail 45 / Mode 18',
        'weights': {'compPerMatch': 75, 'availability': 45, 'preferredMode': 18, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 10, 'sessionLength': 10, 'timeZone': 10, 'studyPersonality': 10}
    },
    {
        'name': 'Skills 85 / Avail 40 / Min 12',
        'weights': {'compPerMatch': 85, 'availability': 40, 'preferredMode': 15, 'primaryGoal': 12, 'preferredFrequency': 12, 'partnerPreference': 12, 'sessionLength': 12, 'timeZone': 12, 'studyPersonality': 12}
    }
]

PENALTIES = {
    'single_factor': -50        # If only 1 total factor matches
}

# HARD REQUIREMENT: Pairs with 0 complementary skills are filtered out entirely
# They are not scored or shown to users - students must be able to teach each other

# Available options for each field
SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 
            'English', 'History', 'Economics', 'Statistics', 'Data Structures',
            'Algorithms', 'Calculus', 'Linear Algebra', 'Psychology', 'Philosophy']

AVAILABILITY_OPTIONS = ['6AM-10AM', '10AM-2PM', '2PM-6PM', '6PM-10PM', 'Late night (10PM+)']
MODE_OPTIONS = ['Online Meeting (Video)', 'Chat Only', 'In-Person', 'Hybrid']
GOAL_OPTIONS = ['Clear basics', 'Improve internals', 'Prepare for semester end exams', 'Project collaboration', 'Other']
FREQUENCY_OPTIONS = ['Once a week', '2-3 times a week', 'Monthly once', 'As needed']
SESSION_LENGTH_OPTIONS = ['30 minutes', '1 hour', '1-2 hours', '2+ hours', 'Flexible']
PARTNER_PREF_OPTIONS = ['Same year/level', 'Senior student', 'Junior student', 'No preference']
TIMEZONE_OPTIONS = ['UTC-08:00', 'UTC-05:00', 'UTC+00:00', 'UTC+01:00', 'UTC+05:30', 'UTC+08:00']
PERSONALITY_OPTIONS = ['Focused & Structured', 'Casual & Flexible', 'Competitive', 'Collaborative', 'Independent learner']

def generate_user(user_id):
    """Generate a random user profile"""
    # Randomly select 1-2 strengths and weaknesses
    all_subjects = SUBJECTS.copy()
    num_strengths = random.randint(1, 2)
    strengths = random.sample(all_subjects, num_strengths)
    
    remaining = [s for s in all_subjects if s not in strengths]
    num_weaknesses = random.randint(1, 2)
    weaknesses = random.sample(remaining, num_weaknesses)
    
    return {
        'id': user_id,
        'name': f'User{user_id}',
        'strengths': strengths,
        'weaknesses': weaknesses,
        'availability': random.choice(AVAILABILITY_OPTIONS),
        'preferredMode': random.choice(MODE_OPTIONS),
        'primaryGoal': random.choice(GOAL_OPTIONS),
        'preferredFrequency': random.choice(FREQUENCY_OPTIONS),
        'sessionLength': random.choice(SESSION_LENGTH_OPTIONS),
        'partnerPreference': random.choice(PARTNER_PREF_OPTIONS),
        'timeZone': random.choice(TIMEZONE_OPTIONS),
        'studyPersonality': random.choice(PERSONALITY_OPTIONS)
    }

def calculate_match_score(user_a, user_b, weights, enable_negative_marking=False):
    """Calculate match score between two users (Python version of matching.js)"""
    score = 0
    match_count = 0  # Track total number of matching factors
    
    # 1. Availability match
    if user_a['availability'] == user_b['availability']:
        score += weights['availability']
        match_count += 1
    elif enable_negative_marking:
        # Negative marking: if availability DOESN'T match, penalize
        score -= weights['availability'] * 0.5  # 50% of weight as penalty
    
    # 2. Complementary skills
    a_strengths = set(user_a['strengths'])
    a_weaknesses = set(user_a['weaknesses'])
    b_strengths = set(user_b['strengths'])
    b_weaknesses = set(user_b['weaknesses'])
    
    comp_matches = 0
    
    # A's weaknesses that match B's strengths
    a_comp = len(a_weaknesses & b_strengths)
    comp_matches += a_comp
    score += a_comp * weights['compPerMatch']
    
    # B's weaknesses that match A's strengths
    b_comp = len(b_weaknesses & a_strengths)
    comp_matches += b_comp
    score += b_comp * weights['compPerMatch']
    
    # Note: Pairs with 0 comp skills filtered out in simulate function
    # No penalty needed since they won't be included in results
    
    # 3. Other preference matches (with negative marking)
    if user_a['preferredMode'] == user_b['preferredMode']:
        score += weights['preferredMode']
        match_count += 1
    elif enable_negative_marking:
        score -= weights['preferredMode'] * 0.5
    
    if user_a['primaryGoal'] == user_b['primaryGoal']:
        score += weights['primaryGoal']
        match_count += 1
    elif enable_negative_marking:
        score -= weights['primaryGoal'] * 0.5
    
    if user_a['preferredFrequency'] == user_b['preferredFrequency']:
        score += weights['preferredFrequency']
        match_count += 1
    elif enable_negative_marking:
        score -= weights['preferredFrequency'] * 0.5
    
    if user_a['partnerPreference'] == user_b['partnerPreference']:
        score += weights['partnerPreference']
        match_count += 1
    elif enable_negative_marking:
        score -= weights['partnerPreference'] * 0.5
    
    if user_a['sessionLength'] == user_b['sessionLength']:
        score += weights['sessionLength']
        match_count += 1
    elif enable_negative_marking:
        score -= weights['sessionLength'] * 0.5
    
    if user_a['timeZone'] == user_b['timeZone']:
        score += weights['timeZone']
        match_count += 1
    elif enable_negative_marking:
        score -= weights['timeZone'] * 0.5
    
    if user_a['studyPersonality'] == user_b['studyPersonality']:
        score += weights['studyPersonality']
        match_count += 1
    elif enable_negative_marking:
        score -= weights['studyPersonality'] * 0.5
    
    # PENALTY: If only 1 factor matches out of all (9 total factors), subtract 50
    if match_count == 1:
        score -= 50
    
    return score, comp_matches

def simulate_matching_with_config(config, num_users=500):
    """Simulate matching process for N users with specific weight configuration"""
    weights = config['weights']
    enable_negative_marking = config.get('negative_marking', False)
    
    # Generate users (use fixed seed for reproducibility across configs)
    random.seed(42)
    users = [generate_user(i) for i in range(1, num_users + 1)]
    
    # Calculate all possible pair scores
    all_pairs = []
    for i in range(len(users)):
        for j in range(i + 1, len(users)):
            score, comp_matches = calculate_match_score(users[i], users[j], weights, enable_negative_marking)
            # HARD REQUIREMENT: Only include pairs with at least 1 complementary skill
            if comp_matches > 0:
                all_pairs.append({
                    'score': score,
                    'comp_matches': comp_matches
                })
    
    # Sort by score
    all_pairs.sort(key=lambda x: x['score'], reverse=True)
    
    # Calculate statistics
    scores = [p['score'] for p in all_pairs]
    avg_score = sum(scores) / len(scores)
    median_score = scores[len(scores) // 2]
    highest_score = max(scores)
    lowest_score = min(scores)
    
    # Count quality tiers
    excellent = sum(1 for s in scores if s >= 150)
    great = sum(1 for s in scores if 120 <= s < 150)
    good = sum(1 for s in scores if 100 <= s < 120)
    fair = sum(1 for s in scores if 80 <= s < 100)
    poor = sum(1 for s in scores if 50 <= s < 80)
    unusable = sum(1 for s in scores if s < 50)
    
    # Usability metrics
    usable_80 = sum(1 for s in scores if s >= 80)
    recommended_120 = sum(1 for s in scores if s >= 120)
    
    # Complementary matches
    comp_counts = [p['comp_matches'] for p in all_pairs]
    avg_comp = sum(comp_counts) / len(comp_counts)
    zero_comp = sum(1 for c in comp_counts if c == 0)
    
    return {
        'config_name': config['name'],
        'avg_score': round(avg_score, 1),
        'median_score': median_score,
        'highest_score': highest_score,
        'lowest_score': lowest_score,
        'excellent_pct': round(excellent / len(scores) * 100, 1),
        'great_pct': round(great / len(scores) * 100, 1),
        'good_pct': round(good / len(scores) * 100, 1),
        'fair_pct': round(fair / len(scores) * 100, 1),
        'poor_pct': round(poor / len(scores) * 100, 1),
        'unusable_pct': round(unusable / len(scores) * 100, 1),
        'usable_80_pct': round(usable_80 / len(scores) * 100, 1),
        'recommended_120_pct': round(recommended_120 / len(scores) * 100, 1),
        'avg_comp': round(avg_comp, 2),
        'zero_comp_pct': round(zero_comp / len(scores) * 100, 1)
    }


def run_all_simulations():
    """Run simulations for all weight configurations with extensive analysis"""
    print("\n" + "="*90)
    print("WEIGHT CONFIGURATION COMPARISON - 30 VARIATIONS")
    print("Testing 500 users - focused on finding optimal Skills First variations")
    print("="*90 + "\n")
    
    # Filter out negative marking config (if any)
    configs_to_test = [c for c in WEIGHT_CONFIGS if not c.get('negative_marking', False)]
    
    results = []
    for i, config in enumerate(configs_to_test, 1):
        print(f"Running simulation {i}/{len(configs_to_test)}: {config['name']}...")
        result = simulate_matching_with_config(config, num_users=500)
        results.append(result)
    
    print("\n✅ All simulations complete!\n")
    
    # ========================================================================
    # TABLE 1: COMPREHENSIVE OVERVIEW
    # ========================================================================
    print("="*130)
    print("TABLE 1: COMPREHENSIVE RESULTS OVERVIEW")
    print("="*130)
    print(f"{'Config Name':<22} | {'Avg':<6} | {'Med':<5} | {'High':<5} | {'Low':<6} | {'Ex%':<5} | {'Gr%':<5} | {'Gd%':<5} | {'Fair%':<6} | {'≥80%':<6} | {'≥120%':<6} | {'AvgC':<5}")
    print("-"*130)
    
    for r in results:
        print(f"{r['config_name']:<22} | "
              f"{r['avg_score']:<6.1f} | "
              f"{r['median_score']:<5} | "
              f"{r['highest_score']:<5} | "
              f"{r['lowest_score']:<6} | "
              f"{r['excellent_pct']:<5.1f} | "
              f"{r['great_pct']:<5.1f} | "
              f"{r['good_pct']:<5.1f} | "
              f"{r['fair_pct']:<6.1f} | "
              f"{r['usable_80_pct']:<6.1f} | "
              f"{r['recommended_120_pct']:<6.1f} | "
              f"{r['avg_comp']:<5.2f}")
    
    print("="*130)
    print("LEGEND: Avg=Average | Med=Median | High=Highest | Low=Lowest | Ex%=Excellent(150+) | Gr%=Great(120-149)")
    print("        Gd%=Good(100-119) | Fair%=Fair(80-99) | ≥80%=Usable | ≥120%=Recommended | AvgC=Avg Comp Skills")
    print("="*130 + "\n\n")
    
    # ========================================================================
    # TABLE 2: SCORE DISTRIBUTION BREAKDOWN
    # ========================================================================
    print("="*110)
    print("TABLE 2: DETAILED SCORE DISTRIBUTION (What % of pairs fall in each quality tier?)")
    print("="*110)
    print(f"{'Config Name':<22} | {'Excellent':<12} | {'Great':<12} | {'Good':<12} | {'Fair':<12} | {'Poor':<12} | {'Unusable':<12}")
    print(f"{'':22} | {'(150+)':<12} | {'(120-149)':<12} | {'(100-119)':<12} | {'(80-99)':<12} | {'(50-79)':<12} | {'(<50)':<12}")
    print("-"*110)
    
    for r in results:
        print(f"{r['config_name']:<22} | "
              f"{r['excellent_pct']:>6.1f}%     | "
              f"{r['great_pct']:>6.1f}%     | "
              f"{r['good_pct']:>6.1f}%     | "
              f"{r['fair_pct']:>6.1f}%     | "
              f"{r['poor_pct']:>6.1f}%     | "
              f"{r['unusable_pct']:>6.1f}%")
    
    print("="*110 + "\n\n")
    
    # ========================================================================
    # TABLE 3: RANKING BY KEY METRICS
    # ========================================================================
    print("="*100)
    print("TABLE 3: RANKINGS BY KEY METRICS (Who wins in each category?)")
    print("="*100)
    
    # Sort by different metrics
    by_avg = sorted(results, key=lambda x: x['avg_score'], reverse=True)
    by_excellent = sorted(results, key=lambda x: x['excellent_pct'], reverse=True)
    by_usable = sorted(results, key=lambda x: x['usable_80_pct'], reverse=True)
    by_recommended = sorted(results, key=lambda x: x['recommended_120_pct'], reverse=True)
    by_median = sorted(results, key=lambda x: x['median_score'], reverse=True)
    
    print(f"{'Rank':<5} | {'By Avg Score':<22} | {'By Excellent %':<22} | {'By Usable %':<22} | {'By Recommended %':<22}")
    print("-"*100)
    for i in range(min(10, len(results))):
        print(f"{i+1:<5} | "
              f"{by_avg[i]['config_name']:<17} ({by_avg[i]['avg_score']:>4.1f}) | "
              f"{by_excellent[i]['config_name']:<17} ({by_excellent[i]['excellent_pct']:>4.1f}%) | "
              f"{by_usable[i]['config_name']:<17} ({by_usable[i]['usable_80_pct']:>4.1f}%) | "
              f"{by_recommended[i]['config_name']:<17} ({by_recommended[i]['recommended_120_pct']:>4.1f}%)")
    print("="*100 + "\n\n")
    
    # ========================================================================
    # TABLE 4: TOP 5 vs BOTTOM 5 COMPARISON
    # ========================================================================
    print("="*90)
    print("TABLE 4: TOP 5 vs BOTTOM 5 (by Average Score)")
    print("="*90)
    print(f"{'Config Name':<22} | {'Avg':<7} | {'Usable%':<8} | {'Excellent%':<11} | {'Median':<7} | {'Highest':<7}")
    print("-"*90)
    print("TOP 5:")
    for i in range(5):
        r = by_avg[i]
        print(f"{r['config_name']:<22} | {r['avg_score']:<7.1f} | {r['usable_80_pct']:<8.1f} | {r['excellent_pct']:<11.1f} | {r['median_score']:<7} | {r['highest_score']:<7}")
    
    print("\nBOTTOM 5:")
    for i in range(-5, 0):
        r = by_avg[i]
        print(f"{r['config_name']:<22} | {r['avg_score']:<7.1f} | {r['usable_80_pct']:<8.1f} | {r['excellent_pct']:<11.1f} | {r['median_score']:<7} | {r['highest_score']:<7}")
    
    print("="*90 + "\n\n")
    
    # ========================================================================
    # VISUAL: ASCII BAR CHARTS
    # ========================================================================
    print("="*90)
    print("VISUAL COMPARISON: AVERAGE SCORE (each █ = 5 points)")
    print("="*90)
    for r in sorted(results, key=lambda x: x['avg_score'], reverse=True):
        bar_length = int(r['avg_score'] / 5)
        bar = "█" * bar_length
        print(f"{r['config_name']:<22} | {bar} {r['avg_score']:.1f}")
    print("="*90 + "\n\n")
    
    print("="*90)
    print("VISUAL COMPARISON: USABLE PAIRS % (each █ = 2%)")
    print("="*90)
    for r in sorted(results, key=lambda x: x['usable_80_pct'], reverse=True):
        bar_length = int(r['usable_80_pct'] / 2)
        bar = "█" * bar_length
        print(f"{r['config_name']:<22} | {bar} {r['usable_80_pct']:.1f}%")
    print("="*90 + "\n\n")
    
    print("="*90)
    print("VISUAL COMPARISON: EXCELLENT MATCHES % (each █ = 0.5%)")
    print("="*90)
    for r in sorted(results, key=lambda x: x['excellent_pct'], reverse=True):
        bar_length = int(r['excellent_pct'] / 0.5)
        bar = "█" * bar_length
        print(f"{r['config_name']:<22} | {bar} {r['excellent_pct']:.1f}%")
    print("="*90 + "\n\n")
    
    # ========================================================================
    # ANALYSIS: PROS & CONS
    # ========================================================================
    print("\n" + "="*90)
    print("DEEP DIVE ANALYSIS: TOP 3 CONFIGURATIONS")
    print("="*90 + "\n")
    
    top_3 = by_avg[:3]
    
    for i, config in enumerate(top_3, 1):
        print(f"{'='*90}")
        print(f"#{i}. {config['config_name']}")
        print(f"{'='*90}")
        
        # Get the actual weights
        weights_config = next(c for c in WEIGHT_CONFIGS if c['name'] == config['config_name'])
        weights = weights_config['weights']
        
        print(f"\nWEIGHT DISTRIBUTION:")
        sorted_weights = sorted(weights.items(), key=lambda x: x[1], reverse=True)
        for factor, weight in sorted_weights:
            bar = "█" * (weight // 5)
            print(f"  {factor:<20} : {weight:>3} pts {bar}")
        
        print(f"\nPERFORMANCE METRICS:")
        print(f"  Average Score        : {config['avg_score']:.1f}")
        print(f"  Median Score         : {config['median_score']}")
        print(f"  Score Range          : {config['lowest_score']} to {config['highest_score']}")
        print(f"  Usable Pairs (≥80)   : {config['usable_80_pct']:.1f}%")
        print(f"  Recommended (≥120)   : {config['recommended_120_pct']:.1f}%")
        print(f"  Excellent (≥150)     : {config['excellent_pct']:.1f}%")
        print(f"  Avg Comp Skills      : {config['avg_comp']:.2f}")
        
        print(f"\nPROS:")
        pros = []
        if config['avg_score'] >= 80:
            pros.append(f"  ✓ Very high average score ({config['avg_score']:.1f})")
        elif config['avg_score'] >= 60:
            pros.append(f"  ✓ Good average score ({config['avg_score']:.1f})")
        
        if config['usable_80_pct'] >= 60:
            pros.append(f"  ✓ Excellent usability ({config['usable_80_pct']:.1f}% of pairs usable)")
        elif config['usable_80_pct'] >= 40:
            pros.append(f"  ✓ Good usability ({config['usable_80_pct']:.1f}% of pairs usable)")
        
        if config['excellent_pct'] >= 10:
            pros.append(f"  ✓ High percentage of excellent matches ({config['excellent_pct']:.1f}%)")
        
        if config['highest_score'] >= 220:
            pros.append(f"  ✓ Very high peak scores possible ({config['highest_score']})")
        
        if config['median_score'] >= 90:
            pros.append(f"  ✓ Strong median indicates consistent quality ({config['median_score']})")
        
        for pro in pros:
            print(pro)
        
        print(f"\nCONS:")
        cons = []
        if config['avg_score'] < 60:
            cons.append(f"  ✗ Below-average scores ({config['avg_score']:.1f})")
        
        if config['usable_80_pct'] < 40:
            cons.append(f"  ✗ Low usability ({config['usable_80_pct']:.1f}% usable)")
        
        if config['excellent_pct'] < 5:
            cons.append(f"  ✗ Few excellent matches ({config['excellent_pct']:.1f}%)")
        
        if config['lowest_score'] < 0:
            cons.append(f"  ✗ Some negative scores possible ({config['lowest_score']})")
        
        if config['fair_pct'] + config['poor_pct'] > 30:
            cons.append(f"  ✗ High percentage of mediocre matches ({config['fair_pct'] + config['poor_pct']:.1f}%)")
        
        if not cons:
            cons.append("  ✓ No significant weaknesses!")
        
        for con in cons:
            print(con)
        
        print()
    
    # ========================================================================
    # DEVIL'S ADVOCATE
    # ========================================================================
    print("\n" + "="*90)
    print("🔥 DEVIL'S ADVOCATE: WHY EACH APPROACH MIGHT FAIL")
    print("="*90 + "\n")
    
    # Case against Skills First
    skills_first = next(r for r in results if r['config_name'] == 'Skills First')
    print(f"AGAINST 'Skills First':")
    print(f"  • What if complementary skills don't guarantee good sessions?")
    print(f"  • If availability doesn't match (only {WEIGHT_CONFIGS[1]['weights']['availability']} pts), sessions won't happen")
    print(f"  • Students with conflicting schedules will get matched and frustrated")
    print(f"  • Real-world: \"Great match on paper, but we can never meet!\"")
    print(f"  • Only {skills_first['excellent_pct']:.1f}% excellent matches - is that enough?")
    print()
    
    # Case against High Minimum
    high_min = next(r for r in results if r['config_name'] == 'High Minimum')
    print(f"AGAINST 'High Minimum':")
    print(f"  • Tries to do everything, masters nothing")
    print(f"  • With {len(WEIGHT_CONFIGS[14]['weights'])} factors all weighted similarly, what's the priority?")
    print(f"  • Highest excellent% ({high_min['excellent_pct']:.1f}%) but only {high_min['usable_80_pct']:.1f}% usable overall")
    print(f"  • Real-world: \"We match on everything except the one thing I care about\"")
    print(f"  • May create analysis paralysis - students don't know why they matched")
    print()
    
    # Case against Availability First
    avail_first = next(r for r in results if r['config_name'] == 'Availability First')
    print(f"AGAINST 'Availability First':")
    print(f"  • Scheduling alignment means nothing if they can't help each other")
    print(f"  • Only {avail_first['usable_80_pct']:.1f}% usable - worst usability!")
    print(f"  • Complementary skills get only {WEIGHT_CONFIGS[0]['weights']['compPerMatch']} pts vs {WEIGHT_CONFIGS[0]['weights']['availability']} for availability")
    print(f"  • Real-world: \"We meet at the same time but neither knows what the other needs\"")
    print(f"  • Average score {avail_first['avg_score']:.1f} - one of the lowest")
    print()
    
    # Case for a middle ground
    print(f"CASE FOR MIDDLE GROUND (Balanced or Triple Core):")
    balanced = next(r for r in results if r['config_name'] == 'Balanced')
    triple = next(r for r in results if r['config_name'] == 'Triple Core')
    print(f"  • Balanced: {balanced['avg_score']:.1f} avg, {balanced['usable_80_pct']:.1f}% usable")
    print(f"  • Triple Core: {triple['avg_score']:.1f} avg, {triple['usable_80_pct']:.1f}% usable")
    print(f"  • Avoids extremes - students get matches that work on multiple dimensions")
    print(f"  • Real-world: \"We can meet, we help each other, and we have the same goals\"")
    print(f"  • More holistic matching may lead to better long-term partnerships")
    print()
    
    print("="*90 + "\n\n")
    
    # ========================================================================
    # STATISTICAL COMPARISON
    # ========================================================================
    print("="*90)
    print("STATISTICAL COMPARISON: VARIABILITY & CONSISTENCY")
    print("="*90)
    print(f"{'Config Name':<22} | {'Range':<10} | {'Avg-Med Gap':<12} | {'Quality Spread':<15}")
    print(f"{'':22} | {'(H-L)':<10} | {'(Consistency)':<12} | {'(Ex+Gr vs Poor+Un)':<15}")
    print("-"*90)
    
    for r in results:
        score_range = r['highest_score'] - r['lowest_score']
        avg_med_gap = abs(r['avg_score'] - r['median_score'])
        quality_spread = (r['excellent_pct'] + r['great_pct']) - (r['poor_pct'] + r['unusable_pct'])
        
        print(f"{r['config_name']:<22} | {score_range:<10} | {avg_med_gap:<12.1f} | {quality_spread:>+6.1f}%")
    
    print("="*90)
    print("NOTE: Lower Avg-Med Gap = more consistent scoring")
    print("      Higher Quality Spread = more good matches than bad")
    print("="*90 + "\n\n")
    
    # ========================================================================
    # FINAL RECOMMENDATION
    # ========================================================================
    print("\n" + "="*90)
    print("🏆 FINAL RECOMMENDATION (with full context)")
    print("="*90 + "\n")
    
    best_avg_config = max(results, key=lambda x: x['avg_score'])
    best_usable_config = max(results, key=lambda x: x['usable_80_pct'])
    best_excellent_config = max(results, key=lambda x: x['excellent_pct'])
    
    print(f"Based on comprehensive analysis across {len(results)} configurations:\n")
    print(f"IF YOU PRIORITIZE: Practical usability (most pairs work)")
    print(f"   → Choose: {best_usable_config['config_name']}")
    print(f"     Rationale: {best_usable_config['usable_80_pct']:.1f}% of pairs are usable (≥80 pts)")
    print()
    print(f"IF YOU PRIORITIZE: Quality over quantity (best possible matches)")
    print(f"   → Choose: {best_excellent_config['config_name']}")
    print(f"     Rationale: {best_excellent_config['excellent_pct']:.1f}% excellent matches (≥150 pts)")
    print()
    print(f"IF YOU PRIORITIZE: Overall balance (highest average)")
    print(f"   → Choose: {best_avg_config['config_name']}")
    print(f"     Rationale: {best_avg_config['avg_score']:.1f} average score across all pairs")
    print()
    
    # Smart recommendation
    scored_configs = []
    for r in results:
        score = (
            r['usable_80_pct'] * 1.0 +        # Usability is most important
            r['avg_score'] * 0.5 +             # Overall quality matters
            r['excellent_pct'] * 0.3 +         # Want some excellent matches
            (100 - r['unusable_pct']) * 0.2    # Minimize bad matches
        )
        scored_configs.append((r['config_name'], score, r))
    
    scored_configs.sort(key=lambda x: x[1], reverse=True)
    top_config = scored_configs[0][2]
    
    print(f"MY OVERALL RECOMMENDATION: {top_config['config_name']}")
    print(f"\nWhy this is the best choice:")
    print(f"  1. Usability: {top_config['usable_80_pct']:.1f}% of pairs work (≥80 pts)")
    print(f"  2. Quality: {top_config['avg_score']:.1f} average score")
    print(f"  3. Excellence: {top_config['excellent_pct']:.1f}% excellent matches")
    print(f"  4. Complementarity: {top_config['avg_comp']:.2f} avg comp skills per pair")
    print(f"  5. Consistency: Median of {top_config['median_score']} shows reliable quality")
    print()
    print(f"This configuration maximizes the number of students who get meaningful matches")
    print(f"while maintaining high quality standards. It's the best balance for real-world use.")
    print("="*90 + "\n")


if __name__ == "__main__":
    run_all_simulations()
