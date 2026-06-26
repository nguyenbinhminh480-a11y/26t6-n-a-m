import React, { useState, useEffect } from "react";
import { Registry } from "../utils/agentSystem";
import { motion } from "motion/react";
import {
  Server,
  Activity,
  Cpu,
  Database,
  Network,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  BrainCircuit,
} from "lucide-react";
import { aiCEO } from "../utils/autonomousSystem";
import { RetrainingQueue } from "../utils/retrainingQueue";

/**
 * AI System Dashboard (CasaOS Inspired)
 * Giao diện Widget Dashboard theo phong cách CasaOS, mượt mà, tối giản, trực quan.
 */

export const AiSystemDashboard: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [systemLoad, setSystemLoad] = useState<number>(0);
  const [queueStatus, setQueueStatus] = useState<string>("IDLE");

  useEffect(() => {
    // Polling mechanism to simulate real-time widget updates
    const interval = setInterval(() => {
      const agents = Registry.getActiveAgents();
      const newReports = agents.map((agent) => {
        const report = agent.getHealthReport();
        const meta = agent.meta;
        return {
          id: meta.id,
          name: meta.name,
          report,
          version: meta.version,
        };
      });
      setReports(newReports);

      // Pseudo-CPU load based on total average latency
      const avgLatency =
        newReports.reduce((acc, curr) => acc + curr.report.latencyAvgMs, 0) /
        (newReports.length || 1);
      
      // Calculate load percentage (assuming 100ms is 100% load for a single frame)
      const currentLoad = Math.min(100, Math.max(0, (avgLatency / 100) * 100));
      // Smoothing out the load variation
      setSystemLoad((prev) => prev * 0.7 + currentLoad * 0.3);

      const idle = typeof RetrainingQueue?.isIdle === "function" ? RetrainingQueue.isIdle() : true;
      setQueueStatus(idle ? "IDLE" : "PROCESSING");
    }, 2000); // update every 2s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-900/40 rounded-3xl p-6 border border-slate-800/60 backdrop-blur-xl shadow-2xl mb-8 select-none">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <Server className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight leading-tight">
              AI Core OS
            </h2>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
              System Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Online
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Widget 1: System Load */}
        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between group hover:bg-slate-800/60 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-slate-300">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold">System Load</span>
            </div>
            <span className="text-xs font-mono text-sky-300">
              {systemLoad.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700/30">
            <motion.div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${systemLoad}%` }}
              transition={{ type: "spring", bounce: 0.2 }}
            />
          </div>
        </div>

        {/* Widget 2: Data Drift Status */}
        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between group hover:bg-slate-800/60 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Activity className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-semibold">Data Drift</span>
            </div>
            {queueStatus === "PROCESSING" ? (
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="text-xl font-black text-slate-100 flex items-baseline gap-1">
              {queueStatus === "PROCESSING" ? "High" : "Low"}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">
              {queueStatus === "PROCESSING" ? "Drift Detected" : "Stable Distribution"}
            </div>
          </div>
        </div>

        {/* Widget 3: Active Agents */}
        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between group hover:bg-slate-800/60 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-slate-300">
              <BrainCircuit className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold">Active Agents</span>
            </div>
            <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center">
              <span className="text-[9px] font-black text-amber-400">
                {reports.length}
              </span>
            </div>
          </div>
          <div>
             <div className="text-xl font-black text-slate-100 flex items-baseline gap-1">
               {reports.filter((r) => r.report.isHealthy).length}
               <span className="text-sm text-slate-500">/ {reports.length}</span>
             </div>
             <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">
              Healthy Agents
             </div>
          </div>
        </div>

        {/* Widget 4: Background Queue */}
        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between group hover:bg-slate-800/60 transition-colors">
           <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Database className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold">Retrain Queue</span>
            </div>
            <Network className={`w-4 h-4 ${queueStatus === "PROCESSING" ? "text-violet-400 animate-spin" : "text-slate-500"}`} />
          </div>
          <div>
            <div className={`text-sm font-black mt-1 ${queueStatus === "PROCESSING" ? "text-violet-400" : "text-slate-300"}`}>
               {queueStatus}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">
              Worker Status
            </div>
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div className="mt-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">
          Agent Registry
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {reports.map((agent) => (
            <div
              key={agent.id}
              className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-3 flex items-center gap-3 hover:bg-slate-800/50 transition-colors"
            >
              <div className="shrink-0 relative">
                {agent.report.isHealthy ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                )}
                {agent.report.isHealthy && (
                  <div className="absolute inset-0 w-5 h-5 rounded-full bg-emerald-400/20 animate-ping" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <div className="text-xs font-bold text-slate-200 truncate pr-2">
                    {agent.name}
                  </div>
                  <div className="text-[9px] font-mono font-medium text-slate-500 shrink-0">
                    v{agent.version}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-medium text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {agent.report.latencyAvgMs.toFixed(1)}ms
                  </span>
                  <span className="text-slate-600">&bull;</span>
                  <span className={agent.report.consecutiveFailures > 0 ? "text-rose-400" : "text-emerald-400/70"}>
                     Fails: {agent.report.consecutiveFailures}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
