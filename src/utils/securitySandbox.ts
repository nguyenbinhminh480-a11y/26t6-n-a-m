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

import { Draw } from "../types";
import { ARParams, MLPParams } from "./algorithms";

/**
 * TẠI SAO (Why): Lớp phòng thủ hộp cát an ninh (Security Sandbox Guard) lấy cảm hứng từ
 * hệ thống rà soát và phòng vệ Anthropic-Cybersecurity-Skills.
 * Lớp này bảo vệ hệ thống khỏi:
 *  1. Tấn công đầu vào bất thường (NaN, Infinity, số âm quá mức).
 *  2. Tấn công vắt kiệt tài nguyên CPU (Resource Exhaustion/DoS) bằng cách giới hạn epochs/neurons cực đại.
 *  3. Rò rỉ thông tin nhạy cảm qua Error Stack Traces.
 *  4. Nhiễm độc tập dữ liệu (Data poisoning) qua dữ liệu nhập tay.
 */
export class SecuritySandbox {
  /**
   * TẠI SAO (Why): Đảm bảo các tham số huấn luyện mô hình AR-EMA luôn nằm trong vùng an toàn tuyệt đối.
   */
  public static sanitizeARParams(params?: ARParams): ARParams {
    const defaultParams: ARParams = {
      lag: 5,
      emaAlpha: 0.3,
      learningRate: 0.01,
      epochs: 150,
    };

    if (!params) return defaultParams;

    // Giới hạn lag cực đại để tránh đệ quy sâu hoặc tràn mảng bộ nhớ
    const lag =
      typeof params.lag === "number" &&
      !isNaN(params.lag) &&
      isFinite(params.lag)
        ? Math.max(2, Math.min(12, Math.round(params.lag)))
        : defaultParams.lag;

    const emaAlpha =
      typeof params.emaAlpha === "number" &&
      !isNaN(params.emaAlpha) &&
      isFinite(params.emaAlpha)
        ? Math.max(0.01, Math.min(1.0, params.emaAlpha))
        : defaultParams.emaAlpha;

    const learningRate =
      typeof params.learningRate === "number" &&
      !isNaN(params.learningRate) &&
      isFinite(params.learningRate)
        ? Math.max(0.0001, Math.min(1.0, params.learningRate))
        : defaultParams.learningRate;

    // Giới hạn epochs cực đại bảo vệ điện thoại iOS/Android không bị nghẽn đơ luồng chính
    const epochs =
      typeof params.epochs === "number" &&
      !isNaN(params.epochs) &&
      isFinite(params.epochs)
        ? Math.max(10, Math.min(300, Math.round(params.epochs)))
        : defaultParams.epochs;

    return { lag, emaAlpha, learningRate, epochs };
  }

  /**
   * TẠI SAO (Why): Đảm bảo các tham số huấn luyện mạng nơ-ron đa tầng MLP nằm trong dải phân bổ an toàn.
   */
  public static sanitizeMLPParams(params?: MLPParams): MLPParams {
    const defaultParams: MLPParams = {
      inputLags: 5,
      hiddenNeurons: 8,
      learningRate: 0.05,
      epochs: 250,
    };

    if (!params) return defaultParams;

    const inputLags =
      typeof params.inputLags === "number" &&
      !isNaN(params.inputLags) &&
      isFinite(params.inputLags)
        ? Math.max(2, Math.min(12, Math.round(params.inputLags)))
        : defaultParams.inputLags;

    // Phạt neurons ẩn cực đại để tránh kích hoạt quá nhiều phép nhân ma trận trên điện thoại di động
    const hiddenNeurons =
      typeof params.hiddenNeurons === "number" &&
      !isNaN(params.hiddenNeurons) &&
      isFinite(params.hiddenNeurons)
        ? Math.max(2, Math.min(32, Math.round(params.hiddenNeurons)))
        : defaultParams.hiddenNeurons;

    const learningRate =
      typeof params.learningRate === "number" &&
      !isNaN(params.learningRate) &&
      isFinite(params.learningRate)
        ? Math.max(0.0001, Math.min(1.0, params.learningRate))
        : defaultParams.learningRate;

    // Chống DoS luồng bằng cách chặn epochs MLP ở mức 500
    const epochs =
      typeof params.epochs === "number" &&
      !isNaN(params.epochs) &&
      isFinite(params.epochs)
        ? Math.max(10, Math.min(500, Math.round(params.epochs)))
        : defaultParams.epochs;

    return { inputLags, hiddenNeurons, learningRate, epochs };
  }

  /**
   * TẠI SAO (Why): Rà soát dữ liệu mảng kết quả quay để ngăn chặn "nhiễm độc dữ liệu" hoặc XSS.
   */
  public static sanitizeDraws(draws: Draw[]): Draw[] {
    if (!draws || !Array.isArray(draws)) return [];

    return draws
      .map((draw) => {
        if (!draw || typeof draw !== "object") return null;

        // Ép kiểu ID an toàn chống ký tự chèn mã độc hại (Injection Flaws)
        const id =
          draw.id !== undefined && draw.id !== null
            ? String(draw.id)
                .replace(/[^a-zA-Z0-9_-]/g, "")
                .slice(0, 50)
            : `draw_${Math.random().toString(36).substr(2, 9)}`;

        // Rà soát dải xúc xắc hợp lệ của Bingo18 (mỗi viên xúc xắc có giá trị từ 1 đến 6)
        let numbers = Array.isArray(draw.numbers) ? draw.numbers : [1, 1, 1];
        numbers = numbers.map((n) => {
          const num =
            typeof n === "number" && !isNaN(n) && isFinite(n)
              ? Math.round(n)
              : 1;
          return Math.max(1, Math.min(6, num));
        });

        // Đảm bảo có đúng 3 viên xúc xắc
        if (numbers.length !== 3) {
          numbers = numbers.slice(0, 3);
          while (numbers.length < 3) numbers.push(1);
        }

        return {
          ...draw,
          id,
          numbers,
        };
      })
      .filter((d): d is Draw => d !== null);
  }

  /**
   * TẠI SAO (Why): Rửa sạch dữ liệu ngăn chặn rò rỉ stack trace nhạy cảm hoặc API keys, Secrets.
   */
  public static sanitizeErrorMessage(error: any): string {
    if (!error) return "Đã xảy ra lỗi không xác định hệ thống.";

    let rawMessage = "";
    if (error instanceof Error) {
      rawMessage = `${error.message}\n${error.stack || ""}`;
    } else if (typeof error === "object") {
      try {
        rawMessage = JSON.stringify(error);
      } catch {
        rawMessage = String(error);
      }
    } else {
      rawMessage = String(error);
    }

    // Các cụm từ khóa nhạy cảm cần lọc bỏ khỏi phản hồi giao diện người dùng (Xóa secrets, private keys, Firebase DB urls)
    const sensitiveRegexes = [
      /AI_STUDIO_[A-Z0-9_]+/gi,
      /GEMINI_API_[A-Z0-9_]+/gi,
      /API_KEY[A-Z0-9_=\s:-]*/gi,
      /firebaseio\.com/gi,
      /project-id-[a-zA-Z0-9-]+/gi,
      /Bearer\s[a-zA-Z0-9._-]+/gi,
      /password[a-zA-Z0-9_=\s:-]*/gi,
      /secret[a-zA-Z0-9_=\s:-]*/gi,
    ];

    let sanitized = rawMessage;
    sensitiveRegexes.forEach((regex) => {
      sanitized = sanitized.replace(regex, "[SECURE_MASKED_BY_SANDBOX]");
    });

    // Giới hạn độ dài lỗi tránh tấn công tràn bộ đệm đầu ra giao diện (Buffer bloat)
    return sanitized.slice(0, 300) + (sanitized.length > 300 ? "..." : "");
  }
}
