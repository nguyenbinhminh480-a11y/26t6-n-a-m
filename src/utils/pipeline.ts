
import { getDrawSum } from "./helpers";
// ============================================================================
// @AI_SYSTEM_DIRECTIVE
// @ROLE: Senior Software Architect, Data Science & AI Expert
//
// @DESCRIPTION:
// File này đóng gói toàn bộ quy trình Tiền xử lý dữ liệu (Data Pipeline)
// tách biệt hoàn toàn khỏi Logic Dự đoán của mô hình. Cung cấp cơ chế
// Đóng gói (Serialization) cấu hình tham số (Scaler, Imputer) thành chuỗi
// JSON đồng bộ giữa khâu Retraining (Học lại) và Prediction (Dự đoán).
// ============================================================================

import { Draw } from "../types";

export interface PipelineConfig {
  /** Phiên bản của bộ tiền xử lý */
  version: string;
  /** Thời gian cấu hình */
  timestamp: number;
  /** Giá trị gán mặc định cho dữ liệu trống (Imputer) */
  imputerDefaultValue: number;
  /** Tham số chuẩn hóa Min-Max của tổng điểm */
  sumMin: number;
  sumMax: number;
  /** Tham số chuẩn hóa Min-Max của EMA */
  emaMin: number;
  emaMax: number;
  /** Tham số chuẩn hóa Min-Max của động lượng (Momentum) */
  momentumMin: number;
  momentumMax: number;
  /** Tham số chuẩn hóa Min-Max của biến động (Volatility) */
  volatilityMin: number;
  volatilityMax: number;
}

export class DataPipeline {
  private config: PipelineConfig;

  constructor(customConfig?: PipelineConfig) {
    // Khởi tạo cấu hình mặc định (Default fallback parameters)
    this.config = customConfig || {
      version: "1.0.0",
      timestamp: Date.now(),
      imputerDefaultValue: 10.5, // Trung vị lý thuyết của 3 xúc xắc [3, 18]
      sumMin: 3,
      sumMax: 18,
      emaMin: 3,
      emaMax: 18,
      momentumMin: -15,
      momentumMax: 15,
      volatilityMin: 0,
      volatilityMax: 5,
    };
  }

  /**
   * Tính toán (Fit) các giá trị thống kê từ tập dữ liệu lịch sử để thiết lập bộ tham số chuẩn hóa.
   * Đây là bản sao của `pipeline.fit()` trong Python Scikit-Learn.
   */
  public fit(draws: Draw[]): void {
    if (!draws || draws.length === 0) return;

    const sums = draws.map((d) => {
      const s = getDrawSum(d);
      return isNaN(s) ? this.config.imputerDefaultValue : s;
    });

    // 1. Tính toán biên tối thiểu/tối đa thực tế của Tổng điểm (Min-Max)
    const actualMin = Math.min(...sums);
    const actualMax = Math.max(...sums);
    this.config.sumMin = Math.max(3, actualMin);
    this.config.sumMax = Math.min(18, actualMax);

    // 2. Tính toán biên của EMA và Momentum động dồn tích lũy
    const lag = 5;
    const emas: number[] = [];
    const momentums: number[] = [];
    const volatilities: number[] = [];

    for (let i = lag; i < sums.length; i++) {
      const window = sums.slice(i - lag, i);
      const ema = window.reduce(
        (acc, val, idx) => acc + val * Math.pow(0.8, lag - idx),
        0,
      );
      const momentum = window[lag - 1] - window[0];
      const mean = window.reduce((a, b) => a + b, 0) / lag;
      const variance =
        window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / lag;
      const volatility = Math.sqrt(variance);

      emas.push(ema);
      momentums.push(momentum);
      volatilities.push(volatility);
    }

    if (emas.length > 0) {
      this.config.emaMin = Math.min(...emas);
      this.config.emaMax = Math.max(...emas);
    }
    if (momentums.length > 0) {
      this.config.momentumMin = Math.min(...momentums);
      this.config.momentumMax = Math.max(...momentums);
    }
    if (volatilities.length > 0) {
      this.config.volatilityMin = Math.min(...volatilities);
      this.config.volatilityMax = Math.max(...volatilities);
    }

    this.config.timestamp = Date.now();
  }

  /**
   * Áp dụng chuẩn hóa (Transform) tập dữ liệu đầu vào dựa trên bộ cấu hình tham số đã học (fitted params).
   * VECTORIZATION CẢI TIẾN: Sử dụng Float64Array để tối ưu bộ đệm (cache-friendly) và
   * hiệu năng xử lý cho JavaScriptCore trên iOS.
   */
  public transform(
    draws: Draw[],
    lag = 5,
  ): {
    normalizedSums: number[];
    features: number[][];
    rawSums: number[];
  } {
    const defaultVal = this.config.imputerDefaultValue;
    const len = draws.length;

    // Tối ưu hóa Vectorization: Sử dụng TypedArray thay vì Array gốc cho tốc độ toán học cao
    const rawSumsBuffer = new Float64Array(len);

    for (let i = 0; i < len; i++) {
      const d = draws[i];
      if (!d || !d.numbers || !Array.isArray(d.numbers)) {
        rawSumsBuffer[i] = defaultVal;
      } else {
        const s = getDrawSum(d); // Fixed size 3 for dice
        rawSumsBuffer[i] = isNaN(s) ? defaultVal : s;
      }
    }

    // 1. Chuẩn hóa Min-Max của Tổng điểm
    const normalizedSums = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      normalizedSums[i] = this.scaleMinMax(
        rawSumsBuffer[i],
        this.config.sumMin,
        this.config.sumMax,
      );
    }

    // 2. Trích xuất các đặc trưng và chuẩn hóa đồng bộ
    const featureCount = len - lag;
    const features: number[][] = [];

    // Caching pow cho EMA
    const emaWeights = new Float64Array(lag);
    for (let i = 0; i < lag; i++) {
      emaWeights[i] = Math.pow(0.8, lag - i);
    }

    if (featureCount > 0) {
      for (let i = 0; i < featureCount; i++) {
        let rawEma = 0;
        let sumForMean = 0;
        const normWindow: number[] = new Array(lag);

        for (let j = 0; j < lag; j++) {
          const val = rawSumsBuffer[i + j];
          rawEma += val * emaWeights[j];
          sumForMean += val;
          normWindow[j] = normalizedSums[i + j];
        }

        const rawMomentum = rawSumsBuffer[i + lag - 1] - rawSumsBuffer[i];
        const mean = sumForMean / lag;

        let varianceSum = 0;
        for (let j = 0; j < lag; j++) {
          varianceSum += Math.pow(rawSumsBuffer[i + j] - mean, 2);
        }
        const rawVolatility = Math.sqrt(varianceSum / lag);

        // Chuẩn hóa đồng bộ theo cấu hình tham số của Pipeline
        const normEma = this.scaleMinMax(
          rawEma,
          this.config.emaMin,
          this.config.emaMax,
        );
        const normMomentum = this.scaleMinMax(
          rawMomentum,
          this.config.momentumMin,
          this.config.momentumMax,
        );
        const normVolatility = this.scaleMinMax(
          rawVolatility,
          this.config.volatilityMin,
          this.config.volatilityMax,
        );

        features.push([...normWindow, normEma, normMomentum, normVolatility]);
      }
    }

    return {
      normalizedSums: Array.from(normalizedSums),
      features,
      rawSums: Array.from(rawSumsBuffer),
    };
  }

  /**
   * Thực hiện đồng thời cả hai bước fit và transform dữ liệu.
   */
  public fitTransform(draws: Draw[], lag = 5) {
    this.fit(draws);
    return this.transform(draws, lag);
  }

  /**
   * Đóng gói (Serialize) cấu hình của pipeline thành dạng chuỗi JSON
   * Tương tự lưu trữ file .pkl hoặc .onnx của Python.
   */
  public serialize(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Tải lại (Deserialize) cấu hình của pipeline từ dạng chuỗi JSON để sử dụng đồng bộ.
   */
  public deserialize(serialized: string): void {
    try {
      const parsed = JSON.parse(serialized);
      if (parsed && typeof parsed === "object") {
        this.config = { ...this.config, ...parsed };
      }
    } catch (err) {
      console.error("[Pipeline] Lỗi nạp cấu hình bộ tiền xử lý:", err);
    }
  }

  /**
   * Lấy cấu hình thô hiện tại để truyền trực tiếp hoặc ghi nhớ
   */
  public getConfig(): PipelineConfig {
    return this.config;
  }

  /**
   * Thuật toán bổ trợ chuẩn hóa Min-Max an toàn
   */
  public scaleMinMax(val: number, min: number, max: number): number {
    const range = max - min;
    if (range === 0) return 0.5;
    const scaled = (val - min) / range;
    return Math.max(0, Math.min(1, scaled)); // Kẹp chặt dải [0, 1] bảo vệ gradient
  }
}
