// Enhanced Analysis Utilities - Superior to Code 1
export interface AnalysisConfig {
  temperature: number;
  seed: number;
  maxRetries: number;
  cacheEnabled: boolean;
}

export interface ConsistencyMetadata {
  seed: number;
  temperature: number;
  timestamp: string;
  attempts: number;
  version: string;
}

export class EnhancedAnalysisManager {
  private cache = new Map<string, any>();
  private readonly defaultConfig: AnalysisConfig = {
    temperature: 0.1,
    seed: 0,
    maxRetries: 3,
    cacheEnabled: true
  };

  // Generate deterministic seed from company names
  generateSeed(companies: string[]): number {
    const normalized = companies
      .map(c => c.toLowerCase().trim())
      .sort()
      .join('');
    
    return Math.abs(
      normalized
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    );
  }

  // Create cache key for consistent results
  createCacheKey(companies: string[], mode: string): string {
    const seed = this.generateSeed(companies);
    return `analysis_${seed}_${mode}`;
  }

  // Get cached analysis if available
  getCachedAnalysis(companies: string[], mode: string): any | null {
    if (!this.defaultConfig.cacheEnabled) return null;
    
    const key = this.createCacheKey(companies, mode);
    const cached = this.cache.get(key);
    
    if (cached) {
      console.log('🎯 Using cached analysis:', { key, companies: companies.length });
      return {
        ...cached,
        fromCache: true,
        cacheKey: key
      };
    }
    
    return null;
  }

  // Store analysis in cache
  setCachedAnalysis(companies: string[], mode: string, analysis: any): void {
    if (!this.defaultConfig.cacheEnabled) return;
    
    const key = this.createCacheKey(companies, mode);
    this.cache.set(key, {
      ...analysis,
      cachedAt: new Date().toISOString()
    });
    
    console.log('💾 Analysis cached:', { key, companies: companies.length });
  }

  // Validate analysis consistency
  validateConsistency(analysis1: any, analysis2: any): boolean {
    if (!analysis1?.metadata?.seed || !analysis2?.metadata?.seed) {
      return false;
    }
    
    return analysis1.metadata.seed === analysis2.metadata.seed;
  }

  // Enhanced error recovery
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.defaultConfig.maxRetries
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  // Circuit breaker pattern
  private circuitState = { failures: 0, lastFailure: 0, isOpen: false };
  private readonly circuitThreshold = 5;
  private readonly circuitTimeout = 60000; // 1 minute

  isCircuitOpen(): boolean {
    if (this.circuitState.isOpen) {
      const timeSinceLastFailure = Date.now() - this.circuitState.lastFailure;
      if (timeSinceLastFailure > this.circuitTimeout) {
        console.log('🔄 Circuit breaker reset');
        this.circuitState = { failures: 0, lastFailure: 0, isOpen: false };
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure(): void {
    this.circuitState.failures++;
    this.circuitState.lastFailure = Date.now();
    
    if (this.circuitState.failures >= this.circuitThreshold) {
      this.circuitState.isOpen = true;
      console.warn('⚡ Circuit breaker opened due to failures');
    }
  }

  recordSuccess(): void {
    this.circuitState.failures = 0;
    this.circuitState.isOpen = false;
  }
}

// Export singleton instance
export const enhancedAnalysis = new EnhancedAnalysisManager();

// Utility functions
export const generateConsistentId = (input: string): string => {
  return `analysis_${Math.abs(input.split('').reduce((a, b) => a + b.charCodeAt(0), 0))}`;
};

export const formatConsistencyReport = (metadata: ConsistencyMetadata): string => {
  return `Analysis ID: ${metadata.seed} | Temperature: ${metadata.temperature} | Attempts: ${metadata.attempts}`;
};