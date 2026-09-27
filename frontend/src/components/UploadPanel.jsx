import { useState, useRef, useEffect } from "react";
import { UploadCloud, Camera, RefreshCw, X, Check, Image as ImageIcon } from "lucide-react";

export default function UploadPanel({ onSubmit, loading, apiKey, onApiKeyChange }) {
  const [mode, setMode] = useState("upload"); // "upload" | "camera"
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [cropType, setCropType] = useState("tomato");
  const [growthStage, setGrowthStage] = useState("vegetative");
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment"); // "environment" | "user"
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera stream on unmount or mode switch
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (facing = cameraFacing) => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError("Camera unavailable or permission denied. Please use file upload.");
      setIsCameraActive(false);
    }
  };

  const switchCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `leaf_snap_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setFile(capturedFile);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  function handleFile(f) {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    stopCamera();
  }

  function clear(e) {
    if (e) e.stopPropagation();
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    stopCamera();
  }

  return (
    <section className="bg-white border border-leaf-soft rounded-2xl p-6 shadow-soft">
      {/* Header with Mode Tabs */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg text-canopy-dark">Leaf Intake</h2>
        
        <div className="flex bg-leaf-soft/50 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("upload");
              stopCamera();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              mode === "upload"
                ? "bg-canopy-dark text-parchment shadow-sm"
                : "text-canopy-dark/70 hover:text-canopy-dark"
            }`}
          >
            <ImageIcon size={13} />
            <span>Upload Image</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("camera");
              if (!preview) startCamera();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              mode === "camera"
                ? "bg-canopy-dark text-parchment shadow-sm"
                : "text-canopy-dark/70 hover:text-canopy-dark"
            }`}
          >
            <Camera size={13} />
            <span>Take Photo</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative border-2 border-dashed border-leaf/40 rounded-xl h-60 flex flex-col items-center justify-center overflow-hidden bg-leaf-soft/10">
        {preview ? (
          /* Preview state */
          <>
            <img src={preview} alt="leaf preview" className="h-full w-full object-cover" />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={clear}
                className="bg-canopy-dark/80 text-parchment text-xs px-2.5 py-1 rounded-full hover:bg-canopy-dark transition-colors flex items-center gap-1 backdrop-blur-sm"
              >
                <X size={13} />
                <span>Retake</span>
              </button>
            </div>
            <div className="absolute bottom-2 left-2 bg-canopy-dark/80 text-leaf-soft text-[11px] px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              Photo ready for analysis
            </div>
          </>
        ) : mode === "camera" ? (
          /* Live Camera View */
          <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
            {cameraError ? (
              <div className="p-4 text-center">
                <p className="text-amber text-xs mb-2">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="text-xs bg-leaf text-canopy-dark px-3 py-1.5 rounded-full font-medium"
                >
                  Retry Camera
                </button>
              </div>
            ) : isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Viewfinder Reticle Overlay */}
                <div className="absolute inset-8 border border-leaf/60 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                  <span className="text-[10px] text-leaf font-mono bg-black/40 self-start px-1.5 py-0.5 rounded">
                    [Align Leaf in Frame]
                  </span>
                </div>

                {/* Camera Controls */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={switchCameraFacing}
                    title="Flip camera"
                    className="p-2 rounded-full bg-black/60 text-parchment hover:bg-black transition-colors"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-12 h-12 rounded-full border-4 border-white bg-leaf hover:bg-leaf-dim flex items-center justify-center text-canopy-dark shadow-lg transition-transform active:scale-95"
                    title="Snap photo"
                  >
                    <div className="w-4 h-4 rounded-full bg-canopy-dark" />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <Camera size={30} className="mx-auto mb-2 text-leaf" />
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="text-xs bg-leaf text-canopy-dark px-4 py-2 rounded-full font-semibold hover:bg-leaf-dim transition-colors"
                >
                  Activate Live Camera
                </button>
              </div>
            )}
          </div>
        ) : (
          /* File Upload Drop Area */
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            className={`w-full h-full flex flex-col items-center justify-center p-6 cursor-pointer transition-colors ${
              dragOver ? "bg-leaf-soft/50 border-leaf" : "hover:bg-leaf-soft/20"
            }`}
          >
            <UploadCloud className="mx-auto mb-2 text-leaf" size={32} />
            <p className="text-sm font-medium text-canopy-dark">Drop leaf photo here</p>
            <p className="text-xs text-canopy-dark/60 mt-0.5">or click to browse from device</p>
            <span className="text-[10px] text-leaf-dim mt-2 bg-leaf-soft/60 px-2 py-0.5 rounded-full">
              Supports JPG, PNG, WEBP
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {/* Metadata Fields */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Field
          label="Suspected Crop"
          value={cropType}
          onChange={setCropType}
          options={["tomato", "potato", "wheat", "rice", "corn", "grape", "other"]}
        />
        <Field
          label="Growth stage"
          value={growthStage}
          onChange={setGrowthStage}
          options={["seedling", "vegetative", "flowering", "mature"]}
        />
      </div>

      {/* Submit Button */}
      <button
        disabled={!file || loading}
        onClick={() => onSubmit(file, preview, cropType, growthStage)}
        className="mt-5 w-full bg-canopy-dark text-parchment rounded-full py-2.5 font-medium hover:bg-canopy transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
      >
        {loading ? (
          <>
            <RefreshCw size={16} className="animate-spin text-leaf" />
            <span>Analyzing foliar disease & cure...</span>
          </>
        ) : (
          <span>Diagnose Leaf & Prescribe Cure</span>
        )}
      </button>
    </section>
  );
}

function Field({ label, value, onChange, options }) {
  return (
    <label className="text-sm block">
      <span className="text-canopy-dark/60 text-xs font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-leaf-soft rounded-lg px-2.5 py-1.5 bg-white text-canopy-dark text-sm focus:outline-none focus:border-leaf"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o[0].toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}
