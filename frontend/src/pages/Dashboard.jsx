import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Award,
  RefreshCw,
  UploadCloud,
  Pill,
  ArrowRight
} from "lucide-react";
import Nav from "../components/Nav.jsx";
import AgroLensLogo from "../components/AgroLensLogo.jsx";
import CameraModal from "../components/CameraModal.jsx";
import { clientDiagnoseFallback, clientUpdateLinUCB } from "../services/clientBandit.js";

const API_URL = import.meta.env.VITE_API_URL || "";
const DEFAULT_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [context, setContext] = useState(null);
  const [outcomeFeedback, setOutcomeFeedback] = useState(null);
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  const [apiKey] = useState(() => localStorage.getItem("cropsense_google_api_key") || DEFAULT_KEY);

  const handleCapturePhoto = (capturedFile, previewUrl) => {
    setFile(capturedFile);
    setPreview(previewUrl);
    diagnoseImage(capturedFile, previewUrl);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const previewUrl = URL.createObjectURL(f);
    setFile(f);
    setPreview(previewUrl);
    diagnoseImage(f, previewUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const previewUrl = URL.createObjectURL(f);
    setFile(f);
    setPreview(previewUrl);
    diagnoseImage(f, previewUrl);
  };

  const diagnoseImage = async (fileToDiagnose, previewUrl) => {
    setLoading(true);
    setResult(null);
    setOutcomeFeedback(null);

    try {
      let data = null;
      try {
        const formData = new FormData();
        formData.append("file", fileToDiagnose);
        formData.append("crop_type", "auto");
        formData.append("growth_stage", "vegetative");
        if (apiKey) {
          formData.append("api_key", apiKey);
        }

        const res = await fetch(`${API_URL}/api/diagnose`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (networkErr) {
        console.warn("Backend unavailable, activating resilient edge LinUCB:", networkErr);
      }

      if (!data) {
        data = await clientDiagnoseFallback(fileToDiagnose, apiKey);
      }

      setResult(data);
      setContext(data.context_vector_id || data.context_vector || []);
    } catch (err) {
      console.error("Diagnosis error:", err);
      setResult({
        error: true,
        message: "Failed to connect to AgroLens diagnostic engine. Please verify connectivity."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReportOutcome = async (outcome) => {
    if (!result || result.error || submittingOutcome) return;
    setSubmittingOutcome(true);
    try {
      const prevUcb = result.linucb?.ucb_score ?? 0;
      const prevConf = result.confidence ?? 0.85;
      let data = null;

      try {
        const res = await fetch(`${API_URL}/api/outcomes`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action_taken: result.recommended_action || "standard_treatment",
            outcome,
            context_json: JSON.stringify(result.context_vector || context || []),
            context_vector_id: result.context_vector_id || ""
          })
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn("Backend outcomes unavailable, updating client LinUCB:", err);
      }

      if (!data) {
        data = clientUpdateLinUCB(result.recommended_action || "early_blight__copper_fungicide_spray", outcome);
      }

      const newUcb = data.updated_decision ? data.updated_decision.arm_ucb : prevUcb;
      const newConf = data.updated_decision ? data.updated_decision.confidence : prevConf;
      const scoreDiff = (typeof newUcb === "number" && typeof prevUcb === "number") 
        ? (newUcb - prevUcb).toFixed(4) 
        : null;

      setResult(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          confidence: newConf,
          linucb: {
            ...prev.linucb,
            ucb_score: newUcb,
            ranked_arms: data.updated_decision?.ranked_arms || prev.linucb?.ranked_arms
          }
        };
      });

      setOutcomeFeedback({
        outcome,
        reward: data.reward,
        updates: data.total_updates,
        prevUcb,
        newUcb,
        scoreDiff,
        prevConf,
        newConf
      });
    } catch (err) {
      console.error("Outcome report error:", err);
    } finally {
      setSubmittingOutcome(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setOutcomeFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-[#0A1612] text-white font-sans antialiased selection:bg-[#52B788] selection:text-[#0A1612] flex flex-col justify-between">
      <Nav />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapturePhoto}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 flex flex-col justify-center items-center">
        {/* INTAKE CARD: Direct Click / Upload */}
        {!preview && !result && (
          <div className="w-full max-w-lg bg-[#0E221B] rounded-[36px] sm:rounded-[44px] shadow-2xl border border-[#1F4A39] p-6 sm:p-10 flex flex-col items-center text-center animate-in fade-in duration-300">
            <div className="mb-6 flex flex-col items-center">
              <AgroLensLogo size="lg" dark={true} showTagline={true} />
              <p className="text-xs sm:text-sm text-gray-300 font-semibold mt-3 max-w-[280px]">
                Supporting Farmers in Safeguarding their Crop Health
              </p>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-8 px-4 rounded-3xl border-2 border-dashed transition-all cursor-pointer mb-6 flex flex-col items-center justify-center ${
                dragOver
                  ? "border-[#52B788] bg-[#16382C]"
                  : "border-[#234B3D] bg-[#0A1612]/70 hover:bg-[#11241E] hover:border-[#52B788]/60"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#11241E] border border-[#234B3D] flex items-center justify-center mb-3 shadow-inner">
                <UploadCloud size={28} className="text-[#52B788]" />
              </div>
              <p className="text-sm font-bold text-white">
                Drop your leaf photo here
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                or use the direct buttons below
              </p>
            </div>

            <div className="w-full space-y-3.5">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="w-full bg-[#52B788] hover:bg-[#40916C] active:scale-[0.98] text-[#0A1612] hover:text-white py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-[#52B788]/20 transition-all cursor-pointer group"
              >
                <div className="text-left">
                  <p className="font-black text-base leading-tight">Take picture</p>
                  <p className="text-xs opacity-90 font-medium">of your plant</p>
                </div>
                <div className="w-11 h-11 rounded-xl border border-current flex items-center justify-center bg-black/10 group-hover:bg-white/20 transition-colors">
                  <Camera size={22} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] active:scale-[0.98] text-white py-4 px-6 rounded-2xl flex items-center justify-between border border-[#2D6A4F] shadow-lg transition-all cursor-pointer group"
              >
                <div className="text-left">
                  <p className="font-black text-base leading-tight">Import</p>
                  <p className="text-xs text-gray-300 font-medium">from your gallery</p>
                </div>
                <div className="w-11 h-11 rounded-xl border border-white/20 flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                  <ImageIcon size={22} className="text-[#52B788]" />
                </div>
              </button>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
              <Sparkles size={13} className="text-[#52B788]" />
              <span>Auto-Detects Any Crop with Gemini 3.8 Flash Vision</span>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="w-full max-w-lg bg-[#0E221B] rounded-[36px] shadow-2xl border border-[#1F4A39] p-8 flex flex-col items-center justify-center text-center min-h-[460px] animate-in fade-in">
            <div className="relative w-36 h-36 rounded-3xl overflow-hidden mb-6 shadow-2xl border-2 border-[#52B788]">
              <img src={preview} alt="Scanning" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-[#52B788]/25 animate-pulse" />
              <div className="absolute inset-x-0 h-1 bg-[#52B788] shadow-lg shadow-[#52B788] animate-[bounce_1.5s_infinite]" />
            </div>

            <h2 className="text-xl font-black text-white mb-1">
              Analyzing Leaf Pathology...
            </h2>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed mb-4">
              Examining cellular pigmentation, lesion morphology, and disease class with Gemini 3.8 Flash.
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-[#52B788] bg-[#11241E] border border-[#234B3D] px-4 py-1.5 rounded-full">
              <RefreshCw size={13} className="animate-spin text-[#52B788]" />
              <span>Generating Targeted Cure & Precautions</span>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && result?.error && (
          <div className="w-full max-w-lg bg-[#0E221B] rounded-[36px] shadow-2xl border border-red-900/60 p-8 text-center space-y-4 animate-in fade-in">
            <AlertTriangle size={42} className="mx-auto text-amber-500" />
            <h2 className="text-lg font-bold text-white">Diagnosis Incomplete</h2>
            <p className="text-xs text-gray-400 leading-relaxed">{result.message}</p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={resetAll}
                className="text-xs bg-[#11241E] hover:bg-[#1B4332] text-white font-semibold px-4 py-2.5 rounded-xl border border-[#234B3D]"
              >
                Scan Another Leaf
              </button>
              <button
                type="button"
                onClick={() => diagnoseImage(file, preview)}
                className="text-xs bg-[#52B788] hover:bg-[#40916C] text-[#0A1612] font-bold px-4 py-2.5 rounded-xl"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* DIAGNOSIS RESULTS DISPLAY */}
        {!loading && result && !result.error && (
          <div className="w-full max-w-3xl bg-[#0E221B] rounded-[36px] sm:rounded-[44px] shadow-2xl border border-[#1F4A39] overflow-hidden flex flex-col animate-in fade-in duration-300">
            <div className="bg-gradient-to-r from-[#11241E] via-[#1B4332] to-[#2D6A4F] p-5 sm:p-7 text-white flex items-center justify-between border-b border-[#1F4A39]">
              <div className="flex items-center gap-3.5">
                {preview && (
                  <img
                    src={preview}
                    alt="Analyzed Leaf"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#52B788]/60 shadow-md shrink-0"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#0A1612] bg-[#52B788] px-2.5 py-0.5 rounded-full">
                      {result.crop || result.crop_type || "Crop Identified"}
                    </span>
                    <span className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
                      {Math.round((result.confidence || 0.9) * 100)}% Match
                      {outcomeFeedback && outcomeFeedback.scoreDiff && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          Number(outcomeFeedback.scoreDiff) < 0 
                            ? "bg-red-950/80 text-red-400 border-red-800/60" 
                            : "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                        }`}>
                          {Number(outcomeFeedback.scoreDiff) > 0 ? `+${outcomeFeedback.scoreDiff}` : outcomeFeedback.scoreDiff} UCB
                        </span>
                      )}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {result.disease || "Diagnosed Condition"}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={resetAll}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#0A1612]/70 hover:bg-[#0A1612] text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/10"
              >
                <X size={16} />
                <span className="hidden sm:inline">New Scan</span>
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F4A39] pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    Class: {result.class || (result.is_healthy ? "Healthy Plant" : "Fungi")}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      result.is_healthy
                        ? "bg-[#52B788]/20 text-[#52B788]"
                        : result.severity === "Critical" || result.severity === "High"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-800"
                        : "bg-[#11241E] text-gray-300 border border-[#234B3D]"
                    }`}
                  >
                    Severity: {result.severity || "Moderate"}
                  </span>
                </div>

                <span className="text-xs text-[#52B788] font-medium flex items-center gap-1">
                  <Sparkles size={13} />
                  Gemini 3.8 Flash Vision
                </span>
              </div>

              {result.description && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Pathological Overview
                  </span>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed bg-[#0A1612] p-4 rounded-xl border border-[#1F4A39]/60">
                    {result.description}
                  </p>
                </div>
              )}

              {result.detection && (
                <div className="bg-[#11241E] border border-[#234B3D] rounded-xl p-4 space-y-1">
                  <span className="text-xs font-bold text-[#52B788] uppercase tracking-wider block flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    Foliar Symptoms Detected
                  </span>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {result.detection}
                  </p>
                </div>
              )}

              {result.cure && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Pill size={18} className="text-[#52B788]" />
                    <h3 className="font-black text-base text-white">
                      Cure & Treatment Protocols
                    </h3>
                  </div>

                  {result.cure.immediate_action && (
                    <div className="bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-xl border-y border-r border-amber-900/40">
                      <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
                        ⚡ Urgent First Step (Do This Today)
                      </span>
                      <p className="text-xs sm:text-sm text-amber-100 font-medium mt-1 leading-relaxed">
                        {result.cure.immediate_action}
                      </p>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 pt-1">
                    {result.cure.organic_options && (
                      <div className="bg-[#11241E] border border-[#234B3D] rounded-xl p-4">
                        <span className="text-xs font-bold text-[#52B788] block mb-1">
                          🌿 Organic / Biological Remedy
                        </span>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {result.cure.organic_options}
                        </p>
                      </div>
                    )}

                    {result.cure.chemical_options && (
                      <div className="bg-[#11241E] border border-[#234B3D] rounded-xl p-4">
                        <span className="text-xs font-bold text-gray-300 block mb-1">
                          🧪 Chemical Active Treatments
                        </span>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {result.cure.chemical_options}
                        </p>
                      </div>
                    )}
                  </div>

                  {result.cure.treatment && (
                    <div className="bg-[#0A1612] border border-[#1F4A39] rounded-xl p-4">
                      <span className="text-xs font-bold text-gray-400 block mb-1">
                        Application Cadence & Dosage
                      </span>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {result.cure.treatment}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {result.precaution && (
                <div className="bg-[#0A1612] border border-[#1F4A39] rounded-xl p-4 space-y-1">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                    🛡️ Long-Term Precautions & Cultural Practices
                  </span>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {result.precaution}
                  </p>
                </div>
              )}

              <div className="border-t border-[#1F4A39] pt-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-bold text-gray-300">
                    Did you apply this remedy? Report outcome (Trains Bandit Policy):
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold">
                    T+7 Days Evaluation
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "recovered", label: "Recovered", style: "hover:bg-[#52B788] hover:text-[#0A1612]" },
                    { key: "improved", label: "Improved", style: "hover:bg-[#2D6A4F] hover:text-white" },
                    { key: "no_change", label: "No Change", style: "hover:bg-gray-700 hover:text-white" },
                    { key: "worsened", label: "Worsened", style: "hover:bg-red-800 hover:text-white" }
                  ].map(({ key, label, style }) => (
                    <button
                      key={key}
                      type="button"
                      disabled={submittingOutcome}
                      onClick={() => handleReportOutcome(key)}
                      className={`text-xs font-bold py-2.5 px-3 rounded-xl border border-[#234B3D] transition-all cursor-pointer capitalize ${
                        outcomeFeedback?.outcome === key
                          ? "bg-[#52B788] text-[#0A1612] border-[#52B788]"
                          : `bg-[#11241E] text-gray-300 ${style}`
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {outcomeFeedback && (
                  <div className="bg-[#11241E] border border-[#234B3D] p-3.5 rounded-xl space-y-1.5 text-xs font-medium">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <Award size={16} className={outcomeFeedback.reward < 0 ? "text-amber-400 shrink-0" : "text-[#52B788] shrink-0"} />
                        <span>
                          Feedback logged! Bandit reward:{" "}
                          <span className={outcomeFeedback.reward < 0 ? "text-red-400 font-bold" : "text-[#52B788] font-bold"}>
                            {outcomeFeedback.reward > 0 ? `+${outcomeFeedback.reward}` : outcomeFeedback.reward}
                          </span>{" "}
                          (Total Updates: {outcomeFeedback.updates})
                        </span>
                      </div>
                      {outcomeFeedback.scoreDiff && (
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                          Number(outcomeFeedback.scoreDiff) < 0 
                            ? "bg-red-950/80 text-red-300 border-red-700/60" 
                            : "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                        }`}>
                          UCB: {outcomeFeedback.prevUcb} &rarr; {outcomeFeedback.newUcb} ({Number(outcomeFeedback.scoreDiff) > 0 ? `+${outcomeFeedback.scoreDiff}` : outcomeFeedback.scoreDiff})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-300 font-mono leading-relaxed">
                      Sherman-Morrison Rank-1 update applied.
                      {Number(outcomeFeedback.scoreDiff) < 0 
                        ? ` Negative feedback reduced this arm's UCB score from ${outcomeFeedback.prevUcb} to ${outcomeFeedback.newUcb} (${outcomeFeedback.scoreDiff}).`
                        : ` Positive feedback boosted this arm's UCB score by +${outcomeFeedback.scoreDiff}.`}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={resetAll}
                  className="w-full sm:w-auto bg-[#52B788] hover:bg-[#40916C] text-[#0A1612] hover:text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera size={18} />
                  <span>Scan Another Leaf</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full py-6 text-center text-xs text-gray-500 border-t border-[#1F4A39]/50">
        © 2026 AgroLens • See. Detect. Protect. • Precision Agronomic Intelligence
      </footer>
    </div>
  );
}
