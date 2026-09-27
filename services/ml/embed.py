"""
CropSense Feature Embedder
Extracts multi-modal state vectors from leaf imagery and agronomic metadata:
- Leaf visual features: Color distribution (RGB/HSV), Green Leaf Index (GLI),
  necrotic/chlorotic spot ratios, spatial lesion distribution, texture gradient variance.
- Tabular metadata: One-hot encoded crop type, growth stage, and microclimate risk.
Outputs a normalized context vector x in R^d for LinUCB bandit policy.
"""

import io
import math
import numpy as np
from PIL import Image
from typing import Tuple, List, Dict, Any, Optional

CROP_TYPES = ["tomato", "potato", "wheat", "rice", "corn", "grape", "other"]
GROWTH_STAGES = ["seedling", "vegetative", "flowering", "mature"]

VISUAL_DIM = 32
METADATA_DIM = len(CROP_TYPES) + len(GROWTH_STAGES) + 1  # 7 + 4 + 1 = 12
TOTAL_CONTEXT_DIM = VISUAL_DIM + METADATA_DIM            # 44 dims


class LeafEmbedder:
    def __init__(self, target_dim: int = TOTAL_CONTEXT_DIM):
        self.target_dim = target_dim

    def extract_visual_features(self, img: Image.Image) -> np.ndarray:
        """
        Extracts 32-dim deterministic visual representation of foliar morphology,
        pigmentation breakdown, and lesion textures.
        """
        # Resize to standard analysis canvas
        img_rgb = img.convert("RGB").resize((128, 128))
        arr = np.array(img_rgb, dtype=np.float32) / 255.0  # (128, 128, 3)

        r = arr[:, :, 0]
        g = arr[:, :, 1]
        b = arr[:, :, 2]

        # 1. Color channel moments (mean and variance) - 6 dims
        r_mean, r_std = float(np.mean(r)), float(np.std(r))
        g_mean, g_std = float(np.mean(g)), float(np.std(g))
        b_mean, b_std = float(np.mean(b)), float(np.std(b))

        # 2. Vegetation Indices - 4 dims
        # Green Leaf Index: (2*G - R - B) / (2*G + R + B + 1e-6)
        gli = (2.0 * g - r - b) / (2.0 * g + r + b + 1e-6)
        gli_mean = float(np.mean(gli))
        gli_std = float(np.std(gli))

        # Chlorosis index (yellowing): (R + G) - 2*B
        chlorosis = np.clip((r + g - 2.0 * b), 0.0, 1.0)
        chlorosis_ratio = float(np.mean(chlorosis > 0.25))

        # Necrosis index (brown/dark spot lesions): low brightness + low greenness
        brightness = (r + g + b) / 3.0
        necrosis = (brightness < 0.35) & (gli < 0.05)
        necrosis_ratio = float(np.mean(necrosis))

        # 3. HSV Color Space features - 6 dims
        img_hsv = img.convert("HSV").resize((128, 128))
        hsv_arr = np.array(img_hsv, dtype=np.float32) / 255.0
        h_mean, h_std = float(np.mean(hsv_arr[:, :, 0])), float(np.std(hsv_arr[:, :, 0]))
        s_mean, s_std = float(np.mean(hsv_arr[:, :, 1])), float(np.std(hsv_arr[:, :, 1]))
        v_mean, v_std = float(np.mean(hsv_arr[:, :, 2])), float(np.std(hsv_arr[:, :, 2]))

        # 4. Texture & Spatial Gradients (Sobel filter approximations) - 4 dims
        # Horizontal and vertical luminance gradients
        dx = np.abs(brightness[:, 1:] - brightness[:, :-1])
        dy = np.abs(brightness[1:, :] - brightness[:-1, :])
        edge_density = float(np.mean(dx > 0.08) + np.mean(dy > 0.08)) / 2.0
        texture_roughness = float(np.std(dx) + np.std(dy)) / 2.0
        contrast = float(np.max(brightness) - np.min(brightness))
        laplacian_var = float(np.var(dx) + np.var(dy))

        # 5. Spatial Grid Breakdown (3x3 blocks to capture focal vs diffuse lesions) - 9 dims
        blocks = []
        for i in range(3):
            for j in range(3):
                sub = necrosis[i * 42:(i + 1) * 42, j * 42:(j + 1) * 42]
                blocks.append(float(np.mean(sub)))

        # 6. Overall Foliar Canopy Ratio - 3 dims
        leaf_mask = (g > r * 0.9) | (gli > -0.05)
        canopy_coverage = float(np.mean(leaf_mask))
        background_ratio = 1.0 - canopy_coverage
        lesion_to_leaf_ratio = necrosis_ratio / (canopy_coverage + 1e-4)

        # Concatenate 32 visual features
        features = [
            r_mean, r_std, g_mean, g_std, b_mean, b_std,
            gli_mean, gli_std, chlorosis_ratio, necrosis_ratio,
            h_mean, h_std, s_mean, s_std, v_mean, v_std,
            edge_density, texture_roughness, contrast, laplacian_var,
            *blocks,  # 9 dims
            canopy_coverage, background_ratio, min(lesion_to_leaf_ratio, 5.0)
        ]

        vis_vector = np.array(features[:VISUAL_DIM], dtype=np.float32)
        # Handle any possible NaN
        vis_vector = np.nan_to_num(vis_vector, nan=0.0, posinf=1.0, neginf=-1.0)
        return vis_vector

    def extract_metadata_features(
        self,
        crop_type: str,
        growth_stage: str,
        microclimate_risk: float = 0.5
    ) -> np.ndarray:
        """
        One-hot encodes categorical crop parameters into dense embedding vector.
        """
        # Crop one-hot
        crop_vec = np.zeros(len(CROP_TYPES), dtype=np.float32)
        c_clean = crop_type.lower().strip()
        if c_clean in CROP_TYPES:
            crop_vec[CROP_TYPES.index(c_clean)] = 1.0
        else:
            crop_vec[-1] = 1.0  # other

        # Stage one-hot
        stage_vec = np.zeros(len(GROWTH_STAGES), dtype=np.float32)
        s_clean = growth_stage.lower().strip()
        if s_clean in GROWTH_STAGES:
            stage_vec[GROWTH_STAGES.index(s_clean)] = 1.0
        else:
            stage_vec[1] = 1.0  # default vegetative

        meta_vec = np.concatenate([
            crop_vec,
            stage_vec,
            np.array([np.clip(float(microclimate_risk), 0.0, 1.0)], dtype=np.float32)
        ])
        return meta_vec

    def embed(
        self,
        image_bytes: bytes,
        crop_type: str = "tomato",
        growth_stage: str = "vegetative",
        microclimate_risk: float = 0.5
    ) -> np.ndarray:
        """
        Full pipeline: Raw image bytes + metadata -> Normalized context vector x in R^d.
        """
        try:
            img = Image.open(io.BytesIO(image_bytes))
        except Exception:
            # Fallback blank image if corrupted
            img = Image.new("RGB", (128, 128), color=(30, 80, 40))

        vis_vec = self.extract_visual_features(img)
        meta_vec = self.extract_metadata_features(crop_type, growth_stage, microclimate_risk)

        context = np.concatenate([vis_vec, meta_vec])

        # L2-normalize context vector so ||x||_2 = 1
        norm = np.linalg.norm(context)
        if norm > 1e-6:
            context = context / norm
        else:
            context = np.zeros_like(context)
            context[0] = 1.0

        return context
