/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Draw {
  id: string;
  date: string;
  numbers: number[]; // 3 numbers, each 1-6
  isManual?: boolean;
  raw?: any;
}

export type SumType = 'TAI' | 'XIU' | 'HOA';

export interface ProbabilityScores {
  TAI: number;
  XIU: number;
  HOA: number;
}

export interface PredictionResult {
  predictedType: SumType;
  predictedSum: number;
  confidence: number; // 0 - 100
  aiScores: ProbabilityScores;
  detectedPattern: string;
  patternConfidence: number; // 0 - 100
  riskLevel: 'RẤT THẤP' | 'THẤP' | 'TRUNG BÌNH' | 'CAO' | 'RẤT CAO';
  riskColorBg: string;
  riskColorText: string;
  riskColorBorder: string;
  kellyFraction: number; // 0 - 1
  capitalAdvice: string; // Bet advice string
  systemStability: number; // 0 - 100% stability
  marketState: string; // e.g., "Bình ổn", "Xu thế bệt dốc", "Dao động ngẫu nhiên"
  learningIteration: number; // Number of cycles trained
  topAgentName: string; // Name of the leading background agent
  topAgentWeight: number; // Percentage weight of leading agent
  geminiDebateLog?: string;
  geminiWeightsBias?: ProbabilityScores;
  geminiConfidenceAdjustment?: number;
  geminiAiReflection?: string;
  // Advanced stress-test audited fields
  multiTimeframeStatus?: {
    shortTermTrend: SumType;
    longTermTrend: SumType;
    hasDivergence: boolean;
    divergenceWarning: string;
  };
  agentSyncStatus?: {
    activeAgentsCount: number;
    timedOutAgents: string[];
    syncLatencyMs: number;
    timeoutThresholdMs: number;
  };
  shadowTestStatus?: {
    shadowModelName: string;
    shadowAccuracy: number;
    productionAccuracy: number;
    hotSwapTriggered: boolean;
  };
  xaiExplanation?: string;
  optimizedPayload?: {
    prediction: SumType;
    probability: ProbabilityScores;
    confidence: number;
    stability: number;
    xai: string;
  };
  // Highly-Advanced quant stress-test structures
  errorBacktrace?: ErrorBacktraceLog[];
  onlineLearningStatus?: OnlineLearningStatus;
  conceptDriftStatus?: ConceptDriftStatus;
  consensusNoiseStatus?: ConsensusNoiseStatus;
  macroShockStatus?: MacroShockStatus;
  liveAgentAudits?: {
    agentId: string;
    report: {
      isHealthy: boolean;
      uptimeSeconds: number;
      latencyAvgMs: number;
      consecutiveFailures: number;
      status: string;
    };
    actionsTaken: string[];
  }[];
  eventBusLogs?: {
    type: string;
    sender: string;
    timestamp: number;
    payloadSummary: string;
  }[];
  hasDynamicHotReloadTriggered?: boolean;
}

export interface ErrorBacktraceLog {
  drawId: string;
  expected: SumType;
  prediction: SumType;
  noisyAgents: {
    agentName: string;
    predicted: SumType;
    penaltyTag: string;
  }[];
}

export interface OnlineLearningStatus {
  learningRate: number;
  memoryUsageStatus: string;
  elasticAnchorScore: number;
  neuralWeightsDelta: { agentName: string; delta: number }[];
}

export interface ConceptDriftStatus {
  driftScore: number;
  isDriftDetected: boolean;
  method: string;
  currentPhase: 'sideways' | 'trending';
  trendAgentsDiscount: number;
  psiScore?: number;
  ksDistance?: number;
  analysisMessage?: string;
  refDist?: { TAI: number; XIU: number; HOA: number };
  tgtDist?: { TAI: number; XIU: number; HOA: number };
}

export interface ConsensusNoiseStatus {
  isNoiseAlertActive: boolean;
  filterTriggered: boolean;
  decisionMatrixAction: string;
}

export interface MacroShockStatus {
  isFrozen: boolean;
  freezeReason: string;
  frozenConfidenceOverride: number;
}

export interface AffinityPair {
  num1: number;
  num2: number;
  count: number;
  correlation: number; // 0 - 1
}

export interface FrequencyData {
  number: number;
  count: number;
  percentage: number;
}

export interface SumFrequencyData {
  sum: number;
  count: number;
  percentage: number;
}

export interface Analytics {
  totalAnalyzed: number;
  lastDrawNumbers: number[];
  lastDrawSum: number;
  lastDrawState: SumType;
  
  // Frequencies
  frequencies: FrequencyData[];
  sumFrequencies: SumFrequencyData[];
  hotNumbers: number[];
  coldNumbers: number[];
  coreNumber: number; // Most frequent number
  
  // Sleep Times (Cold lengths)
  sleepTimes: Record<number, number>; // number -> sleep length
  sumSleepTimes: Record<number, number>; // sum -> sleep length
  taiSleep: number;
  xiuSleep: number;
  hoaSleep: number;
  
  // Streaks
  currentStreakType: SumType;
  currentStreakLength: number;
  maxTaiStreak: number;
  maxXiuStreak: number;
  maxHoaStreak: number;
  
  // Distribution percentages
  taiPercentage: number;
  xiuPercentage: number;
  hoaPercentage: number;
  evenPercentage: number;
  oddPercentage: number;
  
  // Advanced models
  markovMatrix: Record<SumType, Record<SumType, number>>;
  affinityMatrix: number[][]; // 6x6 matrix of co-occurrence
  knnPatternStr: string;
  knnMatchCount: number;
  knnResults: ProbabilityScores;
  volatility: number; // rolling standard deviation of sums
  
  // Ultimate Prediction
  prediction: PredictionResult;
  roadmap: { id: string; type: SumType; sum: number }[];
  
  // Individual predictions computed simultaneously
  markovKnnPred: {
    predictedType: SumType;
    predictedSum: number;
    confidence: number;
    scores: ProbabilityScores;
  };
  arEmaPred: {
    predictedType: SumType;
    predictedSum: number;
    confidence: number;
    scores: ProbabilityScores;
  };
  mlpPred: {
    predictedType: SumType;
    predictedSum: number;
    confidence: number;
    scores: ProbabilityScores;
  };
  bdmcPred: {
    predictedType: SumType;
    predictedSum: number;
    confidence: number;
    scores: ProbabilityScores;
  };
  monteCarloPred: {
    predictedType: SumType;
    predictedSum: number;
    confidence: number;
    scores: ProbabilityScores;
  };
  treePred: {
    predictedType: SumType;
    predictedSum: number;
    confidence: number;
    scores: ProbabilityScores;
  };
  lstmPred: {
    predictedType: SumType;
    predictedSum: number;
    confidence: number;
    scores: ProbabilityScores;
  };
  xgboostPred: {
    predictedType: SumType;
    predictedSum: number;
    confidence: number;
    scores: ProbabilityScores;
  };
  transformerPred: {
    predictedType: SumType;
    predictedSum: number;
    confidence: number;
    scores: ProbabilityScores;
  };
  
  // Backtested Accuracies (Self-learning weights)
  markovKnnAccuracy: number;
  arEmaAccuracy: number;
  mlpAccuracy: number;
  bdmcAccuracy: number;
  monteCarloAccuracy: number;
  treeAccuracy: number;
  lstmAccuracy: number;
  xgboostAccuracy: number;
  transformerAccuracy: number;
  backtestCount: number;
}
