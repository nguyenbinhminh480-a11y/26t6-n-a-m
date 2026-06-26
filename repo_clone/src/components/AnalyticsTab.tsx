/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Analytics } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  PieChart, GitMerge, Award, ChevronRight, Zap, Target
} from 'lucide-react';

interface AnalyticsTabProps {
  analytics: Analytics | null;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
        <PieChart className="w-12 h-12 text-slate-600 animate-pulse mb-3" />
        <p className="text-slate-400 font-medium">Chưa có đủ số liệu thống kê.</p>
        <p className="text-slate-500 text-sm mt-1">Vui lòng nạp dữ liệu kỳ quay để biểu diễn các chỉ số đồ họa.</p>
      </div>
    );
  }

  // Pre-process Sum Frequencies for recharts (sums 3 to 18)
  const sumChartData = analytics.sumFrequencies.map(item => ({
    sum: `S${item.sum}`,
    sumRaw: item.sum,
    count: item.count,
    percentage: Number(item.percentage.toFixed(1)),
  }));

  // Dice values frequencies (1-6)
  const diceChartData = analytics.frequencies.map(item => ({
    dice: `Mặt ${item.number}`,
    count: item.count,
    percentage: Number(item.percentage.toFixed(1)),
  }));

  const getSumTypeColor = (sum: number) => {
    if (sum >= 12) return '#f43f5e'; // TAI (rose)
    if (sum >= 10) return '#f59e0b'; // HOA (amber)
    return '#0ea5e9'; // XIU (sky)
  };

  return (
    <div className="space-y-6">
      
      {/* Top row: General Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* State distribution percentage cards */}
        <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Tỷ lệ Lớn / Nhỏ / Hòa</h3>
            <div className="flex justify-between items-end gap-2 mt-2">
              <div className="text-center flex-1">
                <span className="text-[10px] font-bold text-rose-400">TÀI (≥12đ)</span>
                <div className="text-2xl font-black text-rose-500 font-mono mt-1">{analytics.taiPercentage}%</div>
              </div>
              <div className="text-center flex-1 border-x border-slate-800/80 px-2">
                <span className="text-[10px] font-bold text-amber-400">HÒA (10-11đ)</span>
                <div className="text-2xl font-black text-amber-500 font-mono mt-1">{analytics.hoaPercentage}%</div>
              </div>
              <div className="text-center flex-1">
                <span className="text-[10px] font-bold text-sky-400">XỈU (≤9đ)</span>
                <div className="text-2xl font-black text-sky-500 font-mono mt-1">{analytics.xiuPercentage}%</div>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-slate-950/80 h-3 rounded-full flex overflow-hidden mt-6 border border-slate-800">
            <div className="bg-rose-500 h-full" style={{ width: `${analytics.taiPercentage}%` }} />
            <div className="bg-amber-500 h-full" style={{ width: `${analytics.hoaPercentage}%` }} />
            <div className="bg-sky-500 h-full" style={{ width: `${analytics.xiuPercentage}%` }} />
          </div>
        </div>

        {/* Chẵn / Lẻ Card */}
        <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Phân phối Chẵn / Lẻ</h3>
            
            <div className="flex justify-around items-center mt-3">
              <div className="text-center">
                <div className="text-indigo-400 text-2xl font-black font-mono">{analytics.evenPercentage}%</div>
                <div className="text-[10px] text-slate-500 font-bold mt-1">TỔNG CHẴN</div>
              </div>
              
              <div className="h-8 w-[1px] bg-slate-800" />

              <div className="text-center">
                <div className="text-amber-500 text-2xl font-black font-mono">{analytics.oddPercentage}%</div>
                <div className="text-[10px] text-slate-500 font-bold mt-1">TỔNG LẺ</div>
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-950/80 h-3 rounded-full flex overflow-hidden mt-6 border border-slate-800">
            <div className="bg-indigo-500 h-full" style={{ width: `${analytics.evenPercentage}%` }} />
            <div className="bg-amber-500 h-full" style={{ width: `${analytics.oddPercentage}%` }} />
          </div>
        </div>

        {/* Hot and Cold Numbers */}
        <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Mặt số Xuất hiện nhiều/ít nhất</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Hot */}
            <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wide">🔥 Cực Nóng (Hot)</span>
              <div className="flex items-center gap-1.5 mt-2">
                {analytics.hotNumbers.map((num, i) => (
                  <div key={i} className="w-8 h-8 bg-rose-600 text-slate-100 rounded-lg flex items-center justify-center font-extrabold text-sm shadow">
                    {num}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Cold */}
            <div className="bg-sky-500/5 p-3 rounded-xl border border-sky-500/10">
              <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wide">❄️ Cực Lạnh (Cold)</span>
              <div className="flex items-center gap-1.5 mt-2">
                {analytics.coldNumbers.map((num, i) => (
                  <div key={i} className="w-8 h-8 bg-sky-600 text-slate-100 rounded-lg flex items-center justify-center font-extrabold text-sm shadow">
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sum Frequency Chart */}
        <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="mb-4">
            <h3 className="text-slate-200 font-bold text-sm">Biểu đồ Tần suất Tổng Điểm (Sum Distribution)</h3>
            <p className="text-slate-500 text-xs mt-0.5">Tỷ lệ phần trăm xuất hiện của các tổng từ 3 đến 18 điểm</p>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sumChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="sum" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                  {sumChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getSumTypeColor(entry.sumRaw)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dice Faces Frequency Chart */}
        <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="mb-4">
            <h3 className="text-slate-200 font-bold text-sm">Biểu đồ Tần suất Mặt Xúc Xắc</h3>
            <p className="text-slate-500 text-xs mt-0.5">So sánh mức độ xuất hiện đồng đều của các mặt xúc xắc từ 1 đến 6</p>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="dice" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Bar dataKey="percentage" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {diceChartData.map((entry, index) => {
                    const isCore = (index + 1) === analytics.coreNumber;
                    return (
                      <Cell key={`cell-${index}`} fill={isCore ? '#4f46e5' : '#818cf8'} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Grid: Co-occurrence Affinity Heatmap & Streaks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Co-occurrence Heatmap Grid (6x6 matrix) */}
        <div className="lg:col-span-8 bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="mb-4">
            <h3 className="text-slate-200 font-bold text-sm flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-indigo-400" /> Ma trận đồng xuất hiện xúc xắc (Dice Co-occurrence Affinity)
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Xác định cặp mặt số thường được lắc ra cùng nhau trong cùng một kỳ quay</p>
          </div>

          <div className="grid grid-cols-7 gap-1.5 max-w-lg mx-auto">
            {/* Header label corner */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-[10px] text-slate-500 font-bold font-mono">DICE</div>
            {/* Column labels */}
            {[1, 2, 3, 4, 5, 6].map(col => (
              <div key={col} className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-850/60 rounded flex items-center justify-center font-bold text-xs text-indigo-300 border border-slate-800">
                {col}
              </div>
            ))}

            {/* Matrix rows */}
            {[1, 2, 3, 4, 5, 6].map((row, rowIdx) => (
              <React.Fragment key={row}>
                {/* Row label */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-850/60 rounded flex items-center justify-center font-bold text-xs text-indigo-300 border border-slate-800">
                  {row}
                </div>
                {/* Matrix cells */}
                {[1, 2, 3, 4, 5, 6].map((col, colIdx) => {
                  const score = analytics.affinityMatrix[rowIdx][colIdx];
                  // self cells
                  const isSelf = row === col;
                  
                  // Heatmap color based on co-occurrence score
                  let cellBg = 'bg-slate-950/20 text-slate-500';
                  if (!isSelf) {
                    if (score > 80) cellBg = 'bg-indigo-600 text-slate-100 border border-indigo-500';
                    else if (score > 60) cellBg = 'bg-indigo-500/70 text-indigo-100';
                    else if (score > 40) cellBg = 'bg-indigo-500/40 text-indigo-200';
                    else if (score > 20) cellBg = 'bg-indigo-500/15 text-indigo-300';
                    else cellBg = 'bg-slate-900/30 text-slate-400';
                  } else {
                    cellBg = 'bg-slate-800/20 text-slate-600 border border-dashed border-slate-800';
                  }

                  return (
                    <div 
                      key={col} 
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded flex flex-col items-center justify-center font-mono text-[10px] font-bold cursor-pointer hover:scale-105 transition-transform ${cellBg}`}
                      title={isSelf ? `Mặt ${row}` : `Mặt ${row} & ${col} có độ thân thuộc ${score}%`}
                    >
                      {isSelf ? '•' : score}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-5 text-[10px] text-slate-500 font-semibold justify-center">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500/15 inline-block" /> Thấp
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500/40 inline-block" /> Trung bình
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500/70 inline-block" /> Cao
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block" /> Rất Cao
            </div>
          </div>
        </div>

        {/* Streaks and Historical Records */}
        <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-slate-200 font-bold text-sm mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Thống kê chuỗi bệt cực đại
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-slate-300">Bệt Tài cực đại</span>
                </div>
                <div className="font-mono text-slate-200 font-black text-sm">{analytics.maxTaiStreak} kỳ liên tiếp</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-500" />
                  <span className="text-xs font-bold text-slate-300">Bệt Xỉu cực đại</span>
                </div>
                <div className="font-mono text-slate-200 font-black text-sm">{analytics.maxXiuStreak} kỳ liên tiếp</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-300">Bệt Hòa cực đại</span>
                </div>
                <div className="font-mono text-slate-200 font-black text-sm">{analytics.maxHoaStreak} kỳ liên tiếp</div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[11px] text-slate-400 leading-relaxed font-medium">
            <span className="text-amber-400 font-bold block mb-1">💡 Kinh nghiệm thực chiến:</span>
            Khi chuỗi bệt đạt trên 5 kỳ liên tiếp, hãy theo dõi chỉ số độ biến động (SD). Nếu SD giảm mạnh xuống dưới 1.1, cầu có thể tiếp tục bệt dài (gọi là bệt rồng). Ngược lại, nếu SD tăng vọt thì khả năng cầu nhảy đảo ngược là cực kỳ cao.
          </div>
        </div>

      </div>

    </div>
  );
};
