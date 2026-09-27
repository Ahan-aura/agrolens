# AgroLens: Adaptive Crop Disease Diagnostics & Reinforcement Learning System

> **An intelligent foliar health advisor that gets sharper every season.**

Instead of training once on a static labeled benchmark and going stale in unpredictable field conditions, **AgroLens** treats foliar diagnosis and treatment prescription as an **action** and field outcomes (recovery, progression, agronomist validation) as a **reward signal**. The decision policy continually adapts through an active **Disjoint LinUCB Contextual Bandit** engine.

Featuring a cinematic dark-mode glassmorphic user experience, direct camera intake, interactive botanical pathology library, and multi-modal leaf embeddings.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |     AgroLens React + Vite + Tailwind  |
                      |   Frontend (Canopy Palette :5173)     |
                      +-------------------+-------------------+
                                          |
                        HTTP / Multipart  |  REST Outcome Feedback
                                          v
                      +---------------------------------------+
                      |      Node.js Express API Gateway      |
                      |       (Port :4000 - Multipart/CORS)   |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |         FastAPI ML / RL Engine        |
                      |               (Port :8000)            |
                      +---------+-------------------+---------+
                                |                   |
                      +---------v-------+   +-------v---------+
                      | Multi-Modal     |   | Disjoint LinUCB |
                      | Feature Embed   |   | Contextual      |
                      | (embed.py)      |   | Bandit (policy) |
                      +-----------------+   +-------+---------+
                                                    |
                                            +-------v---------+
                                            | Asymmetric Risk |
                                            | Reward Engine   |
                                            | (reward.py)     |
                                            +-----------------+
```

### Stack Components

| Layer | Technology | Responsibilities |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide | Drag-drop photo intake, SVG circular confidence gauge, human review alerts, 4-tier outcome reporting, scan history |
| **API Gateway** | Node.js (Express), Multer, CORS | Multipart file streaming, request forwarding, scan history cache, outcome feedback aggregation |
| **ML/RL Service** | Python, FastAPI, NumPy, Pillow | Multi-modal leaf feature embedding, LinUCB action selection, asymmetric reward computation, model persistence |
| **Infra** | Docker Compose | Multi-container orchestration for local development and edge deployment |

---

## Reinforcement Learning Formulation

### 1. State Representation ($x \in \mathbb{R}^{44}$, $\|x\|_2 = 1$)
- **Visual Features (32 dims)**:
  - Color channel moments (RGB mean & variance).
  - Vegetation Indices: Green Leaf Index ($\text{GLI} = \frac{2G - R - B}{2G + R + B}$), Chlorosis index, Necrotic spot ratio.
  - HSV saturation and luminance distribution.
  - Spatial gradient and texture roughness (Sobel filter approximations and Laplacian variance).
  - 3x3 spatial grid lesion concentration mapping.
- **Agronomic Tabular Features (12 dims)**:
  - Crop type one-hot: `[tomato, potato, wheat, rice, corn, grape, other]`.
  - Growth stage one-hot: `[seedling, vegetative, flowering, mature]`.
  - Microclimate disease vulnerability score ($0.0 \dots 1.0$).

### 2. Action Space ($\mathcal{A}$)
Each arm is a paired `(Diagnosis, Agronomic Intervention)`:
1. `early_blight__copper_fungicide_spray`
2. `late_blight__escalate_to_agronomist`
3. `powdery_mildew__neem_oil_or_sulfur`
4. `bacterial_spot__copper_bactericide_and_prune`
5. `septoria_leaf_spot__chlorothalonil_protective_spray`
6. `yellow_leaf_curl_virus__vector_control_and_cull`
7. `nutrient_deficiency__foliar_micronutrient_spray`
8. `healthy__routine_monitoring`
9. `high_uncertainty__field_inspection`

### 3. Contextual Bandit Policy (Disjoint LinUCB)
For each action arm $a \in \mathcal{A}$:
- Covariance matrix $A_a \in \mathbb{R}^{d \times d}$, initialized to $\lambda I_d$ ($\lambda = 1.0$).
- Bias vector $b_a \in \mathbb{R}^d$, initialized with agronomic priors.
- Ridge regression estimate: $\hat{\theta}_a = A_a^{-1} b_a$.
- Upper Confidence Bound:
  $$p_{t,a} = \hat{\theta}_a^T x_t + \alpha \sqrt{x_t^T A_a^{-1} x_t}$$
- **Online Rank-1 Matrix Updates upon outcome feedback**:
  $$A_a \leftarrow A_a + x_t x_t^T$$
  $$b_a \leftarrow b_a + r_t x_t$$

### 4. Asymmetric Reward Function ($r_t$)
Agricultural decision-making involves asymmetric risk: failing to identify an aggressive pathogen (False Negative) destroys an entire crop cycle, whereas applying mild organic spray to a healthy plant (False Positive) only incurs modest chemical costs.
- **Recovered / Healed**: $+10.0$
- **Improved / Arrested**: $+4.0$
- **No Change**: $-2.0$
- **Worsened / Spread**: $-15.0$
- **Agronomist Confirmation**: $+5.0$
- **Critical Pathogen Miss (False Negative)**: $-18.0$
- **Chemical Cost Penalty**: $-0.2$ to $-0.8$ depending on synthetic chemical toxicity.

---

## Getting Started

### Option A: Docker Compose (Recommended)

From the project root:
```bash
cd cropsense-rl
docker compose -f infra/docker-compose.yml up --build
```

Access the services:
- **Frontend UI**: [http://localhost:5173](http://localhost:5173)
- **API Gateway**: [http://localhost:4000](http://localhost:4000)
- **ML API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: Local Multi-Process (Without Docker)

#### Windows
Run the automated launcher:
```cmd
run_local.bat
```

#### Linux / macOS
Run the shell launcher:
```bash
chmod +x run_local.sh
./run_local.sh
```

#### Or Run Each Service Manually:

1. **ML RL Service (Python)**:
   ```bash
   cd services/ml
   pip install -r requirements.txt
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **API Gateway (Node.js)**:
   ```bash
   cd services/gateway
   npm install
   npm start
   ```

3. **Frontend UI (React/Vite)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## Verification Test Suite

Verify that embedding, LinUCB action selection, asymmetric reward computation, and online matrix updates function properly:

```bash
cd cropsense-rl
python test_system.py
```

Expected output:
```
======================================================================
Running CropSense RL Verification Suite
======================================================================
[1/4] Testing LeafEmbedder...
  [OK] Context vectors generated successfully (dimension=44, norm=1.0000)
[2/4] Testing LinUCBPolicy inference...
  [OK] LinUCB action selection verified
[3/4] Testing Asymmetric Reward Engine...
  [OK] Asymmetric reward computation verified
[4/4] Testing Online Feedback Loop Update & Persistence...
  [OK] Policy updated online. Total updates: 1
  [OK] Checkpoint saved to: .../linucb_matrices.npz
======================================================================
All CropSense RL components passed verification successfully!
======================================================================
```
