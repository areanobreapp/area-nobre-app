import { GeoLogEntry, GeoConsumptionSummary } from './types';

class GeoLogger {
  private logs: GeoLogEntry[] = [];
  private readonly maxLogs: number = 200;

  public logCall(params: {
    provider: string;
    operation: GeoLogEntry['operation'];
    durationMs: number;
    success: boolean;
    querySnippet: string;
    error?: string;
  }): GeoLogEntry {
    // Sanitização rigorosa: nunca logar chaves, senhas ou telefones
    const cleanSnippet = this.sanitizeQuery(params.querySnippet);

    const entry: GeoLogEntry = {
      id: Math.random().toString(36).substring(2, 10),
      provider: params.provider,
      operation: params.operation,
      timestamp: new Date().toISOString(),
      durationMs: Math.max(0, Math.round(params.durationMs)),
      success: params.success,
      querySnippet: cleanSnippet,
      error: params.error ? params.error.substring(0, 100) : undefined,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Log estruturado discreto no console do servidor
    console.log(
      `[GeoProvider] [${entry.provider}] ${entry.operation} - ${entry.success ? 'OK' : 'FAIL'} (${entry.durationMs}ms) - "${entry.querySnippet}"`
    );

    return entry;
  }

  public getSummary(): GeoConsumptionSummary {
    const totalCalls = this.logs.length;
    const successfulCalls = this.logs.filter((l) => l.success).length;
    const failedCalls = totalCalls - successfulCalls;

    const byProvider: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    let totalDuration = 0;

    for (const log of this.logs) {
      byProvider[log.provider] = (byProvider[log.provider] || 0) + 1;
      byOperation[log.operation] = (byOperation[log.operation] || 0) + 1;
      totalDuration += log.durationMs;
    }

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      byProvider,
      byOperation,
      averageDurationMs: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
      recentLogs: this.logs.slice(0, 50),
    };
  }

  public getLogs(): GeoLogEntry[] {
    return [...this.logs];
  }

  public clear() {
    this.logs = [];
  }

  private sanitizeQuery(query: string): string {
    if (!query) return '';
    // Remove padrões de telefone, e-mails ou chaves longas hex/jwt
    let cleaned = query
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[PHONE]')
      .replace(/[a-fA-F0-9]{32,}/g, '[KEY]')
      .trim();

    if (cleaned.length > 80) {
      cleaned = cleaned.substring(0, 77) + '...';
    }
    return cleaned;
  }
}

// Singleton no contexto de execução do Node.js
const globalForGeoLogger = global as unknown as { geoLogger?: GeoLogger };
export const geoLogger = globalForGeoLogger.geoLogger || new GeoLogger();
if (process.env.NODE_ENV !== 'production') globalForGeoLogger.geoLogger = geoLogger;
