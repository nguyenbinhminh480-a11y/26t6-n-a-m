/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TẠI SAO (Why): Thiết kế hệ thống tự động nhận diện thiết bị và đo lường hiệu năng phần cứng (Hardware & Device Capabilities Profiler).
 * Lấy cảm hứng từ các giải pháp quản lý tương thích thiết bị mượt mà của tác giả Necmttn (như react-native-user-agent),
 * hệ thống này phân tích User Agent kết hợp chạy benchmark toán học siêu nhỏ (< 2ms) để tối ưu hóa tài nguyên phần cứng.
 * Giúp điều chỉnh tải lượng tính toán thuật toán sâu (MLP, Fourier, Markov) phù hợp với cấu hình thiết bị:
 * - iPhone/iPad (iOS WebKit): Giới hạn bộ nhớ cache để tránh OOM sập iframe, hạ số chu kỳ huấn luyện (epochs) để giữ máy mát và mượt 60fps.
 * - Điện thoại cấu hình thấp: Chuyển đổi linh hoạt sang các thuật toán nhẹ hơn hoặc tối thiểu hóa vòng lặp tính toán.
 * - Desktop/High-end: Khai thác toàn bộ hiệu năng tối đa của CPU đa luồng và tăng cường bộ nhớ đệm suy luận (Speculative Warming).
 */

export type DevicePerformanceClass = "low" | "medium" | "high";

export interface DeviceBudget {
  maxHistoryLength: number;     // Giới hạn số lượng kỳ quay đưa vào huấn luyện mô hình để giảm tải O(N^2)
  mlpEpochs: number;            // Số chu kỳ huấn luyện thuật toán lan truyền ngược MLP
  arEpochs: number;             // Số chu kỳ học của mô hình tự hồi quy AR-EMA
  cacheLimit: number;           // Kích thước tối đa của bộ nhớ đệm suy luận tránh rò rỉ RAM WebKit
  enableSpeculativeWarming: boolean; // Cho phép chạy nền tính toán trước kết quả các thuật toán khác
  throttleMs: number;           // Độ trễ điều tiết tính toán khi thay đổi dữ liệu đầu vào liên tục
}

class HardwareProfiler {
  private performanceClass: DevicePerformanceClass = "medium";
  private isMobileDevice: boolean = false;
  private isIOSDevice: boolean = false;
  private benchmarkScoreMs: number = 0;
  private hasBenchmarked: boolean = false;

  constructor() {
    this.detectDeviceEnvironment();
    this.runMicroBenchmarkLazy();
  }

  /**
   * Phát hiện môi trường thiết bị dựa trên User Agent và các đặc tính cảm ứng (Touch Capabilities)
   */
  private detectDeviceEnvironment() {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const ua = navigator.userAgent || "";
    
    // Nhận diện iOS đặc thù (iPhone, iPad, iPod hoặc Safari iOS giả lập)
    this.isIOSDevice = /iPad|iPhone|iPod/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Nhận diện Mobile nói chung
    this.isMobileDevice = this.isIOSDevice || 
      /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      (typeof window.orientation !== "undefined") ||
      navigator.maxTouchPoints > 0;
  }

  /**
   * Chạy benchmark toán học siêu nhỏ ngầm định trong luồng rỗi (Idle thread)
   * để không gây nghẽn UI, đảm bảo mượt mà 100% khi người dùng tương tác.
   */
  private runMicroBenchmarkLazy() {
    if (typeof window === "undefined" || this.hasBenchmarked) return;

    const run = () => {
      try {
        const start = performance.now();
        
        // Thực hiện phép tính toán học nặng lặp lại để đo tốc độ CPU
        let temp = 0.5;
        for (let i = 0; i < 50000; i++) {
          temp = Math.sin(temp) * Math.cos(temp) + Math.sqrt(temp + 1.0);
          temp = temp - Math.floor(temp);
        }

        const duration = performance.now() - start;
        this.benchmarkScoreMs = duration;
        this.hasBenchmarked = true;

        // Phân loại sức mạnh CPU của thiết bị thực tế
        if (duration > 8.0) {
          // CPU yếu hoặc đang chạy chế độ tiết kiệm pin (Battery Saver) trên điện thoại cũ
          this.performanceClass = "low";
        } else if (duration > 2.5 || this.isMobileDevice) {
          // Điện thoại trung bình/cao cấp hoặc máy tính bảng dải trung
          this.performanceClass = "medium";
        } else {
          // Máy tính để bàn hoặc thiết bị di động cấu hình siêu khủng
          this.performanceClass = "high";
        }
      } catch (err) {
        console.warn("Lỗi chạy Hardware Profiler Micro-Benchmark:", err);
        // Fallback an toàn dựa trên loại thiết bị di động
        this.performanceClass = this.isMobileDevice ? "medium" : "high";
      }
    };

    // Tối ưu hiệu năng: Sử dụng requestIdleCallback để chạy ngầm hoặc trì hoãn khởi động sau 1.5s
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => run(), { timeout: 2000 });
    } else {
      setTimeout(run, 1500);
    }
  }

  /**
   * Trả về trạng thái thiết bị là iOS hay không
   */
  public isIOS(): boolean {
    return this.isIOSDevice;
  }

  /**
   * Trả về thiết bị có phải là di động không
   */
  public isMobile(): boolean {
    return this.isMobileDevice;
  }

  /**
   * Trả về nhóm hiệu năng thiết bị hiện tại ("low" | "medium" | "high")
   */
  public getPerformanceClass(): DevicePerformanceClass {
    return this.performanceClass;
  }

  /**
   * Lấy cấu hình tài nguyên (Device Budget) tương thích tối đa với phần cứng thực tế
   */
  public getBudget(): DeviceBudget {
    // Nếu là iOS, cấu hình sẽ được tinh chỉnh đặc biệt để tránh nóng máy và crash WebKit
    if (this.isIOSDevice) {
      return {
        maxHistoryLength: 200,      // Giảm độ dài lịch sử quét để tránh lag vòng lặp O(N^2)
        mlpEpochs: 120,             // Giới hạn chu kỳ học MLP để giữ WebKit mượt mà
        arEpochs: 80,               // Mô hình AR-EMA giảm nhẹ chu kỳ học
        cacheLimit: 6,              // Khống chế bộ đệm cache nhỏ tránh cạn RAM iframe iOS
        enableSpeculativeWarming: this.performanceClass !== "low", // Chỉ bật chạy nền nếu cấu hình không quá yếu
        throttleMs: 350,            // Tăng thời gian điều tiết tránh tính toán dồn dập khi kéo thả
      };
    }

    // Tinh chỉnh theo mức hiệu năng benchmark thực tế của thiết bị
    switch (this.performanceClass) {
      case "low":
        return {
          maxHistoryLength: 150,
          mlpEpochs: 80,
          arEpochs: 50,
          cacheLimit: 4,
          enableSpeculativeWarming: false, // Tắt hoàn toàn tính năng chạy nền để dồn sức cho luồng chính
          throttleMs: 500,
        };
      
      case "medium":
        return {
          maxHistoryLength: 280,
          mlpEpochs: 180,
          arEpochs: 120,
          cacheLimit: 8,
          enableSpeculativeWarming: true,
          throttleMs: 250,
        };

      case "high":
      default:
        return {
          maxHistoryLength: 350,    // Đầy đủ 350 kỳ quay cho độ chính xác cực đại trên máy tính
          mlpEpochs: 250,           // Huấn luyện sâu 250 epochs cho mô hình nơ-ron
          arEpochs: 150,            // Huấn luyện 150 epochs cho mô hình hồi quy AR
          cacheLimit: 12,           // Cache thoải mái tăng tốc độ chuyển đổi tức thời
          enableSpeculativeWarming: true,
          throttleMs: 100,          // Đáp ứng phản hồi tức thì
        };
    }
  }
}

export const deviceProfiler = new HardwareProfiler();
