import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

function validateEnvironmentVariables() {
  const requiredVariables = {
    'ZAPIER_API_KEY': true, // true means it's required in production
    'VITE_DROPBOX_ACCESS_TOKEN': true,
    'VITE_DROPBOX_APP_KEY': true,
    'VITE_DROPBOX_APP_SECRET': true,
    'VITE_DROPBOX_REFRESH_TOKEN': true
  };

  const missingVariables = [];

  for (const [variable, required] of Object.entries(requiredVariables)) {
    if (!process.env[variable]) {
      if (process.env.NODE_ENV === 'production' && required) {
        missingVariables.push(variable);
      } else if (process.env.NODE_ENV !== 'production') {
        log(`Warning: ${variable} is not set in development environment`, 'env-check');
      }
    } else {
      log(`✓ ${variable} is configured`, 'env-check');
    }
  }

  if (missingVariables.length > 0 && process.env.NODE_ENV === 'production') {
    log(`Fatal: Missing required environment variables in production: ${missingVariables.join(', ')}`, 'env-check');
    process.exit(1);
  }
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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Handle payload too large error specifically
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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();