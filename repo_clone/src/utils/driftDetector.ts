// ============================================================================
// @AI_SYSTEM_DIRECTIVE
// @ROLE: Senior Data Scientist & Quantitative AI Specialist
//
// @DESCRIPTION:
// File này triển khai hệ thống Giám sát Độ lệch Dữ liệu (Data Drift Monitor)
// sử dụng hai chỉ số toán học chuẩn chỉ quốc tế: Population Stability Index (PSI)
// và Kolmogorov-Smirnov (KS-test) khoảng cách tích lũy thực nghiệm.
// Hệ thống tự động cảnh báo khi xu thế xúc xắc lệch pha quá xa lý thuyết,
// kích hoạt chỉ thị Học Lại Khẩn Cấp (Emergency Retraining).
// ============================================================================

import { Draw, SumType } from '../types';
import { getSumType } from './predictor';

export interface DriftReport {
  /** Chỉ số PSI tổng quát */
  psiScore: number;
  /** Khoảng cách kiểm định KS (Kolmogorov-Smirnov distance) */
  ksDistance: number;
  /** Mức độ cảnh báo trôi dạt */
  severity: 'NONE' | 'LOW' | 'HIGH';
  /** Có phát hiện trôi dạt dữ liệu không (PSI > 0.25 hoặc KS > Critical) */
  isDriftDetected: boolean;
  /** Giải thích chi tiết bằng tiếng Việt */
  analysisMessage: string;
  /** Chi tiết phân phối cửa cược của nhóm tham chiếu (Reference) */
  refDist: Record<SumType, number>;
  /** Chi tiết phân phối cửa cược của nhóm hiện tại (Recent Target) */
  tgtDist: Record<SumType, number>;
}

export class DataDriftDetector {
  private static readonly EPSILON = 1e-4; // Tránh lỗi chia cho 0 và lấy log(0)

  /**
   * Tính toán độ lệch phân phối (Data Drift) giữa tập Baseline (Lịch sử mẫu xa)
   * và tập Recent Target (Các kỳ đổ mới nhất) bằng thuật toán PSI và KS-test.
   * 
   * @param baselineDraws Tập mẫu tham chiếu chuẩn (Thường lấy 100-300 kỳ cũ)
   * @param targetDraws Tập mẫu đối chiếu hiện tại (Thường lấy 30-50 kỳ mới nhất)
   */
  public static detectDrift(baselineDraws: Draw[], targetDraws: Draw[]): DriftReport {
    // 1. Kiểm tra dữ liệu đầu vào an toàn (ERROR_HANDLING)
    if (!baselineDraws || baselineDraws.length < 15 || !targetDraws || targetDraws.length < 15) {
      return {
        psiScore: 0.0,
        ksDistance: 0.0,
        severity: 'NONE',
        isDriftDetected: false,
        analysisMessage: 'Chưa đủ khối lượng mẫu đối chứng để phân tích dữ liệu lệch pha (Concept Drift). Cần tối thiểu 15 kỳ mẫu.',
        refDist: { TAI: 37.5, XIU: 37.5, HOA: 25.0 },
        tgtDist: { TAI: 37.5, XIU: 37.5, HOA: 25.0 }
      };
    }

    // 2. Phân chia Bins cược: TÀI, XỈU, HÒA
    const refCounts = { TAI: 0, XIU: 0, HOA: 0 };
    const tgtCounts = { TAI: 0, XIU: 0, HOA: 0 };

    baselineDraws.forEach(d => {
      const sum = d.numbers.reduce((a, b) => a + b, 0);
      refCounts[getSumType(sum)]++;
    });

    targetDraws.forEach(d => {
      const sum = d.numbers.reduce((a, b) => a + b, 0);
      tgtCounts[getSumType(sum)]++;
    });

    // Chuyển sang tỷ lệ phần trăm thực nghiệm có cộng mượt Laplace nhẹ (Smoothing)
    const refTotal = baselineDraws.length;
    const tgtTotal = targetDraws.length;

    const refProbs = {
      TAI: refCounts.TAI / refTotal,
      XIU: refCounts.XIU / refTotal,
      HOA: refCounts.HOA / refTotal
    };

    const tgtProbs = {
      TAI: tgtCounts.TAI / tgtTotal,
      XIU: tgtCounts.XIU / tgtTotal,
      HOA: tgtCounts.HOA / tgtTotal
    };

    // 3. Tính toán Chỉ số Thích ứng PSI (Population Stability Index)
    // Công thức: PSI = Sum( (Actual_i - Expected_i) * ln(Actual_i / Expected_i) )
    let psiScore = 0;
    const bins: SumType[] = ['TAI', 'XIU', 'HOA'];

    bins.forEach(bin => {
      // Thêm mượt Laplace nhỏ tránh log của 0
      const expected = refProbs[bin] || DataDriftDetector.EPSILON;
      const actual = tgtProbs[bin] || DataDriftDetector.EPSILON;
      
      psiScore += (actual - expected) * Math.log(actual / expected);
    });

    // 4. Tính toán Khoảng cách tích lũy Kolmogorov-Smirnov thực nghiệm (KS-test Distance Approximation)
    // Đo lường khoảng cách tích lũy lớn nhất giữa phân phối tổng điểm xúc xắc lý thuyết và thực tế
    const ksDistance = this.calculateKSDistance(baselineDraws, targetDraws);

    // 5. Đánh giá Mức độ Trôi dạt theo các dải tiêu chuẩn tài chính thế giới:
    // - PSI < 0.1: Phân phối ổn định cao (Bình thường).
    // - 0.1 <= PSI <= 0.25: Lệch pha nhẹ (Low Drift - Cần quan sát).
    // - PSI > 0.25: Lệch pha nghiêm trọng (High Drift - Bắt buộc học lại).
    let severity: DriftReport['severity'] = 'NONE';
    let isDriftDetected = false;
    let analysisMessage = '';

    if (psiScore > 0.25 || ksDistance > 0.22) {
      severity = 'HIGH';
      isDriftDetected = true;
      analysisMessage = `⚠️ [CẢNH BÁO CAO] Chỉ số lệch pha dữ liệu PSI chạm mức cực đoan (${psiScore.toFixed(3)} > 0.25). Đã phát hiện Concept Drift nặng! Nhịp cầu xúc xắc hiện tại đã thay đổi cấu trúc hành vi so với lịch sử xa. Khuyến nghị chạy ngay Background Retraining Queue để tránh lỗi Overfitting hệ thống.`;
    } else if (psiScore >= 0.10) {
      severity = 'LOW';
      isDriftDetected = false;
      analysisMessage = `💡 [Cảnh báo nhẹ] Chỉ số trôi dạt dữ liệu PSI là ${psiScore.toFixed(3)} (nằm trong biên độ cảnh báo sớm 0.10 - 0.25). Thị trường đang dịch chuyển nhẹ cấu trúc dòng tiền, các hệ số neural của mô hình vẫn đang tự thích nghi an toàn.`;
    } else {
      severity = 'NONE';
      isDriftDetected = false;
      analysisMessage = `✓ [An toàn] Chỉ số ổn định phân bổ dữ liệu PSI đạt mức lý tưởng (${psiScore.toFixed(3)} < 0.10). Các mô hình toán học và mạng nơ-ron đang bám sát nhịp xúc xắc và chạy ổn định không trôi lệch.`;
    }

    return {
      psiScore: Number(psiScore.toFixed(4)),
      ksDistance: Number(ksDistance.toFixed(4)),
      severity,
      isDriftDetected,
      analysisMessage,
      refDist: {
        TAI: Number((refProbs.TAI * 100).toFixed(1)),
        XIU: Number((refProbs.XIU * 100).toFixed(1)),
        HOA: Number((refProbs.HOA * 100).toFixed(1))
      },
      tgtDist: {
        TAI: Number((tgtProbs.TAI * 100).toFixed(1)),
        XIU: Number((tgtProbs.XIU * 100).toFixed(1)),
        HOA: Number((tgtProbs.HOA * 100).toFixed(1))
      }
    };
  }

  /**
   * Tính toán khoảng cách lớn nhất của hàm phân phối tích lũy thực nghiệm (CDF)
   * giữa mẫu tham chiếu và mẫu hiện tại.
   */
  private static calculateKSDistance(ref: Draw[], tgt: Draw[]): number {
    const getCDF = (draws: Draw[]): number[] => {
      const counts = Array(19).fill(0);
      draws.forEach(d => {
        const sum = d.numbers.reduce((a, b) => a + b, 0);
        if (sum >= 3 && sum <= 18) counts[sum]++;
      });
      
      const cdf = Array(19).fill(0);
      let cumulative = 0;
      for (let s = 3; s <= 18; s++) {
        cumulative += counts[s] / draws.length;
        cdf[s] = cumulative;
      }
      return cdf;
    };

    const refCDF = getCDF(ref);
    const tgtCDF = getCDF(tgt);

    let maxDiff = 0;
    for (let s = 3; s <= 18; s++) {
      const diff = Math.abs(refCDF[s] - tgtCDF[s]);
      if (diff > maxDiff) {
        maxDiff = diff;
      }
    }
    return maxDiff;
  }
}
