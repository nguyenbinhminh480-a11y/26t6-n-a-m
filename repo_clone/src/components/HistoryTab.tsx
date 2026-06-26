/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Draw, SumType } from '../types';
import { getSumType } from '../utils/predictor';
import { 
  Search, Filter, Plus, Calendar, Trash2, ChevronLeft, 
  ChevronRight, ChevronsLeft, ChevronsRight, Edit3, X, Cloud
} from 'lucide-react';

interface HistoryTabProps {
  data: Draw[];
  manualData: Draw[];
  filteredData: Draw[];
  currentTableData: Draw[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: string;
  setFilterType: (t: string) => void;
  
  // Add manual
  showManualForm: boolean;
  setShowManualForm: (show: boolean) => void;
  manualId: string;
  setManualId: (id: string) => void;
  manualNum1: number;
  setManualNum1: (n: number) => void;
  manualNum2: number;
  setManualNum2: (n: number) => void;
  manualNum3: number;
  setManualNum3: (n: number) => void;
  onAddManualData: () => void;
  onRemoveManualData: (id: string) => void;
  
  cloudSyncStatus: string;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  data,
  manualData,
  filteredData,
  currentTableData,
  currentPage,
  totalPages,
  onPageChange,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  
  showManualForm,
  setShowManualForm,
  manualId,
  setManualId,
  manualNum1,
  setManualNum1,
  manualNum2,
  setManualNum2,
  manualNum3,
  setManualNum3,
  onAddManualData,
  onRemoveManualData,
  
  cloudSyncStatus
}) => {
  const tableTopRef = useRef<HTMLDivElement>(null);

  const getDiceDotClass = (val: number) => {
    switch (val) {
      case 1: return "col-start-2 row-start-2";
      case 2: return "col-start-1 row-start-1 col-end-2 row-end-2, col-start-3 row-start-3 col-end-4 row-end-4";
      case 3: return "col-start-1 row-start-1, col-start-2 row-start-2, col-start-3 row-start-3";
      case 4: return "col-start-1 row-start-1, col-start-1 row-start-3, col-start-3 row-start-1, col-start-3 row-start-3";
      case 5: return "col-start-1 row-start-1, col-start-1 row-start-3, col-start-2 row-start-2, col-start-3 row-start-1, col-start-3 row-start-3";
      case 6: return "col-start-1 row-start-1, col-start-1 row-start-2, col-start-1 row-start-3, col-start-3 row-start-1, col-start-3 row-start-2, col-start-3 row-start-3";
      default: return "";
    }
  };

  const renderDiceDots = (val: number, size: 'sm' | 'md' = 'sm') => {
    const arr = getDiceDotClass(val).split(',').map(s => s.trim());
    const containerClass = size === 'sm' 
      ? 'w-7 h-7 bg-slate-100 rounded shadow-inner grid grid-cols-3 grid-rows-3 p-1 gap-0.5' 
      : 'w-12 h-12 bg-slate-50 rounded-xl shadow-md grid grid-cols-3 grid-rows-3 p-2 gap-1 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors';
    const dotClass = size === 'sm' ? 'w-1.5 h-1.5 bg-slate-900 rounded-full' : 'w-2 h-2 bg-slate-900 rounded-full';

    return (
      <div className={`${containerClass} justify-items-center items-center`}>
        {arr.map((cls, idx) => (
          <div key={idx} className={`${dotClass} ${cls}`} />
        ))}
      </div>
    );
  };

  const handlePageClick = (page: number) => {
    onPageChange(page);
    if (tableTopRef.current) {
      tableTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6" ref={tableTopRef}>
      
      {/* Top action rail */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
        
        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            <input 
              type="text" 
              placeholder="Tìm mã kỳ quay (ví dụ: 12345)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          {/* Filter selection */}
          <div className="relative min-w-[140px]">
            <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-slate-300 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="all">Tất cả Kết Quả</option>
              <option value="tai">Kỳ TÀI (≥ 12đ)</option>
              <option value="xiu">Kỳ XỈU (≤ 9đ)</option>
              <option value="hoa">Kỳ HÒA (10-11đ)</option>
              <option value="manual">Kỳ Nhập Tay</option>
            </select>
          </div>
        </div>

        {/* Manual data toggler */}
        <div className="flex items-center gap-2.5 justify-end shrink-0">
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border shadow-md transition-all ${
              showManualForm 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' 
                : 'bg-indigo-600 text-slate-100 border-indigo-500/50 hover:bg-indigo-500'
            }`}
          >
            {showManualForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showManualForm ? 'Đóng form nhập' : 'Nhập tay kết quả'}
          </button>
        </div>
      </div>

      {/* Manual Input Form */}
      {showManualForm && (
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <h3 className="text-slate-100 font-extrabold text-sm mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" /> Nhập thủ công kết quả kỳ quay (Thử nghiệm thuật toán)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
            
            {/* Draw ID Input */}
            <div className="md:col-span-3">
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Mã Kỳ Quay (Draw ID)</label>
              <input 
                type="text" 
                placeholder="Ví dụ: 00985"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 text-sm font-bold font-mono focus:outline-none focus:border-indigo-500 placeholder:text-slate-700"
              />
            </div>

            {/* Selector Dice 1 */}
            <div className="md:col-span-2.5">
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Xúc Xắc 1</label>
              <div className="flex gap-1.5 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/80 justify-center">
                {[1, 2, 3, 4, 5, 6].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setManualNum1(v)}
                    className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-all ${
                      manualNum1 === v 
                        ? 'bg-indigo-600 text-slate-100 shadow-lg scale-110' 
                        : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector Dice 2 */}
            <div className="md:col-span-2.5">
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Xúc Xắc 2</label>
              <div className="flex gap-1.5 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/80 justify-center">
                {[1, 2, 3, 4, 5, 6].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setManualNum2(v)}
                    className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-all ${
                      manualNum2 === v 
                        ? 'bg-indigo-600 text-slate-100 shadow-lg scale-110' 
                        : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector Dice 3 */}
            <div className="md:col-span-2.5">
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Xúc Xắc 3</label>
              <div className="flex gap-1.5 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/80 justify-center">
                {[1, 2, 3, 4, 5, 6].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setManualNum3(v)}
                    className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-all ${
                      manualNum3 === v 
                        ? 'bg-indigo-600 text-slate-100 shadow-lg scale-110' 
                        : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <div className="md:col-span-1.5">
              <button
                type="button"
                onClick={onAddManualData}
                className="w-full bg-emerald-600 text-slate-100 hover:bg-emerald-500 transition-all font-bold text-xs py-3 rounded-xl border border-emerald-500/50 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Thêm Kỳ
              </button>
            </div>

          </div>
          
          {manualData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-500 font-medium">
              <span>Có {manualData.length} kỳ quay tự nhập trong cơ sở dữ liệu cục bộ.</span>
              <span className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wide">
                <Cloud className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                Đồng bộ Cloud: {cloudSyncStatus === 'synced' ? 'Đã lưu' : cloudSyncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Ngoại tuyến'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Draw Table */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Mobile-optimized Card List view */}
        <div className="block md:hidden divide-y divide-slate-800/45">
          {currentTableData.length > 0 ? (
            currentTableData.map((draw) => {
              const sum = draw.numbers.reduce((a, b) => a + b, 0);
              const type = getSumType(sum);
              
              return (
                <div key={draw.id} className="p-4 flex flex-col gap-3 hover:bg-slate-800/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-200 font-mono text-base">#{draw.id}</span>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-500" /> {draw.date}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2.5 py-1 rounded font-extrabold text-[10px] uppercase border shadow-sm ${
                        type === 'TAI' ? 'bg-rose-500/15 text-rose-400 border-rose-500/25' : 
                        type === 'XIU' ? 'bg-sky-500/15 text-sky-400 border-sky-500/25' : 
                        'bg-amber-500/15 text-amber-400 border-amber-500/25'
                      }`}>
                        {type === 'TAI' ? 'TÀI' : type === 'XIU' ? 'XỈU' : 'HÒA'}
                      </span>
                      {draw.isManual ? (
                        <button
                          onClick={() => onRemoveManualData(draw.id)}
                          className="text-rose-400 p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer active:scale-90"
                          title="Xóa kỳ quay nhập thủ công này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      {draw.numbers.map((val, idx) => (
                        <React.Fragment key={idx}>
                          {renderDiceDots(val, 'sm')}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                      Tổng: <span className="font-mono font-black text-indigo-400 text-sm">{sum}đ</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Nguồn dữ liệu:</span>
                    {draw.isManual ? (
                      <span className="font-bold text-emerald-400 uppercase">Nhập thủ công</span>
                    ) : (
                      <span className="font-bold text-slate-400 uppercase">API Đồng bộ</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-500 font-medium text-xs">
              Không tìm thấy dữ liệu kỳ quay nào khớp với tìm kiếm và lọc.
            </div>
          )}
        </div>

        {/* Desktop-only Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6">Mã Kỳ Quay / Thời gian</th>
                <th className="py-4 px-6">Kết quả Dice</th>
                <th className="py-4 px-6 text-center">Tổng Điểm</th>
                <th className="py-4 px-6 text-center">Kết Quả</th>
                <th className="py-4 px-6 text-center">Nguồn dữ liệu</th>
                <th className="py-4 px-6 text-center w-20">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/55">
              {currentTableData.length > 0 ? (
                currentTableData.map((draw) => {
                  const sum = draw.numbers.reduce((a, b) => a + b, 0);
                  const type = getSumType(sum);
                  
                  return (
                    <tr 
                      key={draw.id} 
                      className="hover:bg-slate-800/10 transition-colors text-xs font-semibold text-slate-300"
                    >
                      {/* ID / Date */}
                      <td className="py-3 px-6">
                        <div className="font-extrabold text-slate-200 font-mono text-sm">#{draw.id}</div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 shrink-0" /> {draw.date}
                        </div>
                      </td>
                      
                      {/* Dice face render */}
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-1.5">
                          {draw.numbers.map((val, idx) => (
                            <React.Fragment key={idx}>
                              {renderDiceDots(val, 'sm')}
                            </React.Fragment>
                          ))}
                        </div>
                      </td>

                      {/* Sum */}
                      <td className="py-3 px-6 text-center">
                        <span className="text-sm font-extrabold font-mono bg-slate-950/40 border border-slate-800/80 px-2.5 py-1 rounded text-indigo-400">
                          {sum}
                        </span>
                      </td>

                      {/* State Badge */}
                      <td className="py-3 px-6 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded font-extrabold text-[10px] uppercase border shadow-sm ${
                          type === 'TAI' ? 'bg-rose-500/15 text-rose-400 border-rose-500/25' : 
                          type === 'XIU' ? 'bg-sky-500/15 text-sky-400 border-sky-500/25' : 
                          'bg-amber-500/15 text-amber-400 border-amber-500/25'
                        }`}>
                          {type === 'TAI' ? 'TÀI' : type === 'XIU' ? 'XỈU' : 'HÒA'}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-6 text-center">
                        {draw.isManual ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-bold">Nhập tay</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700/50 text-[9px] uppercase font-bold">Hệ thống API</span>
                        )}
                      </td>

                      {/* Delete manually entered draw */}
                      <td className="py-3 px-6 text-center">
                        {draw.isManual ? (
                          <button
                            onClick={() => onRemoveManualData(draw.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Xóa kỳ quay nhập thủ công này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-700 font-mono text-[10px]">-</span>
                        )}
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium text-xs">
                    Không tìm thấy dữ liệu kỳ quay nào khớp với tìm kiếm và lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-800 bg-slate-950/20">
            <span className="text-[11px] text-slate-500 font-semibold">
              Đang xem Trang {currentPage} / {totalPages} (Tìm thấy {filteredData.length} kết quả)
            </span>
            
            <div className="flex items-center gap-1.5">
              {/* First page */}
              <button
                onClick={() => handlePageClick(1)}
                disabled={currentPage === 1}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-950 disabled:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              
              {/* Previous page */}
              <button
                onClick={() => handlePageClick(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-950 disabled:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Number buttons (showing surrounding pages) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let p = currentPage - 2 + idx;
                if (currentPage <= 2) p = idx + 1;
                else if (currentPage >= totalPages - 1) p = totalPages - 4 + idx;
                
                // Clamp
                if (p < 1 || p > totalPages) return null;
                
                return (
                  <button
                    key={p}
                    onClick={() => handlePageClick(p)}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      currentPage === p 
                        ? 'bg-indigo-600 text-slate-100 shadow-md border border-indigo-500' 
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              {/* Next page */}
              <button
                onClick={() => handlePageClick(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-950 disabled:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last page */}
              <button
                onClick={() => handlePageClick(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-950 disabled:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
