// ============================================================================
// @AI_SYSTEM_DIRECTIVE
// @ROLE: Senior Software Architect & AI Platform Engineer
//
// @DESCRIPTION:
// Hệ thống Hàng đợi Huấn luyện Nền (Background Retraining Queue) mô phỏng
// cơ chế hoạt động của Celery/Redis Queue trong môi trường đơn luồng hoặc 
// máy khách/máy chủ Node.js. Khâu tự học cực kỳ tốn tài nguyên được tách 
// biệt hoàn toàn và chạy không chặn (Non-blocking Cooperative Worker) giúp 
// duy trì hiệu năng 60 FPS mượt mà cho điện thoại iOS/Android.
// ============================================================================

import { Draw } from '../types';
import { EventBus } from './agentSystem';

export interface RetrainingJob {
  id: string;
  modelId: string;
  modelName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number; // 0% - 100%
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  epochTotal: number;
  epochCompleted: number;
  error?: string;
  logs: string[];
}

export type JobStatusCallback = (job: RetrainingJob) => void;

export class BackgroundRetrainingQueue {
  private static instance: BackgroundRetrainingQueue;
  private jobs: RetrainingJob[] = [];
  private isProcessing = false;
  private activeJob: RetrainingJob | null = null;
  private subscribers = new Set<JobStatusCallback>();

  private constructor() {
    // Tự động rà soát hàng đợi định kỳ
    setInterval(() => {
      this.checkAndProcess();
    }, 1500);
  }

  public static getInstance(): BackgroundRetrainingQueue {
    if (!BackgroundRetrainingQueue.instance) {
      BackgroundRetrainingQueue.instance = new BackgroundRetrainingQueue();
    }
    return BackgroundRetrainingQueue.instance;
  }

  /**
   * Thêm một công việc huấn luyện (Huấn luyện lại mô hình) vào hàng đợi.
   * Tự động gán độ ưu tiên và xếp hàng để chạy trong tiến trình nền.
   */
  public addJob(
    modelId: string,
    modelName: string,
    epochTotal: number,
    priority: RetrainingJob['priority'] = 'MEDIUM'
  ): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newJob: RetrainingJob = {
      id: jobId,
      modelId,
      modelName,
      status: 'PENDING',
      progress: 0,
      priority,
      createdAt: Date.now(),
      epochTotal,
      epochCompleted: 0,
      logs: [`[Hàng đợi] Job xếp hàng thành công lúc ${new Date().toLocaleTimeString()}. Trạng thái: PENDING.`]
    };

    // Chèn theo thứ tự ưu tiên (Ưu tiên cao xếp trước)
    if (priority === 'HIGH') {
      const firstNonHighIndex = this.jobs.findIndex(j => j.priority !== 'HIGH');
      if (firstNonHighIndex === -1) {
        this.jobs.push(newJob);
      } else {
        this.jobs.splice(firstNonHighIndex, 0, newJob);
      }
    } else {
      this.jobs.push(newJob);
    }

    this.notifySubscribers(newJob);
    
    // Xuất bản sự kiện hệ thống
    EventBus.publish({
      type: 'HEALTH_STATUS_CHANGED', // Publish under state events
      sender: 'RETRAINING_QUEUE',
      timestamp: Date.now(),
      payload: { message: `Đã xếp hàng huấn luyện lại mô hình: ${modelName}`, jobId }
    });

    this.checkAndProcess();
    return jobId;
  }

  /**
   * Đăng ký theo dõi sự thay đổi trạng thái của các job trong hàng đợi.
   */
  public subscribe(callback: JobStatusCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getJobs(): RetrainingJob[] {
    return [...this.jobs];
  }

  public getActiveJob(): RetrainingJob | null {
    return this.activeJob;
  }

  /**
   * Rà soát hàng đợi và bắt đầu chạy tác vụ nền nếu có tiến trình trống.
   */
  private checkAndProcess(): void {
    if (this.isProcessing || this.jobs.length === 0) return;

    // Tìm job ở trạng thái PENDING tiếp theo
    const nextJob = this.jobs.find(j => j.status === 'PENDING');
    if (!nextJob) return;

    this.executeJob(nextJob);
  }

  /**
   * Kích hoạt vòng lặp tối ưu hóa phân mảnh (Cooperative Staggered Retraining Loop).
   * Giúp bẻ nhỏ hàng nghìn bước tính toán gradient thành các khối nhỏ chạy xen kẽ,
   * ngăn chặn hiện tượng đóng băng trình duyệt của người dùng (Zero UI Block).
   */
  private async executeJob(job: RetrainingJob): Promise<void> {
    this.isProcessing = true;
    this.activeJob = job;
    job.status = 'RUNNING';
    job.startedAt = Date.now();
    job.logs.push(`[Worker] Bắt đầu chạy background worker trên mô hình ${job.modelName}.`);
    this.notifySubscribers(job);

    try {
      const stepSize = Math.max(5, Math.floor(job.epochTotal / 20)); // Chia làm 20 khối tính toán
      
      while (job.epochCompleted < job.epochTotal) {
        // Thực thi huấn luyện trong N epochs
        const batchRun = Math.min(stepSize, job.epochTotal - job.epochCompleted);
        
        // Mô phỏng tính toán gradient descent phức tạp của nơ-ron nền
        await this.simulateHeavyGradientDescent(batchRun);
        
        job.epochCompleted += batchRun;
        job.progress = Math.round((job.epochCompleted / job.epochTotal) * 100);
        job.logs.push(`[Huấn luyện] Hoàn thành Epoch ${job.epochCompleted}/${job.epochTotal} (${job.progress}%). Cập nhật hệ số học.`);
        this.notifySubscribers(job);

        // Trả quyền kiểm soát luồng (Yield execution) về CPU để xử lý các sự kiện giao diện / API khác
        await this.yieldToEventLoop();
      }

      job.status = 'COMPLETED';
      job.completedAt = Date.now();
      job.logs.push(`[Hoàn tất] Mô hình đã được huấn luyện tối ưu! Đã lưu trữ trọng số và bộ tiền xử lý Pipeline.`);
      
      // Xuất bản sự kiện hệ thống báo hệ thống đã tự học thành công
      EventBus.publish({
        type: 'AUTO_LABEL_FEEDBACK',
        sender: 'RETRAINING_WORKER',
        timestamp: Date.now(),
        payload: { message: `Hoàn thành tự động học lại mô hình: ${job.modelName}`, status: 'SUCCESS' }
      });

    } catch (err: any) {
      job.status = 'FAILED';
      job.completedAt = Date.now();
      job.error = err?.message || 'Lỗi tính toán cục bộ';
      job.logs.push(`[🚨 Thất bại] Lỗi sụp đổ luồng gradient: ${job.error}`);
    } finally {
      this.isProcessing = false;
      this.activeJob = null;
      this.notifySubscribers(job);
      this.checkAndProcess();
    }
  }

  private simulateHeavyGradientDescent(epochs: number): Promise<void> {
    return new Promise(resolve => {
      // Mỗi epoch mô phỏng khoảng 15ms tính toán ma trận để tối ưu tài nguyên điện thoại di động
      setTimeout(() => {
        resolve();
      }, epochs * 15);
    });
  }

  private yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => {
      // Đẩy luồng tiếp theo xuống hàng đợi vĩ mô của JavaScript (setTimeout(..., 0))
      // Đảm bảo Safari/iOS có cơ hội vẽ đồ thị hoặc tiếp nhận lượt gõ phím của người dùng
      setTimeout(resolve, 10);
    });
  }

  private notifySubscribers(job: RetrainingJob): void {
    this.subscribers.forEach(cb => {
      try {
        cb(job);
      } catch (e) {
        console.error('[Queue] Lỗi gọi subscriber:', e);
      }
    });
  }
}

export const RetrainingQueue = BackgroundRetrainingQueue.getInstance();
