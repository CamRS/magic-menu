import * as fs from 'fs';
import * as path from 'path';

class Logger {
  private logFile: string;
  private maxSize: number;

  constructor() {
    this.logFile = path.join(process.cwd(), 'logs', 'app.log');
    this.maxSize = 100 * 1024; // 100KB in bytes
    
    // Create logs directory if it doesn't exist
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}\n`;
  }

  private async writeLog(message: string) {
    try {
      // Check file size
      let stats;
      try {
        stats = fs.statSync(this.logFile);
      } catch {
        // File doesn't exist yet
        stats = { size: 0 };
      }

      if (stats.size >= this.maxSize) {
        // Rotate log file
        const backupFile = `${this.logFile}.1`;
        if (fs.existsSync(this.logFile)) {
          if (fs.existsSync(backupFile)) {
            fs.unlinkSync(backupFile);
          }
          fs.renameSync(this.logFile, backupFile);
        }
      }

      // Append to log file
      await fs.promises.appendFile(this.logFile, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message: string, data?: any) {
    const logMessage = data 
      ? `${message} ${JSON.stringify(data, null, 2)}`
      : message;
    
    console.log(logMessage);
    this.writeLog(this.formatMessage('INFO', logMessage));
  }

  error(message: string, error?: any) {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;
    
    const logMessage = errorDetails
      ? `${message} ${JSON.stringify(errorDetails, null, 2)}`
      : message;
    
    console.error(logMessage);
    this.writeLog(this.formatMessage('ERROR', logMessage));
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = data 
        ? `${message} ${JSON.stringify(data, null, 2)}`
        : message;
      
      console.debug(logMessage);
      this.writeLog(this.formatMessage('DEBUG', logMessage));
    }
  }
}

export const logger = new Logger();
