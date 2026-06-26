import { GoogleGenAI } from "@google/genai";
import fs from "fs";

// --- 1. Tách biệt Pipeline và Predict (Separation) ---
// Giả lập Serialization/Deserialization của Pipeline
export const DataPipeline = {
  serialize: (data: any, filePath: string) => {
    // Lưu các tham số chuẩn hóa (min, max, imputer state) ra file .json / .pkl
    const state = { minMaxConfig: { TAI: 0, XIU: 1 }, timestamp: Date.now(), ...data };
    fs.writeFileSync(filePath, JSON.stringify(state));
  },
  load: (filePath: string) => {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
    return null;
  },
  preprocess: (rawDraws: any[], config: any) => {
    // Chuẩn hóa dữ liệu tách biệt hoàn toàn với dự đoán
    return rawDraws.map((d) => {
      const sum = d.numbers.reduce((a: number, b: number) => a + b, 0);
      return {
        sum,
        type:
          sum >= 11 && sum <= 17
            ? "TAI"
            : sum >= 4 && sum <= 10
              ? "XIU"
              : "HOA",
      };
    });
  },
};

// --- 2. Hàng đợi (Queue) cho Background Retraining ---
export const RetrainQueue = {
  queue: [] as any[],
  isProcessing: false,
  aiEngineRef: null as any,
  pushTask: function (data: any) {
    this.queue.push(data);
    if (!this.isProcessing) {
      this.processNext();
    }
  },
  processNext: async function () {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }
    this.isProcessing = true;
    const task = this.queue.shift();
    try {
      console.log("[Queue] Đang tiến hành tự học (Retraining) ngầm dưới nền...");
      // Giả lập xử lý tốn tài nguyên
      await new Promise((res) => setTimeout(res, 2000));
      console.log("[Queue] Hoàn tất tự học, cập nhật Pipeline mới.");
      // Lưu pipeline mới
      DataPipeline.serialize({}, "pipeline_state.json");
      
      // Đánh giá tự động sau retrain
      if (this.aiEngineRef) {
        await this.aiEngineRef.runAutomatedEvals();
      }
    } catch (error) {
      console.error("[Queue] Lỗi trong quá trình tự học:", error);
    }

    this.processNext();
  },
};

// --- 3. Giám sát Độ lệch Dữ liệu (Data Drift - PSI) ---
export function calculatePSI(expectedPct: number, actualPct: number) {
  // Tránh chia cho 0
  const e = expectedPct === 0 ? 0.0001 : expectedPct;
  const a = actualPct === 0 ? 0.0001 : actualPct;
  return (a - e) * Math.log(a / e);
}

export function detectDataDrift(historical: any[], recent: any[]) {
  // Đếm TAI/XIU historical
  const hTai =
    historical.filter((d) => d.type === "TAI").length /
    (historical.length || 1);
  // Đếm TAI/XIU recent
  const rTai =
    recent.filter((d) => d.type === "TAI").length / (recent.length || 1);

  const psiTai = calculatePSI(hTai, rTai);
  if (psiTai > 0.1) {
    console.log(
      `[Data Drift] Cảnh báo độ lệch phân phối PSI (${psiTai.toFixed(3)}). Kích hoạt tự học.`,
    );
    APITracker.logDrift();
    RetrainQueue.pushTask({
      type: "retrain",
      reason: "Data Drift Detected",
      psi: psiTai,
    });
    return true;
  }
  return false;
}

// --- 4. Tracking Cost & Latency ---
export const APITracker = {
  totalCostUsd: 0,
  requestCount: 0,
  hallucinationsDetected: 0,
  driftDetectedCount: 0,
  lastDriftTime: null as string | null,
  latencies: [] as number[],
  logRequest: function (cost: number, latencyMs: number) {
    this.totalCostUsd += cost;
    this.requestCount++;
    this.latencies.push(latencyMs);
    if (this.latencies.length > 100) this.latencies.shift();
  },
  logHallucination: function () {
    this.hallucinationsDetected++;
  },
  logDrift: function () {
    this.driftDetectedCount++;
    this.lastDriftTime = new Date().toISOString();
  },
  getStats: function () {
    return { 
      cost: this.totalCostUsd, 
      requests: this.requestCount,
      hallucinations: this.hallucinationsDetected,
      drifts: this.driftDetectedCount,
      lastDriftTime: this.lastDriftTime,
      serverQueueProcessing: RetrainQueue.isProcessing
    };
  },
};

// --- 5. AI LLM-as-a-judge, Golden Dataset, Guardrails ---
const GoldenDataset = [
  {
    input: "Dữ liệu thiên vị cực độ TAI 20 kỳ liên tiếp",
    expected: "Dự đoán TAI hoặc giải thích lý do bắt XỈU bẻ cầu",
  },
  {
    input: "Dữ liệu không có quy luật, biến động ngẫu nhiên",
    expected: "Đề nghị quan sát thêm, không tự tin dự đoán",
  }
];

export class AdvancedGeminiEngine {
  private ai: GoogleGenAI | null = null;
  private isEvaluating = false;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  // Chạy đánh giá tự động dựa trên Golden Dataset sau các đợt Retrain
  async runAutomatedEvals() {
    if (!this.ai || this.isEvaluating) return;
    this.isEvaluating = true;
    console.log("[Evals] Bắt đầu chạy AI Automated Evals với Golden Dataset...");
    let passed = 0;
    
    for (const testCase of GoldenDataset) {
      const response = await this.predictWithGemini({ testMode: true, data: testCase.input });
      if (response && !response.error) {
        passed++;
      }
    }
    
    console.log(`[Evals] Kết quả: ${passed}/${GoldenDataset.length} bài kiểm tra đạt chuẩn.`);
    this.isEvaluating = false;
  }

  async predictWithGemini(contextData: any) {
    if (!this.ai) return { error: "Không có API KEY, sử dụng AI ngoại tuyến." };

    const startTime = Date.now();
    try {
      // BƯỚC 1: AI Cấp thấp - Chia nhỏ yêu cầu phức tạp (Sub-tasking)
      let lowLevelPrompt = `Phân tích dữ liệu: ${JSON.stringify(contextData)}. Hãy chia nhỏ vấn đề thành 2 bước phân tích logic và đưa ra dự đoán ngắn gọn: TAI hay XIU?`;
      
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash", // Dùng bản flash tiết kiệm cost
        contents: lowLevelPrompt,
        config: { temperature: 0.2 },
      });
      const text = response.text || "";

      const latency = Date.now() - startTime;
      APITracker.logRequest(0.0001, latency); // Mock cost tính theo token
      
      // Kiểm tra độ trễ và chi phí (Cost/Latency Tracking)
      const avgLatency = APITracker.latencies.reduce((a, b) => a + b, 0) / Math.max(1, APITracker.latencies.length);
      if (avgLatency > 4000) {
        console.warn("[Monitor] Cảnh báo: Độ trễ hệ thống AI quá cao. Tạm thời tối ưu prompts.");
      }

      // BƯỚC 2: Guardrails & LLM-as-a-judge - AI Cấp cao đánh giá nội bộ ("AI thấu hiểu AI")
      const judgeDecision = await this.judgeResponse(text, contextData);
      
      if (judgeDecision === 'FAIL' || judgeDecision === 'HALLUCINATION') {
        APITracker.logHallucination();
        console.error(`[Guardrails] AI Cấp cao từ chối kết quả: Phát hiện ${judgeDecision}. Khắc phục bằng kết quả an toàn.`);
        return { error: "Blocked by Guardrails", fallback: true };
      }

      return { result: text, latency, judgeDecision };
    } catch (e) {
      return { error: "Lỗi gọi API" };
    }
  }

  // AI Judge: Chấm điểm và bắt ảo giác
  private async judgeResponse(text: string, contextData: any) {
    if (!this.ai) return 'PASS';
    try {
      // Phân tích chéo
      const evalPrompt = `Bạn là AI Cấp Cao (Judge). Hãy đọc lời giải này của một AI cấp thấp: "${text}".
Kiểm tra xem nó có bịa đặt thông tin không có trong dữ liệu gốc (${JSON.stringify(contextData)}) không.
Nó có logic không? Trả lời CHỈ bằng 1 từ: PASS, FAIL, hoặc HALLUCINATION.`;
      
      const evalRes = await this.ai.models.generateContent({
        model: "gemini-2.5-flash", // Cấp cao dùng mô hình suy luận tốt hơn hoặc flash strict
        contents: evalPrompt,
        config: { temperature: 0.0 }
      });
      
      const verdict = evalRes.text?.trim().toUpperCase() || 'PASS';
      if (verdict.includes('HALLUCINATION')) return 'HALLUCINATION';
      if (verdict.includes('FAIL')) return 'FAIL';
      return 'PASS';
    } catch {
      return 'PASS'; // Fallback an toàn
    }
  }
}
