import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
const PORT = process.env.PORT || 4000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// Configure multer for in-memory buffer handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory scan and outcome history
const historyStore = [];
const MAX_HISTORY = 100;

// Root & Health
app.get("/", (req, res) => {
  res.json({
    service: "CropSense Gateway",
    version: "1.0.0",
    ml_service_url: ML_SERVICE_URL,
    status: "healthy"
  });
});

app.get("/health", async (req, res) => {
  let mlReachable = false;
  let mlData = null;
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/health`);
    if (mlRes.ok) {
      mlReachable = true;
      mlData = await mlRes.json();
    }
  } catch (err) {
    mlReachable = false;
  }

  res.json({
    gateway: "ok",
    port: PORT,
    ml_service: {
      url: ML_SERVICE_URL,
      reachable: mlReachable,
      info: mlData
    }
  });
});

// POST /api/diagnose - Upload leaf image and get RL recommendation
app.post("/api/diagnose", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: "No image file provided." });
    }

    const { crop_type = "tomato", growth_stage = "vegetative", microclimate_risk = "0.5", api_key } = req.body;
    const apiKey = api_key || req.headers["x-api-key"] || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    // Build multipart form data for ML service
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || "image/jpeg" });
    formData.append("file", blob, req.file.originalname || "leaf.jpg");
    formData.append("crop_type", crop_type);
    formData.append("growth_stage", growth_stage);
    formData.append("microclimate_risk", microclimate_risk);
    if (apiKey) formData.append("api_key", apiKey);

    const mlResponse = await fetch(`${ML_SERVICE_URL}/diagnose`, {
      method: "POST",
      body: formData
    });

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      return res.status(mlResponse.status).json({
        error: true,
        message: `ML service error: ${errText}`
      });
    }

    const data = await mlResponse.json();

    // Store in history
    const record = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      crop_type,
      growth_stage,
      recommended_action: data.recommended_action,
      disease: data.disease,
      treatment: data.treatment,
      confidence: data.confidence,
      needs_human_review: data.needs_human_review,
      context_vector_id: data.context_vector_id,
      outcome_reported: null
    };

    historyStore.unshift(record);
    if (historyStore.length > MAX_HISTORY) {
      historyStore.pop();
    }

    return res.json(data);
  } catch (error) {
    console.error("Diagnosis error:", error);
    return res.status(502).json({
      error: true,
      message: `Failed to connect to diagnosis service at ${ML_SERVICE_URL}. ${error.message}`
    });
  }
});

// POST /api/outcomes - Record farmer / agronomist outcome feedback and update RL bandit
app.post("/api/outcomes", async (req, res) => {
  try {
    const {
      action_taken,
      outcome,
      context_json,
      context_vector_id,
      agronomist_override
    } = req.body;

    if (!action_taken || !outcome) {
      return res.status(400).json({ error: true, message: "action_taken and outcome are required." });
    }

    const bodyParams = new URLSearchParams();
    bodyParams.append("action_taken", action_taken);
    bodyParams.append("outcome", outcome);
    if (context_json) bodyParams.append("context_json", context_json);
    if (context_vector_id) bodyParams.append("context_vector_id", context_vector_id);
    if (agronomist_override) bodyParams.append("agronomist_override", agronomist_override);

    const mlResponse = await fetch(`${ML_SERVICE_URL}/outcomes`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams
    });

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      return res.status(mlResponse.status).json({
        error: true,
        message: `ML service reward update error: ${errText}`
      });
    }

    const data = await mlResponse.json();

    // Update history record if context_vector_id matches
    if (context_vector_id) {
      const match = historyStore.find(h => h.context_vector_id === context_vector_id);
      if (match) {
        match.outcome_reported = outcome;
        match.reward = data.reward;
      }
    }

    return res.json(data);
  } catch (error) {
    console.error("Outcome error:", error);
    return res.status(502).json({
      error: true,
      message: `Failed to send outcome to ML service: ${error.message}`
    });
  }
});

// GET /api/history - Retrieve recent scans
app.get("/api/history", (req, res) => {
  res.json({ history: historyStore });
});

// GET /api/stats - Proxy RL policy stats
app.get("/api/stats", async (req, res) => {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/stats`);
    if (mlResponse.ok) {
      const stats = await mlResponse.json();
      return res.json(stats);
    }
    return res.status(502).json({ error: true, message: "Failed to retrieve stats from ML service" });
  } catch (err) {
    return res.status(502).json({ error: true, message: err.message });
  }
});

// POST /api/simulate_rl - Trigger simulated interaction rounds to train LinUCB policy online
app.post("/api/simulate_rl", async (req, res) => {
  try {
    const episodes = req.body?.episodes || 10;
    const mlResponse = await fetch(`${ML_SERVICE_URL}/simulate_rl?episodes=${episodes}`, {
      method: "POST"
    });
    if (mlResponse.ok) {
      const data = await mlResponse.json();
      return res.json(data);
    }
    return res.status(502).json({ error: true, message: "Simulation failed on ML service" });
  } catch (err) {
    return res.status(502).json({ error: true, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[CropSense Gateway] Listening on http://localhost:${PORT}`);
  console.log(`[CropSense Gateway] Routing ML requests to ${ML_SERVICE_URL}`);
});
