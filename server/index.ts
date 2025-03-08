import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

function validateEnvironmentVariables() {
  const requiredVariables = {
    'VITE_DROPBOX_ACCESS_TOKEN': true,
    'VITE_DROPBOX_APP_KEY': true,
    'VITE_DROPBOX_APP_SECRET': true,
    'VITE_DROPBOX_REFRESH_TOKEN': true,
    'ZAPIER_API_KEY': true
  };

  const missingVariables = [];
  const environment = process.env.NODE_ENV || 'development';

  log(`Starting environment validation in ${environment} mode`, 'env-check');

  for (const [variable, required] of Object.entries(requiredVariables)) {
    if (!process.env[variable]) {
      if (process.env.NODE_ENV === 'production' && required) {
        missingVariables.push(variable);
        log(`❌ ${variable} is missing (required in production)`, 'env-check');
      } else if (process.env.NODE_ENV !== 'production') {
        log(`⚠️ ${variable} is not set in development environment`, 'env-check');
      }
    } else {
      log(`✓ ${variable} is configured`, 'env-check');
    }
  }

  if (missingVariables.length > 0 && process.env.NODE_ENV === 'production') {
    log(`Fatal: Missing required environment variables in production: ${missingVariables.join(', ')}`, 'env-check');
    log('Application cannot start without required environment variables', 'env-check');
    process.exit(1);
  }

  log('Environment validation completed', 'env-check');
}

// Check environment variables before starting the server
validateEnvironmentVariables();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  log('Starting server initialization...', 'startup');

  // Kill any existing process on port 5000 (development only)
  if (process.env.NODE_ENV === 'development') {
    try {
      const { execSync } = require('child_process');
      execSync('fuser -k 5000/tcp', { stdio: 'ignore' });
      log('Cleared port 5000', 'startup');
    } catch (error) {
      // Ignore errors, port might not be in use
    }
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        message: 'File too large. Maximum size is 10MB.'
      });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    log('Setting up Vite in development mode...', 'startup');
    await setupVite(app, server);
  } else {
    log('Setting up static file serving for production...', 'startup');
    serveStatic(app);
  }

  // Always use port 5000
  const PORT = 5000;

  log(`Attempting to start server on port ${PORT}...`, 'startup');

  // Add a small delay to ensure port is cleared
  await new Promise(resolve => setTimeout(resolve, 1000));

  server.listen(PORT, "0.0.0.0")
    .once('listening', () => {
      log(`Server started successfully on port ${PORT}`, 'startup');
    })
    .once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        log(`Fatal: Port ${PORT} is already in use. Please free up port ${PORT} and try again.`, 'startup');
        process.exit(1);
      } else {
        log(`Fatal: Failed to start server: ${err.message}`, 'startup');
        process.exit(1);
      }
    });
})();