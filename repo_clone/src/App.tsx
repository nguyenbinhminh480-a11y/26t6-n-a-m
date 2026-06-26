/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Clock, AlertCircle, RefreshCw, Cpu, CheckCircle, Database,
  TrendingUp, HelpCircle, Activity, Award, BookOpen, Cloud, CloudOff,
  Signal, ShieldAlert, Info, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged, User
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, onSnapshot, Firestore
} from 'firebase/firestore';

import { Draw, Analytics } from './types';
import { calculateAnalytics, getSumType } from './utils/predictor';
import { ARParams, MLPParams } from './utils/algorithms';
import { syncWithGoogleDrive } from './utils/driveSync';

const clampDice = (v: any): number => {
  const n = Number(v);
  if (isNaN(n)) return 1;
  return Math.min(6, Math.max(1, Math.round(n)));
};

import { PredictionTab } from './components/PredictionTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { HistoryTab } from './components/HistoryTab';
import { GuideTab } from './components/GuideTab';

// App ID fallback
const appId = 'bingo18-predictor-v8-1';

// Safe environment global configurations
let firebaseConfig: any = null;
try {
  // @ts-ignore
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    // @ts-ignore
    firebaseConfig = typeof __firebase_config === 'string'
      // @ts-ignore
      ? JSON.parse(__firebase_config)
      // @ts-ignore
      : __firebase_config;
  }
} catch (e) {
  console.warn('Cannot parse runtime Firebase config.');
}

// Initialize Firebase safely
let firebaseApp: any = null;
let auth: any = null;
let db: any = null;

if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  } catch (error) {
    console.error('Firebase SDK dynamic init error:', error);
  }
}

const DATA_URL = 'https://raw.githubusercontent.com/vietvudanh/vietlott-data/main/data/bingo18.jsonl';
const ITEMS_PER_PAGE = 50;

export default function App() {
  const [fetchedData, setFetchedData] = useState<Draw[]>([]);
  const [manualData, setManualData] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isOfflineMode, setIsOfflineMode] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string>('offline');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('prediction');
  const [arParams, setArParams] = useState<ARParams>({ lag: 5, emaAlpha: 0.3, learningRate: 0.01, epochs: 150 });
  const [mlpParams, setMlpParams] = useState<MLPParams>({ inputLags: 5, hiddenNeurons: 8, learningRate: 0.05, epochs: 250 });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveSyncStatus, setDriveSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual entry states
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualId, setManualId] = useState('');
  const [manualNum1, setManualNum1] = useState(1);
  const [manualNum2, setManualNum2] = useState(1);
  const [manualNum3, setManualNum3] = useState(1);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Listen for OAuth token
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OAUTH_TOKEN') {
        setDriveToken(event.data.token);
      }
    };
    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'REQUEST_OAUTH_TOKEN' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync with Drive when token is available
  useEffect(() => {
    if (driveToken && driveSyncStatus === 'idle') {
      setDriveSyncStatus('syncing');
      syncWithGoogleDrive(driveToken, manualData).then(merged => {
        if (merged.length > manualData.length) {
           setManualData(merged);
           try {
             localStorage.setItem('bingo18_manual_data', JSON.stringify(merged));
           } catch(e){}
        }
        setDriveSyncStatus('synced');
        showToast('Đồng bộ Google Drive thành công', 'success');
      }).catch(err => {
        console.error('Drive Sync Error', err);
        setDriveSyncStatus('error');
        showToast('Lỗi đồng bộ Google Drive', 'error');
      });
    }
  }, [driveToken, driveSyncStatus, manualData, showToast]);

  // Sync real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format clock output
  const timeString = useMemo(() => {
    return currentTime.toLocaleTimeString('vi-VN', { hour12: false });
  }, [currentTime]);

  const dateString = useMemo(() => {
    return currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [currentTime]);

  // Combine fetched + manual inputs
  const combinedData = useMemo(() => {
    const manualIds = new Set(manualData.map(m => String(m.id)));
    const uniqueFetched = fetchedData.filter(item => !manualIds.has(String(item.id)));
    const combined = [...manualData, ...uniqueFetched];
    
    return combined.sort((a, b) => {
      const numA = Number(String(a.id).replace(/\D/g, ''));
      const numB = Number(String(b.id).replace(/\D/g, ''));
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numB - numA;
      return String(b.id).localeCompare(String(a.id));
    });
  }, [manualData, fetchedData]);

  // API call to Gemini has been permanently removed per user request: "Tuyệt đối không sử dụng API bên ngoài cho AI"
  // The system will exclusively use its integrated local mathematical AI model (SiLU MLP, Bayesian, Kalman, AR-EMA, XGBoost)
  // for all pattern recognition and self-reflection!

  const lastDrawIdRef = useRef<string>("");
  useEffect(() => {
    const newestId = combinedData[0]?.id || "";
    if (newestId && newestId !== lastDrawIdRef.current) {
      lastDrawIdRef.current = newestId;
      // No external API call. The local prediction engine will handle everything seamlessly in calculateAnalytics()!
    }
  }, [combinedData, arParams, mlpParams]);

  // Save manual list helper
  const saveManualData = useCallback(async (newList: Draw[]) => {
    setManualData(newList);
    // 1. Save to LocalStorage for safety
    try {
      localStorage.setItem('bingo18_manual_data', JSON.stringify(newList));
    } catch (e) {
      console.warn('Failed to write manual data to local storage');
    }

    // Google Drive Sync
    if (driveToken) {
      setDriveSyncStatus('syncing');
      syncWithGoogleDrive(driveToken, newList).then(() => {
        setDriveSyncStatus('synced');
      }).catch(err => {
        console.error('Drive Sync Error', err);
        setDriveSyncStatus('error');
      });
    }

    // 2. Save to Firestore if user is active
    if (db && user) {
      setCloudSyncStatus('syncing');
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'manualData', 'history');
        await setDoc(docRef, { list: newList });
        setCloudSyncStatus('synced');
      } catch (err) {
        console.error('Firestore manual save failure:', err);
        setCloudSyncStatus('error');
        showToast('Lỗi đồng bộ đám mây, đã lưu cục bộ thiết bị.', 'info');
      }
    }
  }, [user, showToast, driveToken]);

  // Fetch from the data url
  const fetchData = useCallback(async (isInitialLoad = false, isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    setError(null);

    try {
      // First attempt to restore from Firestore cached artifact to render instantly
      if (isInitialLoad && db && auth?.currentUser) {
        try {
          const cacheRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'fetchedData', 'cache');
          const cacheSnap = await getDoc(cacheRef);
          if (cacheSnap.exists() && Array.isArray(cacheSnap.data().list)) {
            const restoredList: Draw[] = cacheSnap.data().list.map((rawStr: string) => {
              if (typeof rawStr === 'string') {
                const parts = rawStr.split('|');
                if (parts.length >= 3 && parts[1]) {
                  return {
                    id: parts[0],
                    numbers: parts[1].split(',').map(Number),
                    date: parts[2] || 'N/A',
                  };
                }
              }
              return null;
            }).filter(Boolean) as Draw[];
            setFetchedData(prev => prev.length === 0 ? restoredList : prev);
          }
        } catch (e) {
          console.warn('Firestore Cache load failed, proceeding with direct fetch');
        }
      }

      const response = await fetch(`${DATA_URL}?t=${new Date().getTime()}`);

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const text = await response.text();
      const lines = text.trim().split('\n').filter(line => line.trim() !== '');
      
      // Limit to the most recent 1500 draws to guarantee zero latency and optimal memory usage on mobile devices
      const recentLines = lines.slice(-1500);
      const targetLines = [...recentLines].reverse();

      const parsedData: Draw[] = targetLines.map((line, index) => {
        try {
          const item = JSON.parse(line);
          let numbers: number[] = [];
          if (Array.isArray(item?.result)) {
            numbers = item.result.map(Number);
          } else if (typeof item?.result === 'string') {
            numbers = item.result.split(/[-,\\s]+/).map(Number);
          } else if (item?.numbers) {
            numbers = Array.isArray(item.numbers) ? item.numbers.map(Number) : String(item.numbers).split(/[-,\\s]+/).map(Number);
          }

          const validNumbers = numbers.filter(n => !isNaN(n) && n >= 1 && n <= 6);
          if (validNumbers.length !== 3) return null;

          return {
            id: item.draw_id || item.id || `Kỳ-${index}`,
            date: item.draw_date || item.date || item.draw_time || 'N/A',
            numbers: validNumbers,
            isManual: false,
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean) as Draw[];

      setFetchedData(parsedData);
      setIsOfflineMode(false);

      // Save to cache in background if signed in
      if (db && auth?.currentUser && parsedData.length > 0) {
        const cacheDocRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'fetchedData', 'cache');
        const compressedCache = parsedData.map(d => `${d.id}|${d.numbers.join(',')}|${d.date}`);
        setDoc(cacheDocRef, { list: compressedCache.slice(0, 1000) }).catch(() => {});
      }

      // Auto-archive missing draws into the private persistent warehouse so we never lose them (independent of 3rd party!)
      if (parsedData.length > 0) {
        setManualData(currentManual => {
          const manualMap = new Map<string, Draw>(currentManual.map(d => [String(d.id), d]));
          let updated = false;
          for (const draw of parsedData) {
            const idStr = String(draw.id);
            if (!manualMap.has(idStr)) {
              manualMap.set(idStr, { ...draw, isManual: true });
              updated = true;
            }
          }
          if (updated) {
            const newList = Array.from(manualMap.values()).sort((a, b) => {
              const numA = Number(String(a.id).replace(/\D/g, ''));
              const numB = Number(String(b.id).replace(/\D/g, ''));
              if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numB - numA;
              return String(b.id).localeCompare(String(a.id));
            });
            saveManualData(newList);
            return newList;
          }
          return currentManual;
        });
      }

      if (!isInitialLoad && !isSilent) {
        showToast('Đã đồng bộ bộ dữ liệu Deep-Quant V9.0 mới nhất!', 'success');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (isInitialLoad) {
        setIsOfflineMode(true);
        setError('Không kết nối được máy chủ Vietlott API. Đang tải mô hình Offline.');
      } else if (!isSilent) {
        showToast('Lỗi cập nhật. Hãy kiểm tra kết nối mạng của bạn.', 'error');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast, saveManualData]);

  // Mount effect
  useEffect(() => {
    // Authenticate with Firebase if config is present
    if (auth) {
      setCloudSyncStatus('syncing');
      signInAnonymously(auth)
        .then((credential) => {
          setUser(credential.user);
          setIsOfflineMode(false);
          setCloudSyncStatus('synced');
        })
        .catch((err) => {
          console.error('Firebase Auth failed:', err);
          setIsOfflineMode(true);
          setCloudSyncStatus('offline');
        });

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          setIsOfflineMode(false);
          setCloudSyncStatus('synced');
        } else {
          setCloudSyncStatus('offline');
        }
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
      setCloudSyncStatus('offline');
    }
  }, []);

  // Sync historical manual inputs from Cloud Firestore
  useEffect(() => {
    if (!db || !user) {
      // Restore manual entries from local storage in absolute offline mode
      try {
        const stored = localStorage.getItem('bingo18_manual_data');
        if (stored) {
          setManualData(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('LocalStorage restore failed');
      }
      return;
    }

    setCloudSyncStatus('syncing');
    const manualDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'manualData', 'history');
    
    const unsubManual = onSnapshot(manualDocRef, (docSnap) => {
      if (docSnap.exists() && Array.isArray(docSnap.data().list)) {
        setManualData(docSnap.data().list.map((item: any) => ({ ...item, isManual: true })));
      }
      setCloudSyncStatus('synced');
    }, (err) => {
      console.warn('Firestore snapshot error, falling back to local cache', err);
      setCloudSyncStatus('error');
    });

    return () => unsubManual();
  }, [user]);

  // Initial data pull on mount or auth ready
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Auto-refresh interval trigger
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;
    if (autoRefresh) {
      refreshTimer = setInterval(() => fetchData(false, true), 12000); // refresh every 12s
    }
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [autoRefresh, fetchData]);

  // Sequential ID generator for manual entry
  useEffect(() => {
    if (!showManualForm) return;
    if (combinedData.length === 0) return;
    
    setManualId(prev => {
      if (prev !== '') return prev;
      const latestId = String(combinedData[0]?.id || '');
      const match = latestId.match(/(\d+)/);
      if (match) {
        const numPart = match[1];
        const nextIdNum = Number(numPart) + 1;
        const nextIdStr = String(nextIdNum).padStart(numPart.length, '0');
        return latestId.replace(numPart, nextIdStr);
      }
      return '10001';
    });
  }, [showManualForm, combinedData]);



  // Add Manual Draw handler
  const handleAddManualData = useCallback(() => {
    if (!manualId.trim()) {
      return showToast('Vui lòng cung cấp mã kỳ quay hợp lệ!', 'error');
    }

    const n1 = clampDice(manualNum1);
    const n2 = clampDice(manualNum2);
    const n3 = clampDice(manualNum3);

    const newDraw: Draw = {
      id: manualId.trim(),
      date: new Date().toLocaleString('vi-VN') + ' (Tự nhập)',
      numbers: [n1, n2, n3],
      isManual: true,
    };

    if (combinedData.some(d => String(d.id) === String(newDraw.id))) {
      return showToast(`Mã kỳ quay #${newDraw.id} đã tồn tại trong hệ thống!`, 'error');
    }

    const updated = [newDraw, ...manualData];
    saveManualData(updated);
    showToast(`Đã thêm thủ công kết quả kỳ #${newDraw.id}!`, 'success');

    // Instant, synchronous analytics recalculation to ensure 0ms latency on user action
    const manualIds = new Set(updated.map(m => String(m.id)));
    const uniqueFetched = fetchedData.filter(item => !manualIds.has(String(item.id)));
    const newCombined = [...updated, ...uniqueFetched].sort((a, b) => {
      const numA = Number(String(a.id).replace(/\D/g, ''));
      const numB = Number(String(b.id).replace(/\D/g, ''));
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numB - numA;
      return String(b.id).localeCompare(String(a.id));
    });
    
    setIsCalculating(true);
    setTimeout(() => {
      const res = calculateAnalytics(newCombined, 'ensemble', arParams, mlpParams);
      setAnalytics(res);
      setIsCalculating(false);
    }, 10);
    
    // Clear state & Auto-advance ID
    setManualId('');
    setManualNum1(1);
    setManualNum2(1);
    setManualNum3(1);
    setCurrentPage(1);
  }, [manualId, manualNum1, manualNum2, manualNum3, combinedData, manualData, fetchedData, saveManualData, showToast, arParams, mlpParams]);

  // Remove manual draw handler
  const handleRemoveManualData = useCallback((idToRemove: string) => {
    const updated = manualData.filter(d => String(d.id) !== String(idToRemove));
    saveManualData(updated);
    showToast(`Đã gỡ bỏ dữ liệu tự nhập kỳ #${idToRemove}`, 'info');

    // Instant, synchronous analytics recalculation to ensure 0ms latency on user action
    const manualIds = new Set(updated.map(m => String(m.id)));
    const uniqueFetched = fetchedData.filter(item => !manualIds.has(String(item.id)));
    const newCombined = [...updated, ...uniqueFetched].sort((a, b) => {
      const numA = Number(String(a.id).replace(/\D/g, ''));
      const numB = Number(String(b.id).replace(/\D/g, ''));
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numB - numA;
      return String(b.id).localeCompare(String(a.id));
    });

    setIsCalculating(true);
    setTimeout(() => {
      const res = calculateAnalytics(newCombined, 'ensemble', arParams, mlpParams);
      setAnalytics(res);
      setIsCalculating(false);
    }, 10);
  }, [manualData, fetchedData, saveManualData, showToast, arParams, mlpParams]);

  // Run Quantitative Analysis computations with smart immediate-vs-debounce dispatching
  const [analytics, setAnalytics] = useState<any>(() => {
    return calculateAnalytics(combinedData, 'ensemble', arParams, mlpParams);
  });
  const [isCalculating, setIsCalculating] = useState(false);

  // Track previous combinedData length/content to trigger instant updates on manual input
  const prevCombinedDataRef = useRef(combinedData);

  useEffect(() => {
    // Check if the actual draw history has updated (e.g. manual entry added or removed)
    const isDataChanged = prevCombinedDataRef.current !== combinedData;
    prevCombinedDataRef.current = combinedData;

    if (isDataChanged) {
      // 1. Give React a tick to show calculation state
      setIsCalculating(true);
      const timer = setTimeout(() => {
        const res = calculateAnalytics(combinedData, 'ensemble', arParams, mlpParams);
        setAnalytics(res);
        setIsCalculating(false);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      // 2. Debounced calculation (150ms delay) when slider parameters are dragged to keep UI ultra-smooth
      setIsCalculating(true);
      const timer = setTimeout(() => {
        const res = calculateAnalytics(combinedData, 'ensemble', arParams, mlpParams);
        setAnalytics(res);
        setIsCalculating(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [combinedData, arParams, mlpParams]);

  // Filter & Search computation
  const filteredData = useMemo(() => {
    const cleanQuery = searchQuery.replace(/#/g, '').trim().toLowerCase();
    
    return combinedData.filter(draw => {
      // 1. Search ID query
      if (cleanQuery && !draw.id.toString().toLowerCase().includes(cleanQuery)) {
        return false;
      }
      
      // 2. State filters
      const sum = draw.numbers.reduce((a, b) => a + b, 0);
      const stateType = getSumType(sum);

      if (filterType === 'tai') return stateType === 'TAI';
      if (filterType === 'xiu') return stateType === 'XIU';
      if (filterType === 'hoa') return stateType === 'HOA';
      if (filterType === 'manual') return draw.isManual === true;
      
      return true;
    });
  }, [combinedData, searchQuery, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));

  // Reset page bounds if query/filter shrink data size
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const currentTableData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none selection:bg-indigo-500/30">
      
      {/* Header Container */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-900 shrink-0 sticky top-0 z-50 px-4 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 p-[1px] flex items-center justify-center shadow-lg border border-indigo-500/20">
              <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-slate-100 text-lg font-black tracking-tight">BINGO18 Deep-Quant</h1>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-bold">V9.0</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hệ thống phân tích & dự đoán Vietlott</p>
            </div>
          </div>

          {/* Clock, Status and Sync indicator */}
          <div className="flex flex-wrap items-center gap-3.5 justify-start sm:justify-end">
            {/* Clock display */}
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-900 rounded-xl px-3.5 py-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <div className="text-right">
                <div className="text-slate-200 text-xs font-black font-mono leading-none">{timeString}</div>
                <div className="text-[9px] text-slate-500 font-medium leading-none mt-1 whitespace-nowrap">{dateString}</div>
              </div>
            </div>

            {/* Sync connection pill */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-900 rounded-xl px-3 py-2 text-[10px] font-bold uppercase">
              {isOfflineMode ? (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-rose-400">Offline Mode</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400">Deep-Quant Live</span>
                </>
              )}
            </div>

            {/* Auto-Refresh Toggle Pill */}
            <button
              onClick={() => {
                const nextState = !autoRefresh;
                setAutoRefresh(nextState);
                showToast(nextState ? 'Đã kích hoạt tự động cập nhật thời gian thực (12 giây)!' : 'Đã tắt tự động cập nhật thời gian thực.', 'info');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all active:scale-95 cursor-pointer ${
                autoRefresh 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-slate-950/60 text-slate-500 border-slate-900 hover:text-slate-400'
              }`}
              title="Nhấp để bật/tắt cập nhật tự động 12s"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              <span>Realtime: {autoRefresh ? 'Bật (12s)' : 'Tắt'}</span>
            </button>

            {/* Drive Sync Toggle Pill */}
            <button
              onClick={() => {
                if (!driveToken) {
                  window.parent.postMessage({ type: 'REQUEST_OAUTH_TOKEN' }, '*');
                  showToast('Đang kết nối Google Drive...', 'info');
                } else {
                  setDriveSyncStatus('syncing');
                  syncWithGoogleDrive(driveToken, manualData).then(merged => {
                    if (merged.length > manualData.length) {
                       setManualData(merged);
                       try {
                         localStorage.setItem('bingo18_manual_data', JSON.stringify(merged));
                       } catch(e){}
                    }
                    setDriveSyncStatus('synced');
                    showToast('Đồng bộ Google Drive thành công', 'success');
                  }).catch(err => {
                    console.error('Drive Sync Error', err);
                    setDriveSyncStatus('error');
                    showToast('Lỗi đồng bộ Google Drive', 'error');
                  });
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all active:scale-95 cursor-pointer ${
                driveToken && driveSyncStatus === 'synced'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                  : driveSyncStatus === 'syncing'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : driveSyncStatus === 'error'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-slate-950/60 text-slate-500 border-slate-900 hover:text-slate-400'
              }`}
              title="Lưu trữ lịch sử vào Drive cá nhân"
            >
              <Database className={`w-3.5 h-3.5 ${driveSyncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">
                {driveSyncStatus === 'syncing' ? 'Đang đồng bộ...' : driveToken ? 'Drive OK' : 'Lưu Drive'}
              </span>
            </button>

            {/* Sync control button */}
            <button
              onClick={() => fetchData(false)}
              disabled={isRefreshing}
              className="p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 disabled:opacity-50 border border-slate-800 rounded-xl cursor-pointer transition-all active:scale-95"
              title="Đồng bộ lại dữ liệu tức thời"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        
        {/* Error message indicator banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-4 py-3 rounded-xl flex items-center gap-3 shadow-md">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Tab switcher navigation */}
        <div className="grid grid-cols-3 md:flex md:flex-wrap items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-xl border border-slate-900 w-full md:max-w-max">
          <button
            onClick={() => setActiveTab('prediction')}
            className={`relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
              activeTab === 'prediction'
                ? 'text-slate-100 z-10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'prediction' && (
              <motion.span
                layoutId="activeTabPill"
                className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Cpu className="w-3.5 h-3.5 shrink-0" /> Dự Đoán Định Lượng
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
              activeTab === 'history'
                ? 'text-slate-100 z-10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'history' && (
              <motion.span
                layoutId="activeTabPill"
                className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <List className="w-3.5 h-3.5 shrink-0" /> Lịch Sử Kỳ Quay
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
              activeTab === 'guide'
                ? 'text-slate-100 z-10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'guide' && (
              <motion.span
                layoutId="activeTabPill"
                className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <BookOpen className="w-3.5 h-3.5 shrink-0" /> Hướng Dẫn Sử Dụng
          </button>
        </div>

        {/* Tab content rendering area */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-400 font-bold text-sm">Đang nạp dữ liệu kỳ quay Bingo18...</p>
            <p className="text-slate-600 text-xs mt-1">Khởi tạo và tính toán mô phỏng lượng tử định lượng.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'prediction' && (
                <motion.div
                  key="prediction"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex-1 flex flex-col"
                >
                  <PredictionTab 
                    analytics={analytics} 
                    arParams={arParams}
                    setArParams={setArParams}
                    mlpParams={mlpParams}
                    setMlpParams={setMlpParams}
                    isCalculating={isCalculating}
                    isGeminiLoading={false}
                  />
                </motion.div>
              )}
              
              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex-1 flex flex-col"
                >
                  <HistoryTab
                    data={combinedData}
                    manualData={manualData}
                    filteredData={filteredData}
                    currentTableData={currentTableData}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterType={filterType}
                    setFilterType={setFilterType}
                    showManualForm={showManualForm}
                    setShowManualForm={setShowManualForm}
                    manualId={manualId}
                    setManualId={setManualId}
                    manualNum1={manualNum1}
                    setManualNum1={setManualNum1}
                    manualNum2={manualNum2}
                    setManualNum2={setManualNum2}
                    manualNum3={manualNum3}
                    setManualNum3={setManualNum3}
                    onAddManualData={handleAddManualData}
                    onRemoveManualData={handleRemoveManualData}
                    cloudSyncStatus={cloudSyncStatus}
                  />
                </motion.div>
              )}

              {activeTab === 'guide' && (
                <motion.div
                  key="guide"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex-1 flex flex-col"
                >
                  <GuideTab />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 shrink-0 px-4 py-5 text-center text-[10px] text-slate-600 font-bold uppercase tracking-wider">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <span>Bingo18 Predictor & Analyzer © 2026 • Deep-Quant V9.0 engine</span>
          <span className="flex items-center gap-1.5 justify-center text-slate-500 font-semibold text-[9px]">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            Dự án nghiên cứu toán học xác suất lý thuyết • Không chịu trách nhiệm kết quả thực tế
          </span>
        </div>
      </footer>

      {/* Notification Toast Alert system */}
      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl border shadow-2xl transition-all duration-300 transform scale-100 font-bold text-xs ${
          toast.type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-500/20' :
          toast.type === 'error' ? 'bg-slate-900 text-rose-400 border-rose-500/20' :
          'bg-slate-900 text-indigo-400 border-indigo-500/20'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
