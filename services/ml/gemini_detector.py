"""
CropSense Gemini Vision Agronomic Detector
Powered by Google Gemini 3.8 Flash Vision API
Analyzes foliar imagery to extract:
- Crop type & variety
- Disease name & classification (Class: Fungi, Bacteria, Virus, etc.)
- Detection symptoms & visual cues
- Detailed Description
- Comprehensive Cure (Immediate action, organic remedies, chemical treatments)
- Precaution & Prevention measures
"""

import os
import json
import io
import re
from PIL import Image
from typing import Dict, Any, Optional
import google.generativeai as genai

SYSTEM_PROMPT = """
You are an expert agricultural scientist, agronomist, and plant pathologist working with the 'agrio' precision agriculture system.
Analyze the uploaded crop leaf image with high scientific and field accuracy.

Return ONLY a valid JSON object matching this exact schema:
{
  "crop": "Name of crop (e.g. Tomato, Potato, Corn, Sugarcane, Grape, Wheat, Rice, Apple, etc.)",
  "disease": "Exact disease name (e.g. 'Early Blight', 'Late Blight', 'Powdery Mildew', 'Bacterial Spot', or 'Healthy Foliage')",
  "class": "Pathogen class: 'Fungi', 'Bacteria', 'Virus', 'Insect Pest', 'Nutrient Deficiency', or 'Healthy Plant'",
  "is_healthy": true or false,
  "confidence": float between 0.65 and 0.99,
  "severity": "None", "Low", "Moderate", "High", or "Critical",
  "description": "Comprehensive explanation of what this condition is, how it develops, and its lifecycle in crops.",
  "detection": "Observable visual foliar symptoms and diagnostic markings identified on the leaf (e.g. concentric brown target-ring lesions, yellow halo, chlorosis).",
  "cure": {
    "immediate_action": "Clear, urgent first step the farmer must take today (e.g. prune lower infected leaves, sanitize tools).",
    "treatment": "Main treatment protocol and application cadence.",
    "organic_options": "Organic, biological, and eco-friendly remedies (e.g. neem oil, wettable sulfur, Bacillus subtilis, copper octanoate).",
    "chemical_options": "Specific active chemical fungicide/bactericide ingredients (e.g. Chlorothalonil, Mancozeb, Copper oxychloride, Azoxystrobin)."
  },
  "precaution": "Cultural precautions, irrigation guidelines, plant spacing, and preventive practices for long-term protection.",
  "recommended_action": "snake_case slug like 'early_blight__copper_fungicide_spray'",
  "needs_human_review": true or false
}
Do not wrap your response in markdown fences like ```json, just return the raw valid JSON string.
"""

def clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

def detect_with_gemini(
    image_bytes: bytes,
    api_key: Optional[str] = None,
    crop_type_hint: Optional[str] = None,
    model_name: str = "gemini-3.8-flash"
) -> Optional[Dict[str, Any]]:
    key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not key:
        return None

    try:
        genai.configure(api_key=key)
        
        # Load image with PIL
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        prompt = SYSTEM_PROMPT + "\n\nDiagnose this crop leaf."
        if crop_type_hint and crop_type_hint.lower() != "other" and crop_type_hint.lower() != "unknown":
            prompt += f" Suspected crop: {crop_type_hint}."

        candidate_models = [model_name, "gemini-3.7-flash", "gemini-3.6-flash", "gemini-2.5-flash"]
        
        for m_name in candidate_models:
            try:
                model = genai.GenerativeModel(m_name)
                response = model.generate_content([prompt, img])
                if response and response.text:
                    cleaned = clean_json_text(response.text)
                    data = json.loads(cleaned)
                    return data
            except Exception as e:
                print(f"[Gemini] Model {m_name} failed: {e}")
                continue

    except Exception as outer_err:
        print(f"[Gemini] Detection error: {outer_err}")
    
    return None
