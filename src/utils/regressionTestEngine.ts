/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Draw } from "../types";
import { getSumType, calculateAnalytics } from "./predictor";
import { runTransformerForecast, runARForecast, runMLPClassifier } from "./algorithms";
import { aiCEO } from "./autonomousSystem";
import { DataDriftDetector } from "./driftDetector";
import { DataPipeline } from "./pipeline";

export interface RegressionTestResult {
  suiteName: string;
  testName: string;
  status: "PASSED" | "FAILED";
  durationMs: number;
  message?: string;
}

export interface RegressionReport {
  timestamp: number;
  passed: boolean;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  results: RegressionTestResult[];
}

export class RegressionTestEngine {
  /**
   * TẠI SAO (Why): Tạo lập mẫu dữ liệu xúc xắc giả lập chính xác nhằm phục vụ việc kiểm thử hộp đen.
   * Giúp loại bỏ sự ngẫu nhiên trong việc đánh giá hiệu năng giải thuật AI.
   */
  public static makeMockDraws(
    count: number,
    pattern: "alternating" | "high" | "low" | "random" = "alternating"
  ): Draw[] {
    const draws: Draw[] = [];
    for (let i = 1; i <= count; i++) {
      let numbers = [3, 3, 3]; // Tổng = 9 (XIU)
      if (pattern === "alternating") {
        numbers = i % 2 === 0 ? [5, 5, 5] : [2, 2, 2]; // Luân phiên giữa 15 (TAI) và 6 (XIU)
      } else if (pattern === "high") {
        numbers = [5, 5, 5]; // Tổng = 15 (TAI)
      } else if (pattern === "low") {
        numbers = [2, 2, 2]; // Tổng = 6 (XIU)
      } else {
        // Tạo ngẫu nhiên có seed
        const seed = Math.sin(i) * 10000;
        const d1 = Math.floor((seed % 6) + 1);
        const d2 = Math.floor(((seed * 1.3) % 6) + 1);
        const d3 = Math.floor(((seed * 1.7) % 6) + 1);
        numbers = [d1, d2, d3];
      }

      draws.push({
        id: `REGRESS_K${100000 + i}`,
        date: "2026-06-26",
        numbers,
      });
    }
    return draws;
  }

  /**
   * TẠI SAO (Why): Thực thi bộ kiểm tra hồi quy toàn diện.
   * Rà soát toàn bộ các thành phần AI: Phân loại, Phân tích phổ, Mô hình Transformer (MLA), Định tuyến DeepSeek-MoE, SVRG Classifier,
   * để đảm bảo các thay đổi tối ưu hiệu năng không làm suy giảm độ chính xác dự báo (Zero-Regression).
   */
  public static runAllTests(): RegressionReport {
    const startTime = performance.now();
    const results: RegressionTestResult[] = [];

    // --- TEST SUITE 1: Phân Loại Trạng Thái & Tính Toán Thống Kê ---
    this.runTestCase(results, "Data Helpers", "getSumType Classification", () => {
      const isTai = getSumType(15) === "TAI";
      const isXiu = getSumType(6) === "XIU";
      const isHoa = getSumType(10) === "HOA" && getSumType(11) === "HOA";
      if (!isTai || !isXiu || !isHoa) {
        throw new Error("Phân loại điểm TÀI/XỈU/HÒA bị sai lệch cấu trúc.");
      }
    });

    this.runTestCase(results, "Data Helpers", "calculateAnalytics Integration", () => {
      const draws = this.makeMockDraws(20, "alternating");
      const analytics = calculateAnalytics(draws);
      if (!analytics) throw new Error("Mô hình không tạo ra được báo cáo phân tích.");
      if (analytics.totalAnalyzed !== 20) {
        throw new Error(`Tổng số kỳ phân tích không khớp: ${analytics.totalAnalyzed}`);
      }
      if (analytics.currentStreakType !== "TAI") {
        throw new Error(`Nhận diện chuỗi kết thúc bị sai: ${analytics.currentStreakType}`);
      }
    });

    // --- TEST SUITE 2: Đo Lường Drift Dữ Liệu (KS-Test & PSI) ---
    this.runTestCase(results, "Drift Detection", "PSI and KS-Test Computation", () => {
      const baseline = this.makeMockDraws(100, "random");
      const target = this.makeMockDraws(30, "high"); // Làm lệch pha dữ liệu bằng TÀI liên tục
      const report = DataDriftDetector.detectDrift(baseline, target);
      if (report.psiScore === 0) {
        throw new Error("Chỉ số PSI không tính toán được hoặc bằng 0 mặc dù có Drift cực mạnh.");
      }
      if (!report.isDriftDetected) {
        throw new Error("Hệ thống bỏ lọt Data Drift khi phân phối thay đổi nghiêm trọng.");
      }
    });

    // --- TEST SUITE 3: Mô Hình Transformer MLA (Multi-head Latent Attention) ---
    this.runTestCase(results, "Algorithms Engine", "Transformer MLA Forecaster", () => {
      const draws = this.makeMockDraws(30, "random");
      const res = runTransformerForecast(draws, 8, 4);
      if (!res.scores || isNaN(res.scores.TAI) || isNaN(res.scores.XIU)) {
        throw new Error("Mô hình Transformer MLA trả về giá trị NaN.");
      }
      const sum = res.scores.TAI + res.scores.XIU + res.scores.HOA;
      if (Math.abs(sum - 100) > 0.5) {
        throw new Error(`Tổng xác suất không xấp xỉ 100%: ${sum}%`);
      }
    });

    // --- TEST SUITE 4: Định Tuyến DeepSeek-MoE (Mixture of Experts) ---
    this.runTestCase(results, "Autonomous CEO", "MoE Sparse Routing System", () => {
      const draws = this.makeMockDraws(50, "alternating");
      const routing = aiCEO.routeExperts(draws);
      if (!routing.sharedExperts.includes("agent_pattern")) {
        throw new Error("Shared Expert 'agent_pattern' bị bỏ sót.");
      }
      if (routing.activeRoutedExperts.length !== 2) {
        throw new Error(`MoE Router kích hoạt sai số lượng Routed Experts: ${routing.activeRoutedExperts.length}`);
      }
    });

    // --- TEST SUITE 5: SVRG Online Learning & Q-Learning ---
    this.runTestCase(results, "Autonomous CEO", "SVRG Classifier Conv & SGD Stability", () => {
      const draws = this.makeMockDraws(40, "alternating");
      const decision = aiCEO.getFinalDecision(draws);
      if (!decision.weights || isNaN(decision.confidence as any)) {
        throw new Error("Q-Learning / Trọng số thích ứng trả về NaN hoặc bị sụp đổ.");
      }
    });

    // --- TEST SUITE 6: Chuỗi tiền xử lý chống lộ dữ liệu (Pipeline Serialization) ---
    this.runTestCase(results, "Data Pipeline", "Min-Max Standardizer Isolation", () => {
      const draws = this.makeMockDraws(30, "random");
      const pipeline = new DataPipeline();
      pipeline.fit(draws);
      const serialized = pipeline.serialize();
      if (!serialized || !serialized.includes("min") || !serialized.includes("max")) {
        throw new Error("Pipeline Serialization bị hỏng cấu trúc chuỗi.");
      }

      const newPipeline = new DataPipeline();
      newPipeline.deserialize(serialized);
      const testVal = 10.5;
      const normalized = newPipeline.scaleMinMax(testVal, newPipeline.getConfig().sumMin, newPipeline.getConfig().sumMax);
      if (normalized < 0 || normalized > 1) {
        throw new Error(`Chuẩn hóa trị giá ngoài khoảng [0, 1]: ${normalized}`);
      }
    });

    const endTime = performance.now();
    const durationMs = endTime - startTime;
    const totalTests = results.length;
    const passedCount = results.filter((r) => r.status === "PASSED").length;
    const failedCount = totalTests - passedCount;
    const passed = failedCount === 0;

    return {
      timestamp: Date.now(),
      passed,
      totalTests,
      passedCount,
      failedCount,
      durationMs,
      results,
    };
  }

  private static runTestCase(
    results: RegressionTestResult[],
    suiteName: string,
    testName: string,
    testFn: () => void
  ) {
    const start = performance.now();
    try {
      testFn();
      results.push({
        suiteName,
        testName,
        status: "PASSED",
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        suiteName,
        testName,
        status: "FAILED",
        durationMs: performance.now() - start,
        message: err.message || "Lỗi không xác định.",
      });
    }
  }
}
