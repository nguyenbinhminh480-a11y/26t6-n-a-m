/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TẠI SAO (Why): Helper functions về Network/API tuân thủ DRY (Don't Repeat Yourself).
 * Xử lý lỗi tập trung, cơ chế thử lại (Exponential Backoff) để chống đơ mạng/rate limit,
 * giúp cải thiện độ tin cậy của ứng dụng (Reliability).
 */

/**
 * Xử lý Retry với Exponential Backoff 
 */
export const fetchWithRetry = async (
  url: string,
  options?: RequestInit,
  retries: number = 3,
  backoffMs: number = 1000,
  timeoutMs: number = 8000 // 8s timeout cho thiết bị di động
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`Server returned ${res.status}`);
      }
    }
    return res;
  } catch (err: any) {
    clearTimeout(id);
    if (retries > 0) {
      console.warn(`[Sync Warning] Lỗi kết nối (${err.message}). Thử lại sau ${backoffMs}ms... (Còn ${retries} lần)`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return fetchWithRetry(url, options, retries - 1, backoffMs * 2, timeoutMs);
    }
    throw new Error(`[Sync Error] Không thể kết nối sau nhiều lần thử: ${err.message}`);
  }
};
