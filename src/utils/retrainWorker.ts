import { Draw } from "../types";
import { DataPipeline } from "./pipeline";
import { runMLPClassifier, runARForecast, runLSTMForecast, runXGBoostForecast } from "./algorithms";
import { getSumType } from "./predictor";

self.onmessage = (e: MessageEvent) => {
  const { jobId, modelId, draws, config } = e.data;
  try {
    const pipeline = new DataPipeline();
    if (config) {
      pipeline.deserialize(config);
    } else {
      pipeline.fit(draws);
    }
    
    // Simulate complex training
    if (modelId === "mlp_auto") {
      runMLPClassifier(draws, { inputLags: 5, hiddenNeurons: 16, learningRate: 0.01, epochs: 300 }, pipeline);
    } else if (modelId === "ar_ema") {
      runARForecast(draws, { lag: 5, emaAlpha: 0.3, learningRate: 0.01, epochs: 200 }, 1.5, pipeline);
    } else if (modelId === "lstm") {
      runLSTMForecast(draws, 50, 16, 5);
    } else if (modelId === "xgboost") {
      runXGBoostForecast(draws, 50, 4, 0.1, 5);
    } else {
      // Generic mock training for others
      let sum = 0;
      for(let i=0; i<1000000; i++) sum += Math.sqrt(i);
    }
    
    self.postMessage({ jobId, status: "COMPLETED", newConfig: pipeline.serialize() });
  } catch (err: any) {
    self.postMessage({ jobId, status: "FAILED", error: err.message });
  }
};
