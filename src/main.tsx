// @ts-nocheck
import React, { StrictMode, Component, ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            background: "#333",
            color: "red",
            minHeight: "100vh",
          }}
        >
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// TẠI SAO (Why): Đăng ký Service Worker ngầm giúp ứng dụng có thể tải nhanh và chạy ổn định khi mất kết nối mạng.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[Service Worker] Đăng ký thành công với scope: ", reg.scope);
        
        // Cố gắng đăng ký Background Sync ngầm nếu có hỗ trợ
        if ('sync' in reg) {
          reg.sync.register('sync-draws').catch(() => {
            // Âm thầm bỏ qua nếu bị từ chối
          });
        }
      })
      .catch((err) => {
        console.error("[Service Worker] Đăng ký thất bại: ", err);
      });
  });
}

