import React, { useRef, useState, useEffect } from "react";
import { X, RefreshCw, Camera, AlertCircle } from "lucide-react";

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (facing) => {
    stopCamera();
    setError(null);
    setIsReady(false);

    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check permissions or upload from gallery.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
  };

  const handleCapture = () => {
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
        const capturedFile = new File([blob], `leaf_photo_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(blob);
        onCapture(capturedFile, previewUrl);
        onClose();
      },
      "image/jpeg",
      0.92
    );
  };

  const toggleFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col">
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-agrio-light" />
            <span className="text-sm font-semibold tracking-tight">Leaf Viewfinder</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/40 text-gray-300 hover:text-white hover:bg-black/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Canvas Container */}
        <div className="relative w-full aspect-[3/4] bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-white space-y-3">
              <AlertCircle size={36} className="mx-auto text-amber" />
              <p className="text-xs text-gray-300 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="text-xs bg-agrio text-white px-4 py-2 rounded-full font-medium"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Leaf Reticle Alignment Box */}
              <div className="absolute inset-10 border-2 border-agrio/60 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-agrio" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-agrio" />
                </div>
                <div className="text-center">
                  <span className="text-[10px] bg-black/60 text-white font-mono px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Place affected leaf inside frame
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-agrio" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-agrio" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="p-6 bg-gradient-to-t from-black to-black/80 flex items-center justify-around">
          <button
            type="button"
            onClick={toggleFacing}
            title="Flip Camera"
            className="p-3 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={20} />
          </button>

          {/* Shutter Button */}
          <button
            type="button"
            disabled={!isReady}
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-white bg-agrio hover:bg-agrio-light active:scale-95 transition-all flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-6 h-6 rounded-full bg-white shadow-inner" />
          </button>

          <div className="w-11" /> {/* Spacer for balance */}
        </div>
      </div>
    </div>
  );
}
