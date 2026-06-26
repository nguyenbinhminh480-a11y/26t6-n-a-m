import { Draw } from "../types";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MinerUParseResult {
  draws: Draw[];
  stats: {
    totalLines: number;
    parsedCount: number;
    failedLines: { line: string; error: string; lineNumber: number }[];
  };
}

/**
 * MinerUDataParser - Trình phân tích cú pháp cấu trúc dữ liệu không cấu trúc.
 * Lấy cảm hứng từ MinerU (opendatalab/MinerU) để tự động hóa trích xuất dữ liệu,
 * sửa lỗi cách dòng, làm sạch nhiễu (noise) từ PDF/HTML, nhận diện bảng số liệu
 * và chuẩn hóa cấu trúc để chuyển đổi thành các kỳ quay hợp lệ (Draw).
 */
export class MinerUDataParser {
  /**
   * Phân tích và trích xuất cấu trúc danh sách kỳ quay từ văn bản thô (Unstructured Text)
   * @param rawText Văn bản thô được copy-paste từ web kết quả, tệp PDF, bảng Excel, hoặc log hệ thống.
   */
  public static parseUnstructuredText(rawText: string): MinerUParseResult {
    const lines = rawText.split(/\r?\n/);
    const draws: Draw[] = [];
    const failedLines: { line: string; error: string; lineNumber: number }[] = [];
    let parsedCount = 0;

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      const currentLineNum = idx + 1;

      // 1. Loại bỏ các dòng trống hoặc dòng nhiễu tiêu đề trang PDF/Web
      if (!trimmedLine) return;
      if (/^(trang|page|tổng số|danh sách|kết quả|bingo18|thời gian|báo cáo)/i.test(trimmedLine)) {
        return; // Bỏ qua dòng tiêu đề phụ nhiễu
      }

      try {
        // Thử xem dòng có phải là JSON hợp lệ hay không
        if (trimmedLine.startsWith("{") && trimmedLine.endsWith("}")) {
          const item = JSON.parse(trimmedLine);
          const drawId = String(item.id || item.draw_id || item.drawId || `M-${currentLineNum}`);
          let numbers: number[] = [];

          if (Array.isArray(item.numbers)) {
            numbers = item.numbers.map(Number);
          } else if (Array.isArray(item.result)) {
            numbers = item.result.map(Number);
          } else if (typeof item.numbers === "string") {
            numbers = item.numbers.split(/[,\s-]+/).map(Number);
          }

          const validNums = this.validateAndNormalizeDice(numbers);
          if (validNums) {
            draws.push({
              id: drawId,
              date: item.date || item.drawDate || item.time || new Date().toLocaleDateString("vi-VN"),
              numbers: validNums,
              isManual: true,
            });
            parsedCount++;
            return;
          } else {
            throw new Error("Không tìm thấy đúng 3 xúc xắc hợp lệ (1-6) trong JSON");
          }
        }

        // 2. MinerU-inspired Regex Layout Parser: Trích xuất các mẫu cấu trúc bảng phổ biến
        // Tìm kiếm các cụm số hoặc định dạng dòng như:
        // "Kỳ 00123: 3 - 4 - 5" hoặc "00123 | 25/06/2026 | 3, 4, 5" hoặc "00123   3  4  5"
        
        // Trích xuất toàn bộ các cụm chữ số liên tiếp
        // Ví dụ dòng: "Kỳ quay 98124 kết quả 3, 5, 1" -> ["98124", "3", "5", "1"]
        const numbersInLine = trimmedLine.match(/\d+/g);
        
        if (!numbersInLine || numbersInLine.length < 3) {
          throw new Error("Dòng không chứa đủ ký tự số để làm mã kỳ và 3 kết quả xúc xắc");
        }

        let drawId = "";
        let diceNumbers: number[] = [];

        if (numbersInLine.length === 3) {
          // Trường hợp không có ID kỳ quay rõ ràng, tự sinh ID tuần tự hoặc lấy thời gian
          drawId = `M-${Date.now().toString().slice(-5)}-${currentLineNum}`;
          diceNumbers = numbersInLine.map(Number);
        } else if (numbersInLine.length >= 4) {
          // Thường số đầu tiên hoặc số dài nhất là ID kỳ quay, các số tiếp theo là xúc xắc
          // Ví dụ: ["00984", "3", "4", "5"] -> ID: "00984", Xúc xắc: [3, 4, 5]
          // Hoặc ["20260625123", "2", "6", "3"] -> ID: "123" hoặc giữ nguyên
          drawId = numbersInLine[0];
          diceNumbers = numbersInLine.slice(1, 4).map(Number);

          // Nếu số đầu tiên không giống ID mà lại có dạng xúc xắc (1-6) và số sau cùng lại lớn (ví dụ ID nằm cuối)
          // MinerU Layout Alignment: Tự động đảo cấu trúc để sửa lỗi lệch cột
          const firstNum = Number(numbersInLine[0]);
          const lastNumStr = numbersInLine[numbersInLine.length - 1];
          const lastNum = Number(lastNumStr);
          if (firstNum >= 1 && firstNum <= 6 && numbersInLine.length === 4 && (lastNum > 100 || lastNumStr.length > 2)) {
            drawId = lastNumStr;
            diceNumbers = numbersInLine.slice(0, 3).map(Number);
          }
        }

        // Kiểm tra và chuẩn hóa xúc xắc
        const validNums = this.validateAndNormalizeDice(diceNumbers);
        if (!validNums) {
          throw new Error(`Xúc xắc không hợp lệ: ${diceNumbers.join(", ")}. Phải có đúng 3 xúc xắc, mỗi xúc xắc từ 1-6.`);
        }

        // Trích xuất ngày tháng nếu có (ví dụ định dạng YYYY-MM-DD hoặc DD/MM trong dòng)
        const dateMatch = trimmedLine.match(/(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{2,4})/);
        const drawDate = dateMatch ? dateMatch[0] : new Date().toLocaleDateString("vi-VN");

        // Tránh trùng lặp ID trong tập vừa phân tích
        if (draws.some((d) => d.id === drawId)) {
          drawId = `${drawId}-${currentLineNum}`;
        }

        draws.push({
          id: drawId,
          date: drawDate,
          numbers: validNums,
          isManual: true,
        });
        parsedCount++;
      } catch (err: any) {
        failedLines.push({
          line: trimmedLine,
          error: err.message || "Lỗi phân tích dòng không xác định",
          lineNumber: currentLineNum,
        });
      }
    });

    return {
      draws,
      stats: {
        totalLines: lines.length,
        parsedCount,
        failedLines,
      },
    };
  }

  /**
   * Sửa đổi cấu trúc dữ liệu xúc xắc bị lỗi định dạng hoặc nằm ngoài dải 1-6
   */
  private static validateAndNormalizeDice(nums: number[]): number[] | null {
    if (nums.length < 3) return null;
    const targetSlice = nums.slice(0, 3);
    const isValid = targetSlice.every((n) => !isNaN(n) && n >= 1 && n <= 6);
    return isValid ? targetSlice : null;
  }
}
