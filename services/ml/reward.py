"""
CropSense Reward Engine
Computes asymmetric agricultural reward signals based on real-world outcomes:
- Delayed foliar outcome status (recovered, improved, no_change, worsened)
- Agronomist verification / expert override penalty
- Economic and environmental treatment cost penalty
"""

from typing import Dict, Any, Tuple, Optional

# Base outcome rewards
OUTCOME_REWARDS = {
    "recovered": 10.0,
    "cured": 10.0,
    "healed": 10.0,
    "improved": 4.0,
    "arrested": 4.0,
    "stabilized": 3.0,
    "no_change": -2.0,
    "unchanged": -2.0,
    "worsened": -15.0,
    "spread": -15.0,
    "crop_lost": -20.0,
}

# Treatment cost penalty: penalize over-prescription of heavy synthetic chemicals
TREATMENT_COSTS = {
    "healthy__routine_monitoring": 0.0,
    "nutrient_deficiency__foliar_micronutrient_spray": -0.2,
    "powdery_mildew__neem_oil_or_sulfur": -0.3,
    "early_blight__copper_fungicide_spray": -0.5,
    "septoria_leaf_spot__chlorothalonil_protective_spray": -0.6,
    "bacterial_spot__copper_bactericide_and_prune": -0.7,
    "late_blight__escalate_to_agronomist": -0.8,
    "yellow_leaf_curl_virus__vector_control_and_cull": -0.9,
    "high_uncertainty__field_inspection": -0.5,
}


class RewardEngine:
    def __init__(self):
        pass

    def compute_reward(
        self,
        action_taken: str,
        outcome: str,
        agronomist_override: Optional[str] = None,
        confidence: float = 0.8
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Calculates scalar reward r in R and returns detailed breakdown for logging.
        """
        breakdown = {
            "base_outcome_reward": 0.0,
            "agronomist_reward": 0.0,
            "treatment_cost_penalty": 0.0,
            "asymmetric_penalty": 0.0,
        }

        # 1. Base outcome score
        norm_outcome = outcome.strip().lower().replace(" ", "_")
        base_val = OUTCOME_REWARDS.get(norm_outcome, 0.0)
        breakdown["base_outcome_reward"] = base_val

        # 2. Economic Treatment Cost
        cost_penalty = TREATMENT_COSTS.get(action_taken, -0.4)
        breakdown["treatment_cost_penalty"] = cost_penalty

        # 3. Agronomist Verification / Override Evaluation
        if agronomist_override:
            norm_override = agronomist_override.strip().lower().replace(" ", "_")
            if norm_override in ["agree", "confirmed", "correct"]:
                breakdown["agronomist_reward"] = 5.0
            else:
                # Disagreement / Misdiagnosis
                if "healthy" in action_taken and "healthy" not in norm_override:
                    # Critical False Negative: Told farmer it was healthy when disease was present!
                    breakdown["asymmetric_penalty"] = -18.0
                elif "healthy" not in action_taken and "healthy" in norm_override:
                    # False Positive: Unnecessary chemical spray on clean crop
                    breakdown["agronomist_reward"] = -3.5
                else:
                    # Wrong pathogen classification
                    breakdown["agronomist_reward"] = -6.0

        total_reward = sum(breakdown.values())
        # Clip to realistic reward range [-25.0, 15.0]
        total_reward = max(-25.0, min(15.0, total_reward))

        return round(total_reward, 3), breakdown
