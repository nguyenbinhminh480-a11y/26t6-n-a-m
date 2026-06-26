/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Compass, ShieldAlert, Zap, Cpu, Wallet, RefreshCw } from 'lucide-react';

export const GuideTab: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto">
      
      {/* LEFT COLUMN: Main Game Rules & Payouts */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* Game Rules Card */}
        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-lg">
          <h3 className="text-slate-100 font-extrabold text-base mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" /> Cách Chơi Bingo18 Vietlott
          </h3>
          
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-medium">
            <p>
              <strong>Bingo18</strong> là hình thức xổ số nhanh quay số liên tục của Vietlott. Mỗi kỳ quay số, hệ thống sẽ thực hiện tung ngẫu nhiên <strong>3 hột xúc xắc (xí ngầu)</strong>, mỗi hột có giá trị mặt từ 1 đến 6 điểm.
            </p>
            <p>
              Tổng điểm của 3 hột xúc xắc cộng lại (tối thiểu là 3 điểm, tối đa là 18 điểm) sẽ quyết định kết quả của kỳ quay đó:
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                <div>
                  <span className="text-rose-400 font-bold">LỚN (TÀI):</span> Tổng điểm từ <strong>12 đến 18 điểm</strong>. Tỷ lệ trả thưởng là 1 ăn 2 (nhận gấp đôi tiền cược). Xác suất toán học lý thuyết là 37.5%.
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                <div>
                  <span className="text-sky-400 font-bold">NHỎ (XỈU):</span> Tổng điểm từ <strong>3 đến 9 điểm</strong>. Tỷ lệ trả thưởng là 1 ăn 2 (nhận gấp đôi tiền cược). Xác suất toán học lý thuyết là 37.5%.
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <div>
                  <span className="text-amber-400 font-bold">HÒA:</span> Tổng điểm là <strong>10 hoặc 11 điểm</strong>. Tỷ lệ trả thưởng là 1 ăn 3. Xác suất toán học lý thuyết là 25.0%.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quant Models Explanation */}
        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-lg">
          <h3 className="text-slate-100 font-extrabold text-base mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" /> Hệ thống Dự đoán Deep-Quant V9.0
          </h3>
          
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-medium">
            <p>
              Ứng dụng tích hợp bộ giải thuật định lượng cấp cao để phân tích chuỗi dữ liệu lớn, bao gồm:
            </p>

            <div className="space-y-3">
              <div>
                <span className="text-indigo-400 font-bold">1. Chuỗi Markov bậc 1 (Markov Chains):</span>
                <p className="mt-1 text-slate-400">
                  Phân tích ma trận chuyển trạng thái giữa các kỳ quay liền kề để xác định xác suất đảo cầu hoặc nối cầu tiếp diễn dựa trên kết quả của kỳ hiện tại.
                </p>
              </div>

              <div>
                <span className="text-indigo-400 font-bold">2. K-Nearest Neighbors (KNN lân cận):</span>
                <p className="mt-1 text-slate-400">
                  Sử dụng phương pháp trích lọc mẫu chuỗi dài. Giải thuật sẽ tìm kiếm các đoạn lịch sử có chuỗi 3 kỳ gần nhất tương đồng hoàn toàn với hiện tại, từ đó đếm tần suất kết quả kỳ tiếp theo của các chuỗi quá khứ đó để đưa ra dự đoán.
                </p>
              </div>

              <div>
                <span className="text-indigo-400 font-bold">3. Bộ Bayesian Tích Chập (Dirichlet-Multinomial Convolution - BDMC):</span>
                <p className="mt-1 text-slate-400">
                  Công cụ cực kỳ mạnh mẽ sử dụng phân phối Dirichlet để phân tích tỷ lệ xuất hiện của từng mặt xúc xắc riêng lẻ (mẫu số liệu lớn gấp 3 lần mẫu tổng số điểm). Sau đó thực hiện thuật toán tích chập toán học (Convolve) để tái tạo chính xác tuyệt đối hàm mật độ xác suất PMF của tổng 3 hạt xúc xắc, tự động nhận biết nếu xúc xắc có dấu hiệu lệch cơ học.
                </p>
              </div>

              <div>
                <span className="text-indigo-400 font-bold">4. Chuỗi Thời Gian AR-EMA & Mạng Nơ-ron AI (MLP Neural):</span>
                <p className="mt-1 text-slate-400">
                  Hệ thống hồi quy tự động kết hợp mạng trí tuệ nhân tạo MLP từ đầu (huấn luyện trực tiếp trên trình duyệt) để dò tìm những hình mẫu phi tuyến siêu cấp, tự động san mượt EMA để tối thiểu hóa sai số.
                </p>
              </div>

              <div>
                <span className="text-indigo-400 font-bold">5. Công thức Quản lý vốn Kelly Criterion:</span>
                <p className="mt-1 text-slate-400">
                  Áp dụng lý thuyết thông tin của Claude Kelly để tối ưu hóa tỷ lệ đi vốn dựa trên lợi thế toán học thực tế và tỷ lệ trả thưởng của trò chơi, bảo vệ tài chính an toàn.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Probability reference & Risk warnings */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Math Probability Reference */}
        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-lg">
          <h3 className="text-slate-100 font-extrabold text-sm mb-4 flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" /> Xác Suất Toán Học Lý Thuyết
          </h3>
          
          <div className="overflow-hidden rounded-xl border border-slate-800 text-[11px]">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 font-bold">
                  <th className="py-2.5 px-4">Tổng Điểm</th>
                  <th className="py-2.5 px-4 text-center">Tổ Hợp Khả Thi</th>
                  <th className="py-2.5 px-4 text-right">Xác Suất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-slate-300">
                <tr>
                  <td className="py-2 px-4 font-sans font-semibold">
                    <span className="text-sky-400">3đ (XỈU)</span> <span className="text-slate-600">/</span> <span className="text-rose-400">18đ (TÀI)</span>
                  </td>
                  <td className="py-2 px-4 text-center">1 / 216</td>
                  <td className="py-2 px-4 text-right">0.46%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-semibold">
                    <span className="text-sky-400">4đ (XỈU)</span> <span className="text-slate-600">/</span> <span className="text-rose-400">17đ (TÀI)</span>
                  </td>
                  <td className="py-2 px-4 text-center">3 / 216</td>
                  <td className="py-2 px-4 text-right">1.39%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-semibold">
                    <span className="text-sky-400">5đ (XỈU)</span> <span className="text-slate-600">/</span> <span className="text-rose-400">16đ (TÀI)</span>
                  </td>
                  <td className="py-2 px-4 text-center">6 / 216</td>
                  <td className="py-2 px-4 text-right">2.78%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-semibold">
                    <span className="text-sky-400">6đ (XỈU)</span> <span className="text-slate-600">/</span> <span className="text-rose-400">15đ (TÀI)</span>
                  </td>
                  <td className="py-2 px-4 text-center">10 / 216</td>
                  <td className="py-2 px-4 text-right">4.63%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-semibold">
                    <span className="text-sky-400">7đ (XỈU)</span> <span className="text-slate-600">/</span> <span className="text-rose-400">14đ (TÀI)</span>
                  </td>
                  <td className="py-2 px-4 text-center">15 / 216</td>
                  <td className="py-2 px-4 text-right">6.94%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-semibold">
                    <span className="text-sky-400">8đ (XỈU)</span> <span className="text-slate-600">/</span> <span className="text-rose-400">13đ (TÀI)</span>
                  </td>
                  <td className="py-2 px-4 text-center">21 / 216</td>
                  <td className="py-2 px-4 text-right">9.72%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans font-semibold">
                    <span className="text-sky-400">9đ (XỈU)</span> <span className="text-slate-600">/</span> <span className="text-rose-400">12đ (TÀI)</span>
                  </td>
                  <td className="py-2 px-4 text-center">25 / 216</td>
                  <td className="py-2 px-4 text-right">11.57%</td>
                </tr>
                <tr className="bg-slate-900/40">
                  <td className="py-2.5 px-4 font-sans font-bold">
                    <span className="text-amber-500">10đ / 11đ (HÒA)</span>
                  </td>
                  <td className="py-2.5 px-4 text-center font-bold text-slate-300">27 / 216</td>
                  <td className="py-2.5 px-4 text-right font-bold text-amber-400">12.50% x 2</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Responsible Gaming & Disclaimer */}
        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-lg">
          <h3 className="text-slate-100 font-extrabold text-sm mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" /> Khuyến Cáo Trách Nhiệm
          </h3>
          
          <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed font-semibold">
            <p>
              Hệ thống dự báo Deep-Quant V9.0 được xây dựng hoàn toàn phục vụ mục đích nghiên cứu lý thuyết xác suất, mô phỏng chuỗi Markov và học máy ứng dụng (KNN).
            </p>
            <p className="text-rose-400/90 bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10">
              ⚠️ <strong>Cảnh báo cực kỳ quan trọng:</strong> Không có bất kỳ thuật toán nào đảm bảo chính xác 100% trong trò chơi may rủi. Việc quay số Vietlott chịu sự điều khiển của hệ thống cơ khí ngẫu nhiên độc lập tuyệt đối.
            </p>
            <p>
              Người chơi vui lòng tham gia có trách nhiệm, không sử dụng hệ thống này để phục vụ mục đích đặt cược rủi ro tài chính lớn. Mọi hành vi đỏ đen quá đà có hại cho kinh tế bản thân và xã hội.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
