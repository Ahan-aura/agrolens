import { useState } from "react";
import { AlertTriangle, CheckCircle2, Award, Sparkles, Shield, Pill, Leaf } from "lucide-react";

export default function DiagnosisCard({ result, apiUrl, context }) {
  const [outcomeFeedback, setOutcomeFeedback] = useState(null);
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  async function reportOutcome(outcome) {
    if (!result || result.error) return;
    setSubmittingOutcome(true);
    try {
      const res = await fetch(`${apiUrl}/api/outcomes`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action_taken: result.recommended_action || "standard_treatment",
          outcome,
          context_json: JSON.stringify(context || []),
          context_vector_id: result.context_vector_id || ""
        }),
      });
      const data = await res.json();
      setOutcomeFeedback({ outcome, reward: data.reward, updates: data.total_updates });
    } catch (err) {
      console.error("Failed to report outcome:", err);
    } finally {
      setSubmittingOutcome(false);
    }
  }

  if (!result) {
    return (
      <section className="border-2 border-dashed border-leaf-soft rounded-2xl p-6 h-full min-h-[320px] flex flex-col items-center justify-center text-center text-canopy-dark/40 text-sm">
        <Leaf size={32} className="mb-2 text-leaf/40" />
        <p className="font-display text-base text-canopy-dark/70">Awaiting Leaf Intake</p>
        <p className="text-xs text-canopy-dark/40 max-w-xs mt-1">
          Take a photo with your camera or upload an image to receive instant disease diagnosis and tailored cure instructions.
        </p>
      </section>
    );
  }

  if (result.error) {
    return (
      <section className="bg-white border border-amber/30 rounded-2xl p-6 shadow-soft">
        <p className="text-amber text-sm font-medium">{result.message}</p>
      </section>
    );
  }

  const pct = Math.round((result.confidence || 0.8) * 100);
  const needsReview = result.needs_human_review;
  const isHealthy = result.is_healthy || result.disease?.toLowerCase().includes("healthy");
  const cure = result.cure || {};

  return (
    <section className="bg-white border border-leaf-soft rounded-2xl p-6 shadow-soft space-y-5">
      {/* Title & Badge */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-leaf uppercase tracking-wider">
            {result.crop || result.crop_type || "Crop Diagnosis"}
          </span>
          <h2 className="font-display text-2xl text-canopy-dark mt-0.5 leading-tight">
            {result.disease || "Pathology Report"}
          </h2>
        </div>

        {result.detected_by === "gemini" ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-soft text-canopy-dark px-2.5 py-1 rounded-full border border-amber/20 shadow-xs">
            <Sparkles size={12} className="text-amber" />
            Gemini Vision
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-leaf-soft text-canopy-dark px-2.5 py-1 rounded-full border border-leaf/20">
            <Shield size={12} className="text-leaf" />
            LinUCB Policy
          </span>
        )}
      </div>

      {/* Confidence & Severity Header */}
      <div className="flex items-center gap-4 bg-leaf-soft/20 p-3.5 rounded-xl border border-leaf-soft/50">
        <Gauge pct={pct} warn={needsReview} />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isHealthy
                ? "bg-leaf-soft text-leaf"
                : needsReview
                ? "bg-amber-soft text-amber"
                : "bg-leaf-soft text-canopy-dark"
            }`}>
              {needsReview ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
              {isHealthy ? "Healthy Leaf" : `Severity: ${result.severity || "Moderate"}`}
            </span>
            <span className="text-xs text-canopy-dark/60 font-medium">
              {pct}% Confidence
            </span>
          </div>
          <p className="text-xs text-canopy-dark/70">
            {needsReview
              ? "High uncertainty or critical pathogen detected. Physical agronomist review advised."
              : "Clear foliar markers identified with high statistical confidence."}
          </p>
        </div>
      </div>

      {/* Cure & Treatment Instructions */}
      <div className="space-y-3">
        <h3 className="font-display text-base text-canopy-dark flex items-center gap-1.5">
          <Pill size={16} className="text-leaf" />
          <span>Prescription & Cure</span>
        </h3>

        {cure.immediate_action && (
          <div className="bg-amber/10 border-l-4 border-amber p-3 rounded-r-lg text-xs">
            <span className="font-bold text-amber block uppercase tracking-wider mb-0.5">Immediate Action</span>
            <p className="text-canopy-dark">{cure.immediate_action}</p>
          </div>
        )}

        <div className="bg-parchment/60 p-3 rounded-xl border border-leaf-soft/40 space-y-2 text-xs">
          {cure.treatment && (
            <div>
              <span className="font-semibold text-canopy-dark block">Treatment Protocol:</span>
              <p className="text-canopy-dark/80">{cure.treatment}</p>
            </div>
          )}

          {cure.organic_options && (
            <div>
              <span className="font-semibold text-leaf block">Organic / Biological Remedy:</span>
              <p className="text-canopy-dark/80">{cure.organic_options}</p>
            </div>
          )}

          {cure.chemical_options && (
            <div>
              <span className="font-semibold text-soil block">Chemical Controls:</span>
              <p className="text-canopy-dark/80">{cure.chemical_options}</p>
            </div>
          )}

          {result.prevention && (
            <div className="pt-1 border-t border-leaf-soft/50">
              <span className="font-semibold text-canopy-light block">Prevention:</span>
              <p className="text-canopy-dark/70">{result.prevention}</p>
            </div>
          )}
        </div>
      </div>

      {/* Closed-loop RL Outcome Feedback */}
      <div className="border-t border-leaf-soft pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-canopy-dark/60">
            T+7 Days Follow-up (Trains the RL policy):
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["recovered", "improved", "no_change", "worsened"].map((o) => (
            <button
              key={o}
              disabled={submittingOutcome}
              onClick={() => reportOutcome(o)}
              className={`text-xs border border-leaf-soft rounded-full px-3 py-1.5 transition-all cursor-pointer capitalize font-medium ${
                outcomeFeedback?.outcome === o
                  ? "bg-canopy-dark text-parchment"
                  : "hover:bg-leaf-soft text-canopy-dark hover:border-leaf"
              }`}
            >
              {o.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        {outcomeFeedback && (
          <div className="mt-3 text-xs bg-leaf-soft text-canopy-dark px-3 py-2 rounded-lg flex items-center gap-2">
            <Award size={14} className="text-leaf shrink-0" />
            <span>
              Bandit feedback recorded! Reward: <b>{outcomeFeedback.reward > 0 ? `+${outcomeFeedback.reward}` : outcomeFeedback.reward}</b> (Total policy updates: {outcomeFeedback.updates})
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function Gauge({ pct, warn }) {
  const r = 26, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0">
      <circle cx="34" cy="34" r={r} fill="none" stroke="#DCEBDD" strokeWidth="7" />
      <circle
        cx="34" cy="34" r={r} fill="none"
        stroke={warn ? "#C97A2B" : "#4E8C5A"}
        strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 34 34)"
      />
      <text x="34" y="38" textAnchor="middle" fontSize="14" fontWeight="700" fill="#16302A">
        {pct}%
      </text>
    </svg>
  );
}
