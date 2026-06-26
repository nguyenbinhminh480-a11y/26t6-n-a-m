/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Draw } from "../types";

/**
 * TẠI SAO (Why): Helper functions tuân thủ DRY (Don't Repeat Yourself).
 * Các phép toán lặp đi lặp lại nên được gom về một mối để tránh sai sót
 * và dễ dàng bảo trì (KISS). Cải thiện tính thống nhất (SOLID - Single Responsibility).
 */

/**
 * Tính tổng điểm của một kỳ quay. 
 * Tự động bắt lỗi (Error Handling) nếu dữ liệu không hợp lệ.
 */
export const getDrawSum = (draw: Draw): number => {
  try {
    if (!draw || !draw.numbers || draw.numbers.length < 3) {
      return 3; // Fallback an toàn thấp nhất
    }
    return draw.numbers[0] + draw.numbers[1] + draw.numbers[2];
  } catch (error) {
    console.error("Lỗi tính tổng:", error);
    return 3;
  }
};
