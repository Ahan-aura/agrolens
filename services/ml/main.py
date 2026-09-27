"""
CropSense ML Service (FastAPI)
Exposes:
- POST /diagnose: Extracts 44-dim leaf context vector, uses Gemini Vision for foliar pathology,
                  and executes LinUCB Contextual Bandit policy to rank and select optimal interventions.
- POST /outcomes: Receives delayed field outcome, calculates asymmetric reward, updates LinUCB covariance matrices.
- POST /simulate_rl: Simulates agronomic interaction episodes to train and converge LinUCB online.
- GET /stats: Reports real-time LinUCB bandit learning statistics and arm weights.
- GET /health: Liveness and service readiness check.
"""

import json
import uuid
import os
import re
from typing import Optional, List, Dict, Any
import numpy as np
from dotenv import load_dotenv

# Load local environment variables (.env)
load_dotenv()

from fastapi import FastAPI, File, UploadFile, Form, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from embed import LeafEmbedder
from policy import LinUCBPolicy, ACTION_METADATA
from reward import RewardEngine
from gemini_detector import detect_with_gemini

app = FastAPI(
    title="CropSense RL Engine",
    description="Adaptive LinUCB Contextual Bandit & Gemini Agronomic Policy Service",
    version="1.2.0"
)

# Enable CORS for local gateway & frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

embedder = LeafEmbedder()
policy = LinUCBPolicy()
reward_engine = RewardEngine()

# In-memory LRU-like context cache for matching outcome reports with diagnoses
CONTEXT_CACHE: Dict[str, Dict[str, Any]] = {}
MAX_CACHE_SIZE = 500


def slugify(text: str) -> str:
    """Helper to convert any string to clean snake_case slug."""
    s = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "_", s)


@app.get("/")
def root():
    return {
        "service": "CropSense RL Engine",
        "status": "online",
        "algorithm": "LinUCB Disjoint Contextual Bandit + Google Gemini Vision",
        "total_policy_updates": policy.total_updates,
        "docs": "/docs"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "policy_updates": policy.total_updates,
        "actions_tracked": len(policy.actions),
        "recent_avg_reward": policy.get_stats().get("recent_avg_reward", 0.0)
    }


@app.post("/diagnose")
async def diagnose(
    file: UploadFile = File(...),
    crop_type: str = Form("tomato"),
    growth_stage: str = Form("vegetative"),
    microclimate_risk: float = Form(0.5),
    api_key: Optional[str] = Form(None)
):
    """
    Inference endpoint:
    1. Extracts 44-dimensional multimodal context vector x_t from leaf image & metadata.
    2. Identifies pathology using Gemini Vision (or domain priors).
    3. Evaluates LinUCB Contextual Bandit policy to balance exploration vs. exploitation
       and select the treatment with maximum Upper Confidence Bound (UCB).
    """
    try:
        image_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read image: {e}")

    # 1. Extract normalized 44-dimensional multimodal context vector x in R^44
    context = embedder.embed(
        image_bytes=image_bytes,
        crop_type=crop_type,
        growth_stage=growth_stage,
        microclimate_risk=microclimate_risk
    )
    vector_id = str(uuid.uuid4())
    context_list = context.tolist()

    # 2. Attempt Google Gemini Vision diagnosis
    gemini_result = None
    if api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"):
        try:
            gemini_result = detect_with_gemini(
                image_bytes=image_bytes,
                api_key=api_key,
                crop_type_hint=crop_type
            )
        except Exception as e:
            print(f"[Diagnose] Gemini call error: {e}")

    # 3. Formulate candidate intervention arms for the LinUCB Bandit
    candidate_arms = []
    if gemini_result:
        crop_name = gemini_result.get("crop", crop_type)
        disease_name = gemini_result.get("disease", "Unknown Condition")
        crop_slug = slugify(crop_name)
        disease_slug = slugify(disease_name)

        cure_dict = gemini_result.get("cure", {})
        organic_text = cure_dict.get("organic_options", "")
        chemical_text = cure_dict.get("chemical_options", "")
        immediate_text = cure_dict.get("immediate_action", "")

        # Generate candidate action arms for LinUCB evaluation
        primary_arm = f"{disease_slug}__standard_protocol"
        policy.register_arm(primary_arm, {
            "disease": disease_name,
            "recommendation": immediate_text or cure_dict.get("treatment", "Standard Treatment"),
            "severity": gemini_result.get("severity", "Moderate"),
            "urgency_days": 3
        })
        candidate_arms.append(primary_arm)

        if organic_text:
            organic_arm = f"{disease_slug}__organic_biological"
            policy.register_arm(organic_arm, {
                "disease": disease_name,
                "recommendation": organic_text,
                "severity": "Low",
                "urgency_days": 4
            })
            candidate_arms.append(organic_arm)

        if chemical_text:
            chemical_arm = f"{disease_slug}__chemical_control"
            policy.register_arm(chemical_arm, {
                "disease": disease_name,
                "recommendation": chemical_text,
                "severity": gemini_result.get("severity", "Moderate"),
                "urgency_days": 2
            })
            candidate_arms.append(chemical_arm)

    # 4. Evaluate LinUCB Contextual Bandit: UCB_a = theta_a^T x + alpha * sqrt(x^T A_a^-1 x)
    bandit_decision = policy.select_action(context, candidate_arms=candidate_arms if candidate_arms else None)
    chosen_action = bandit_decision["action"]

    # Cache context vector for delayed outcome feedback
    CONTEXT_CACHE[vector_id] = {
        "context": context,
        "action": chosen_action,
        "confidence": bandit_decision["confidence"]
    }
    if len(CONTEXT_CACHE) > MAX_CACHE_SIZE:
        oldest_key = next(iter(CONTEXT_CACHE))
        CONTEXT_CACHE.pop(oldest_key, None)

    # 5. Assemble unified response
    if gemini_result:
        cure_info = gemini_result.get("cure", {})
        treatment_summary = cure_info.get("treatment") or cure_info.get("immediate_action") or "Apply standard agronomic treatment"

        return {
            "context_vector_id": vector_id,
            "detected_by": "gemini_plus_linucb",
            "crop": gemini_result.get("crop", crop_type),
            "crop_type": gemini_result.get("crop", crop_type),
            "disease": gemini_result.get("disease", "Unknown"),
            "class": gemini_result.get("class", "Fungi"),
            "severity": gemini_result.get("severity", "Moderate"),
            "is_healthy": gemini_result.get("is_healthy", False),
            "description": gemini_result.get("description", ""),
            "detection": gemini_result.get("detection", ""),
            "recommended_action": chosen_action,
            "treatment": treatment_summary,
            "cure": cure_info,
            "precaution": gemini_result.get("precaution", ""),
            "confidence": float(gemini_result.get("confidence", bandit_decision["confidence"])),
            "needs_human_review": bandit_decision["needs_human_review"],
            "growth_stage": growth_stage,
            "context_vector": context_list,
            "linucb": {
                "selected_arm": chosen_action,
                "ucb_score": bandit_decision["score"],
                "uncertainty_sigma": bandit_decision["uncertainty_sigma"],
                "ranked_arms": bandit_decision.get("ranked_arms", [])
            }
        }

    # Fallback to pure LinUCB policy if Gemini key unavailable
    meta = bandit_decision["metadata"]
    return {
        "context_vector_id": vector_id,
        "detected_by": "linucb",
        "crop": crop_type,
        "crop_type": crop_type,
        "disease": meta.get("disease", "Identified Foliar Condition"),
        "class": "Pathological Leaf Spot",
        "severity": meta.get("severity", "Moderate"),
        "is_healthy": "healthy" in chosen_action,
        "description": "Foliar pathology diagnosed through 44-dimensional color moments, Green Leaf Index (GLI), and necrosis texture variance.",
        "detection": "Automated cellular texture extraction and vegetation gradient analysis.",
        "recommended_action": chosen_action,
        "treatment": meta.get("recommendation", "Monitor foliage"),
        "cure": {
            "immediate_action": meta.get("recommendation", "Monitor foliage"),
            "treatment": meta.get("recommendation", "Apply targeted treatment"),
            "organic_options": "Apply neem extract or potassium bicarbonate spray.",
            "chemical_options": "Apply protective copper or chlorothalonil fungicide if symptoms spread."
        },
        "precaution": "Maintain adequate plant spacing, sanitize pruning shears, and utilize drip irrigation.",
        "confidence": bandit_decision["confidence"],
        "needs_human_review": bandit_decision["needs_human_review"],
        "growth_stage": growth_stage,
        "context_vector": context_list,
        "linucb": {
            "selected_arm": chosen_action,
            "ucb_score": bandit_decision["score"],
            "uncertainty_sigma": bandit_decision["uncertainty_sigma"],
            "ranked_arms": bandit_decision.get("ranked_arms", [])
        }
    }


@app.post("/outcomes")
async def record_outcome(request: Request):
    """
    Feedback endpoint: Closes the Reinforcement Learning loop.
    Computes asymmetric reward and executes online LinUCB rank-1 Sherman-Morrison update.
    """
    content_type = request.headers.get("content-type", "")

    action_taken = ""
    outcome = ""
    context_vector_id = None
    context_json = None
    agronomist_override = None

    if "application/json" in content_type:
        body = await request.json()
        action_taken = body.get("action_taken", "")
        outcome = body.get("outcome", "")
        context_vector_id = body.get("context_vector_id")
        context_json = body.get("context_json")
        agronomist_override = body.get("agronomist_override")
    else:
        form_data = await request.form()
        action_taken = form_data.get("action_taken", "")
        outcome = form_data.get("outcome", "")
        context_vector_id = form_data.get("context_vector_id")
        context_json = form_data.get("context_json")
        agronomist_override = form_data.get("agronomist_override")

    if not action_taken or not outcome:
        raise HTTPException(status_code=400, detail="action_taken and outcome are required.")

    # Reconstruct context vector x_t in R^44
    context = None
    confidence = 0.85

    # 1. Try lookup from memory cache
    if context_vector_id and context_vector_id in CONTEXT_CACHE:
        entry = CONTEXT_CACHE[context_vector_id]
        context = entry["context"]
        confidence = entry["confidence"]
    # 2. Try parse from serialized context_json
    elif context_json:
        try:
            parsed = json.loads(context_json)
            if isinstance(parsed, list) and len(parsed) == policy.dim:
                context = np.array(parsed, dtype=np.float32)
            elif isinstance(parsed, str) and parsed in CONTEXT_CACHE:
                entry = CONTEXT_CACHE[parsed]
                context = entry["context"]
                confidence = entry["confidence"]
        except Exception:
            pass

    # Fallback to zero context if unavailable
    if context is None:
        context = np.zeros(policy.dim, dtype=np.float32)
        context[0] = 1.0

    # Compute asymmetric reward r_t
    reward, breakdown = reward_engine.compute_reward(
        action_taken=action_taken,
        outcome=outcome,
        agronomist_override=agronomist_override,
        confidence=confidence
    )

    # Perform online LinUCB rank-1 matrix update: A_a <- A_a + x x^T, b_a <- b_a + r x
    policy.update(context=context, action=action_taken, reward=reward)

    return {
        "status": "success",
        "action_taken": action_taken,
        "outcome": outcome,
        "reward": reward,
        "breakdown": breakdown,
        "total_updates": policy.total_updates,
        "recent_avg_reward": policy.get_stats().get("recent_avg_reward", 0.0)
    }


@app.post("/simulate_rl")
def simulate_rl(episodes: int = 10):
    """
    Simulation endpoint: Runs N simulated interaction episodes on varying foliar pathology
    to demonstrate and train the LinUCB bandit policy online.
    """
    num_ep = max(1, min(episodes, 100))
    return policy.simulate_episodes(num_ep)


@app.get("/stats")
def get_stats():
    """
    Returns real-time bandit learning diagnostics, arm counts, and ridge weights.
    """
    return policy.get_stats()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
