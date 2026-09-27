"""
CropSense RL System Verification Test
Tests end-to-end:
1. Feature extraction from synthetic leaf image (RGB/HSV/GLI/Texture)
2. LinUCB action selection & confidence calibration
3. Outcome feedback simulation with asymmetric reward computation
4. LinUCB online matrix update & persistence check
"""

import sys
import os
import io
import numpy as np
from PIL import Image

# Add services/ml to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "services", "ml"))

from embed import LeafEmbedder, TOTAL_CONTEXT_DIM
from policy import LinUCBPolicy, ACTIONS
from reward import RewardEngine

def create_synthetic_leaf(leaf_type="healthy") -> bytes:
    """Generates synthetic RGB image array simulating healthy vs infected leaves."""
    img = Image.new("RGB", (128, 128))
    pixels = img.load()
    
    for x in range(128):
        for y in range(128):
            # Base leaf green
            base_g = int(120 + 30 * np.sin(x / 10.0))
            base_r = int(40 + 15 * np.cos(y / 10.0))
            base_b = int(30 + 10 * np.sin((x + y) / 15.0))
            
            if leaf_type == "early_blight":
                # Add concentric brown necrotic target spot in center
                dist = np.sqrt((x - 64)**2 + (y - 64)**2)
                if dist < 25:
                    base_r = 140
                    base_g = 60
                    base_b = 20
            elif leaf_type == "chlorosis":
                # Yellowing
                base_r = 180
                base_g = 180
                base_b = 30

            pixels[x, y] = (base_r, base_g, base_b)
            
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def run_tests():
    print("=" * 70)
    print("Running CropSense RL Verification Suite")
    print("=" * 70)

    # 1. Test Feature Embedder
    print("\n[1/4] Testing LeafEmbedder...")
    embedder = LeafEmbedder()
    healthy_img = create_synthetic_leaf("healthy")
    blight_img = create_synthetic_leaf("early_blight")

    ctx_healthy = embedder.embed(healthy_img, crop_type="tomato", growth_stage="flowering")
    ctx_blight = embedder.embed(blight_img, crop_type="tomato", growth_stage="vegetative")

    assert len(ctx_healthy) == TOTAL_CONTEXT_DIM, f"Expected {TOTAL_CONTEXT_DIM}, got {len(ctx_healthy)}"
    assert np.isclose(np.linalg.norm(ctx_healthy), 1.0, atol=1e-3), "Context vector must be L2-normalized"
    print(f"  [OK] Context vectors generated successfully (dimension={len(ctx_healthy)}, norm={np.linalg.norm(ctx_healthy):.4f})")

    # 2. Test LinUCB Policy Action Selection
    print("\n[2/4] Testing LinUCBPolicy inference...")
    test_models_dir = os.path.join(os.path.dirname(__file__), "services", "ml", "models")
    policy = LinUCBPolicy(dim=TOTAL_CONTEXT_DIM, checkpoint_dir=test_models_dir)

    decision_healthy = policy.select_action(ctx_healthy)
    decision_blight = policy.select_action(ctx_blight)

    print(f"  Healthy Image -> Action: {decision_healthy['action']}")
    print(f"                   Confidence: {decision_healthy['confidence'] * 100:.1f}%, Needs Review: {decision_healthy['needs_human_review']}")
    print(f"  Blight Image  -> Action: {decision_blight['action']}")
    print(f"                   Confidence: {decision_blight['confidence'] * 100:.1f}%, Needs Review: {decision_blight['needs_human_review']}")

    assert decision_healthy["action"] in ACTIONS
    assert decision_blight["action"] in ACTIONS
    print("  [OK] LinUCB action selection verified")

    # 3. Test Reward Engine
    print("\n[3/4] Testing Asymmetric Reward Engine...")
    reward_engine = RewardEngine()

    r1, b1 = reward_engine.compute_reward("early_blight__copper_fungicide_spray", "recovered")
    r2, b2 = reward_engine.compute_reward("early_blight__copper_fungicide_spray", "worsened")
    r3, b3 = reward_engine.compute_reward("healthy__routine_monitoring", "worsened", agronomist_override="critical_blight")

    print(f"  Outcome: Recovered -> Reward: {r1:+.2f} (Breakdown: {b1})")
    print(f"  Outcome: Worsened  -> Reward: {r2:+.2f} (Breakdown: {b2})")
    print(f"  Agronomist False Negative Override -> Reward: {r3:+.2f} (Asymmetric penalty: {b3['asymmetric_penalty']})")

    assert r1 > 0, "Recovery must yield positive reward"
    assert r2 < 0, "Worsened must yield negative penalty"
    assert r3 < -15, "False negative on critical disease must yield heavy penalty"
    print("  [OK] Asymmetric reward computation verified")

    # 4. Test Policy Feedback Loop Update & Persistence
    print("\n[4/4] Testing Online Feedback Loop Update & Persistence...")
    initial_updates = policy.total_updates
    action_to_update = decision_blight["action"]
    
    # Simulate farmer reporting recovery
    reward_val, _ = reward_engine.compute_reward(action_to_update, "recovered")
    policy.update(ctx_blight, action_to_update, reward_val)

    assert policy.total_updates == initial_updates + 1
    stats = policy.get_stats()
    print(f"  [OK] Policy updated online. Total updates: {stats['total_updates']}, Recent avg reward: {stats['recent_avg_reward']}")

    # Check persistence files
    npz_path = os.path.join(test_models_dir, "linucb_matrices.npz")
    assert os.path.exists(npz_path), "Checkpoint npz must be written to disk"
    print(f"  [OK] Checkpoint saved to: {npz_path}")

    print("\n" + "=" * 70)
    print("All CropSense RL components passed verification successfully!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
