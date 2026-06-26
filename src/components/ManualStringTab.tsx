// ============================================================================
// @AI_SYSTEM_DIRECTIVE
// @ROLE: Senior Software Architect & UI Designer
// @DESCRIPTION: Manual Draw Result String Tab optimized for mobile (iOS)
// ============================================================================

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { hapticFeedback } from "../utils/haptics";
import {
  List,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clipboard,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  Sliders,
  Sparkles,
} from "lucide-react";

interface ManualStringTabProps {
  stringA: string;
  setStringA: (s: string) => void;
  stringB: string;
  setStringB: (s: string) => void;
  activeStringMode: "A" | "B";
  setActiveStringMode: (mode: "A" | "B") => void;
  useManualStringMode: boolean;
  setUseManualStringMode: (b: boolean) => void;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const ManualStringTab: React.FC<ManualStringTabProps> = ({
  stringA,
  setStringA,
  stringB,
  setStringB,
  activeStringMode,
  setActiveStringMode,
  useManualStringMode,
  setUseManualStringMode,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<"A" | "B">("A");
  const [pastedValue, setPastedValue] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const currentString = (activeTab === "A" ? stringA : stringB) || "";
  const setCurrentString = activeTab === "A" ? setStringA : setStringB;

  // TẠI SAO (Why): Tối ưu hóa tính toán phân phối và chuỗi bệt trực tiếp trên client để mượt mà trên iOS
  const stats = useMemo(() => {
    const chars = currentString.split("").filter(c => c === "T" || c === "X");
    const total = chars.length;
    const tCount = chars.filter(c => c === "T").length;
    const xCount = chars.filter(c => c === "X").length;
    
    // Tìm chuỗi bệt dài nhất
    let maxTStreak = 0;
    let maxXStreak = 0;
    let currentTStreak = 0;
    let currentXStreak = 0;

    chars.forEach((c) => {
      if (c === "T") {
        currentTStreak++;
        currentXStreak = 0;
        if (currentTStreak > maxTStreak) maxTStreak = currentTStreak;
      } else {
        currentXStreak++;
        currentTStreak = 0;
        if (currentXStreak > maxXStreak) maxXStreak = currentXStreak;
      }
    });

    return {
      total,
      tPercent: total > 0 ? Number(((tCount / total) * 100).toFixed(1)) : 0,
      xPercent: total > 0 ? Number(((xCount / total) * 100).toFixed(1)) : 0,
      maxTStreak,
      maxXStreak,
    };
  }, [currentString]);

  const handleAppend = (char: "T" | "X") => {
    hapticFeedback(char === "T" ? 40 : 60); // Distinct pattern
    setCurrentString(currentString + char);
  };

  const handleBackspace = () => {
    if (currentString.length > 0) {
      hapticFeedback([30, 50, 30]); // Error/delete pattern
      setCurrentString(currentString.slice(0, -1));
    }
  };

  const handleClear = () => {
    hapticFeedback([50, 100, 150]);
    setCurrentString("");
    setShowClearConfirm(false);
    onToast(`Đã xóa sạch chuỗi ${activeTab}!`, "success");
  };

  const handlePasteSubmit = () => {
    hapticFeedback(50);
    const normalized = pastedValue
      .toUpperCase()
      .replace(/[^TX]/g, ""); // Chỉ giữ lại T và X

    if (!normalized) {
      onToast("Không tìm thấy ký tự T hoặc X hợp lệ trong chuỗi dán!", "error");
      return;
    }

    setCurrentString(currentString + normalized);
    setPastedValue("");
    onToast(`Đã nạp thêm ${normalized.length} kết quả vào chuỗi ${activeTab}!`, "success");
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col gap-5">
      {/* Tab Header with Two separate Draw Strings */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <h3 className="text-slate-100 font-extrabold text-sm flex items-center gap-2">
            <List className="w-4 h-4 text-emerald-400" /> Quản lý chuỗi kết quả (T/X)
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
            Nhập nhanh chuỗi kết quả thủ công không giới hạn
          </p>
        </div>

        {/* Global mode switcher */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
            Chế độ dự báo:
          </span>
          <button
            onClick={() => {
              const newVal = !useManualStringMode;
              setUseManualStringMode(newVal);
              onToast(
                newVal
                  ? `Đã chuyển sang dự báo theo chuỗi T/X ${activeStringMode}!`
                  : "Đã chuyển về dự báo theo lịch sử kỳ quay Vietlott!",
                "info"
              );
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase transition-all ${
              useManualStringMode
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-slate-950/60 text-slate-500 border-slate-800"
            }`}
          >
            {useManualStringMode ? (
              <>
                <ToggleRight className="w-5 h-5 text-emerald-400" />
                <span>Chuỗi thủ công ({activeStringMode})</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-slate-600" />
                <span>Lịch sử Vietlott</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Select between String A and String B */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
        <button
          onClick={() => {
            setActiveTab("A");
            setActiveStringMode("A");
          }}
          className={`py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
            activeTab === "A"
              ? "bg-indigo-600 text-slate-100 shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${activeTab === "A" ? "text-amber-400" : "text-slate-500"}`} />
          Chuỗi kết quả A
          {stringA.length > 0 && (
            <span className="bg-slate-950/80 text-[10px] px-1.5 py-0.5 rounded-full text-indigo-300 font-mono">
              {stringA.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("B");
            setActiveStringMode("B");
          }}
          className={`py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
            activeTab === "B"
              ? "bg-indigo-600 text-slate-100 shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${activeTab === "B" ? "text-amber-400" : "text-slate-500"}`} />
          Chuỗi kết quả B
          {stringB.length > 0 && (
            <span className="bg-slate-950/80 text-[10px] px-1.5 py-0.5 rounded-full text-indigo-300 font-mono">
              {stringB.length}
            </span>
          )}
        </button>
      </div>

      {/* active check indicator */}
      <div className={`px-3.5 py-2.5 rounded-xl text-[11px] font-bold border flex items-center gap-2 ${
        useManualStringMode
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
      }`}>
        <span>
          {useManualStringMode 
            ? `🤖 AI đang sử dụng [Chuỗi thủ công ${activeStringMode}] làm nguồn dữ liệu chính để dự đoán.` 
            : `📊 AI đang sử dụng [Lịch sử Vietlott] làm nguồn dữ liệu chính để dự đoán.`}
        </span>
      </div>

      {/* Visual Result Tape */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Băng chuyền kết quả ({stats.total} kết quả):
        </span>
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 min-h-[58px] max-h-[120px] overflow-y-auto flex flex-wrap gap-1.5 content-start">
          {currentString.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs py-2 font-medium">
              Chưa có kết quả. Hãy nhấn nút T hoặc X bên dưới để thêm.
            </div>
          ) : (
            currentString.split("").map((char, index) => (
              <span
                key={index}
                className={`w-7 h-7 rounded-lg text-xs font-black font-mono flex items-center justify-center shadow-md border ${
                  char === "T"
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : "bg-sky-500/20 text-sky-400 border-sky-500/30"
                }`}
                title={`Kỳ thứ ${index + 1}: ${char === "T" ? "TÀI" : "XỈU"}`}
              >
                {char}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Core Rapid Input Buttons (Optimized for Mobile/iOS touch) */}
      <div className="grid grid-cols-12 gap-3">
        {/* T button */}
        <button
          onClick={() => handleAppend("T")}
          className="col-span-4 bg-rose-600 hover:bg-rose-500 active:scale-95 text-slate-100 transition-all font-black text-sm py-4 rounded-xl border border-rose-500/30 shadow-md flex flex-col items-center justify-center gap-0.5 cursor-pointer"
        >
          <span className="text-lg">TÀI (T)</span>
          <span className="text-[9px] text-rose-200/60 font-semibold font-mono">+ 1 entry</span>
        </button>

        {/* X button */}
        <button
          onClick={() => handleAppend("X")}
          className="col-span-4 bg-sky-600 hover:bg-sky-500 active:scale-95 text-slate-100 transition-all font-black text-sm py-4 rounded-xl border border-sky-500/30 shadow-md flex flex-col items-center justify-center gap-0.5 cursor-pointer"
        >
          <span className="text-lg">XỈU (X)</span>
          <span className="text-[9px] text-sky-200/60 font-semibold font-mono">+ 1 entry</span>
        </button>

        {/* Correction keys */}
        <div className="col-span-4 flex flex-col gap-2">
          {showClearConfirm ? (
            <div className="flex-1 flex flex-col justify-center gap-1.5 bg-rose-950/20 p-1.5 rounded-xl border border-rose-500/20 animate-fadeIn min-h-[96px]">
              <span className="text-[9px] text-rose-300 font-extrabold uppercase tracking-wide text-center block">Xóa sạch?</span>
              <div className="flex gap-1 w-full">
                <button
                  onClick={handleClear}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-slate-100 text-[10px] font-black uppercase rounded-lg active:scale-95 transition-all cursor-pointer py-2"
                >
                  OK
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase rounded-lg active:scale-95 transition-all cursor-pointer py-2"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleBackspace}
                disabled={currentString.length === 0}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-slate-200 transition-all font-bold text-xs rounded-xl border border-slate-700/50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                title="Xóa ký tự cuối"
              >
                <span>Backspace</span>
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={currentString.length === 0}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-rose-400 transition-all font-bold text-xs rounded-xl border border-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                title="Xóa toàn bộ"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa sạch</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Advanced Quick Paste input for unlimited entries */}
      <div className="bg-slate-950/30 rounded-xl p-3 border border-slate-800/80 flex flex-col gap-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Nhập hoặc dán chuỗi lớn (Ví dụ: TTXXTXXT):
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Dán chuỗi T và X tại đây..."
            value={pastedValue}
            onChange={(e) => setPastedValue(e.target.value.toUpperCase().replace(/[^TX]/g, ""))}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-base md:text-xs font-bold font-mono focus:outline-none focus:border-indigo-500 placeholder:text-slate-700"
          />
          <button
            type="button"
            onClick={handlePasteSubmit}
            disabled={!pastedValue}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-100 transition-all font-bold text-xs rounded-xl border border-indigo-500/40 flex items-center gap-1 cursor-pointer"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Nạp</span>
          </button>
        </div>
      </div>

      {/* Quick stats for validation & trend analysis */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Tỷ lệ TÀI</span>
            <span className="text-xs font-black font-mono text-rose-400">{stats.tPercent}%</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Tỷ lệ XỈU</span>
            <span className="text-xs font-black font-mono text-sky-400">{stats.xPercent}%</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Bệt T max</span>
            <span className="text-xs font-black font-mono text-rose-500">{stats.maxTStreak} kỳ</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Bệt X max</span>
            <span className="text-xs font-black font-mono text-sky-500">{stats.maxXStreak} kỳ</span>
          </div>
        </div>
      )}
    </div>
  );
};
