import { describe, it, expect } from 'vitest';
import { getSumType, calculateAnalytics } from './predictor';
import { 
  runARForecast, 
  runMLPClassifier, 
  runMarkovKNNForecast, 
  runBayesianConvolutedForecast, 
  runMonteCarloSimulation, 
  runRandomForestForecast, 
  runLSTMForecast, 
  runXGBoostForecast, 
  runTransformerForecast 
} from './algorithms';
import { Draw } from '../types';

// Generate simulated sequence of draws for deterministic testing
const makeMockDraws = (count: number, pattern: 'alternating' | 'high' | 'low' | 'random' = 'alternating', startIdOffset: number = 0): Draw[] => {
  const draws: Draw[] = [];
  for (let i = 1; i <= count; i++) {
    let numbers = [3, 3, 3]; // sum 9 (XIU)
    if (pattern === 'alternating') {
      numbers = i % 2 === 0 ? [5, 5, 5] : [2, 2, 2]; // Alternates sum 15 (TAI) and sum 6 (XIU)
    } else if (pattern === 'high') {
      numbers = [5, 5, 5]; // sum 15 (TAI)
    } else if (pattern === 'low') {
      numbers = [2, 2, 2]; // sum 6 (XIU)
    } else {
      // random dice values
      const seed = Math.sin(i + startIdOffset) * 10000;
      const d1 = Math.floor((seed % 6) + 1);
      const d2 = Math.floor(((seed * 1.3) % 6) + 1);
      const d3 = Math.floor(((seed * 1.7) % 6) + 1);
      numbers = [d1, d2, d3];
    }

    draws.push({
      id: `K${100000 + startIdOffset + i}`,
      date: '2026-06-24',
      numbers,
    });
  }
  return draws;
};

describe('Quantitative Analytics Prediction Engine Unit Tests', () => {

  describe('getSumType', () => {
    it('should classify sums correctly', () => {
      // TAI (sums 12 - 18)
      expect(getSumType(12)).toBe('TAI');
      expect(getSumType(15)).toBe('TAI');
      expect(getSumType(18)).toBe('TAI');

      // HOA (sums 10 - 11)
      expect(getSumType(10)).toBe('HOA');
      expect(getSumType(11)).toBe('HOA');

      // XIU (sums 3 - 9)
      expect(getSumType(3)).toBe('XIU');
      expect(getSumType(6)).toBe('XIU');
      expect(getSumType(9)).toBe('XIU');
    });
  });

  describe('calculateAnalytics', () => {
    it('should return null when data is empty or invalid', () => {
      expect(calculateAnalytics([])).toBeNull();
      // @ts-ignore
      expect(calculateAnalytics(null)).toBeNull();
    });

    it('should generate accurate frequencies and stats from mock history', () => {
      // Generate alternating draws
      const draws = makeMockDraws(20, 'alternating');
      const analytics = calculateAnalytics(draws, 'ensemble');

      expect(analytics).not.toBeNull();
      if (analytics) {
        expect(analytics.totalAnalyzed).toBe(20);
        expect(analytics.lastDrawNumbers).toEqual([5, 5, 5]); // i = 20 (even) is high
        expect(analytics.lastDrawSum).toBe(15);
        expect(analytics.lastDrawState).toBe('TAI');

        // Check frequency counters are computed correctly
        const countOf5 = analytics.frequencies.find(f => f.number === 5)?.count || 0;
        const countOf2 = analytics.frequencies.find(f => f.number === 2)?.count || 0;
        expect(countOf5).toBe(30); // 10 draws of [5, 5, 5]
        expect(countOf2).toBe(30); // 10 draws of [2, 2, 2]

        // Assert that hotNumbers and coldNumbers lists are updated correctly
        expect(analytics.hotNumbers).toContain(5);
        expect(analytics.hotNumbers).toContain(2);
      }
    });

    it('should correctly handle streaks (max streaks, current streak)', () => {
      // 5 Lows followed by 5 Highs with sequential, non-overlapping IDs
      const draws: Draw[] = [
        ...makeMockDraws(5, 'low', 0),
        ...makeMockDraws(5, 'high', 5)
      ];
      
      const analytics = calculateAnalytics(draws);
      expect(analytics).not.toBeNull();
      if (analytics) {
        expect(analytics.currentStreakType).toBe('TAI');
        expect(analytics.currentStreakLength).toBe(5);
        expect(analytics.maxTaiStreak).toBe(5);
        expect(analytics.maxXiuStreak).toBe(5);
      }
    });
  });

  describe('AR-EMA Time-Series Algorithm', () => {
    it('should run auto-regressive forecast with exponential moving average successfully', () => {
      const draws = makeMockDraws(15, 'alternating');
      const params = { lag: 4, emaAlpha: 0.3, learningRate: 0.05, epochs: 50 };
      const res = runARForecast(draws, params, 1.2);

      expect(res).toHaveProperty('predictedSum');
      expect(res).toHaveProperty('scores');
      expect(res.predictedSum).toBeGreaterThanOrEqual(3);
      expect(res.predictedSum).toBeLessThanOrEqual(18);
      expect(Math.abs(res.scores.TAI + res.scores.XIU + res.scores.HOA - 100.0)).toBeLessThan(0.5);
    });
  });

  describe('MLP Neural Network Classifier', () => {
    it('should backpropagate and train on mock data sequence', () => {
      const draws = makeMockDraws(15, 'alternating');
      const params = { inputLags: 4, hiddenNeurons: 6, learningRate: 0.1, epochs: 100 };
      const res = runMLPClassifier(draws, params);

      expect(res).toHaveProperty('scores');
      expect(Math.abs(res.scores.TAI + res.scores.XIU + res.scores.HOA - 100.0)).toBeLessThan(0.5);
    });
  });

  describe('Markov Chain & K-Nearest Neighbors Ensemble', () => {
    it('should match sequences and perform transitions on historical chains', () => {
      const draws = makeMockDraws(20, 'alternating');
      const res = runMarkovKNNForecast(draws);

      expect(res).toHaveProperty('predictedSum');
      expect(res).toHaveProperty('scores');
      expect(Math.abs(res.scores.TAI + res.scores.XIU + res.scores.HOA - 100.0)).toBeLessThan(0.5);
    });
  });

  describe('Bayesian Convoluted Model', () => {
    it('should estimate probabilities with prior distribution update', () => {
      const draws = makeMockDraws(15, 'random');
      const res = runBayesianConvolutedForecast(draws);

      expect(res).toHaveProperty('scores');
      expect(Math.abs(res.scores.TAI + res.scores.XIU + res.scores.HOA - 100.0)).toBeLessThan(0.5);
    });
  });

  describe('Monte Carlo Simulator', () => {
    it('should simulate paths to determine distribution properties', () => {
      const draws = makeMockDraws(15, 'random');
      const res = runMonteCarloSimulation(draws, 200);

      expect(res).toHaveProperty('scores');
      expect(Math.abs(res.scores.TAI + res.scores.XIU + res.scores.HOA - 100.0)).toBeLessThan(0.5);
    });
  });

  describe('Decision Tree / Random Forest Model', () => {
    it('should build decision boundaries and predict results', () => {
      const draws = makeMockDraws(25, 'random');
      const res = runRandomForestForecast(draws, 10, 3, 4);

      expect(res).toHaveProperty('scores');
      expect(Math.abs(res.scores.TAI + res.scores.XIU + res.scores.HOA - 100.0)).toBeLessThan(0.5);
    });
  });

  describe('Long Short-Term Memory (LSTM) Model', () => {
    it('should propagate gate weights over temporal inputs', () => {
      const draws = makeMockDraws(20, 'random');
      const res = runLSTMForecast(draws, 15, 6, 4);

      expect(res).toHaveProperty('scores');
      expect(Math.abs(res.scores.TAI + res.scores.XIU + res.scores.HOA - 100.0)).toBeLessThan(0.5);
    });
  });

  describe('Extreme Gradient Boosting (XGBoost) Model', () => {
    it('should fit residuals dynamically across multiple trees', () => {
      const draws = makeMockDraws(20, 'random');
      const res = runXGBoostForecast(draws, 10, 3, 0.1, 4);

      expect(res).toHaveProperty('scores');
      expect(Math.abs(res.scores.TAI + res.scores.XIU + res.scores.HOA - 100.0)).toBeLessThan(0.5);
    });
  });

  describe('Attention-based Transformer Model', () => {
    it('should calculate query-key self-attention coefficients', () => {
      const draws = makeMockDraws(20, 'random');
      const res = runTransformerForecast(draws, 8, 4);

      expect(res).toHaveProperty('scores');
      expect(Math.abs(res.scores.TAI + res.scores.XIU + res.scores.HOA - 100.0)).toBeLessThan(0.5);
    });
  });
});
