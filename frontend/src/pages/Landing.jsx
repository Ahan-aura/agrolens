import React, { useRef, useState, useEffect } from "react";
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
  Shield,
  ArrowRight,
  BookOpen,
  Cpu,
  Volume2,
  VolumeX,
  RotateCcw,
  Check,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  Search,
  ExternalLink,
  Info,
  Filter
} from "lucide-react";
import Nav from "../components/Nav.jsx";
import AgroLensLogo from "../components/AgroLensLogo.jsx";
import CameraModal from "../components/CameraModal.jsx";
import { clientDiagnoseFallback, clientUpdateLinUCB } from "../services/clientBandit.js";

const API_URL = import.meta.env.VITE_API_URL || "";
const DEFAULT_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

// Enhanced interactive Disease Library dataset with multi-tab cures
const DISEASE_LIBRARY = [
  {
    id: "early_blight",
    name: "Early Blight",
    crop: "Tomato & Potato",
    pathogen: "Alternaria solani",
    class: "Fungi",
    severity: "Moderate",
    urgency: "3-5 Days",
    symptoms: "Concentric dark brown rings resembling target spots, primarily on older leaves, surrounded by distinctive yellow chlorotic halos.",
    immediate_step: "Prune and dispose of lower infected foliage immediately; avoid overhead sprinkler watering.",
    organic_cure: "Apply fixed copper octanoate spray (2.5ml/L) or Bacillus subtilis bio-fungicide every 7 days. Mulch heavily with organic straw.",
    chemical_cure: "Foliar application of Chlorothalonil (1.5g/L) or Mancozeb protective barrier spray; rotate with Azoxystrobin to prevent resistance.",
    prevention: "Implement 3-year solanaceous crop rotation, install drip irrigation lines, and maintain 45cm plant spacing for canopy airflow.",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "late_blight",
    name: "Late Blight",
    crop: "Potato & Tomato",
    pathogen: "Phytophthora infestans",
    class: "Fungi",
    severity: "Critical",
    urgency: "Immediate (24 hrs)",
    symptoms: "Rapidly expanding water-soaked greasy olive-green lesions turning purplish-black, with delicate white fungal mold on leaf undersides in humid conditions.",
    immediate_step: "Rogue severely infected plants inside plastic bags immediately to prevent airborne spore dispersion across the field.",
    organic_cure: "Copper hydroxide preventive barrier spray; spray before forecast rain events. Remove volunteer potato tubers completely.",
    chemical_cure: "Systemic translaminar fungicides: Mandipropamid, Dimethomorph, or Cymoxanil tank-mixed with protectant Mancozeb.",
    prevention: "Plant certified blight-resistant seed stock; destroy cull piles; avoid prolonged leaf wetness through soil-level drip irrigation.",
    image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "powdery_mildew",
    name: "Powdery Mildew",
    crop: "Grape, Cucurbits, Apple & Strawberry",
    pathogen: "Erysiphales",
    class: "Fungi",
    severity: "Low",
    urgency: "5-7 Days",
    symptoms: "White to grayish talcum-powder-like fungal patches across upper leaf surfaces, causing leaf curling, chlorosis, and premature senescence.",
    immediate_step: "Prune dense shading canopy foliage to allow direct solar UV penetration and increase air circulation.",
    organic_cure: "Cold-pressed neem oil (0.5%), potassium bicarbonate spray (3g/L), or micronized wettable sulfur dust applied in the early morning.",
    chemical_cure: "Triazole and strobilurin fungicides: Myclobutanil, Trifloxystrobin, or Azoxystrobin applied upon first sign of mycelial patches.",
    prevention: "Maintain wide trellising and row spacing; avoid nitrogen over-fertilization which produces excessively succulent vulnerable tissue.",
    image: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "anthracnose",
    name: "Anthracnose",
    crop: "Mango, Coffee, Avocado & Peppers",
    pathogen: "Colletotrichum gloeosporioides",
    class: "Fungi",
    severity: "Moderate",
    urgency: "3-4 Days",
    symptoms: "Sunken, dark brown necrotic circular lesions with concentric zones, producing gelatinous pinkish spore masses during warm rainy periods.",
    immediate_step: "Prune dead twigs 10cm below infected zone using sterilized shears; rake and burn fallen leaves and mummified fruit.",
    organic_cure: "Copper oxychloride (3g/L) or Trichoderma viride biological antagonist applied at panicle emergence and flower flush.",
    chemical_cure: "Pre-bloom protective spray of Chlorothalonil followed by systemic Difenoconazole or Thiophanate-methyl at fruit set.",
    prevention: "Canopy skirt pruning above 50cm from soil level to prevent splash contamination; avoid overhead sprinkler irrigation.",
    image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "bacterial_spot",
    name: "Bacterial Leaf Spot",
    crop: "Tomato, Bell Pepper & Stone Fruit",
    pathogen: "Xanthomonas campestris",
    class: "Bacteria",
    severity: "High",
    urgency: "1-2 Days",
    symptoms: "Small (2-3mm), angular, water-soaked dark brown spots with translucent greasy margins and yellow halos; lesions delimited by leaf veins.",
    immediate_step: "Do NOT enter field or handle foliage while leaves are wet from dew or rain to prevent rapid mechanical bacterial transmission.",
    organic_cure: "Copper sulfate pentahydrate combined with fatty acid soap; spray early morning so foliage dries rapidly in sunlight.",
    chemical_cure: "Fixed copper bactericide (Copper Hydroxide) combined synergistically with Mancozeb (overcomes bacterial copper tolerance).",
    prevention: "Use hot-water treated or certified disease-free seeds; sanitize pruning shears with 70% isopropyl alcohol between rows.",
    image: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "septoria_spot",
    name: "Septoria Leaf Spot",
    crop: "Tomato, Eggplant & Leafy Greens",
    pathogen: "Septoria lycopersici",
    class: "Fungi",
    severity: "Moderate",
    urgency: "3-5 Days",
    symptoms: "Abundant circular spots (1-3mm) with ash-gray centers and dark brown margins, peppered with tiny black fruiting bodies (pycnidia).",
    immediate_step: "Strip lower affected leaves up to the first healthy fruit cluster; remove all clipped foliage from the field.",
    organic_cure: "Liquid copper octanoate or Serenade (Bacillus amyloliquefaciens) preventive foliar bio-spray every 5-7 days.",
    chemical_cure: "Chlorothalonil or Fluxapyroxad applied upon initial observation of basal leaf lesions to protect canopy growth.",
    prevention: "Stake and tie plants off soil contact; install organic mulch barriers; deep autumn moldboard plowing of crop residues.",
    image: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "yellow_curl_virus",
    name: "Yellow Leaf Curl Virus (TYLCV)",
    crop: "Tomato, Pepper & Cucurbits",
    pathogen: "Tomato Yellow Leaf Curl Begomovirus",
    class: "Virus",
    severity: "Critical",
    urgency: "Immediate",
    symptoms: "Severe upward leaf cupping and curling, pronounced marginal chlorosis (yellowing), marked plant stunting, and complete flower drop.",
    immediate_step: "Immediately rogue and seal infected plants in airtight plastic bags; deploy yellow sticky vector monitoring traps.",
    organic_cure: "Deploy yellow sticky cards (1 per 10m²); spray cold-pressed neem oil (1%) or insecticidal potassium salts to suppress Bemisia whiteflies.",
    chemical_cure: "Soil drench of systemic Imidacloprid or Thiamethoxam; foliar application of Spiromesifen or Pyriproxyfen for whitefly nymph control.",
    prevention: "Install 50-mesh anti-insect netting over nursery houses; maintain a 2-month solanaceous host-free period between planting cycles.",
    image: "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "foliar_chlorosis",
    name: "Foliar Chlorosis (Nutrient Deficiency)",
    crop: "Corn, Rice, Wheat & Vegetables",
    pathogen: "Nutrient Imbalance / Soil pH Exhaustion",
    class: "Deficiency",
    severity: "Low",
    urgency: "7 Days",
    symptoms: "V-shaped yellowing starting from leaf tips and advancing along midribs of older leaves; stunted, pale biomass with reduced vigor.",
    immediate_step: "Conduct rapid soil pH and electrical conductivity (EC) testing to identify nutrient lockout versus depletion.",
    organic_cure: "Foliar spray of fish emulsion (5-1-1), aerated compost tea, or liquid seaweed extract; side-dress well-aged compost.",
    chemical_cure: "Foliar application of 2% Urea or chelated micronutrient cocktail (Fe-EDDHA, Zn-EDTA) for rapid 48-hour foliar absorption.",
    prevention: "Maintain balanced soil organic matter >3.5%; incorporate leguminous green manure cover crops in off-season.",
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80"
  }
];

export default function Landing() {
  // Intro Video & Smooth Slow Opening Animation State
  const [transitionPhase, setTransitionPhase] = useState("playing");
  const [isMuted, setIsMuted] = useState(true);
  const introVideoRef = useRef(null);

  // Scanner & Intake State (Direct camera/file - no plant selection step)
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Diagnosis Results State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [context, setContext] = useState(null);
  const [outcomeFeedback, setOutcomeFeedback] = useState(null);
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  // RL Stats & Live Simulation State
  const [stats, setStats] = useState(null);
  const [simulatingRL, setSimulatingRL] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Interactive Disease Library State (Search, Filters, Active Card Tabs, Modal)
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("all");
  const [cardActiveTabs, setCardActiveTabs] = useState({});
  const [selectedDiseaseModal, setSelectedDiseaseModal] = useState(null);

  // API Key
  const [apiKey] = useState(() => localStorage.getItem("cropsense_google_api_key") || DEFAULT_KEY);

  // Trigger the slow cinematic transition from full screen video into the website
  const startSlowTransition = () => {
    setTransitionPhase((current) => {
      if (current !== "playing") return current;
      return "transitioning";
    });
  };

  // When transitioning, wait 2.2 seconds for the slow smooth fade & unblur before unmounting overlay
  useEffect(() => {
    if (transitionPhase === "transitioning") {
      const timer = setTimeout(() => {
        setTransitionPhase("complete");
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [transitionPhase]);

  // Video playback management: Plays full video to the very end, then initiates slow transition
  useEffect(() => {
    const video = introVideoRef.current;
    if (!video) return;

    // Safety timeout: Guarantee website opens even if video stalls or browser blocks autoplay
    const safetyTimer = setTimeout(() => {
      if (transitionPhase === "playing") {
        startSlowTransition();
      }
    }, 9800);

    video.muted = isMuted;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Autoplay muted fallback:", err);
        setTimeout(() => {
          if (transitionPhase === "playing") {
            startSlowTransition();
          }
        }, 2000);
      });
    }

    const handleTimeUpdate = () => {
      if (!video.duration) return;
      if (video.currentTime >= video.duration - 0.12 && transitionPhase === "playing") {
        startSlowTransition();
      }
    };

    const handleEnded = () => {
      if (transitionPhase === "playing") {
        startSlowTransition();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      clearTimeout(safetyTimer);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [transitionPhase]);

  // Fetch LinUCB bandit stats
  const fetchStats = () => {
    fetch(`${API_URL}/api/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStats();
  }, [outcomeFeedback]);

  // Handle manual Enter / Skip
  const handleSkipOrEnter = () => {
    startSlowTransition();
  };

  // Replay intro video anytime
  const handleReplayIntro = () => {
    setTransitionPhase("playing");
    setTimeout(() => {
      if (introVideoRef.current) {
        introVideoRef.current.currentTime = 0;
        introVideoRef.current.play().catch(() => {});
      }
    }, 50);
  };

  const toggleSound = () => {
    if (introVideoRef.current) {
      introVideoRef.current.muted = !introVideoRef.current.muted;
      setIsMuted(introVideoRef.current.muted);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Image intake handlers
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
    scrollToSection("scanner");

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
        // Fallback to client-side edge LinUCB & Gemini vision
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

      // Dynamically update the displayed diagnosis result with the new RL matrix weights
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
        breakdown: data.breakdown,
        prevUcb,
        newUcb,
        scoreDiff,
        prevConf,
        newConf,
        topAction: data.updated_decision?.action
      });
      fetchStats();
    } catch (err) {
      console.error("Outcome report error:", err);
    } finally {
      setSubmittingOutcome(false);
    }
  };

  // Interactive RL simulation to demonstrate live training
  const handleSimulateRL = async (episodes = 10) => {
    setSimulatingRL(true);
    setSimResult(null);
    try {
      const res = await fetch(`${API_URL}/api/simulate_rl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodes })
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
        fetchStats();
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulatingRL(false);
    }
  };

  const resetScanner = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setOutcomeFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Helper for per-card cure tab switching
  const setCardTab = (diseaseName, tab) => {
    setCardActiveTabs((prev) => ({
      ...prev,
      [diseaseName]: tab
    }));
  };

  // Filtered diseases for the interactive library
  const filteredDiseases = DISEASE_LIBRARY.filter((item) => {
    const matchesCategory =
      libraryFilter === "all" || item.class.toLowerCase() === libraryFilter.toLowerCase();
    const query = librarySearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.crop.toLowerCase().includes(query) ||
      item.pathogen.toLowerCase().includes(query) ||
      item.symptoms.toLowerCase().includes(query) ||
      item.organic_cure.toLowerCase().includes(query) ||
      item.chemical_cure.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A1612] text-white font-sans antialiased selection:bg-[#52B788] selection:text-[#0A1612] relative overflow-x-hidden">
      {/* Hidden File Input for Gallery / Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Live Camera Viewfinder Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapturePhoto}
      />

      {/* ========================================================================= */}
      {/* 1. TRULY FULL SCREEN CINEMATIC INTRO VIDEO OVERLAY */}
      {/* ========================================================================= */}
      {transitionPhase !== "complete" && (
        <div
          onClick={handleSkipOrEnter}
          className={`fixed inset-0 w-screen h-screen z-50 bg-black overflow-hidden select-none cursor-pointer ${
            transitionPhase === "transitioning"
              ? "cinematic-overlay-exit"
              : "cinematic-overlay-active"
          }`}
        >
          {/* Edge-to-Edge Full Screen Video */}
          <video
            ref={introVideoRef}
            src="/landing_video.mp4"
            autoPlay
            muted={isMuted}
            playsInline
            onError={() => startSlowTransition()}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Atmospheric Cinematic Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />

          {/* Top Bar with Floating Glassmorphic AgroLens Badge & Controls */}
          <div className="absolute top-0 inset-x-0 z-20 px-6 py-6 flex items-center justify-between">
            <div className="bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
              <AgroLensLogo size="md" dark={true} showTagline={false} />
            </div>

            <div className="flex items-center gap-3">
              {/* Audio Mute/Unmute */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSound();
                }}
                className="p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-lg active:scale-95"
                title={isMuted ? "Unmute video" : "Mute video"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="text-[#52B788]" />}
              </button>

              {/* Enter Website Skip Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipOrEnter();
                }}
                className="flex items-center gap-2 bg-[#52B788] hover:bg-[#40916C] text-[#0A1612] hover:text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-2xl transition-all active:scale-95 cursor-pointer border border-[#52B788]/60"
              >
                <span>Enter Website</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Click to enter prompt at bottom */}
          <div className="absolute bottom-5 inset-x-0 z-20 flex justify-center pointer-events-none">
            <span className="text-[11px] text-white/60 bg-black/40 backdrop-blur-sm px-3.5 py-1 rounded-full border border-white/10">
              Click anywhere or press Enter Website
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN WEBSITE CONTENT */}
      {/* ========================================================================= */}
      <div
        className={
          transitionPhase === "playing"
            ? "cinematic-website-hidden"
            : "cinematic-website-enter"
        }
      >
        {/* Sticky Dark Navigation Bar */}
        <Nav
          onReplayVideo={handleReplayIntro}
          onScrollToSection={scrollToSection}
        />

        {/* HERO SECTION */}
        <header className="relative w-full overflow-hidden pt-8 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
          {/* Ambient Emerald Glow Behind Hero */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#52B788]/15 rounded-full blur-[120px] pointer-events-none" />

          {/* Slogan Badge */}
          <div className="inline-flex items-center gap-2 bg-[#11241E] border border-[#234B3D] px-4 py-1.5 rounded-full text-xs font-semibold text-[#52B788] mb-4 shadow-sm">
            <Sparkles size={14} className="text-[#52B788]" />
            <span>Multimodal Vision + LinUCB Reinforcement Learning</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight max-w-4xl mb-4">
            <span className="text-white">SEE. </span>
            <span className="text-[#52B788]">DETECT. </span>
            <span className="text-white">PROTECT.</span>
          </h1>

          <p className="text-sm sm:text-lg text-gray-300 max-w-2xl leading-relaxed mb-8">
            Next-generation optical precision agriculture. Take a leaf photo or import from your gallery for instant disease detection, targeted cures, and closed-loop reinforcement learning that optimizes treatments with every harvest.
          </p>

          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">
            <span className="bg-[#11241E] border border-[#1F4A39] px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#52B788]" />
              Gemini 3.8 Flash Vision
            </span>
            <span className="bg-[#11241E] border border-[#1F4A39] px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#52B788]" />
              Disjoint LinUCB Bandit
            </span>
            <span className="bg-[#11241E] border border-[#1F4A39] px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#52B788]" />
              Closed-Loop Field Learning
            </span>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* SECTION 1: LIVE SCANNER STUDIO (#scanner) */}
        {/* ========================================================================= */}
        <section id="scanner" className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-20 scroll-mt-24">
          <div className="bg-[#0E221B] border border-[#1F4A39] rounded-[36px] shadow-2xl p-6 sm:p-10 relative overflow-hidden">
            {/* INTAKE STATE: Direct Two Big Buttons */}
            {!preview && !result && (
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Scan or Upload Crop Leaf
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-300 max-w-md">
                    No plant selection needed. AgroLens automatically recognizes any crop species and diagnoses foliar disease.
                  </p>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-10 px-6 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center ${
                    dragOver
                      ? "border-[#52B788] bg-[#16382C]"
                      : "border-[#234B3D] bg-[#0A1612]/70 hover:bg-[#11241E] hover:border-[#52B788]/60"
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#11241E] border border-[#234B3D] flex items-center justify-center mb-3 shadow-inner">
                    <UploadCloud size={32} className="text-[#52B788]" />
                  </div>
                  <p className="text-sm font-bold text-white">
                    Drag and drop leaf image here
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports JPG, PNG, WEBP from field or lab
                  </p>
                </div>

                {/* THE TWO BIG DIRECT ACTION BUTTONS */}
                <div className="w-full grid sm:grid-cols-2 gap-4">
                  {/* Button 1: Take picture (Camera) */}
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

                  {/* Button 2: Import (Gallery) */}
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
              </div>
            )}

            {/* SCANNING & DIAGNOSING STATE */}
            {loading && (
              <div className="py-14 flex flex-col items-center justify-center text-center space-y-5">
                <div className="relative w-36 h-36 rounded-3xl overflow-hidden shadow-2xl border-2 border-[#52B788]">
                  <img src={preview} alt="Scanning" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#52B788]/25 animate-pulse" />
                  <div className="absolute inset-x-0 h-1 bg-[#52B788] shadow-lg shadow-[#52B788] animate-[bounce_1.5s_infinite]" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white">Extracting Foliar Features & LinUCB Inference</h3>
                  <p className="text-xs text-gray-400 max-w-sm">
                    Computing 44-D context vector (GLI, necrosis, chlorosis) and evaluating LinUCB Upper Confidence Bounds across treatment arms.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-[#11241E] border border-[#234B3D] text-[#52B788] px-4 py-1.5 rounded-full text-xs font-semibold">
                  <RefreshCw size={14} className="animate-spin text-[#52B788]" />
                  <span>Evaluating Treatment Arm Exploration vs. Exploitation</span>
                </div>
              </div>
            )}

            {/* ERROR STATE */}
            {!loading && result?.error && (
              <div className="py-10 text-center space-y-4">
                <AlertTriangle size={42} className="mx-auto text-amber-500" />
                <h3 className="text-lg font-bold text-white">Diagnosis Interrupted</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">{result.message}</p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetScanner}
                    className="text-xs bg-[#11241E] hover:bg-[#1B4332] text-white px-5 py-2.5 rounded-xl border border-[#234B3D] cursor-pointer"
                  >
                    Scan Another Leaf
                  </button>
                  <button
                    type="button"
                    onClick={() => diagnoseImage(file, preview)}
                    className="text-xs bg-[#52B788] hover:bg-[#40916C] text-[#0A1612] hover:text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* RESULT HUD DISPLAY */}
            {!loading && result && !result.error && (
              <div className="space-y-6 text-left animate-in fade-in duration-300">
                {/* Result Header */}
                <div className="bg-[#11241E] border border-[#234B3D] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {preview && (
                      <img
                        src={preview}
                        alt="Leaf"
                        className="w-16 h-16 rounded-xl object-cover border-2 border-[#52B788]/60 shadow-md shrink-0"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0A1612] bg-[#52B788] px-2 py-0.5 rounded-full">
                          {result.crop || result.crop_type || "Crop Identified"}
                        </span>
                        <span className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
                          {Math.round((result.confidence || 0.9) * 100)}% Confidence
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
                      <h3 className="text-2xl font-black text-white tracking-tight">
                        {result.disease || "Diagnosed Condition"}
                      </h3>
                      <p className="text-xs text-[#74C776] font-semibold">
                        Class: {result.class || (result.is_healthy ? "Healthy Plant" : "Fungi")}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetScanner}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#2D6A4F]"
                  >
                    <X size={15} />
                    <span>New Scan</span>
                  </button>
                </div>

                {/* LinUCB Contextual Bandit Decision HUD */}
                {result.linucb && (
                  <div className="bg-gradient-to-r from-[#11241E] to-[#16382C] border border-[#234B3D] rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#52B788] uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu size={15} />
                        LinUCB Contextual Bandit Policy Decision
                      </span>
                      <span className="text-[11px] font-mono font-bold bg-[#0A1612] text-[#52B788] px-2.5 py-0.5 rounded-full border border-[#234B3D] flex items-center gap-1.5">
                        <span>Arm UCB: {result.linucb.ucb_score}</span>
                        {outcomeFeedback && outcomeFeedback.scoreDiff && (
                          <span className={Number(outcomeFeedback.scoreDiff) < 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                            ({Number(outcomeFeedback.scoreDiff) > 0 ? `+${outcomeFeedback.scoreDiff}` : outcomeFeedback.scoreDiff})
                          </span>
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      Evaluated 44-D context vector x. The LinUCB algorithm computed Upper Confidence Bound UCB = mean(a) + alpha * sigma(a) to optimize field cure efficacy against exploration uncertainty (sigma = {result.linucb.uncertainty_sigma}).
                    </p>

                    {result.linucb.ranked_arms && result.linucb.ranked_arms.length > 0 && (
                      <div className="pt-1.5 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                          Bandit Action Arm Rankings (Exploration vs. Exploitation):
                        </span>
                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                          {result.linucb.ranked_arms.map((arm, i) => (
                            <div
                              key={arm.action}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                i === 0
                                  ? "bg-[#52B788]/15 border-[#52B788] text-white"
                                  : "bg-[#0A1612]/70 border-[#1F4A39] text-gray-400"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold flex items-center gap-1">
                                  {i === 0 && <span className="text-[#52B788]">★</span>}
                                  {arm.label || arm.action}
                                </span>
                                <span className="text-[10px] text-gray-400 block font-mono">
                                  Pred. Reward: {arm.predicted_reward} | Bonus: +{arm.exploration_bonus}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-xs bg-black/40 px-2 py-1 rounded-md">
                                {arm.ucb_score}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pathological Overview */}
                {result.description && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Pathological Overview
                    </span>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed bg-[#0A1612] p-4 rounded-xl border border-[#1F4A39]/60">
                      {result.description}
                    </p>
                  </div>
                )}

                {/* Visual Detection Markers */}
                {result.detection && (
                  <div className="bg-[#11241E]/70 border border-[#234B3D] rounded-xl p-4 space-y-1">
                    <span className="text-xs font-bold text-[#52B788] uppercase tracking-wider block flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      Visual Detection Markers
                    </span>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                      {result.detection}
                    </p>
                  </div>
                )}

                {/* Cure Protocols */}
                {result.cure && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Pill size={18} className="text-[#52B788]" />
                      <h4 className="font-black text-base text-white">
                        Cure & Treatment Protocols
                      </h4>
                    </div>

                    {result.cure.immediate_action && (
                      <div className="bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-xl border-y border-r border-amber-900/40">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
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
                            🧪 Chemical Active Controls
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

                {/* Long-Term Precautions */}
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

                {/* Closed-Loop RL Outcome Feedback */}
                <div className="border-t border-[#1F4A39] pt-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Zap size={14} className="text-[#52B788]" />
                      Report Field Outcome (Executes Online LinUCB Update):
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">
                      T+7 Days Reward Signal
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: "recovered", label: "Recovered (+10.0)", style: "hover:bg-[#52B788] hover:text-[#0A1612]" },
                      { key: "improved", label: "Improved (+4.0)", style: "hover:bg-[#2D6A4F] hover:text-white" },
                      { key: "no_change", label: "No Change (-2.0)", style: "hover:bg-gray-700 hover:text-white" },
                      { key: "worsened", label: "Worsened (-15.0)", style: "hover:bg-red-800 hover:text-white" }
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
                    <div className="bg-[#11241E] border border-[#234B3D] p-4 rounded-xl space-y-2 text-xs font-medium">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-white">
                          <Award size={16} className={outcomeFeedback.reward < 0 ? "text-amber-400 shrink-0" : "text-[#52B788] shrink-0"} />
                          <span>
                            RL Feedback Logged! Reward:{" "}
                            <span className={outcomeFeedback.reward < 0 ? "text-red-400 font-bold" : "text-[#52B788] font-bold"}>
                              {outcomeFeedback.reward > 0 ? `+${outcomeFeedback.reward}` : outcomeFeedback.reward}
                            </span>{" "}
                            | Total Updates: {outcomeFeedback.updates}
                          </span>
                        </div>
                        {outcomeFeedback.scoreDiff && (
                          <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
                            Number(outcomeFeedback.scoreDiff) < 0 
                              ? "bg-red-950/80 text-red-300 border-red-700/60" 
                              : "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                          }`}>
                            UCB: {outcomeFeedback.prevUcb} &rarr; {outcomeFeedback.newUcb} ({Number(outcomeFeedback.scoreDiff) > 0 ? `+${outcomeFeedback.scoreDiff}` : outcomeFeedback.scoreDiff})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-300 font-mono leading-relaxed">
                        Sherman-Morrison Rank-1 Update executed: A_a &larr; A_a + x*x^T and b_a &larr; b_a + ({outcomeFeedback.reward})*x.
                        {Number(outcomeFeedback.scoreDiff) < 0 
                          ? ` Your negative feedback of ${outcomeFeedback.reward} immediately depressed this treatment arm's UCB score from ${outcomeFeedback.prevUcb} down to ${outcomeFeedback.newUcb} (${outcomeFeedback.scoreDiff}), suppressing it in future rankings.` 
                          : ` Your positive feedback of +${outcomeFeedback.reward} reinforced this treatment arm's weights, increasing its UCB score by +${outcomeFeedback.scoreDiff}.`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={resetScanner}
                    className="w-full sm:w-auto bg-[#52B788] hover:bg-[#40916C] text-[#0A1612] hover:text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera size={18} />
                    <span>Scan Another Leaf</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: INTERACTIVE GLASSMORPHIC DISEASE LIBRARY & CURES (#library) */}
        {/* ========================================================================= */}
        <section id="library" className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-24 scroll-mt-24 relative">
          {/* Ambient Glass Glow Layer */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#52B788]/10 via-[#40916C]/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

          {/* Section Header */}
          <div className="text-center mb-8 space-y-2 relative z-10">
            <span className="text-xs font-bold text-[#52B788] uppercase tracking-wider flex items-center justify-center gap-1.5">
              <BookOpen size={14} />
              Interactive Pathology Knowledge Base
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Disease Library & Cure Protocols
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto leading-relaxed">
              Explore foliar pathologies with interactive treatment tabs, symptom analysis, biological cures, chemical actives, and cultural prevention guidelines.
            </p>
          </div>

          {/* Glassmorphic Search & Filter Bar */}
          <div className="glass-panel rounded-3xl p-4 sm:p-5 mb-8 relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Live Search Input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search diseases, crops, pathogens, biological cures, or fungicides..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full glass-input text-xs sm:text-sm pl-11 pr-10 py-3 rounded-2xl text-white placeholder-gray-400"
                />
                {librarySearch && (
                  <button
                    type="button"
                    onClick={() => setLibrarySearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Counter Badge */}
              <div className="text-right text-xs text-gray-400 shrink-0 hidden sm:block">
                Showing <b className="text-[#52B788]">{filteredDiseases.length}</b> of {DISEASE_LIBRARY.length} pathologies
              </div>
            </div>

            {/* Filter Category Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { key: "all", label: "All Pathologies", count: DISEASE_LIBRARY.length },
                { key: "Fungi", label: "Fungal Blights", count: DISEASE_LIBRARY.filter((d) => d.class === "Fungi").length },
                { key: "Bacteria", label: "Bacterial Spots", count: DISEASE_LIBRARY.filter((d) => d.class === "Bacteria").length },
                { key: "Virus", label: "Viral Vectors", count: DISEASE_LIBRARY.filter((d) => d.class === "Virus").length },
                { key: "Deficiency", label: "Nutrient Deficiencies", count: DISEASE_LIBRARY.filter((d) => d.class === "Deficiency").length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLibraryFilter(key)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full cursor-pointer flex items-center gap-1.5 transition-all ${
                    libraryFilter === key
                      ? "glass-pill-active scale-102"
                      : "glass-pill text-gray-300 hover:text-white"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${libraryFilter === key ? "bg-[#52B788] text-[#0A1612]" : "bg-white/10 text-gray-400"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Disease Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {filteredDiseases.map((item) => {
              const currentTab = cardActiveTabs[item.name] || "symptoms";

              return (
                <div
                  key={item.name}
                  className="glass-card rounded-3xl overflow-hidden flex flex-col justify-between group relative"
                >
                  {/* Card Header & Photo */}
                  <div>
                    <div className="h-44 w-full overflow-hidden relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1612] via-black/20 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                        <span className="bg-black/60 backdrop-blur-md text-[#52B788] text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-white/15">
                          {item.class}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border backdrop-blur-md ${
                            item.severity === "Critical"
                              ? "bg-red-950/80 text-red-300 border-red-500/40"
                              : item.severity === "High"
                              ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                              : "bg-emerald-950/80 text-[#52B788] border-emerald-500/40"
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>

                      {/* Title overlay on photo bottom */}
                      <div className="absolute bottom-2.5 inset-x-3.5 leading-tight">
                        <h3 className="text-lg font-black text-white drop-shadow-md">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-[#74C776] italic drop-shadow-sm truncate">
                          {item.crop}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Tab Switcher within Card */}
                    <div className="p-3.5 pb-2">
                      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/40 border border-white/10 mb-3 text-[10px] font-bold">
                        {[
                          { id: "symptoms", label: "Symptom" },
                          { id: "organic", label: "Organic" },
                          { id: "chemical", label: "Chemical" },
                          { id: "prevention", label: "Prevent" }
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setCardTab(item.name, tab.id)}
                            className={`py-1 rounded-lg text-center transition-all cursor-pointer ${
                              currentTab === tab.id
                                ? "bg-[#52B788] text-[#0A1612] font-black shadow-sm"
                                : "text-gray-400 hover:text-white"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Dynamic Content Panel based on active card tab */}
                      <div className="min-h-[105px] text-xs text-gray-300 leading-relaxed">
                        {currentTab === "symptoms" && (
                          <div className="space-y-1 animate-in fade-in duration-200">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                              Pathological Markers:
                            </span>
                            <p className="line-clamp-4">{item.symptoms}</p>
                          </div>
                        )}

                        {currentTab === "organic" && (
                          <div className="space-y-1 animate-in fade-in duration-200">
                            <span className="text-[10px] uppercase font-bold text-[#52B788] block tracking-wider flex items-center gap-1">
                              <span>🌿</span> Biological Remedy:
                            </span>
                            <p className="line-clamp-4 text-emerald-100">{item.organic_cure}</p>
                          </div>
                        )}

                        {currentTab === "chemical" && (
                          <div className="space-y-1 animate-in fade-in duration-200">
                            <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider flex items-center gap-1">
                              <span>🧪</span> Chemical Control:
                            </span>
                            <p className="line-clamp-4 text-blue-100">{item.chemical_cure}</p>
                          </div>
                        )}

                        {currentTab === "prevention" && (
                          <div className="space-y-1 animate-in fade-in duration-200">
                            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider flex items-center gap-1">
                              <span>🛡️</span> Cultural Prevention:
                            </span>
                            <p className="line-clamp-4 text-amber-100">{item.prevention}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="p-3.5 pt-0 border-t border-white/10 mt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                      <span>Urgency: <b className="text-white">{item.urgency}</b></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedDiseaseModal(item)}
                      className="w-full text-xs font-bold py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-[#52B788] hover:text-[#0A1612] text-white border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer group/btn"
                    >
                      <span>Inspect Full Protocol</span>
                      <ChevronRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state for search */}
          {filteredDiseases.length === 0 && (
            <div className="glass-panel rounded-3xl p-10 text-center space-y-3 relative z-10">
              <AlertTriangle size={36} className="mx-auto text-amber-400" />
              <h3 className="text-lg font-bold text-white">No matching pathologies found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No disease entries matched your search query "{librarySearch}". Try adjusting your keywords or selecting "All Pathologies".
              </p>
              <button
                type="button"
                onClick={() => {
                  setLibrarySearch("");
                  setLibraryFilter("all");
                }}
                className="text-xs bg-[#52B788] text-[#0A1612] font-bold px-4 py-2 rounded-full cursor-pointer hover:bg-[#40916C] hover:text-white"
              >
                Clear Search & Filters
              </button>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE GLASSMORPHIC DISEASE DETAIL MODAL */}
        {/* ========================================================================= */}
        {selectedDiseaseModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={() => setSelectedDiseaseModal(null)}
          >
            <div
              className="glass-panel max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl border border-white/20 relative flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Hero Banner */}
              <div className="relative h-48 sm:h-56 w-full shrink-0 overflow-hidden">
                <img
                  src={selectedDiseaseModal.image}
                  alt={selectedDiseaseModal.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E221B] via-black/40 to-transparent" />

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDiseaseModal(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95"
                >
                  <X size={18} />
                </button>

                {/* Title & Badges in Hero */}
                <div className="absolute bottom-4 inset-x-6">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase bg-[#52B788] text-[#0A1612] px-2.5 py-0.5 rounded-full">
                      {selectedDiseaseModal.class}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-black/60 text-white px-2.5 py-0.5 rounded-full border border-white/20">
                      Severity: {selectedDiseaseModal.severity}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    {selectedDiseaseModal.name}
                  </h3>
                  <p className="text-xs text-[#74C776] italic font-medium">
                    {selectedDiseaseModal.crop} • {selectedDiseaseModal.pathogen}
                  </p>
                </div>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-6 overflow-y-auto space-y-4 text-left">
                {/* Urgent Action Banner */}
                {selectedDiseaseModal.immediate_step && (
                  <div className="bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-2xl border-y border-r border-amber-900/40">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                      ⚡ Urgent First Step (Do This Today)
                    </span>
                    <p className="text-xs sm:text-sm text-amber-100 font-medium mt-1 leading-relaxed">
                      {selectedDiseaseModal.immediate_step}
                    </p>
                  </div>
                )}

                {/* Foliar Symptoms */}
                <div className="glass-card rounded-2xl p-4 space-y-1.5">
                  <span className="text-xs font-bold text-[#52B788] uppercase tracking-wider block flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Foliar Symptoms & Identification
                  </span>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {selectedDiseaseModal.symptoms}
                  </p>
                </div>

                {/* Organic vs Chemical Comparison */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="glass-card rounded-2xl p-4 space-y-1.5 border-emerald-500/30">
                    <span className="text-xs font-bold text-[#52B788] uppercase tracking-wider block">
                      🌿 Biological / Organic Remedy
                    </span>
                    <p className="text-xs text-emerald-100 leading-relaxed">
                      {selectedDiseaseModal.organic_cure}
                    </p>
                  </div>

                  <div className="glass-card rounded-2xl p-4 space-y-1.5 border-blue-500/30">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                      🧪 Chemical Active Control
                    </span>
                    <p className="text-xs text-blue-100 leading-relaxed">
                      {selectedDiseaseModal.chemical_cure}
                    </p>
                  </div>
                </div>

                {/* Cultural Practices */}
                <div className="glass-card rounded-2xl p-4 space-y-1.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <Shield size={14} />
                    Long-Term Cultural Practices & Prevention
                  </span>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {selectedDiseaseModal.prevention}
                  </p>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 px-6 border-t border-white/10 flex items-center justify-between bg-black/40">
                <span className="text-xs text-gray-400">
                  AgroLens Scientific Pathology Database
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDiseaseModal(null);
                      scrollToSection("scanner");
                    }}
                    className="bg-[#52B788] hover:bg-[#40916C] text-[#0A1612] hover:text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera size={14} />
                    <span>Scan Leaf Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: HOW AGROLENS WORKS (#how-it-works) */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-24 scroll-mt-24">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-bold text-[#52B788] uppercase tracking-wider">
              Architecture & Science
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              How AgroLens Works
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#11241E] border border-[#234B3D] text-[#52B788] flex items-center justify-center font-black text-lg">
                01
              </div>
              <h3 className="font-bold text-lg text-white">44-D Context Embedding</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Extracts cellular pigmentation, Green Leaf Index (GLI), necrotic spot spatial ratios, texture gradients, and crop metadata into normalized 44-dimensional state vector x.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#11241E] border border-[#234B3D] text-[#52B788] flex items-center justify-center font-black text-lg">
                02
              </div>
              <h3 className="font-bold text-lg text-white">Gemini 3.8 Flash Vision</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Google Gemini multimodal intelligence identifies botanical species, classifies pathogen class, and generates treatment options (biological, chemical, cultural).
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#11241E] border border-[#234B3D] text-[#52B788] flex items-center justify-center font-black text-lg">
                03
              </div>
              <h3 className="font-bold text-lg text-white">LinUCB Reinforcement Learning</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Disjoint Linear Upper Confidence Bound bandit selects interventions balancing exploration vs. exploitation. T+7 field outcomes update covariance matrices $A_a$ and bias $b_a$.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: REINFORCEMENT LEARNING ENGINE & SIMULATION STUDIO (#rl-engine) */}
        {/* ========================================================================= */}
        <section id="rl-engine" className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-24 scroll-mt-24">
          <div className="bg-gradient-to-tr from-[#0E221B] via-[#112A21] to-[#0A1612] border border-[#1F4A39] rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl">
            {/* Header & Simulation Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#1F4A39]">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#52B788] uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} />
                  Live LinUCB Contextual Bandit Engine
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Adaptive Agronomic Reinforcement Learning
                </h3>
                <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
                  Unlike frozen classifiers, AgroLens continuously updates its treatment policy through online feedback. Click below to simulate 10 field seasons and watch the bandit explore, exploit, and converge!
                </p>
              </div>

              {/* Interactive Training Button */}
              <button
                type="button"
                disabled={simulatingRL}
                onClick={() => handleSimulateRL(10)}
                className="self-start sm:self-center shrink-0 bg-[#52B788] hover:bg-[#40916C] active:scale-95 text-[#0A1612] hover:text-white font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-[#52B788]/20 transition-all cursor-pointer"
              >
                {simulatingRL ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Simulating Field Seasons...</span>
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    <span>Train / Simulate 10 Seasons</span>
                  </>
                )}
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0A1612]/70 border border-[#234B3D] p-4 rounded-2xl text-center">
                <p className="text-3xl font-black text-[#52B788]">{stats?.total_updates ?? 0}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Total Policy Updates</p>
              </div>

              <div className="bg-[#0A1612]/70 border border-[#234B3D] p-4 rounded-2xl text-center">
                <p className="text-3xl font-black text-white">{stats?.num_actions ?? 9}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Active Action Arms</p>
              </div>

              <div className="bg-[#0A1612]/70 border border-[#234B3D] p-4 rounded-2xl text-center">
                <p className="text-3xl font-black text-[#52B788]">
                  {stats?.recent_avg_reward ? (stats.recent_avg_reward > 0 ? `+${stats.recent_avg_reward}` : stats.recent_avg_reward) : "+3.4"}
                </p>
                <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Recent Avg Reward</p>
              </div>

              <div className="bg-[#0A1612]/70 border border-[#234B3D] p-4 rounded-2xl text-center">
                <p className="text-3xl font-black text-white">44-D</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Context Dimension</p>
              </div>
            </div>

            {/* Simulation Episodes Output */}
            {simResult && simResult.episodes && (
              <div className="bg-[#0A1612] border border-[#234B3D] rounded-2xl p-5 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#52B788] uppercase tracking-wider flex items-center gap-1.5">
                    <Check size={14} />
                    Simulation Complete: 10 Episodes Executed
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Mean Reward: <b>+{simResult.average_simulation_reward}</b>
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {simResult.episodes.map((ep, idx) => (
                    <div
                      key={idx}
                      className="bg-[#11241E]/60 border border-white/5 rounded-xl px-3 py-2 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-200">{ep.scenario}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">
                          Selected: {ep.chosen_arm.split("__")[1] || ep.chosen_arm}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold ${ep.reward > 0 ? "text-[#52B788]" : "text-amber-400"}`}>
                          {ep.reward > 0 ? `+${ep.reward}` : ep.reward}
                        </span>
                        <span className="text-[10px] text-gray-500 block capitalize">{ep.outcome}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LinUCB Action Arms Table */}
            {stats?.arm_weights && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Action Arms & Learned Weight Norms (||&theta;_a||):
                </span>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(stats.arm_weights).slice(0, 6).map(([armKey, armData]) => (
                    <div
                      key={armKey}
                      className="bg-[#0A1612]/60 border border-[#1F4A39] rounded-xl p-3 space-y-1"
                    >
                      <span className="font-bold text-xs text-white block truncate">
                        {armData.label || armKey}
                      </span>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                        <span>Weight Norm: {armData.theta_norm}</span>
                        <span className="text-[#52B788]">Chosen: {armData.times_chosen}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mathematical Formulation Footer */}
            <div className="bg-[#060F0C] border border-[#1F4A39]/60 rounded-2xl p-4 text-[11px] text-gray-400 leading-relaxed font-mono">
              <span className="text-[#52B788] font-bold block mb-1">
                LinUCB Online Decision & Update Rules:
              </span>
              <span>
                Action Selection: a* = argmax [ &mu;_a + &alpha; &middot; &sigma;_a(x) ] &bull; Rank-1 Matrix Update: A_a &larr; A_a + x&middot;x^T and b_a &larr; b_a + r&middot;x
              </span>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="w-full bg-[#060F0C] border-t border-[#1F4A39]/60 py-10 px-4 sm:px-8 text-center text-xs text-gray-500 space-y-4">
          <div className="flex justify-center">
            <AgroLensLogo size="lg" fullBadge={true} />
          </div>
          <p className="max-w-md mx-auto leading-relaxed">
            AgroLens Precision Agricultural Intelligence • See. Detect. Protect. • Built with Google Gemini 3.8 Flash Vision and Disjoint LinUCB Reinforcement Learning.
          </p>
          <p className="text-[11px] text-gray-600">
            © 2026 AgroLens • Recommendations support, not replace, physical agronomist judgment on critical blight cases.
          </p>
        </footer>
      </div>
    </div>
  );
}
