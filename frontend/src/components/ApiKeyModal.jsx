import React, { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Check, X, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { getEffectiveApiKey, testGeminiApiKey } from "../services/clientBandit.js";

export default function ApiKeyModal({ isOpen, onClose, onKeySaved }) {
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getEffectiveApiKey();
      setKeyInput(active);
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      localStorage.setItem("cropsense_google_api_key", trimmed);
    } else {
      localStorage.removeItem("cropsense_google_api_key");
    }
    setSavedSuccess(true);
    if (onKeySaved) onKeySaved(trimmed || getEffectiveApiKey());
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(keyInput.trim());
      setTestResult(res);
    } catch (e) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleResetDefault = () => {
    localStorage.removeItem("cropsense_google_api_key");
    const def = getEffectiveApiKey();
    setKeyInput(def);
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0E221B] border border-[#234B3D] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F4A39] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#52B788]/20 border border-[#52B788]/40 flex items-center justify-center text-[#52B788]">
              <Key size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Google Gemini API Key</h3>
              <p className="text-xs text-gray-400">Powers real-time multimodal leaf vision diagnosis</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white bg-[#11241E] hover:bg-[#1B4332] border border-[#234B3D] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status banner */}
        <div className="bg-[#11241E] border border-[#234B3D] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#52B788] animate-pulse"></span>
            <span className="text-xs font-bold text-white">Active Key Status</span>
          </div>
          <span className="text-xs text-[#52B788] font-mono font-semibold bg-[#0A1612] px-2.5 py-1 rounded-full border border-[#234B3D]">
            {keyInput ? "Key Loaded" : "No Key Active"}
          </span>
        </div>

        {/* Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
            <span>API Key</span>
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-[11px] text-[#52B788] hover:underline"
            >
              Reset to Default Demo Key
            </button>
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste AI Studio API Key (AQ. or AIza...)"
              className="w-full bg-[#0A1612] border border-[#234B3D] focus:border-[#52B788] rounded-xl px-4 py-3 text-xs text-white font-mono placeholder:text-gray-600 focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Keys are stored locally in your browser session. Get a free key at{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#52B788] hover:underline inline-flex items-center gap-0.5"
            >
              aistudio.google.com <Sparkles size={11} className="inline" />
            </a>
          </p>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 font-medium ${
              testResult.ok
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                : "bg-red-950/60 border-red-800 text-red-300"
            }`}
          >
            {testResult.ok ? (
              <Check size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-400 shrink-0" />
            )}
            <span className="leading-snug">{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={testing || !keyInput}
            onClick={handleTest}
            className="text-xs bg-[#11241E] hover:bg-[#1B4332] text-gray-300 hover:text-white font-bold px-4 py-3 rounded-xl border border-[#234B3D] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {testing ? (
              <>
                <RefreshCw size={14} className="animate-spin text-[#52B788]" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-[#52B788]" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-white px-3 py-2 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-lg flex items-center gap-1.5 ${
                savedSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-[#52B788] hover:bg-[#40916C] text-[#0A1612] hover:text-white"
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check size={15} />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Key</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
