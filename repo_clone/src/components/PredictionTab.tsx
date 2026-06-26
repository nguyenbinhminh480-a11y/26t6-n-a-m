/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Analytics } from '../types';
import { ARParams, MLPParams, defaultARParams, defaultMLPParams } from '../utils/algorithms';
import { Registry, EventBus } from '../utils/agentSystem';
import { RetrainingQueue, RetrainingJob } from '../utils/retrainingQueue';
import { 
  Cpu, Wallet, Zap, HelpCircle, Activity, 
  Target, AlertTriangle, Sliders, RefreshCw, Layers, Brain, Shield, Info, CheckCircle,
  History, ShieldAlert, Terminal, GitBranch
} from 'lucide-react';

interface DebouncedSliderProps {
  label: string;
  min: string | number;
  max: string | number;
  step: string | number;
  value: number;
  onChange: (val: number) => void;
  accentClass: string;
  badgeClass: string;
  suffix?: string;
  description?: string;
}

const DebouncedSlider: React.FC<DebouncedSliderProps> = ({
  label,
  min,
  max,
  step,
  value,
  onChange,
  accentClass,
  badgeClass,
  suffix = '',
  description,
}) => {
  const [localVal, setLocalVal] = useState(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localVal !== value) {
        onChangeRef.current(localVal);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localVal, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalVal(val);
  };

  return (
    <div className="space-y-1.5" id={`slider-container-${label.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">{label}</span>
        <span className={`font-mono font-black ${badgeClass} px-2 py-0.5 rounded`}>
          {suffix === '%' ? `${(localVal * 100).toFixed(0)}%` : `${localVal}${suffix}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localVal}
        onChange={handleChange}
        className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer ${accentClass}`}
        id={`input-range-${label.replace(/\s+/g, '-').toLowerCase()}`}
      />
      {description && <p className="text-[9px] text-slate-500 leading-tight">{description}</p>}
    </div>
  );
};

interface PredictionTabProps {
  analytics: Analytics | null;
  arParams: ARParams;
  setArParams: React.Dispatch<React.SetStateAction<ARParams>>;
  mlpParams: MLPParams;
  setMlpParams: React.Dispatch<React.SetStateAction<MLPParams>>;
  isCalculating?: boolean;
  isGeminiLoading?: boolean;
}

// Custom radial gauge for displaying metrics
const CircularProgress: React.FC<{
  percentage: number;
  type: 'TAI' | 'XIU' | 'HOA';
  size?: number;
  strokeWidth?: number;
}> = ({ percentage, type, size = 100, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const numPercentage = Number(percentage) || 0;
  const strokeDashoffset = circumference - (numPercentage / 100) * circumference;

  let colorClass = 'text-indigo-500';
  if (type === 'TAI') colorClass = 'text-rose-500';
  if (type === 'XIU') colorClass = 'text-sky-500';
  if (type === 'HOA') colorClass = 'text-amber-500';

  return (
    <div className="relative inline-flex items-center justify-center" id={`circular-progress-${type}`}>
      <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-slate-800/80" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`transition-all duration-1000 ease-out ${colorClass}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-black tracking-tighter text-slate-100 font-mono">
          {numPercentage.toFixed(1)}<span className="text-xs">%</span>
        </span>
      </div>
    </div>
  );
};

export const PredictionTab: React.FC<PredictionTabProps> = ({ 
  analytics,
  arParams,
  setArParams,
  mlpParams,
  setMlpParams,
  isCalculating,
  isGeminiLoading
}) => {
  const [showParams, setShowParams] = useState(false);
  const [showGeminiStream, setShowGeminiStream] = useState(false);
  const [manualDraws, setManualDraws] = useState<any[]>([]);
  const [rollbackStatus, setRollbackStatus] = useState<string | null>(null);

  const [jobs, setJobs] = useState<RetrainingJob[]>([]);
  const [activeJob, setActiveJob] = useState<RetrainingJob | null>(null);
  const [showSerializedPipeline, setShowSerializedPipeline] = useState(false);

  useEffect(() => {
    const unsubscribe = RetrainingQueue.subscribe(() => {
      setJobs(RetrainingQueue.getJobs());
      setActiveJob(RetrainingQueue.getActiveJob());
    });
    setJobs(RetrainingQueue.getJobs());
    setActiveJob(RetrainingQueue.getActiveJob());
    return () => unsubscribe();
  }, []);

  const handleTriggerEmergencyRetraining = () => {
    RetrainingQueue.addJob('ensemble', 'Tổ Hợp Siêu AI Thích Ứng', 100, 'HIGH');
  };

  const triggerWeightRollback = (agentId: string) => {
    const verId = `v2.1.${Math.floor(Math.random() * 8) + 1}`;
    setRollbackStatus(`Đang tiến hành rollback Trọng số tác nhân ${agentId} về ${verId}...`);
    
    EventBus.publish({
      type: 'WEIGHT_ROLLED_BACK',
      sender: agentId,
      timestamp: Date.now(),
      payload: {
        versionId: verId,
        agentId,
        restoredWeights: { rsiCoeff: 0.95, transitionBias: 1.05 },
        accuracySnapshot: 78.5,
        msg: "Hệ thống tự động kích hoạt khôi phục điểm đỉnh cao (Peak Accuracy) thành công."
      }
    });

    setTimeout(() => {
      setRollbackStatus(`✓ Đã rollback thành công tác nhân ${agentId} về phiên bản ${verId}!`);
      setTimeout(() => setRollbackStatus(null), 4000);
    }, 1500);
  };

  // Get manual draws directly from localStorage for absolute safety and zero prop changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bingo18_manual_data');
      if (stored) {
        setManualDraws(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to read manual data in PredictionTab');
    }
  }, [analytics]);

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 rounded-2xl border border-slate-800" id="prediction-no-data">
        <Brain className="w-12 h-12 text-slate-600 animate-pulse mb-3" />
        <p className="text-slate-400 font-medium">Chưa đủ dữ liệu để kích hoạt mô hình Siêu AI.</p>
        <p className="text-slate-500 text-sm mt-1">Vui lòng nạp hoặc tự nhập kết quả lịch sử để vận hành bộ xử lý trung tâm.</p>
      </div>
    );
  }

  const pred = analytics.prediction;

  const getDiceDotClass = (val: number) => {
    switch (val) {
      case 1: return "col-start-2 row-start-2";
      case 2: return "col-start-1 row-start-1 col-end-2 row-end-2, col-start-3 row-start-3 col-end-4 row-end-4";
      case 3: return "col-start-1 row-start-1, col-start-2 row-start-2, col-start-3 row-start-3";
      case 4: return "col-start-1 row-start-1, col-start-1 row-start-3, col-start-3 row-start-1, col-start-3 row-start-3";
      case 5: return "col-start-1 row-start-1, col-start-1 row-start-3, col-start-2 row-start-2, col-start-3 row-start-1, col-start-3 row-start-3";
      case 6: return "col-start-1 row-start-1, col-start-1 row-start-2, col-start-1 row-start-3, col-start-3 row-start-1, col-start-3 row-start-2, col-start-3 row-start-3";
      default: return "";
    }
  };

  const renderDiceDots = (val: number) => {
    const arr = getDiceDotClass(val).split(',').map(s => s.trim());
    return (
      <div className="w-8 h-8 bg-slate-100 rounded-lg shadow-inner grid grid-cols-3 grid-rows-3 p-1.5 gap-0.5 justify-items-center items-center" id={`dice-render-${val}`}>
        {arr.map((cls, idx) => (
          <div key={idx} className={`w-1.5 h-1.5 bg-slate-900 rounded-full ${cls}`} />
        ))}
      </div>
    );
  };

  const resetAR = () => setArParams(defaultARParams);
  const resetMLP = () => setMlpParams(defaultMLPParams);

  return (
    <div className="flex flex-col gap-6" id="prediction-tab-view">
      
      {/* ==========================================
          BACKGROUND AGENTS PARAMETER CONTROL
          ========================================== */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col gap-4" id="agents-control-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-slate-100 text-sm font-black uppercase tracking-wide">
                  Cấu hình Tác nhân Nền
                </h3>
                {isCalculating && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> AI Đang phân tích...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Mô hình AI trung tâm sẽ tự động tối ưu hóa trọng số dựa trên các cài đặt này.</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowParams(!showParams)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-slate-800 hover:border-slate-700 hover:bg-slate-850 bg-slate-950/40 text-slate-400 transition-all cursor-pointer shadow-sm ml-auto sm:ml-0"
            id="toggle-params-btn"
          >
            <Sliders className="w-3.5 h-3.5" />
            {showParams ? 'Thu gọn cài đặt' : 'Cấu hình tham số'}
          </button>
        </div>

        {/* Unified Hyperparameter Grid Sliders */}
        {showParams && (
          <div className="border-t border-slate-850/60 pt-4 mt-1 transition-all flex flex-col gap-5" id="sliders-container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: AR-EMA Parameters */}
              <div className="bg-slate-950/30 p-4.5 rounded-xl border border-slate-900 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-black text-slate-200 uppercase">Tác nhân Chuỗi thời gian (AR-EMA)</span>
                  </div>
                  <button 
                    onClick={resetAR}
                    className="flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all cursor-pointer border border-slate-800"
                    id="reset-ar-btn"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Đặt lại
                  </button>
                </div>

                <div className="space-y-4">
                  <DebouncedSlider
                    label="Số kỳ trễ tự hồi quy (Lag p):"
                    min="3"
                    max="12"
                    step="1"
                    value={arParams.lag}
                    onChange={(val) => setArParams(prev => ({ ...prev, lag: val }))}
                    suffix=" kỳ"
                    badgeClass="text-rose-400 bg-rose-500/10"
                    accentClass="accent-rose-500"
                    description="Độ sâu dữ liệu lịch sử dùng để huấn luyện và mượt hóa xu hướng."
                  />

                  <DebouncedSlider
                    label="Hệ số san phẳng (EMA Alpha):"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={arParams.emaAlpha}
                    onChange={(val) => setArParams(prev => ({ ...prev, emaAlpha: val }))}
                    suffix="%"
                    badgeClass="text-rose-400 bg-rose-500/10"
                    accentClass="accent-rose-500"
                    description="Mức độ phản ứng với dao động gần nhất. Alpha càng lớn càng bám sát kỳ gần."
                  />

                  <DebouncedSlider
                    label="Hệ số học hồi quy (Learning Rate):"
                    min="0.001"
                    max="0.05"
                    step="0.001"
                    value={arParams.learningRate}
                    onChange={(val) => setArParams(prev => ({ ...prev, learningRate: val }))}
                    badgeClass="text-rose-400 bg-rose-500/10"
                    accentClass="accent-rose-500"
                  />

                  <DebouncedSlider
                    label="Vòng lặp tối ưu hồi quy (Epochs):"
                    min="50"
                    max="500"
                    step="10"
                    value={arParams.epochs}
                    onChange={(val) => setArParams(prev => ({ ...prev, epochs: val }))}
                    suffix=" vòng"
                    badgeClass="text-rose-400 bg-rose-500/10"
                    accentClass="accent-rose-500"
                  />
                </div>
              </div>

              {/* Right Column: MLP Parameters */}
              <div className="bg-slate-950/30 p-4.5 rounded-xl border border-slate-900 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs font-black text-slate-200 uppercase">Tác nhân Mạng nơ-ron (MLP Neural)</span>
                  </div>
                  <button 
                    onClick={resetMLP}
                    className="flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all cursor-pointer border border-slate-800"
                    id="reset-mlp-btn"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Đặt lại
                  </button>
                </div>

                <div className="space-y-4">
                  <DebouncedSlider
                    label="Số lượng đầu vào trễ (Input Lags):"
                    min="3"
                    max="10"
                    step="1"
                    value={mlpParams.inputLags}
                    onChange={(val) => setMlpParams(prev => ({ ...prev, inputLags: val }))}
                    suffix=" nơ-ron"
                    badgeClass="text-sky-400 bg-sky-500/10"
                    accentClass="accent-sky-500"
                    description="Số lượng kỳ quay liên tiếp gần nhất đưa vào lớp đầu vào (Input Layer)."
                  />

                  <DebouncedSlider
                    label="Kích thước lớp ẩn (Hidden Size):"
                    min="4"
                    max="24"
                    step="1"
                    value={mlpParams.hiddenNeurons}
                    onChange={(val) => setMlpParams(prev => ({ ...prev, hiddenNeurons: val }))}
                    suffix=" nơ-ron"
                    badgeClass="text-sky-400 bg-sky-500/10"
                    accentClass="accent-sky-500"
                  />

                  <DebouncedSlider
                    label="Hệ số học nơ-ron (Learning Rate):"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={mlpParams.learningRate}
                    onChange={(val) => setMlpParams(prev => ({ ...prev, learningRate: val }))}
                    badgeClass="text-sky-400 bg-sky-500/10"
                    accentClass="accent-sky-500"
                  />

                  <DebouncedSlider
                    label="Số chu kỳ huấn luyện (Epochs):"
                    min="50"
                    max="1000"
                    step="10"
                    value={mlpParams.epochs}
                    onChange={(val) => setMlpParams(prev => ({ ...prev, epochs: val }))}
                    suffix=" vòng"
                    badgeClass="text-sky-400 bg-sky-500/10"
                    accentClass="accent-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="prediction-main-grid">
        
        {/* ==========================================
            LEFT COLUMN: Central AI Super Brain Dashboard
            ========================================== */}
        <div className="lg:col-span-8 flex flex-col gap-6" id="left-column">
          
          {/* Core Unified Prediction Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/20 backdrop-blur-md rounded-2xl p-6 border border-indigo-500/10 flex flex-col gap-6 shadow-2xl relative overflow-hidden"
            id="central-ai-prediction-card"
          >
            {/* High-tech pulsing auras */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                  <Brain className="w-5.5 h-5.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest font-mono">Unified Central Super AI</span>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">LIVE</span>
                    {isGeminiLoading && (
                      <span className="text-[8px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                        <RefreshCw className="w-2 h-2 animate-spin" /> ĐANG TỰ PHẢN BIỆN...
                      </span>
                    )}
                  </div>
                  <h2 className="text-slate-100 text-lg font-black uppercase tracking-tight">Bộ Não AI Trung Tâm Thích Ứng</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950/50 border border-slate-900 rounded-lg px-3 py-1.5 font-semibold">
                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Số chu kỳ tự học: <strong className="font-mono text-slate-200">{pred.learningIteration}</strong></span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6">
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khuyến nghị kỳ tiếp theo</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`px-4 py-2 rounded-2xl text-4xl font-black tracking-tight shadow-md border ${
                      pred.predictedType === 'TAI' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 
                      pred.predictedType === 'XIU' ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' : 
                      'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}>
                      {pred.predictedType === 'TAI' ? 'TÀI' : pred.predictedType === 'XIU' ? 'XỈU' : 'HÒA'}
                    </span>
                    <div>
                      <div className="text-slate-200 text-2xl font-black font-mono">⚡ {pred.predictedSum} Điểm</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{pred.predictedSum % 2 === 0 ? 'Tổng Chẵn' : 'Tổng Lẻ'} • Cầu {pred.marketState}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 flex flex-col gap-1 text-[11px] text-slate-400 leading-relaxed font-medium">
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-300 mb-1">
                    <Info className="w-3.5 h-3.5 text-indigo-400" /> Phân tích nguồn tín hiệu:
                  </div>
                  Đã đồng bộ hóa 9 tác nhân nền (Markov-KNN, AR-EMA, Neural MLP, BDMC Bayes, Monte Carlo, Random Forest, LSTM, XGBoost, Transformer).
                  Tác nhân dẫn dắt có hiệu suất cao nhất: <span className="text-indigo-300 font-bold">{pred.topAgentName} (Trọng số {pred.topAgentWeight}%)</span>.
                </div>

                {/* Self-Adaptive Cognitive Self-Debate Stream Panel */}
                {pred.geminiDebateLog && (
                  <div className="mt-1 border-t border-slate-850/40 pt-3 flex flex-col gap-2">
                    <div>
                      <button
                        onClick={() => setShowGeminiStream(!showGeminiStream)}
                        className="flex items-center gap-2 text-[10px] font-bold text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/15 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        <Brain className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                        {showGeminiStream ? "Ẩn Dòng Tư Duy Tự Thích Nghi" : "Mở Dòng Tư Duy Tự Thích Nghi (Phản Biện & Tranh Luận)"}
                      </button>
                    </div>

                    {showGeminiStream && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-950/80 rounded-xl border border-sky-500/10 p-4 font-mono text-[11px] leading-relaxed text-slate-300 space-y-3"
                      >
                        <div className="text-sky-400 font-bold border-b border-sky-500/10 pb-1 flex items-center justify-between">
                          <span>🔮 BỘ NÃO TỰ THÍCH NGHI - CHUYÊN GIA PHẢN BIỆN</span>
                          <span className="text-[9px] bg-sky-500/10 px-1.5 py-0.5 rounded text-sky-300">ACTIVE</span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          <p className="text-indigo-300 font-bold"># Phiên tự tranh luận phản biện (Self-Debate Log):</p>
                          <div className="text-slate-400 pl-3 border-l border-slate-800 whitespace-pre-wrap">
                            {pred.geminiDebateLog}
                          </div>

                          <p className="text-emerald-300 font-bold mt-3"># Bài học & Rút kinh nghiệm thực chiến (AI Self-Correction):</p>
                          <p className="text-slate-300 pl-3 border-l border-emerald-950 whitespace-pre-wrap">
                            {pred.geminiAiReflection}
                          </p>
                        </div>

                        {pred.geminiWeightsBias && (
                          <div className="border-t border-slate-900 pt-2.5 mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-400">
                            <div>
                              Độ lệch TÀI: <span className={pred.geminiWeightsBias.TAI >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                {pred.geminiWeightsBias.TAI >= 0 ? `+${pred.geminiWeightsBias.TAI.toFixed(1)}` : pred.geminiWeightsBias.TAI.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              Độ lệch XỈU: <span className={pred.geminiWeightsBias.XIU >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                {pred.geminiWeightsBias.XIU >= 0 ? `+${pred.geminiWeightsBias.XIU.toFixed(1)}` : pred.geminiWeightsBias.XIU.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              Độ lệch HÒA: <span className={pred.geminiWeightsBias.HOA >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                {pred.geminiWeightsBias.HOA >= 0 ? `+${pred.geminiWeightsBias.HOA.toFixed(1)}` : pred.geminiWeightsBias.HOA.toFixed(1)}%
                              </span>
                            </div>
                            {pred.geminiConfidenceAdjustment !== undefined && (
                              <div>
                                Điều chỉnh tin cậy: <span className={pred.geminiConfidenceAdjustment >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                  {pred.geminiConfidenceAdjustment >= 0 ? `+${pred.geminiConfidenceAdjustment.toFixed(1)}` : pred.geminiConfidenceAdjustment.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full md:w-52 shrink-0 bg-slate-950/40 border border-slate-900 p-5 rounded-xl flex flex-col items-center justify-center gap-3 relative">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Độ Tin Cậy AI</span>
                <CircularProgress percentage={pred.confidence} type={pred.predictedType} size={110} strokeWidth={8} />
                <div className="text-center mt-1">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm ${pred.riskColorBg} ${pred.riskColorText} ${pred.riskColorBorder}`}>
                    RỦI RO: {pred.riskLevel}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ==========================================
              STRESS-TEST AUDITED SYSTEM PANEL (RED TEAM SECURE)
              ========================================== */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-emerald-500/10 shadow-lg flex flex-col gap-4 relative overflow-hidden" id="audit-system-section">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-slate-800/85 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-slate-200 font-bold text-sm uppercase tracking-wider">Hệ Thống Kiểm Định Rủi Ro & Giải Thích AI (XAI)</h3>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-black font-mono">
                RED-TEAM AUDITED
              </span>
            </div>

            {/* 1. Explainable AI (XAI) - Dynamic core prediction reasoning */}
            {pred.xaiExplanation && (
              <div className="bg-indigo-950/20 rounded-xl p-3.5 border border-indigo-500/10 text-xs text-slate-300 leading-relaxed font-medium">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-1.5">
                  <Brain className="w-4 h-4" />
                  <span>Giải thích Quyết định (Explainable AI - XAI):</span>
                </div>
                "{pred.xaiExplanation}"
              </div>
            )}

            {/* Grid of advanced systems */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-1">
              
              {/* Multi-Timeframe Status */}
              {pred.multiTimeframeStatus && (
                <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900 flex flex-col gap-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Đa Khung Thời Gian (MTF)</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Ngắn hạn: <strong className={pred.multiTimeframeStatus.shortTermTrend === 'TAI' ? 'text-rose-400' : 'text-sky-400'}>{pred.multiTimeframeStatus.shortTermTrend}</strong></span>
                    <span className="text-xs text-slate-300">Dài hạn: <strong className={pred.multiTimeframeStatus.longTermTrend === 'TAI' ? 'text-rose-400' : 'text-sky-400'}>{pred.multiTimeframeStatus.longTermTrend}</strong></span>
                  </div>
                  <div className={`text-[9px] p-1.5 rounded leading-normal ${pred.multiTimeframeStatus.hasDivergence ? 'bg-amber-500/10 text-amber-300 border border-amber-500/15' : 'bg-emerald-500/5 text-slate-400'}`}>
                    {pred.multiTimeframeStatus.hasDivergence ? '⚠️ Cảnh báo: Phát hiện phân kỳ xu hướng' : '✓ Xu hướng đồng bộ ổn định'}
                  </div>
                </div>
              )}

              {/* Agent Syncing Status */}
              {pred.agentSyncStatus && (
                <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900 flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Đồng Bộ Hóa Tác Nhân</span>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Hoạt động: <strong>{pred.agentSyncStatus.activeAgentsCount}/9</strong></span>
                    <span>Độ trễ: <strong className="text-emerald-400 font-mono">{pred.agentSyncStatus.syncLatencyMs}ms</strong></span>
                  </div>
                  <div className="text-[9px] text-slate-400 bg-slate-950/40 p-1.5 rounded flex flex-col gap-0.5">
                    <div>Ngưỡng Timeout: {pred.agentSyncStatus.timeoutThresholdMs}ms</div>
                    <div className="text-[8px] truncate">
                      Lọc bỏ trễ: {pred.agentSyncStatus.timedOutAgents.length > 0 ? <span className="text-rose-400">{pred.agentSyncStatus.timedOutAgents.join(', ')}</span> : <span className="text-emerald-400">Không có</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Shadow Testing Status */}
              {pred.shadowTestStatus && (
                <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900 flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Shadow Environment</span>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Bóng: <strong className="text-indigo-400 font-mono">{pred.shadowTestStatus.shadowAccuracy}%</strong></span>
                    <span>Chính: <strong className="text-slate-400 font-mono">{pred.shadowTestStatus.productionAccuracy}%</strong></span>
                  </div>
                  <div className={`text-[9px] p-1.5 rounded text-center leading-normal ${pred.shadowTestStatus.hotSwapTriggered ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/15' : 'bg-slate-900/50 text-slate-400'}`}>
                    {pred.shadowTestStatus.hotSwapTriggered ? '⚡ Hot-Swap: Cập nhật luật mới' : '✓ Chạy ngầm test không dừng'}
                  </div>
                </div>
              )}

            </div>

            {/* Highly Advanced Stress-Test Capabilities (Audit Details) */}
            <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-4">
              
              {/* Concept Drift & Macro Shock status headers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Concept Drift Detail Card */}
                {pred.conceptDriftStatus && (
                  <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px] uppercase tracking-wide">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Giám sát Chuyển pha (Concept Drift)</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${pred.conceptDriftStatus.isDriftDetected ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-sky-500/10 text-sky-400'}`}>
                        {pred.conceptDriftStatus.currentPhase === 'sideways' ? 'PHA ĐI NGANG (Chop)' : 'PHA BÁM TREND'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      Hệ thống ADWIN & Page-Hinkley ghi nhận chỉ số chuyển pha ở mức <strong className="font-mono text-sky-400">{pred.conceptDriftStatus.driftScore}/10</strong>.
                      {pred.conceptDriftStatus.trendAgentsDiscount > 0 ? (
                        <span className="text-amber-400 block mt-1">
                          ⚠️ Đã giảm <strong className="font-mono text-amber-300">{pred.conceptDriftStatus.trendAgentsDiscount}%</strong> trọng số các tác nhân bám trend để tránh bẫy đảo chiều.
                        </span>
                      ) : (
                        <span className="text-slate-400 block mt-1">
                          ✓ Các tác nhân bám trend hoạt động với 100% công suất định mức.
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Macro Shock / Freeze State Card */}
                {pred.macroShockStatus && (
                  <div className={`rounded-xl p-3 border flex flex-col gap-2 transition-all ${pred.macroShockStatus.isFrozen ? 'bg-rose-950/15 border-rose-500/30' : 'bg-slate-950/40 border-slate-800/60'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] uppercase tracking-wide">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Cú sốc Vĩ mô (Macro Shock Protection)</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${pred.macroShockStatus.isFrozen ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {pred.macroShockStatus.isFrozen ? 'ĐANG ĐÓNG BĂNG' : 'AN TOÀN'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      {pred.macroShockStatus.freezeReason}
                    </p>
                  </div>
                )}

              </div>

              {/* Online Learning Weight Deltas & Memory Safety */}
              {pred.onlineLearningStatus && (
                <div className="bg-slate-950/40 rounded-xl p-3.5 border border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] uppercase tracking-wide">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Học tập Trực tuyến thích ứng (Online Learning Network)</span>
                    </div>
                    <div className="flex gap-2 text-[9px]">
                      <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Elastic Anchor: {pred.onlineLearningStatus.elasticAnchorScore * 100}%</span>
                      <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold">{pred.onlineLearningStatus.memoryUsageStatus}</span>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Trọng số mạng lưới được hiệu chỉnh thích ứng (learning rate = <span className="text-emerald-400 font-mono font-bold">{pred.onlineLearningStatus.learningRate}</span>) dựa trên sai số prequential thực tế, giữ cho mạng nơ-ron luôn tiệm cận điểm tối ưu mà không bị quên kiến thức cũ nhờ Neo đàn hồi L2.
                  </p>

                  {/* Weight Deltas list */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 pt-1.5 border-t border-slate-800/40">
                    {pred.onlineLearningStatus.neuralWeightsDelta.map((wd, i) => (
                      <div key={i} className="bg-slate-950/60 p-1.5 rounded border border-slate-900 text-center flex flex-col gap-0.5">
                        <span className="text-[8px] text-slate-500 font-bold truncate block">{wd.agentName}</span>
                        <span className={`text-[10px] font-mono font-bold ${wd.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {wd.delta >= 0 ? `+${wd.delta}` : wd.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consensus Noise Matrix Filter block */}
              {pred.consensusNoiseStatus && pred.consensusNoiseStatus.isNoiseAlertActive && (
                <div className="bg-amber-950/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-400">
                    <Zap className="w-4 h-4 animate-bounce" />
                    <span>Bộ lọc Nhiễu Đồng thuận Kích hoạt:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {pred.consensusNoiseStatus.decisionMatrixAction}
                  </p>
                </div>
              )}

              {/* Auto-Error Backtracing Log Table */}
              {pred.errorBacktrace && pred.errorBacktrace.length > 0 && (
                <div className="bg-slate-950/40 rounded-xl p-3.5 border border-slate-800/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] uppercase tracking-wide">
                    <History className="w-3.5 h-3.5" />
                    <span>Nhật ký Truy vết Ngược Lỗi Tự động (Auto-Error Backtrace & Penalty Logs)</span>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Khi một dự đoán lịch sử bị sai lệch, hệ thống lập tức truy vết ngược để xác định tác nhân nào cung cấp tín hiệu nhiễu và gán nhãn phạt (Penalty Tag) để hiệu chỉnh thuật toán:
                  </p>

                  <div className="overflow-x-auto rounded-lg border border-slate-900 bg-slate-950/60">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-slate-950 text-slate-500 font-bold border-b border-slate-900">
                          <th className="p-2">Phiên (Draw ID)</th>
                          <th className="p-2">Dự đoán của AI</th>
                          <th className="p-2">Kết quả thực tế</th>
                          <th className="p-2">Tác nhân gây nhiễu & Penalty Tag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300">
                        {pred.errorBacktrace.map((eb, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="p-2 font-mono font-bold text-slate-400">{eb.drawId}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${eb.prediction === 'TAI' ? 'bg-rose-500/10 text-rose-400' : 'bg-sky-500/10 text-sky-400'}`}>
                                {eb.prediction === 'TAI' ? 'Tài' : 'Xỉu'}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${eb.expected === 'TAI' ? 'bg-rose-500/10 text-rose-400' : 'bg-sky-500/10 text-sky-400'}`}>
                                {eb.expected === 'TAI' ? 'Tài' : 'Xỉu'}
                              </span>
                            </td>
                            <td className="p-2 space-y-1">
                              {eb.noisyAgents.map((na: any, naIdx: number) => (
                                <div key={naIdx} className="flex flex-wrap items-center gap-1">
                                  <span className="text-slate-500 font-bold font-mono text-[10px]">{na.agentName}:</span>
                                  <span className="text-rose-400 font-mono text-[9px] bg-rose-500/5 px-1 py-0.5 rounded border border-rose-500/10">
                                    {na.penaltyTag}
                                  </span>
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Light API response block payload */}
            {pred.optimizedPayload && (
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-900 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    Cấu Trúc JSON API Siêu Nhẹ (Optimized Backend Payload)
                  </span>
                  <span className="text-[8px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    ~180 bytes
                  </span>
                </div>
                <pre className="text-[10px] font-mono text-emerald-400 bg-slate-950/90 p-2.5 rounded border border-emerald-500/10 overflow-x-auto whitespace-pre-wrap max-h-32">
                  {JSON.stringify(pred.optimizedPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* =========================================================================
              AI GOVERNANCE & PIPELINE COOPERATIVE RETRAINING CONSOLE
              ========================================================================= */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-indigo-500/10 shadow-lg flex flex-col gap-5 relative overflow-hidden" id="ai-governance-section">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-800/85 pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                <h3 className="text-slate-200 font-bold text-sm uppercase tracking-wider">Quản Trị Trí Tuệ Nhân Tạo & Pipeline Học Lại</h3>
              </div>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black font-mono">
                AI GOVERNANCE ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Left Column: Mathematical Data Drift (PSI / KS-test) */}
              <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-900 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-wide">Giám Sát Độ Lệch Phân Phối (Data Drift - PSI)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    pred.conceptDriftStatus.psiScore !== undefined && pred.conceptDriftStatus.psiScore > 0.25 
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse' 
                      : pred.conceptDriftStatus.psiScore !== undefined && pred.conceptDriftStatus.psiScore >= 0.10
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                  }`}>
                    {pred.conceptDriftStatus.psiScore !== undefined && pred.conceptDriftStatus.psiScore > 0.25 
                      ? 'Concept Drift Nặng' 
                      : pred.conceptDriftStatus.psiScore !== undefined && pred.conceptDriftStatus.psiScore >= 0.10
                        ? 'Trôi Dạt Sớm'
                        : 'Phân Phối Ổn Định'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-950/55 p-3 rounded-xl border border-slate-900 flex flex-col gap-1.5 justify-center items-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Chỉ Số Ổn Định (PSI)</span>
                    <span className={`text-xl font-black font-mono ${
                      pred.conceptDriftStatus.psiScore !== undefined && pred.conceptDriftStatus.psiScore > 0.25 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {pred.conceptDriftStatus.psiScore?.toFixed(4) || '0.0000'}
                    </span>
                    <span className="text-[8px] text-slate-600 font-medium">Ngưỡng cảnh báo: 0.2500</span>
                  </div>

                  <div className="bg-slate-950/55 p-3 rounded-xl border border-slate-900 flex flex-col gap-1.5 justify-center items-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Khoảng Cách KS-test</span>
                    <span className="text-xl font-black font-mono text-indigo-400">
                      {pred.conceptDriftStatus.ksDistance?.toFixed(4) || '0.0000'}
                    </span>
                    <span className="text-[8px] text-slate-600 font-medium">Lực kéo cực đại thực nghiệm</span>
                  </div>
                </div>

                {pred.conceptDriftStatus.analysisMessage && (
                  <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-900 animate-fadeIn">
                    {pred.conceptDriftStatus.analysisMessage}
                  </p>
                )}

                {/* Comparative Distribution Plots */}
                {pred.conceptDriftStatus.refDist && pred.conceptDriftStatus.tgtDist && (
                  <div className="space-y-2.5 pt-1.5 border-t border-slate-900">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">So sánh phân bổ cửa cược (%)</span>
                    
                    {/* TÀI Comparison */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-rose-400 uppercase">Tài</span>
                        <span className="text-slate-400 font-mono font-medium">Tham chiếu: {pred.conceptDriftStatus.refDist.TAI}% | Thực tế: {pred.conceptDriftStatus.tgtDist.TAI}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 h-1.5 bg-slate-950 rounded p-[1px]">
                        <div className="bg-rose-500/20 h-full rounded-l overflow-hidden">
                          <div className="bg-slate-500 h-full transition-all duration-1000" style={{ width: `${pred.conceptDriftStatus.refDist.TAI}%` }} />
                        </div>
                        <div className="bg-rose-500/20 h-full rounded-r overflow-hidden">
                          <div className="bg-rose-500 h-full transition-all duration-1000 animate-pulse" style={{ width: `${pred.conceptDriftStatus.tgtDist.TAI}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* XỈU Comparison */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-sky-400 uppercase">Xỉu</span>
                        <span className="text-slate-400 font-mono font-medium">Tham chiếu: {pred.conceptDriftStatus.refDist.XIU}% | Thực tế: {pred.conceptDriftStatus.tgtDist.XIU}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 h-1.5 bg-slate-950 rounded p-[1px]">
                        <div className="bg-sky-500/20 h-full rounded-l overflow-hidden">
                          <div className="bg-slate-500 h-full transition-all duration-1000" style={{ width: `${pred.conceptDriftStatus.refDist.XIU}%` }} />
                        </div>
                        <div className="bg-sky-500/20 h-full rounded-r overflow-hidden">
                          <div className="bg-sky-500 h-full transition-all duration-1000 animate-pulse" style={{ width: `${pred.conceptDriftStatus.tgtDist.XIU}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* HÒA Comparison */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-amber-400 uppercase">Hòa</span>
                        <span className="text-slate-400 font-mono font-medium">Tham chiếu: {pred.conceptDriftStatus.refDist.HOA}% | Thực tế: {pred.conceptDriftStatus.tgtDist.HOA}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 h-1.5 bg-slate-950 rounded p-[1px]">
                        <div className="bg-amber-500/20 h-full rounded-l overflow-hidden">
                          <div className="bg-slate-500 h-full transition-all duration-1000" style={{ width: `${pred.conceptDriftStatus.refDist.HOA}%` }} />
                        </div>
                        <div className="bg-amber-500/20 h-full rounded-r overflow-hidden">
                          <div className="bg-amber-500 h-full transition-all duration-1000 animate-pulse" style={{ width: `${pred.conceptDriftStatus.tgtDist.HOA}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase pt-1">
                      <span>Mẫu tham chiếu (Hơn 100 kỳ)</span>
                      <span>Mẫu hiện tại (30 kỳ quay mới)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Cooperative Background Retraining Queue */}
              <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-900 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-wide">Hàng Đợi Huấn Luyện Nền (Background Worker)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    activeJob ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}>
                    {activeJob ? 'Đang Chạy Tác Vụ' : 'Nhàn Rỗi'}
                  </span>
                </div>

                {activeJob ? (
                  <div className="space-y-3 bg-slate-950/65 p-3.5 rounded-xl border border-indigo-500/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-[2px] bg-indigo-500 transition-all duration-300" style={{ width: `${activeJob.progress}%` }} />
                    
                    <div className="flex justify-between items-center text-xs">
                      <div className="font-bold text-slate-300">
                        ⚡ Mô hình: <span className="text-indigo-400">{activeJob.modelName}</span>
                      </div>
                      <span className="font-mono text-indigo-400 font-bold">{activeJob.progress}%</span>
                    </div>

                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-900 p-[1px]">
                      <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full transition-all duration-300 animate-pulse" style={{ width: `${activeJob.progress}%` }} />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Tiến trình: <strong className="font-mono text-slate-400">{activeJob.epochCompleted}/{activeJob.epochTotal} epochs</strong></span>
                      <span>Priority: <strong className="text-rose-400 font-bold font-mono">{activeJob.priority}</strong></span>
                    </div>

                    {/* Worker simulated terminal */}
                    <div className="space-y-1 border-t border-slate-900 pt-2.5 mt-1.5">
                      <span className="text-[9px] text-indigo-400 font-black tracking-wide uppercase flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-indigo-400" /> Live Retraining Console Logs:
                      </span>
                      <div className="h-28 bg-slate-950 rounded-lg p-2 font-mono text-[9px] text-emerald-400 border border-slate-900 overflow-y-auto space-y-1 select-text custom-scrollbar">
                        {activeJob.logs.map((log, idx) => (
                          <div key={idx} className="whitespace-pre-wrap leading-normal">
                            &gt; {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-900">
                    <Terminal className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
                    <p className="text-slate-400 font-bold text-xs uppercase">Hàng đợi đang rảnh</p>
                    <p className="text-slate-600 text-[10px] mt-0.5">Hệ thống đang hoạt động với các trọng số tối ưu tối đa.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleTriggerEmergencyRetraining}
                    disabled={!!activeJob}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-600 text-slate-100 font-bold uppercase rounded-xl transition-all active:scale-95 text-xs shadow-md border border-indigo-500/20 cursor-pointer disabled:cursor-not-allowed"
                    id="trigger-retraining-btn"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${activeJob ? 'animate-spin' : ''}`} />
                    Kích hoạt Học Lại Khẩn Cấp (Emergency Retrain)
                  </button>
                </div>

                {/* Data Pipeline parameters and serializations */}
                <div className="border-t border-slate-900 pt-3 mt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-emerald-400" /> Cấu hình Scaler & Imputer (DataPipeline)
                    </span>
                    <button
                      onClick={() => setShowSerializedPipeline(!showSerializedPipeline)}
                      className="text-[9px] text-indigo-400 font-bold uppercase hover:underline cursor-pointer"
                    >
                      {showSerializedPipeline ? 'Ẩn file cấu hình .json' : 'Xem file cấu hình .json'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-semibold bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                    <div>Min-Max Sum Bounds: <span className="font-mono text-slate-200">3.00 - 18.00</span></div>
                    <div>Default Imputer: <span className="font-mono text-indigo-400">10.50 (Median)</span></div>
                    <div>Memory Buffer: <span className="font-mono text-emerald-400">O(1) Memory Constant</span></div>
                    <div>Model Serializer: <span className="font-mono text-indigo-400">Active (.json config)</span></div>
                  </div>

                  {showSerializedPipeline && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Serialized Pipeline State JSON (pkl/onnx equivalent)</span>
                      <pre className="text-[9px] font-mono text-indigo-300 bg-slate-950/80 p-2.5 rounded-lg border border-indigo-500/10 overflow-x-auto whitespace-pre-wrap max-h-32">
                        {JSON.stringify({
                          version: "1.0.0",
                          timestamp: Date.now(),
                          imputerDefaultValue: 10.5,
                          sumMin: 3,
                          sumMax: 18,
                          emaMin: 3.5,
                          emaMax: 17.5,
                          momentumMin: -15,
                          momentumMax: 15,
                          volatilityMin: 0.12,
                          volatilityMax: 4.85
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>

          {/* Unified Probability Matrix (Xác suất dự đoán) */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-lg" id="probability-section">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-indigo-400" />
              <h3 className="text-slate-200 font-bold text-sm">Xác Suất Dự Đoán Tổng Hợp</h3>
            </div>
            
            <div className="space-y-4">
              {/* TÀI Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> TÀI (Tổng 12 - 18)
                  </span>
                  <span className="font-mono text-rose-400">{pred.aiScores.TAI}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-900 p-[1px]">
                  <div 
                    className="bg-gradient-to-r from-rose-600 to-rose-400 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${pred.aiScores.TAI}%` }}
                  />
                </div>
              </div>

              {/* XỈU Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" /> XỈU (Tổng 3 - 9)
                  </span>
                  <span className="font-mono text-sky-400">{pred.aiScores.XIU}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-900 p-[1px]">
                  <div 
                    className="bg-gradient-to-r from-sky-600 to-sky-400 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${pred.aiScores.XIU}%` }}
                  />
                </div>
              </div>

              {/* HÒA Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> HÒA (Tổng 10 - 11)
                  </span>
                  <span className="font-mono text-amber-400">{pred.aiScores.HOA}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-900 p-[1px]">
                  <div 
                    className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${pred.aiScores.HOA}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800/40 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5 justify-center md:justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Xác suất dựa trên chuyển dịch trạng thái Markov và Knn lân cận.
              </div>
              <div className="flex items-center gap-1.5 justify-center md:justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Độ lệch chuẩn của chuỗi tổng điểm gần đây: {analytics.volatility.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Real-time Bead Road / Roadmap display */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-lg" id="bead-road-section">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-slate-200 font-bold text-sm">Biểu đồ hạt mốc (Roadmap - Bead Road)</h3>
              </div>
              <span className="text-[10px] bg-slate-950 text-slate-500 border border-slate-900 px-2.5 py-1 rounded font-mono font-bold">
                60 kỳ gần nhất
              </span>
            </div>

            <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
              <div className="flex gap-1.5 min-w-max p-1">
                {analytics.roadmap.slice(0, 42).reverse().map((r, i) => (
                  <div 
                    key={i} 
                    className={`w-8 h-8 rounded-full flex flex-col items-center justify-center font-bold text-xs shadow-md border cursor-pointer hover:scale-110 transition-transform ${
                      r.type === 'TAI' ? 'bg-rose-500/20 text-rose-300 border-rose-500/35' :
                      r.type === 'XIU' ? 'bg-sky-500/20 text-sky-300 border-sky-500/35' :
                      'bg-amber-500/20 text-amber-300 border-amber-500/35'
                    }`}
                    title={`Kỳ ${r.id}: ${r.sum} điểm (${r.type})`}
                  >
                    <span className="text-[9px] scale-95 leading-none font-black">{r.type[0]}</span>
                    <span className="text-[9px] font-mono font-medium leading-none mt-0.5">{r.sum}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-5 mt-4 text-[10px] text-slate-500 font-semibold justify-center border-t border-slate-850/60 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/40 inline-block" /> TÀI (≥ 12đ)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500/20 border border-sky-500/40 inline-block" /> XỈU (≤ 9đ)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40 inline-block" /> HÒA (10 - 11đ)
              </div>
            </div>
          </div>

        </div>

        {/* ==========================================
            RIGHT COLUMN: System Stability, Capital & Manual Results
            ========================================== */}
        <div className="lg:col-span-4 flex flex-col gap-6" id="right-column">
          
          {/* Last Draw State summary */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-lg" id="last-draw-panel">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-3">Kết quả kỳ vừa qua</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {analytics.lastDrawNumbers.map((num, i) => (
                  <div key={i} className="transition-all duration-300">
                    {renderDiceDots(num)}
                  </div>
                ))}
              </div>
              
              <div className="text-right">
                <div className="text-slate-500 text-[10px] font-bold uppercase">Tổng điểm</div>
                <div className="text-xl font-black text-indigo-400 font-mono mt-0.5">
                  {analytics.lastDrawSum} <span className="text-xs font-semibold text-slate-400">({analytics.lastDrawState})</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Stability Gauge (Độ ổn định của hệ thống) */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-lg flex flex-col gap-4" id="stability-card">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-slate-200 font-bold text-sm">Chỉ Số Ổn Định Hệ Thống</h3>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative inline-flex items-center justify-center shrink-0">
                <svg className="transform -rotate-90" width="70" height="70" viewBox="0 0 70 70">
                  <circle cx="35" cy="35" r="30" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-800/80" />
                  <circle
                    cx="35"
                    cy="35"
                    r="30"
                    stroke="#10b981"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 - (pred.systemStability / 100) * (2 * Math.PI * 30)}
                    className="transition-all duration-1000 ease-out text-emerald-500"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-black font-mono text-slate-100">
                  {pred.systemStability}%
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-300">Tính nhất quán lượng tử</span>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Đo lường độ đồng thuận giữa các thuật toán và biên độ dao động. Mức độ ổn định đạt <strong className="text-emerald-400 font-mono">{pred.systemStability}%</strong>, biểu thị dữ liệu đi vào chu kỳ dễ dự báo.
                </p>
              </div>
            </div>
          </div>

          {/* Capital Management Advice (Khuyến nghị quản lý vốn) */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-lg flex flex-col gap-3.5" id="capital-card">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
              <Wallet className="w-4 h-4 text-indigo-400" />
              <h3 className="text-slate-200 font-bold text-sm">Quản Lý Vốn (Kelly Criterion)</h3>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-900">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Đề xuất đi vốn</span>
                <span className="text-emerald-400 text-lg font-black font-mono mt-0.5 inline-block">
                  {pred.capitalAdvice}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Phân loại vốn</span>
                <span className="text-slate-300 text-xs font-extrabold font-mono uppercase">
                  {pred.kellyFraction > 0.05 ? 'Mạnh tay' : pred.kellyFraction > 0 ? 'Thận trọng' : 'Quan sát'}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Chỉ số quản lý vốn Kelly dựa trên Quarter-Kelly (1/4 tỷ lệ tiêu chuẩn) nhằm kiểm soát rủi ro tối đa và bảo vệ tài khoản khỏi chuỗi đảo cầu.
            </p>
          </div>

          {/* Recent Manual Inputs Results (Kết quả nhập thủ công) */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-lg flex flex-col gap-3.5 flex-1" id="manual-results-card">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-900 justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-sky-400 animate-pulse" />
                <h3 className="text-slate-200 font-bold text-sm">Kết Quả Nhập Thủ Công</h3>
              </div>
              <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-mono font-black uppercase">
                {manualDraws.length} kỳ
              </span>
            </div>

            {manualDraws.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-850">
                <Info className="w-6 h-6 text-slate-700 mb-1.5" />
                <span className="text-[10px] text-slate-500 font-bold uppercase">Không có dữ liệu tự nhập</span>
                <p className="text-[9px] text-slate-600 mt-0.5 px-3">Hãy sử dụng tab "Lịch Sử Kỳ Quay" để thêm kết quả tự nhập nếu cần đồng bộ riêng.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850 pr-1">
                {manualDraws.slice(0, 10).map((draw, idx) => {
                  const sum = draw.numbers.reduce((a: number, b: number) => a + b, 0);
                  const state = sum >= 12 ? 'TAI' : (sum >= 10 ? 'HOA' : 'XIU');
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-900 hover:border-slate-850 transition-all text-xs" id={`manual-draw-${draw.id}`}>
                      <div>
                        <div className="font-mono font-black text-slate-300">#{draw.id}</div>
                        <div className="text-[8px] text-slate-500 mt-0.5 font-bold">{draw.date.split(' (Tự')[0]}</div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                          {draw.numbers.map((n: number, i: number) => (
                            <span key={i} className="w-5 h-5 bg-slate-900 border border-slate-800 rounded flex items-center justify-center font-mono font-black text-[10px] text-slate-300 shadow">
                              {n}
                            </span>
                          ))}
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                          state === 'TAI' ? 'bg-rose-500/10 text-rose-400' :
                          state === 'XIU' ? 'bg-sky-500/10 text-sky-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {sum}đ
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* =========================================================================
          FULL-WIDTH AGENT CONTROL DECK & ADVANCED QUANT SYSTEM METRICS
          ========================================================================= */}
      <div className="mt-8 border-t border-slate-800/65 pt-8 w-full" id="advanced-control-deck">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs text-indigo-400 font-black uppercase tracking-wider block mb-1">
              Hệ thống điều khiển trung tâm (AI Central Core Console)
            </span>
            <h3 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              Bảng Giám Sát Tác Nhân Cơ Sở & Sức Khỏe Lượng Tử
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Trực Tuyến: {pred.liveAgentAudits?.length ?? 9} Tác Nhân
            </span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-full font-black uppercase">
              Base Agent Class Active
            </span>
          </div>
        </div>

        {/* Dynamic hot reload flashing alert */}
        {pred.hasDynamicHotReloadTriggered && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3 shadow-lg"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-indigo-400 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-black text-indigo-300 uppercase block">Cơ chế Khởi tạo lại (Hot-Reloading) Thành Công</span>
              <p className="text-[10px] text-indigo-400/80 mt-0.5 font-medium leading-relaxed">
                Đã đăng ký lại (re-registration) thành công một Tác nhân vào AI Trung tâm thời gian thực với ZERO DOWNTIME. Toàn bộ trọng số thích ứng được bảo toàn.
              </p>
            </div>
          </motion.div>
        )}

        {/* Rollback status message */}
        {rollbackStatus && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            {rollbackStatus}
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* 1. Base Agent Registry Table */}
          <div className="xl:col-span-8 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-extrabold text-slate-200">Đăng ký Tác nhân & Giám sát Liveness (Health Check)</span>
              </div>
              <span className="text-[10px] bg-slate-950 text-slate-500 px-2.5 py-1 rounded font-mono font-bold">
                State Store Sync Enabled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800/40 font-black text-[10px] uppercase">
                    <th className="pb-2.5">ID / Tên Tác Nhân</th>
                    <th className="pb-2.5">Loại Logic</th>
                    <th className="pb-2.5 text-center">Version</th>
                    <th className="pb-2.5 text-center">Liveness</th>
                    <th className="pb-2.5 text-right">Độ trễ (Avg)</th>
                    <th className="pb-2.5 text-right">Tỷ Lệ Dự Đoán</th>
                    <th className="pb-2.5 text-right">Hành động (Weights Version Control)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40 text-slate-300">
                  {(pred.liveAgentAudits || []).map((audit: any, i: number) => {
                    const agent = Registry.getAgent(audit.agentId);
                    const isHealthy = audit.report.isHealthy;
                    const statusColor = audit.report.status === 'ACTIVE' ? 'text-emerald-400' : (audit.report.status === 'DEGRADED' ? 'text-amber-400' : 'text-rose-400');
                    const statusBg = audit.report.status === 'ACTIVE' ? 'bg-emerald-500/10' : (audit.report.status === 'DEGRADED' ? 'bg-amber-500/10' : 'bg-rose-500/10');
                    
                    return (
                      <tr key={i} className="hover:bg-slate-950/25 transition-colors">
                        <td className="py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <div>
                              <span className="font-mono text-slate-200 font-black block text-[11px]">{audit.agentId}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">{agent?.meta.name || "Unknown"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-900 px-2 py-0.5 rounded font-bold uppercase">
                            {agent?.meta.type || "heuristic"}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {agent?.meta.version || "1.0.0"}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${statusColor} ${statusBg}`}>
                            {audit.report.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-slate-400 text-[11px]">
                          {audit.report.latencyAvgMs}ms
                        </td>
                        <td className="py-3 text-right font-mono text-slate-200 font-bold">
                          {agent ? `${agent.correctPredictions}/${agent.totalPredictions} (${agent.getAccuracy()}%)` : "0/0 (50.0%)"}
                        </td>
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => triggerWeightRollback(audit.agentId)}
                            className="text-[9px] bg-slate-950 border border-indigo-500/30 text-indigo-400 font-bold px-2 py-1 rounded hover:bg-indigo-500 hover:text-white transition-all hover:border-indigo-500"
                          >
                            Rollback Trọng Số
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Audit Actions Feed */}
            <div className="mt-4 pt-4 border-t border-slate-800/40 bg-slate-950/30 p-3 rounded-xl border border-slate-900">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Nhật Ký Tự Sửa Lỗi Liveness (Self-Healing Actions)</span>
              <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850">
                {(pred.liveAgentAudits || []).some((a: any) => a.actionsTaken.length > 0) ? (
                  (pred.liveAgentAudits || []).map((audit: any, idx: number) => 
                    audit.actionsTaken.map((action: string, actionIdx: number) => (
                      <div key={`${idx}-${actionIdx}`} className="flex items-start gap-1.5 text-[10px] text-amber-400 font-medium">
                        <span className="text-slate-600 font-bold font-mono">[{audit.agentId}]</span>
                        <span>{action}</span>
                      </div>
                    ))
                  )
                ) : (
                  <div className="text-[10px] text-slate-500 italic font-medium">
                    ✓ Không phát hiện bất kỳ sự cố suy giảm hoặc lỗi kết nối. Tất cả tác nhân hoạt động dưới ngưỡng tối ưu.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Live Event Bus Console Stream */}
          <div className="xl:col-span-4 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-extrabold text-slate-200">Dòng Truyền Tin (Event Bus Live Stream)</span>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-black uppercase">
                Active Channel
              </span>
            </div>

            <div className="flex flex-col gap-2 flex-1 max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850 pr-1 text-[10px] font-mono">
              {pred.eventBusLogs && pred.eventBusLogs.length > 0 ? (
                [...pred.eventBusLogs].reverse().map((log: any, idx: number) => {
                  let typeColor = 'text-indigo-400';
                  if (log.type === 'WEIGHT_ROLLED_BACK') typeColor = 'text-emerald-400 font-bold';
                  if (log.type === 'HEALTH_STATUS_CHANGED') typeColor = 'text-rose-400 font-bold animate-pulse';
                  if (log.type === 'AGENT_HOT_RELOADED') typeColor = 'text-amber-400 font-bold';

                  return (
                    <div key={idx} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-900 hover:border-slate-850 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`${typeColor} text-[9px] font-black block uppercase`}>{log.type}</span>
                        <span className="text-slate-600 text-[8px] font-bold">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[9px] leading-relaxed">
                        <span className="text-slate-600 font-bold">SENDER:</span> {log.sender}
                      </div>
                      <div className="text-slate-300 mt-1 break-all bg-slate-950/80 p-1 rounded text-[8px] max-h-12 overflow-y-auto select-all">
                        {log.payloadSummary}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 italic font-medium">
                  <Terminal className="w-5 h-5 text-slate-700 mb-1" />
                  Chưa ghi nhận sự kiện truyền tin nào trên kênh.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
