/**
 * Client-side logger utility that mirrors the server logger interface
 */
class Logger {
  info(message: string, data?: any) {
    const logMessage = data 
      ? `${message} ${JSON.stringify(data, null, 2)}`
      : message;
    
    console.log(logMessage);
  }

  error(message: string, error?: any) {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;
    
    const logMessage = errorDetails
      ? `${message} ${JSON.stringify(errorDetails, null, 2)}`
      : message;
    
    console.error(logMessage);
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = data 
        ? `${message} ${JSON.stringify(data, null, 2)}`
        : message;
      
      console.debug(logMessage);
    }
  }
}

export const logger = new Logger();
