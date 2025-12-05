"""
TEST: Skills First with Negative Marking
Compare to: 1) Skills First without negative marking, 2) All Equal
"""

import sys
sys.path.insert(0, 'c:\\Users\\ragha\\Documents\\CODE\\PEERFUSE')

from simulate_matching import simulate_matching_with_config, WEIGHT_CONFIGS
import random

# Set seed for reproducibility
random.seed(42)

# Get the three configs to compare
skills_first = next(c for c in WEIGHT_CONFIGS if c['name'] == 'Skills First')
skills_first_negative = next(c for c in WEIGHT_CONFIGS if c['name'] == 'Skills First + Negative Marking')
all_equal = next(c for c in WEIGHT_CONFIGS if c['name'] == 'All Equal')

print("\n" + "="*100)
print("NEGATIVE MARKING TEST: Skills First Comparison")
print("="*100)
print("\nTesting negative marking system where mismatches on lesser-weighted factors subtract points")
print("Penalty: -50% of the weight value if factors DON'T match\n")

# Run simulations
print("Running simulations...")
result_original = simulate_matching_with_config(skills_first, num_users=100)
result_negative = simulate_matching_with_config(skills_first_negative, num_users=100)
result_all_equal = simulate_matching_with_config(all_equal, num_users=100)

print("✅ All simulations complete!\n")

# ============================================================================
# COMPARISON 1: Skills First vs Skills First + Negative Marking
# ============================================================================
print("="*100)
print("COMPARISON 1: Skills First (Original) vs Skills First + Negative Marking")
print("="*100)
print("\nWeight Configuration (both use same weights):")
print("  compPerMatch: 80 | availability: 30 | preferredMode: 15 | primaryGoal: 12")
print("  preferredFrequency: 12 | partnerPreference: 10 | sessionLength: 10 | timeZone: 10 | studyPersonality: 10")
print("\nDifference: Negative Marking penalizes -50% of weight when factors DON'T match\n")

print("-"*100)
print(f"{'Metric':<30} | {'Original':<18} | {'+ Negative Marking':<18} | {'Change':<20}")
print("-"*100)

# Average Score
print(f"{'Average Score':<30} | {result_original['avg_score']:>8.1f}          | {result_negative['avg_score']:>8.1f}          | {result_negative['avg_score'] - result_original['avg_score']:>+7.1f} ({((result_negative['avg_score'] - result_original['avg_score'])/result_original['avg_score']*100):>+5.1f}%)")

# Median
print(f"{'Median Score':<30} | {result_original['median_score']:>8}          | {result_negative['median_score']:>8}          | {result_negative['median_score'] - result_original['median_score']:>+7}")

# Range
print(f"{'Highest Score':<30} | {result_original['highest_score']:>8}          | {result_negative['highest_score']:>8}          | {result_negative['highest_score'] - result_original['highest_score']:>+7}")
print(f"{'Lowest Score':<30} | {result_original['lowest_score']:>8}          | {result_negative['lowest_score']:>8}          | {result_negative['lowest_score'] - result_original['lowest_score']:>+7}")

print()
print(f"{'Usable (≥80)':<30} | {result_original['usable_80_pct']:>7.1f}%         | {result_negative['usable_80_pct']:>7.1f}%         | {result_negative['usable_80_pct'] - result_original['usable_80_pct']:>+6.1f}%")
print(f"{'Recommended (≥120)':<30} | {result_original['recommended_120_pct']:>7.1f}%         | {result_negative['recommended_120_pct']:>7.1f}%         | {result_negative['recommended_120_pct'] - result_original['recommended_120_pct']:>+6.1f}%")
print(f"{'Excellent (≥150)':<30} | {result_original['excellent_pct']:>7.1f}%         | {result_negative['excellent_pct']:>7.1f}%         | {result_negative['excellent_pct'] - result_original['excellent_pct']:>+6.1f}%")

print()
print(f"{'Great (120-149)':<30} | {result_original['great_pct']:>7.1f}%         | {result_negative['great_pct']:>7.1f}%         | {result_negative['great_pct'] - result_original['great_pct']:>+6.1f}%")
print(f"{'Good (100-119)':<30} | {result_original['good_pct']:>7.1f}%         | {result_negative['good_pct']:>7.1f}%         | {result_negative['good_pct'] - result_original['good_pct']:>+6.1f}%")
print(f"{'Fair (80-99)':<30} | {result_original['fair_pct']:>7.1f}%         | {result_negative['fair_pct']:>7.1f}%         | {result_negative['fair_pct'] - result_original['fair_pct']:>+6.1f}%")
print(f"{'Poor (50-79)':<30} | {result_original['poor_pct']:>7.1f}%         | {result_negative['poor_pct']:>7.1f}%         | {result_negative['poor_pct'] - result_original['poor_pct']:>+6.1f}%")
print(f"{'Unusable (<50)':<30} | {result_original['unusable_pct']:>7.1f}%         | {result_negative['unusable_pct']:>7.1f}%         | {result_negative['unusable_pct'] - result_original['unusable_pct']:>+6.1f}%")

print()
print(f"{'Avg Comp Skills':<30} | {result_original['avg_comp']:>8.2f}          | {result_negative['avg_comp']:>8.2f}          | {result_negative['avg_comp'] - result_original['avg_comp']:>+7.2f}")

print("="*100)

# Quality spread calculation
orig_quality_spread = (result_original['excellent_pct'] + result_original['great_pct']) - (result_original['poor_pct'] + result_original['unusable_pct'])
neg_quality_spread = (result_negative['excellent_pct'] + result_negative['great_pct']) - (result_negative['poor_pct'] + result_negative['unusable_pct'])

print("\nKEY INSIGHTS:")
print(f"  Quality Spread (Good-Bad): {orig_quality_spread:>+6.1f}% → {neg_quality_spread:>+6.1f}% (change: {neg_quality_spread - orig_quality_spread:>+5.1f}%)")
print(f"  Score Range: {result_original['highest_score'] - result_original['lowest_score']:.1f} → {result_negative['highest_score'] - result_negative['lowest_score']:.1f} (variability change: {(result_negative['highest_score'] - result_negative['lowest_score']) - (result_original['highest_score'] - result_original['lowest_score']):+.1f})")
print(f"  Consistency (Avg-Med gap): {abs(result_original['avg_score'] - result_original['median_score']):.1f} → {abs(result_negative['avg_score'] - result_negative['median_score']):.1f}")

print("\n" + "="*100)
print("\n\n")

# ============================================================================
# COMPARISON 2: Skills First + Negative Marking vs All Equal
# ============================================================================
print("="*100)
print("COMPARISON 2: Skills First + Negative Marking vs All Equal")
print("="*100)
print("\nPhilosophy Comparison:")
print("  Skills First + Neg: Prioritizes skills (80) but punishes mismatches on other factors (-50% penalty)")
print("  All Equal: Every factor weighted equally (20-25 pts each), no penalties\n")

print("-"*100)
print(f"{'Metric':<30} | {'Skills+Negative':<18} | {'All Equal':<18} | {'Difference':<20}")
print("-"*100)

# Average Score
print(f"{'Average Score':<30} | {result_negative['avg_score']:>8.1f}          | {result_all_equal['avg_score']:>8.1f}          | {result_negative['avg_score'] - result_all_equal['avg_score']:>+7.1f} ({((result_negative['avg_score'] - result_all_equal['avg_score'])/result_all_equal['avg_score']*100):>+5.1f}%)")

# Median
print(f"{'Median Score':<30} | {result_negative['median_score']:>8}          | {result_all_equal['median_score']:>8}          | {result_negative['median_score'] - result_all_equal['median_score']:>+7}")

# Range
print(f"{'Highest Score':<30} | {result_negative['highest_score']:>8}          | {result_all_equal['highest_score']:>8}          | {result_negative['highest_score'] - result_all_equal['highest_score']:>+7}")
print(f"{'Lowest Score':<30} | {result_negative['lowest_score']:>8}          | {result_all_equal['lowest_score']:>8}          | {result_negative['lowest_score'] - result_all_equal['lowest_score']:>+7}")

print()
print(f"{'Usable (≥80)':<30} | {result_negative['usable_80_pct']:>7.1f}%         | {result_all_equal['usable_80_pct']:>7.1f}%         | {result_negative['usable_80_pct'] - result_all_equal['usable_80_pct']:>+6.1f}%")
print(f"{'Recommended (≥120)':<30} | {result_negative['recommended_120_pct']:>7.1f}%         | {result_all_equal['recommended_120_pct']:>7.1f}%         | {result_negative['recommended_120_pct'] - result_all_equal['recommended_120_pct']:>+6.1f}%")
print(f"{'Excellent (≥150)':<30} | {result_negative['excellent_pct']:>7.1f}%         | {result_all_equal['excellent_pct']:>7.1f}%         | {result_negative['excellent_pct'] - result_all_equal['excellent_pct']:>+6.1f}%")

print()
print(f"{'Great (120-149)':<30} | {result_negative['great_pct']:>7.1f}%         | {result_all_equal['great_pct']:>7.1f}%         | {result_negative['great_pct'] - result_all_equal['great_pct']:>+6.1f}%")
print(f"{'Good (100-119)':<30} | {result_negative['good_pct']:>7.1f}%         | {result_all_equal['good_pct']:>7.1f}%         | {result_negative['good_pct'] - result_all_equal['good_pct']:>+6.1f}%")
print(f"{'Fair (80-99)':<30} | {result_negative['fair_pct']:>7.1f}%         | {result_all_equal['fair_pct']:>7.1f}%         | {result_negative['fair_pct'] - result_all_equal['fair_pct']:>+6.1f}%")
print(f"{'Poor (50-79)':<30} | {result_negative['poor_pct']:>7.1f}%         | {result_all_equal['poor_pct']:>7.1f}%         | {result_negative['poor_pct'] - result_all_equal['poor_pct']:>+6.1f}%")
print(f"{'Unusable (<50)':<30} | {result_negative['unusable_pct']:>7.1f}%         | {result_all_equal['unusable_pct']:>7.1f}%         | {result_negative['unusable_pct'] - result_all_equal['unusable_pct']:>+6.1f}%")

print("="*100)

# Quality spread for All Equal
all_equal_quality_spread = (result_all_equal['excellent_pct'] + result_all_equal['great_pct']) - (result_all_equal['poor_pct'] + result_all_equal['unusable_pct'])

print("\nKEY INSIGHTS:")
print(f"  Quality Spread (Good-Bad): {neg_quality_spread:>+6.1f}% vs {all_equal_quality_spread:>+6.1f}% (Skills+Neg is {neg_quality_spread - all_equal_quality_spread:>+5.1f}% better)")
print(f"  Usability Gap: Skills+Neg gets {result_negative['usable_80_pct'] - result_all_equal['usable_80_pct']:>+.1f}% more usable pairs")
print(f"  Excellence Gap: Skills+Neg gets {result_negative['excellent_pct'] - result_all_equal['excellent_pct']:>+.1f}% more excellent matches")

print("\n" + "="*100)
print("\n\n")

# ============================================================================
# THREE-WAY VISUAL COMPARISON
# ============================================================================
print("="*100)
print("THREE-WAY VISUAL COMPARISON")
print("="*100)

print("\nAVERAGE SCORE (each █ = 5 points):")
for name, result in [("Skills First (Original)", result_original), 
                      ("Skills First + Neg Mark", result_negative),
                      ("All Equal", result_all_equal)]:
    bar = "█" * int(result['avg_score'] / 5)
    print(f"{name:<25} | {bar} {result['avg_score']:.1f}")

print("\nUSABLE PAIRS % (each █ = 2%):")
for name, result in [("Skills First (Original)", result_original), 
                      ("Skills First + Neg Mark", result_negative),
                      ("All Equal", result_all_equal)]:
    bar = "█" * int(result['usable_80_pct'] / 2)
    print(f"{name:<25} | {bar} {result['usable_80_pct']:.1f}%")

print("\nEXCELLENT MATCHES % (each █ = 0.5%):")
for name, result in [("Skills First (Original)", result_original), 
                      ("Skills First + Neg Mark", result_negative),
                      ("All Equal", result_all_equal)]:
    bar = "█" * int(result['excellent_pct'] / 0.5)
    print(f"{name:<25} | {bar} {result['excellent_pct']:.1f}%")

print("\n" + "="*100)
print("\n\n")

# ============================================================================
# FINAL VERDICT
# ============================================================================
print("="*100)
print("🎯 FINAL VERDICT: Should We Use Negative Marking?")
print("="*100)

print("\nPROS of Negative Marking:")
if result_negative['avg_score'] > result_original['avg_score']:
    print(f"  ✅ Higher average score: {result_negative['avg_score']:.1f} vs {result_original['avg_score']:.1f}")
else:
    print(f"  ❌ Lower average score: {result_negative['avg_score']:.1f} vs {result_original['avg_score']:.1f}")

if result_negative['usable_80_pct'] > result_original['usable_80_pct']:
    print(f"  ✅ More usable pairs: {result_negative['usable_80_pct']:.1f}% vs {result_original['usable_80_pct']:.1f}%")
else:
    print(f"  ❌ Fewer usable pairs: {result_negative['usable_80_pct']:.1f}% vs {result_original['usable_80_pct']:.1f}%")

if result_negative['excellent_pct'] > result_original['excellent_pct']:
    print(f"  ✅ More excellent matches: {result_negative['excellent_pct']:.1f}% vs {result_original['excellent_pct']:.1f}%")
else:
    print(f"  ❌ Fewer excellent matches: {result_negative['excellent_pct']:.1f}% vs {result_original['excellent_pct']:.1f}%")

if neg_quality_spread > orig_quality_spread:
    print(f"  ✅ Better quality spread: {neg_quality_spread:+.1f}% vs {orig_quality_spread:+.1f}%")
else:
    print(f"  ❌ Worse quality spread: {neg_quality_spread:+.1f}% vs {orig_quality_spread:+.1f}%")

print("\nCONS of Negative Marking:")
if abs(result_negative['lowest_score']) > abs(result_original['lowest_score']):
    print(f"  ⚠️  More extreme low scores: {result_negative['lowest_score']} vs {result_original['lowest_score']}")
if result_negative['unusable_pct'] > result_original['unusable_pct']:
    print(f"  ⚠️  More unusable pairs: {result_negative['unusable_pct']:.1f}% vs {result_original['unusable_pct']:.1f}%")

print("\n" + "-"*100)
print("RECOMMENDATION:")
print("-"*100)

# Decision logic
if (result_negative['avg_score'] > result_original['avg_score'] and 
    result_negative['usable_80_pct'] > result_original['usable_80_pct'] and
    neg_quality_spread > orig_quality_spread):
    print("\n✅ USE NEGATIVE MARKING")
    print("   Negative marking improves all key metrics. The penalties make lesser-weighted")
    print("   factors more important by punishing mismatches, creating better overall quality.")
elif (result_negative['avg_score'] < result_original['avg_score'] or 
      result_negative['usable_80_pct'] < result_original['usable_80_pct']):
    print("\n❌ DON'T USE NEGATIVE MARKING")
    print("   Negative marking hurts usability and/or average quality. The penalties are too harsh,")
    print("   eliminating viable matches. Stick with the original positive-only scoring.")
else:
    print("\n🤔 MIXED RESULTS - NEEDS CONSIDERATION")
    print("   Negative marking has trade-offs. Consider which metrics matter most to your users.")

print("\n" + "="*100)
