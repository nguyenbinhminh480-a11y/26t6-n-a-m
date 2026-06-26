// ============================================================================
// @AI_SYSTEM_DIRECTIVE
// @ROLE: Senior Software Architect & Data Science Expert
//
// @DESCRIPTION:
// Bộ cấu trúc dữ liệu đa chiều được gán nhãn tọa độ (Labeled Multidimensional Dataset)
// Thừa hưởng tư tưởng thiết kế của thư viện xarray (Max Joseph - @max-sixty).
// Lớp này cung cấp cơ chế quản lý dữ liệu chuỗi thời gian nhiều chiều (Sum, Parity, EMA, Momentum...)
// với nhãn tọa độ (Coordinates), hỗ trợ tự động căn lề (Automatic Alignment) và 
// tính toán vector hóa tốc độ cao (Vectorized operations) sử dụng TypedArray (Float64Array),
// tối ưu hóa tuyệt đối bộ nhớ đệm Cache L1/L2 trên vi xử lý ARM của thiết bị iOS.
// ============================================================================

export interface DatasetCoords {
  /** Danh sách nhãn thời gian hoặc chỉ số thứ tự chuỗi */
  time: number[];
  /** Tên của các biến số đặc trưng trong chiều thứ hai */
  variables: string[];
}

export class LabeledDataset {
  private coords: DatasetCoords;
  private data: Float64Array; // Mảng dẹt 1D (Flat 1D array) lưu trữ ma trận 2D: [time.length x variables.length]

  constructor(coords: DatasetCoords, initialData?: Float64Array | number[][]) {
    this.coords = {
      time: [...coords.time],
      variables: [...coords.variables],
    };

    const numTimes = this.coords.time.length;
    const numVars = this.coords.variables.length;
    const totalSize = numTimes * numVars;

    if (initialData instanceof Float64Array) {
      if (initialData.length !== totalSize) {
        throw new Error(
          `Kích thước dữ liệu khởi tạo không khớp: Mong đợi ${totalSize}, Nhận được ${initialData.length}`
        );
      }
      this.data = new Float64Array(initialData);
    } else if (Array.isArray(initialData)) {
      this.data = new Float64Array(totalSize);
      for (let t = 0; t < numTimes; t++) {
        const row = initialData[t] || [];
        for (let v = 0; v < numVars; v++) {
          this.data[t * numVars + v] = row[v] !== undefined ? row[v] : 0;
        }
      }
    } else {
      this.data = new Float64Array(totalSize);
    }
  }

  public getCoords(): DatasetCoords {
    return this.coords;
  }

  /**
   * Lấy giá trị của một biến cụ thể tại thời điểm cụ thể
   */
  public get(timeValue: number, variableName: string): number {
    const tIdx = this.coords.time.indexOf(timeValue);
    const vIdx = this.coords.variables.indexOf(variableName);

    if (tIdx === -1 || vIdx === -1) {
      return NaN;
    }

    return this.data[tIdx * this.coords.variables.length + vIdx];
  }

  /**
   * Gán giá trị của một biến cụ thể tại thời điểm cụ thể
   */
  public set(timeValue: number, variableName: string, value: number): void {
    const tIdx = this.coords.time.indexOf(timeValue);
    const vIdx = this.coords.variables.indexOf(variableName);

    if (tIdx !== -1 && vIdx !== -1) {
      this.data[tIdx * this.coords.variables.length + vIdx] = value;
    }
  }

  /**
   * Trích xuất mảng 1D đại diện cho một chiều biến cụ thể (ví dụ: "sum", "ema")
   */
  public getVariableSlice(variableName: string): Float64Array {
    const vIdx = this.coords.variables.indexOf(variableName);
    if (vIdx === -1) {
      return new Float64Array(0);
    }

    const numTimes = this.coords.time.length;
    const numVars = this.coords.variables.length;
    const result = new Float64Array(numTimes);

    for (let t = 0; t < numTimes; t++) {
      result[t] = this.data[t * numVars + vIdx];
    }

    return result;
  }

  /**
   * Tự động căn lề (Alignment) hai Dataset theo tọa độ thời gian (Time Coordinates) chung.
   * Đây là phiên bản TypeScript tinh gọn của `xarray.align(ds1, ds2, join="inner")`.
   * Nó triệt tiêu hoàn toàn lỗi không khớp chỉ số đặc trưng (Feature index mismatch) và
   * rò rỉ dữ liệu (Data leakage) giữa các mô hình phân tích khác nhau.
   */
  public static align(ds1: LabeledDataset, ds2: LabeledDataset): [LabeledDataset, LabeledDataset] {
    const coords1 = ds1.getCoords();
    const coords2 = ds2.getCoords();

    // Tìm giao của các nhãn thời gian (Inner Join)
    const set2 = new Set(coords2.time);
    const sharedTime = coords1.time.filter((t) => set2.has(t));

    if (sharedTime.length === 0) {
      throw new Error("Không thể căn lề Dataset: Không tìm thấy giao điểm tọa độ thời gian chung.");
    }

    const buildAligned = (ds: LabeledDataset): LabeledDataset => {
      const vars = ds.getCoords().variables;
      const numVars = vars.length;
      const totalSize = sharedTime.length * numVars;
      const alignedData = new Float64Array(totalSize);

      for (let t = 0; t < sharedTime.length; t++) {
        const timeVal = sharedTime[t];
        for (let v = 0; v < numVars; v++) {
          alignedData[t * numVars + v] = ds.get(timeVal, vars[v]);
        }
      }

      return new LabeledDataset({ time: sharedTime, variables: vars }, alignedData);
    };

    return [buildAligned(ds1), buildAligned(ds2)];
  }

  /**
   * Tính toán tích số trượt động (Rolling window summary) cực kỳ tối ưu
   */
  public rollingMean(variableName: string, windowSize: number): Float64Array {
    const slice = this.getVariableSlice(variableName);
    const len = slice.length;
    const result = new Float64Array(len);

    if (len === 0 || windowSize <= 0) return result;

    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += slice[i];
      if (i >= windowSize) {
        sum -= slice[i - windowSize];
        result[i] = sum / windowSize;
      } else {
        result[i] = sum / (i + 1);
      }
    }

    return result;
  }

  /**
   * Vectorized Map: Áp dụng phép toán lên toàn bộ phần tử của một biến mà không gây tốn tài nguyên GC
   */
  public mapVariable(variableName: string, fn: (val: number, idx: number) => number): void {
    const vIdx = this.coords.variables.indexOf(variableName);
    if (vIdx === -1) return;

    const numTimes = this.coords.time.length;
    const numVars = this.coords.variables.length;

    for (let t = 0; t < numTimes; t++) {
      const idx = t * numVars + vIdx;
      this.data[idx] = fn(this.data[idx], t);
    }
  }

  /**
   * Tính toán độ lệch chuẩn động dồn tích lũy (Rolling Volatility)
   */
  public rollingStd(variableName: string, windowSize: number): Float64Array {
    const slice = this.getVariableSlice(variableName);
    const len = slice.length;
    const result = new Float64Array(len);

    if (len === 0 || windowSize <= 1) return result;

    for (let i = 0; i < len; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const count = i - start + 1;
      
      let sum = 0;
      for (let j = start; j <= i; j++) {
        sum += slice[j];
      }
      const mean = sum / count;

      let varianceSum = 0;
      for (let j = start; j <= i; j++) {
        varianceSum += Math.pow(slice[j] - mean, 2);
      }
      result[i] = Math.sqrt(varianceSum / count);
    }

    return result;
  }
}
