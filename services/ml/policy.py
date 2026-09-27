"""
CropSense LinUCB Contextual Bandit Policy
Implements Disjoint Linear Upper Confidence Bound (LinUCB) algorithm for
adaptive agronomic decision making.
Each arm corresponds to a (Diagnosis, Agronomic Intervention) pair.
The policy balances exploration of promising treatments with exploitation of proven remedies.
"""

import os
import json
import random
import numpy as np
from typing import Dict, Any, Tuple, List, Optional

ACTIONS = [
    "early_blight__copper_fungicide_spray",
    "late_blight__escalate_to_agronomist",
    "powdery_mildew__neem_oil_or_sulfur",
    "bacterial_spot__copper_bactericide_and_prune",
    "septoria_leaf_spot__chlorothalonil_protective_spray",
    "yellow_leaf_curl_virus__vector_control_and_cull",
    "nutrient_deficiency__foliar_micronutrient_spray",
    "healthy__routine_monitoring",
    "high_uncertainty__field_inspection",
]

ACTION_METADATA = {
    "early_blight__copper_fungicide_spray": {
        "disease": "Early Blight (Alternaria solani)",
        "recommendation": "Spray fixed copper fungicide and remove affected lower leaves",
        "severity": "Moderate",
        "urgency_days": 3,
    },
    "late_blight__escalate_to_agronomist": {
        "disease": "Late Blight (Phytophthora infestans)",
        "recommendation": "Urgent agronomist escalation required; prepare targeted systemic fungicide",
        "severity": "Critical",
        "urgency_days": 1,
    },
    "powdery_mildew__neem_oil_or_sulfur": {
        "disease": "Powdery Mildew (Erysiphales)",
        "recommendation": "Apply organic neem oil or wettable sulfur; increase canopy ventilation",
        "severity": "Low",
        "urgency_days": 5,
    },
    "bacterial_spot__copper_bactericide_and_prune": {
        "disease": "Bacterial Spot (Xanthomonas spp.)",
        "recommendation": "Apply copper-mancozeb bactericide and sanitize pruning shears between cuts",
        "severity": "Moderate",
        "urgency_days": 2,
    },
    "septoria_leaf_spot__chlorothalonil_protective_spray": {
        "disease": "Septoria Leaf Spot",
        "recommendation": "Apply protective chlorothalonil barrier spray and mulch soil to prevent splash",
        "severity": "Moderate",
        "urgency_days": 4,
    },
    "yellow_leaf_curl_virus__vector_control_and_cull": {
        "disease": "Tomato Yellow Leaf Curl Virus (TYLCV)",
        "recommendation": "Deploy yellow sticky traps for whiteflies; cull severely stunted plants",
        "severity": "High",
        "urgency_days": 1,
    },
    "nutrient_deficiency__foliar_micronutrient_spray": {
        "disease": "Foliar Chlorosis (Nutrient Deficiency)",
        "recommendation": "Apply chelated zinc/iron and nitrogen foliar spray; check soil pH",
        "severity": "Low",
        "urgency_days": 7,
    },
    "healthy__routine_monitoring": {
        "disease": "Healthy Foliage",
        "recommendation": "Continue standard drip irrigation and routine weekly monitoring",
        "severity": "None",
        "urgency_days": 14,
    },
    "high_uncertainty__field_inspection": {
        "disease": "Unidentified Foliar Anomaly",
        "recommendation": "Schedule physical agronomist inspection before applying chemical controls",
        "severity": "High",
        "urgency_days": 2,
    },
}


class LinUCBPolicy:
    def __init__(
        self,
        dim: int = 44,
        alpha: float = 0.65,
        reg_lambda: float = 1.0,
        checkpoint_dir: str = "models"
    ):
        self.dim = dim
        self.alpha = alpha  # Exploration factor
        self.reg_lambda = reg_lambda
        self.actions = list(ACTIONS)
        self.checkpoint_dir = checkpoint_dir
        self.total_updates = 0
        self.action_counts: Dict[str, int] = {a: 0 for a in self.actions}
        self.reward_history: List[float] = []

        # A_a: (d x d) covariance matrix initialized to lambda * I_d
        # b_a: (d) bias vector initialized to 0
        self.A: Dict[str, np.ndarray] = {
            a: self.reg_lambda * np.identity(self.dim, dtype=np.float32)
            for a in self.actions
        }
        self.b: Dict[str, np.ndarray] = {
            a: np.zeros(self.dim, dtype=np.float32)
            for a in self.actions
        }

        # Initialize domain agronomic priors for sensible cold-start
        self._initialize_priors()

        # Load persisted weights if available
        self.load_checkpoint()

    def _initialize_priors(self):
        """
        Gives positive prior weight to sensible initial leaf signatures so the
        cold-start policy produces coherent diagnoses before outcome updates.
        """
        healthy_arm = "healthy__routine_monitoring"
        if healthy_arm in self.b:
            self.b[healthy_arm][6] += 2.5  # GLI greenness correlates with healthy

        early_blight_arm = "early_blight__copper_fungicide_spray"
        if early_blight_arm in self.b:
            self.b[early_blight_arm][9] += 3.0  # Necrosis spot ratio

        chlorosis_arm = "nutrient_deficiency__foliar_micronutrient_spray"
        if chlorosis_arm in self.b:
            self.b[chlorosis_arm][8] += 3.5  # Chlorosis index

    def register_arm(self, action: str, metadata: Optional[Dict[str, Any]] = None):
        """
        Dynamically registers a new intervention arm so LinUCB can learn for ANY crop or treatment.
        """
        clean_action = action.strip().lower().replace(" ", "_").replace("-", "_")
        if clean_action not in self.actions:
            self.actions.append(clean_action)
            self.A[clean_action] = self.reg_lambda * np.identity(self.dim, dtype=np.float32)
            self.b[clean_action] = np.zeros(self.dim, dtype=np.float32)
            self.action_counts[clean_action] = 0
            if metadata:
                ACTION_METADATA[clean_action] = metadata
            else:
                ACTION_METADATA[clean_action] = {
                    "disease": clean_action.replace("__", " ").title(),
                    "recommendation": f"Protocol for {clean_action}",
                    "severity": "Moderate",
                    "urgency_days": 3
                }
            self.save_checkpoint()
        return clean_action

    def evaluate_arms(self, context: np.ndarray, candidate_arms: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Evaluates each arm for the given context vector x:
        Computes theta_a = A_a^{-1} b_a
        Predicted reward mu_a = theta_a^T x
        Exploration variance sigma_a = sqrt(x^T A_a^{-1} x)
        UCB score = mu_a + alpha * sigma_a
        """
        x = context.reshape(-1, 1).astype(np.float32)
        target_arms = [a for a in (candidate_arms or self.actions) if a in self.A]
        if not target_arms:
            target_arms = list(self.actions)

        results = []
        for a in target_arms:
            A_inv = np.linalg.pinv(self.A[a])
            theta_a = A_inv @ self.b[a]
            mean_r = float(theta_a.T @ x)
            var_term = float(np.sqrt(np.clip(x.T @ A_inv @ x, 1e-6, 1e4)))
            exploration_bonus = self.alpha * var_term
            ucb_score = mean_r + exploration_bonus

            meta = ACTION_METADATA.get(a, {})
            results.append({
                "action": a,
                "label": meta.get("disease", a.replace("__", " ").title()),
                "treatment": meta.get("recommendation", a),
                "predicted_reward": round(mean_r, 4),
                "uncertainty_sigma": round(var_term, 4),
                "exploration_bonus": round(exploration_bonus, 4),
                "ucb_score": round(ucb_score, 4),
                "times_chosen": self.action_counts.get(a, 0),
            })

        results.sort(key=lambda item: item["ucb_score"], reverse=True)
        return results

    def select_action(self, context: np.ndarray, candidate_arms: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        LinUCB action selection:
        p_{t,a} = theta_a^T x_t + alpha * sqrt(x_t^T A_a^{-1} x_t)
        Returns chosen action, confidence, uncertainty sigma, and agronomist flag.
        """
        ranked = self.evaluate_arms(context, candidate_arms)
        if not ranked:
            best_action = "healthy__routine_monitoring"
            best_score = 1.0
            best_sigma = 0.5
        else:
            best = ranked[0]
            best_action = best["action"]
            best_score = best["ucb_score"]
            best_sigma = best["uncertainty_sigma"]

        margin = 0.0
        if len(ranked) > 1:
            margin = ranked[0]["ucb_score"] - ranked[1]["ucb_score"]

        confidence = 0.85 - (best_sigma * 0.35) + min(margin * 0.08, 0.12)
        confidence = float(np.clip(confidence, 0.50, 0.98))

        meta = ACTION_METADATA.get(best_action, {})
        is_critical = meta.get("severity") in ["Critical", "High"]
        needs_review = bool((confidence < 0.70) or is_critical or ("uncertainty" in best_action))

        return {
            "action": best_action,
            "recommended_action": best_action,
            "score": round(best_score, 4),
            "uncertainty_sigma": round(best_sigma, 4),
            "confidence": round(confidence, 3),
            "needs_human_review": needs_review,
            "metadata": meta,
            "ranked_arms": ranked[:5],
            "all_scores": {item["action"]: item["ucb_score"] for item in ranked},
        }

    def update(self, context: np.ndarray, action: str, reward: float):
        """
        LinUCB online update rule (Sherman-Morrison rank-1 update):
        A_a <- A_a + x * x^T
        b_a <- b_a + r * x
        """
        if action not in self.A:
            self.register_arm(action)

        x = context.reshape(-1, 1).astype(np.float32)

        # Rank-1 update
        self.A[action] += x @ x.T
        self.b[action] += (reward * x).flatten()

        self.total_updates += 1
        self.action_counts[action] = self.action_counts.get(action, 0) + 1
        self.reward_history.append(float(reward))
        if len(self.reward_history) > 300:
            self.reward_history.pop(0)

        # Persist checkpoint
        self.save_checkpoint()

    def simulate_episodes(self, num_episodes: int = 10) -> Dict[str, Any]:
        """
        Simulates realistic agronomic feedback interaction episodes to train
        the LinUCB bandit policy online and demonstrate dynamic convergence.
        """
        scenario_types = [
            {
                "name": "Early Blight Outbreak",
                "correct_arm": "early_blight__copper_fungicide_spray",
                "necrosis_bias": 0.35,
                "gli_bias": -0.2,
                "chlorosis_bias": 0.25,
            },
            {
                "name": "Powdery Mildew Spread",
                "correct_arm": "powdery_mildew__neem_oil_or_sulfur",
                "necrosis_bias": 0.05,
                "gli_bias": 0.05,
                "chlorosis_bias": 0.40,
            },
            {
                "name": "Bacterial Spot Infiltration",
                "correct_arm": "bacterial_spot__copper_bactericide_and_prune",
                "necrosis_bias": 0.45,
                "gli_bias": -0.3,
                "chlorosis_bias": 0.15,
            },
            {
                "name": "Healthy Canopy Field",
                "correct_arm": "healthy__routine_monitoring",
                "necrosis_bias": 0.0,
                "gli_bias": 0.65,
                "chlorosis_bias": 0.0,
            },
        ]

        history_sim = []
        for _ in range(num_episodes):
            scen = random.choice(scenario_types)
            # Create synthetic context vector x in R^44
            vec = np.random.normal(0.0, 0.1, self.dim).astype(np.float32)
            vec[6] += scen["gli_bias"]        # GLI feature
            vec[8] += scen["chlorosis_bias"]  # chlorosis
            vec[9] += scen["necrosis_bias"]   # necrosis
            # L2 normalize
            norm = np.linalg.norm(vec)
            if norm > 1e-6:
                vec = vec / norm

            # LinUCB chooses arm
            decision = self.select_action(vec)
            chosen_arm = decision["action"]

            # Compute environment reward
            if chosen_arm == scen["correct_arm"]:
                r = round(random.uniform(8.5, 10.0), 2)
                outcome = "recovered"
            elif "healthy" in chosen_arm and scen["correct_arm"] != "healthy__routine_monitoring":
                r = round(random.uniform(-16.0, -12.0), 2)  # Critical false negative penalty
                outcome = "worsened"
            elif "copper" in chosen_arm or "sulfur" in chosen_arm or "bactericide" in chosen_arm:
                r = round(random.uniform(2.0, 5.0), 2)   # Partially effective
                outcome = "improved"
            else:
                r = round(random.uniform(-4.0, -1.0), 2)
                outcome = "no_change"

            # Execute online policy update
            self.update(vec, chosen_arm, r)
            history_sim.append({
                "scenario": scen["name"],
                "chosen_arm": chosen_arm,
                "reward": r,
                "outcome": outcome,
                "ucb_score": decision["score"]
            })

        avg_r = float(np.mean([h["reward"] for h in history_sim])) if history_sim else 0.0
        return {
            "status": "success",
            "episodes_simulated": num_episodes,
            "total_updates": self.total_updates,
            "average_simulation_reward": round(avg_r, 3),
            "recent_avg_reward": round(float(np.mean(self.reward_history)), 3) if self.reward_history else 0.0,
            "episodes": history_sim[-10:],
            "action_counts": self.action_counts
        }

    def get_stats(self) -> Dict[str, Any]:
        """Returns diagnostic policy statistics including top arm values and UCB weights."""
        avg_reward = float(np.mean(self.reward_history)) if self.reward_history else 0.0
        
        # Calculate summary of arm weights
        arm_weights_summary = {}
        for a in self.actions:
            if a in self.A and a in self.b:
                A_inv = np.linalg.pinv(self.A[a])
                theta_a = A_inv @ self.b[a]
                arm_weights_summary[a] = {
                    "theta_norm": round(float(np.linalg.norm(theta_a)), 3),
                    "times_chosen": self.action_counts.get(a, 0),
                    "label": ACTION_METADATA.get(a, {}).get("disease", a.replace("__", " ").title())
                }

        return {
            "total_updates": self.total_updates,
            "action_counts": self.action_counts,
            "recent_avg_reward": round(avg_reward, 3),
            "alpha": self.alpha,
            "num_actions": len(self.actions),
            "context_dim": self.dim,
            "arm_weights": arm_weights_summary,
            "actions": self.actions
        }

    def save_checkpoint(self):
        """Persists matrices to disk."""
        try:
            os.makedirs(self.checkpoint_dir, exist_ok=True)
            npz_path = os.path.join(self.checkpoint_dir, "linucb_matrices.npz")
            meta_path = os.path.join(self.checkpoint_dir, "linucb_meta.json")

            save_dict = {}
            for a in self.actions:
                save_dict[f"A_{a}"] = self.A[a]
                save_dict[f"b_{a}"] = self.b[a]

            np.savez_compressed(npz_path, **save_dict)

            meta = {
                "total_updates": self.total_updates,
                "action_counts": self.action_counts,
                "reward_history": self.reward_history[-100:],
                "actions": self.actions,
            }
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2)
        except Exception as e:
            print(f"[Policy] Checkpoint save warning: {e}")

    def load_checkpoint(self):
        """Loads matrices from disk if present."""
        npz_path = os.path.join(self.checkpoint_dir, "linucb_matrices.npz")
        meta_path = os.path.join(self.checkpoint_dir, "linucb_meta.json")

        if os.path.exists(npz_path):
            try:
                data = np.load(npz_path)
                # Load saved actions if metadata file exists
                if os.path.exists(meta_path):
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                        self.total_updates = meta.get("total_updates", 0)
                        self.action_counts = meta.get("action_counts", self.action_counts)
                        self.reward_history = meta.get("reward_history", [])
                        saved_actions = meta.get("actions", [])
                        for sa in saved_actions:
                            if sa not in self.actions:
                                self.actions.append(sa)

                for a in self.actions:
                    if f"A_{a}" in data and f"b_{a}" in data:
                        self.A[a] = data[f"A_{a}"]
                        self.b[a] = data[f"b_{a}"]

                print(f"[Policy] Successfully loaded checkpoint with {self.total_updates} updates and {len(self.actions)} arms.")
            except Exception as e:
                print(f"[Policy] Error loading checkpoint: {e}")
