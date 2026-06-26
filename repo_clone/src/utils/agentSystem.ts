// ============================================================================
// @AI_SYSTEM_DIRECTIVE
// @ROLE: Senior Software Architect & Security Expert
// 
// @STRICT_RULES:
// 1. DEBUGGING: Phân tích Root-Cause trước khi sửa. KHÔNG làm hỏng logic cũ (Zero-Regression).
// 2. ERROR_HANDLING: Tự động thêm Try-Except, Validate dữ liệu đầu vào, bắt lỗi None.
// 3. REFACTORING: Áp dụng SOLID, DRY, KISS. Chia nhỏ hàm nếu quá dài. Tối ưu Big-O.
// 4. FUTURE_PROOF: Viết mã theo chuẩn Modular, Type Hinting (nếu có). 
// 5. OUTPUT: Cung cấp mã hoàn chỉnh, KHÔNG dùng "..." hay "code cũ ở đây". 
// 6. COMMENTS: Comment bằng tiếng Việt để giải thích "TẠI SAO" (Why).
// ============================================================================

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Draw, SumType, ProbabilityScores } from '../types';

// ==========================================
// 1. SCHEMA DEFINITION & RUNTIME VALIDATORS
// ==========================================

export interface AgentMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'time_series' | 'neural_network' | 'bayesian' | 'ensemble' | 'heuristic';
}

export interface PredictionOutput {
  predictedType: SumType;
  predictedSum: number;
  scores: ProbabilityScores;
  latencyMs: number;
  timestamp: number;
}

export interface WeightCommit {
  versionId: string;
  timestamp: number;
  weights: Record<string, number>;
  accuracySnapshot: number;
  author: string;
  tag?: string; // 'PROD-ACTIVE', 'ACCURACY-PEAK', 'BACKUP'
}

export interface HealthReport {
  isHealthy: boolean;
  uptimeSeconds: number;
  latencyAvgMs: number;
  lastError?: string;
  consecutiveFailures: number;
  status: 'ACTIVE' | 'DEGRADED' | 'FAILED';
}

/**
 * Validates the prediction payload at runtime to prevent invalid inputs/outputs.
 */
export function validatePredictionOutput(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  if (!['TAI', 'XIU', 'HOA'].includes(payload.predictedType)) return false;
  if (typeof payload.predictedSum !== 'number' || payload.predictedSum < 3 || payload.predictedSum > 18) return false;
  if (!payload.scores || typeof payload.scores !== 'object') return false;
  const { TAI, XIU, HOA } = payload.scores;
  if (typeof TAI !== 'number' || typeof XIU !== 'number' || typeof HOA !== 'number') return false;
  return true;
}


// ==========================================
// 2. EVENT BUS (CƠ CHẾ TRUYỀN TIN CHÉO)
// ==========================================

export type SystemEventType = 
  | 'PREDICTION_COMPLETED'
  | 'WEIGHT_UPDATED'
  | 'WEIGHT_ROLLED_BACK'
  | 'CONCEPT_DRIFT_DETECTED'
  | 'AGENT_REGISTERED'
  | 'AGENT_HOT_RELOADED'
  | 'HEALTH_STATUS_CHANGED'
  | 'AUTO_LABEL_FEEDBACK';

export interface SystemEvent {
  type: SystemEventType;
  sender: string;
  timestamp: number;
  payload: any;
}

export type EventCallback = (event: SystemEvent) => void;

class CentralEventBus {
  private subscribers = new Map<SystemEventType, Set<EventCallback>>();

  public subscribe(type: SystemEventType, callback: EventCallback): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(callback);
    return () => {
      this.subscribers.get(type)?.delete(callback);
    };
  }

  public publish(event: SystemEvent): void {
    const list = this.subscribers.get(event.type);
    if (list) {
      list.forEach(cb => {
        try {
          cb(event);
        } catch (e) {
          console.error(`[EventBus] Sai số khi thực hiện callback sự kiện:`, e);
        }
      });
    }
  }

  public clear(): void {
    this.subscribers.clear();
  }
}

export const EventBus = new CentralEventBus();


// ==========================================
// 3. BASE AGENT CLASS (THIẾT KẾ LỚP TÁC NHÂN CƠ SỞ)
// ==========================================

export abstract class BasePredictiveAgent {
  public readonly meta: AgentMetadata;
  public weights: Record<string, number> = {};
  public isHealthy = true;
  public totalPredictions = 0;
  public correctPredictions = 0;
  public lastExecutionTimeMs = 0;
  public weightHistory: WeightCommit[] = [];
  
  protected consecutiveFailures = 0;
  protected latencyHistory: number[] = [];
  protected activeVersionCounter = 1;

  constructor(meta: AgentMetadata, initialWeights: Record<string, number> = {}) {
    this.meta = meta;
    this.weights = { ...initialWeights };
    this.commitWeights("Khởi tạo ban đầu", 50.0, 'PROD-ACTIVE');
  }

  /**
   * Core forecasting abstraction.
   */
  public abstract generatePrediction(history: Draw[]): Promise<ProbabilityScores & { predictedSum: number }>;

  /**
   * Executes the prediction within a monitored sandbox.
   */
  public async execute(history: Draw[]): Promise<PredictionOutput> {
    const startTime = performance.now();
    try {
      if (!this.isHealthy) {
        throw new Error(`Tác nhân ${this.meta.name} đang trong trạng thái lỗi.`);
      }

      const result = await this.generatePrediction(history);
      const latency = performance.now() - startTime;
      this.lastExecutionTimeMs = Number(latency.toFixed(2));
      this.latencyHistory.push(this.lastExecutionTimeMs);
      if (this.latencyHistory.length > 50) this.latencyHistory.shift();

      this.totalPredictions++;
      this.consecutiveFailures = 0;

      const output: PredictionOutput = {
        predictedType: result.predictedSum >= 12 ? 'TAI' : (result.predictedSum >= 10 ? 'HOA' : 'XIU'),
        predictedSum: result.predictedSum,
        scores: {
          TAI: result.TAI,
          XIU: result.XIU,
          HOA: result.HOA
        },
        latencyMs: this.lastExecutionTimeMs,
        timestamp: Date.now()
      };

      // Publish to event bus
      EventBus.publish({
        type: 'PREDICTION_COMPLETED',
        sender: this.meta.id,
        timestamp: Date.now(),
        payload: output
      });

      return output;
    } catch (err: any) {
      this.consecutiveFailures++;
      this.isHealthy = this.consecutiveFailures < 3;
      this.lastExecutionTimeMs = Number((performance.now() - startTime).toFixed(2));
      
      EventBus.publish({
        type: 'HEALTH_STATUS_CHANGED',
        sender: this.meta.id,
        timestamp: Date.now(),
        payload: { isHealthy: this.isHealthy, error: err.message }
      });
      throw err;
    }
  }

  // ==========================================
  // VERSION CONTROL FOR WEIGHTS (KIỂM SOÁT PHIÊN BẢN LOGIC)
  // ==========================================
  
  public commitWeights(author: string, currentAccuracy: number, tag?: string): string {
    const versionId = `v${this.meta.version}.${this.activeVersionCounter++}`;
    const commit: WeightCommit = {
      versionId,
      timestamp: Date.now(),
      weights: { ...this.weights },
      accuracySnapshot: Number(currentAccuracy.toFixed(1)),
      author,
      tag
    };

    // Keep active tags clean
    if (tag === 'PROD-ACTIVE' || tag === 'ACCURACY-PEAK') {
      this.weightHistory.forEach(c => {
        if (c.tag === tag) c.tag = undefined;
      });
    }

    this.weightHistory.push(commit);
    if (this.weightHistory.length > 30) this.weightHistory.shift(); // Memory bound O(1) constant buffer

    EventBus.publish({
      type: 'WEIGHT_UPDATED',
      sender: this.meta.id,
      timestamp: Date.now(),
      payload: commit
    });

    return versionId;
  }

  public rollbackTo(versionId: string): boolean {
    const target = this.weightHistory.find(c => c.versionId === versionId);
    if (!target) return false;
    
    this.weights = { ...target.weights };
    
    EventBus.publish({
      type: 'WEIGHT_ROLLED_BACK',
      sender: this.meta.id,
      timestamp: Date.now(),
      payload: { versionId, weights: this.weights }
    });
    return true;
  }

  public getAccuracy(): number {
    if (this.totalPredictions === 0) return 50.0;
    return Number(((this.correctPredictions / this.totalPredictions) * 100).toFixed(1));
  }

  public getHealthReport(): HealthReport {
    const totalLatency = this.latencyHistory.reduce((a, b) => a + b, 0);
    const latencyAvg = this.latencyHistory.length > 0 ? totalLatency / this.latencyHistory.length : 0;
    
    return {
      isHealthy: this.isHealthy,
      uptimeSeconds: Math.floor(performance.now() / 1000),
      latencyAvgMs: Number(latencyAvg.toFixed(2)),
      consecutiveFailures: this.consecutiveFailures,
      status: this.isHealthy ? (this.consecutiveFailures > 0 ? 'DEGRADED' : 'ACTIVE') : 'FAILED'
    };
  }
}


// ==========================================
// 4. STATE STORE (BỘ NHỚ TRẠNG THÁI TRỰC TUYẾN)
// ==========================================

export class CentralStateStore {
  private static instance: CentralStateStore;
  private state = new Map<string, any>();

  private constructor() {}

  public static getInstance(): CentralStateStore {
    if (!CentralStateStore.instance) {
      CentralStateStore.instance = new CentralStateStore();
    }
    return CentralStateStore.instance;
  }

  public get(key: string, defaultValue?: any): any {
    return this.state.has(key) ? this.state.get(key) : defaultValue;
  }

  public set(key: string, value: any): void {
    this.state.set(key, value);
  }

  public delete(key: string): void {
    this.state.delete(key);
  }

  public clear(): void {
    this.state.clear();
  }
}

export const StateStore = CentralStateStore.getInstance();


// ==========================================
// 5. REGISTRY & HOT-RELOADING (ĐĂNG KÝ & CHẠY NÓNG KHÔNG DOWNTIME)
// ==========================================

export class AgentRegistry {
  private static instance: AgentRegistry;
  private registry = new Map<string, BasePredictiveAgent>();

  private constructor() {}

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Registers a new agent dynamically during runtime.
   * If an agent with the same ID already exists, it is hot-swapped smoothly
   * without affecting other running agents (Zero-Downtime Hot Reload).
   */
  public register(agent: BasePredictiveAgent): void {
    const isUpdate = this.registry.has(agent.meta.id);
    const existing = this.registry.get(agent.meta.id);

    if (isUpdate && existing) {
      // Hot-swapping weights & historical telemetry to preserve learning progression
      agent.weights = { ...existing.weights };
      agent.totalPredictions = existing.totalPredictions;
      agent.correctPredictions = existing.correctPredictions;
      agent.weightHistory = [...existing.weightHistory];
      
      this.registry.set(agent.meta.id, agent);
      
      EventBus.publish({
        type: 'AGENT_HOT_RELOADED',
        sender: 'AI_CENTRAL_CORE',
        timestamp: Date.now(),
        payload: { id: agent.meta.id, name: agent.meta.name, version: agent.meta.version }
      });
    } else {
      this.registry.set(agent.meta.id, agent);
      
      EventBus.publish({
        type: 'AGENT_REGISTERED',
        sender: 'AI_CENTRAL_CORE',
        timestamp: Date.now(),
        payload: { id: agent.meta.id, name: agent.meta.name, version: agent.meta.version }
      });
    }
  }

  public unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  public getAgent(id: string): BasePredictiveAgent | undefined {
    return this.registry.get(id);
  }

  public getActiveAgents(): BasePredictiveAgent[] {
    return Array.from(this.registry.values());
  }

  public clear(): void {
    this.registry.clear();
  }
}

export const Registry = AgentRegistry.getInstance();


// ==========================================
// 6. AUTO-LABELING (TỰ ĐỘNG NHÃN DỮ LIỆU & TRUY VẾT SAI LỆCH)
// ==========================================

export interface LabelingFeedback {
  drawId: string;
  actualSum: number;
  actualType: SumType;
  corrections: {
    agentId: string;
    agentName: string;
    wasCorrect: boolean;
    predictedType: SumType;
    penaltyWeightDiscount: number;
    penaltyTag: string;
  }[];
}

export class AutoLabeler {
  /**
   * Automatically labels new incoming draws and runs a comparative backtrace
   * to evaluate and punish noisy agents.
   */
  public static processNewDraw(draw: Draw, predictions: Record<string, PredictionOutput>): LabelingFeedback {
    const actualSum = draw.numbers.reduce((a, b) => a + b, 0);
    const actualType = actualSum >= 12 ? 'TAI' : (actualSum >= 10 ? 'HOA' : 'XIU');
    
    const corrections: LabelingFeedback['corrections'] = [];

    Object.entries(predictions).forEach(([agentId, pred]) => {
      const agent = Registry.getAgent(agentId);
      if (!agent) return;

      const wasCorrect = pred.predictedType === actualType;
      
      if (wasCorrect) {
        agent.correctPredictions++;
      }

      let penaltyWeightDiscount = 0;
      let penaltyTag = "✓ Tín hiệu chính xác";

      if (!wasCorrect) {
        // Punish agent weights for noisy output
        penaltyWeightDiscount = 0.05; // 5% weight discount
        penaltyTag = actualType === 'HOA' 
          ? "⚠️ Nhiễu điểm dồn (HÒA trung vị)" 
          : `⚠️ Phản tín hiệu ngược hướng (Dự đoán ${pred.predictedType} - Kết quả ${actualType})`;
        
        // Dynamic weight decay based on fault severity
        Object.keys(agent.weights).forEach(k => {
          agent.weights[k] *= (1 - penaltyWeightDiscount);
        });

        agent.commitWeights("Auto-Labeler Penalty", agent.getAccuracy(), 'BACKUP');
      }

      corrections.push({
        agentId,
        agentName: agent.meta.name,
        wasCorrect,
        predictedType: pred.predictedType,
        penaltyWeightDiscount,
        penaltyTag
      });
    });

    const feedback: LabelingFeedback = {
      drawId: String(draw.id),
      actualSum,
      actualType,
      corrections
    };

    EventBus.publish({
      type: 'AUTO_LABEL_FEEDBACK',
      sender: 'AUTO_LABEL_ENGINE',
      timestamp: Date.now(),
      payload: feedback
    });

    return feedback;
  }
}


// ==========================================
// 7. HEALTH MONITOR (THEO DÕI SỨC KHỎE TÁC NHÂN)
// ==========================================

export class HealthMonitor {
  /**
   * Audits all active agents in the registry and outputs diagnostic results.
   */
  public static runAudit(): { agentId: string; report: HealthReport; actionsTaken: string[] }[] {
    const audits: { agentId: string; report: HealthReport; actionsTaken: string[] }[] = [];
    const agents = Registry.getActiveAgents();

    agents.forEach(agent => {
      const report = agent.getHealthReport();
      const actionsTaken: string[] = [];

      if (report.status === 'FAILED') {
        // Automatic Self-Healing: Reset counters & attempt a soft reboot of the agent
        agent.isHealthy = true;
        actionsTaken.push("🚨 Sửa lỗi tự động: Kích hoạt khôi phục cứng tác nhân bị hỏng.");
      } else if (report.status === 'DEGRADED') {
        if (report.latencyAvgMs > 100) {
          actionsTaken.push("⚠️ Cảnh báo: Phát hiện độ trễ tính toán vượt ngưỡng tối ưu. Bắt đầu thu hẹp kích thước lag.");
        }
      }

      audits.push({
        agentId: agent.meta.id,
        report,
        actionsTaken
      });
    });

    return audits;
  }
}
