import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import outlookEmailRoutes from "./routes/outlook-email-routes";
import cors from "cors";
// Removed frontend-related imports
import { registerAILearningRoutes } from "./routes/ai-learning-routes";
import { registerMiltonAIRoutes } from "./routes/milton-ai-routes";
import simpleImportRouter from "./simple-import";
import timeTrackingRoutes from "./routes/time-tracking-routes";
import calendarIntegrationRoutes from "./routes/calendar-integration-routes";
import firmCalendarSettingsRoutes from "./routes/firm-calendar-settings-routes";
import path from "path";
import fs from "fs";

// Add process-level error handlers to prevent crashes
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit the process, just log the error
});

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  // Don't exit the process, just log the error
});

// Handle database connection errors specifically
process.on("error", (error) => {
  console.error("🚨 Process Error:", error);
});

const app = express();

// Trust proxy to get correct headers from reverse proxy
app.set('trust proxy', true);

// Helper function to serve client logos
const serveClientLogo = (req: Request, res: Response) => {
  const filename = req.params.filename;
  // If basePath is provided (from route pattern), validate it's not a reserved route
  const basePath = (req.params as any).basePath;
  if (basePath && ['api', 'uploads', 'debug-path', 'test-uploads'].includes(basePath)) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const filePath = path.join(process.cwd(), 'uploads', 'client-logos', filename);
  
  console.log(`📸 Serving logo request:`, {
    filename,
    filePath,
    basePath: basePath || 'none',
    originalUrl: req.originalUrl,
    url: req.url,
    path: req.path
  });
  
  // Security: prevent path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    console.error(`❌ Invalid filename (path traversal attempt): ${filename}`);
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Logo file not found: ${filePath}`);
    return res.status(404).json({ error: 'Logo not found' });
  }
  
  // Set appropriate content type based on file extension
  const ext = filename.split('.').pop()?.toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === 'jpg' || ext === 'jpeg') {
    contentType = 'image/jpeg';
  } else if (ext === 'png') {
    contentType = 'image/png';
  } else if (ext === 'gif') {
    contentType = 'image/gif';
  } else if (ext === 'webp') {
    contentType = 'image/webp';
  } else if (ext === 'svg') {
    contentType = 'image/svg+xml';
  }
  
  // Set headers for CORS and caching
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  // Add CORS headers to allow cross-origin image loading
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`❌ Error sending logo file: ${err.message}`, {
        filePath,
        filename,
        error: err
      });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving logo file' });
      }
    } else {
      console.log(`✅ Logo served successfully: ${filename}`);
    }
  });
};

// Middleware to catch ALL logo requests (before any other processing)
// This handles both /uploads/client-logos/:filename and /:basePath/uploads/client-logos/:filename
app.use((req, res, next) => {
  // Handle OPTIONS preflight requests for CORS
  if (req.method === 'OPTIONS' && (req.path.includes('client-logos') || req.originalUrl?.includes('client-logos'))) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  
  // Only process GET requests for logo files
  if (req.method !== 'GET') {
    return next();
  }
  
  const originalUrl = req.originalUrl || req.url || '';
  const url = originalUrl.split('?')[0]; // Remove query string
  
  // Log all requests to help debug routing issues
  if (url.includes('client-logos') || url.includes('uploads')) {
    console.log(`🔍 Logo route check:`, {
      originalUrl,
      url,
      path: req.path,
      method: req.method,
      headers: {
        host: req.get('host'),
        'x-forwarded-prefix': req.get('x-forwarded-prefix'),
        'x-original-uri': req.get('x-original-uri'),
      }
    });
  }
  
  // Match both patterns:
  // 1. /uploads/client-logos/:filename
  // 2. /:basePath/uploads/client-logos/:filename (e.g., /staging/uploads/client-logos/:filename)
  // Updated regex to be more explicit and handle base paths correctly
  const logoMatch = url.match(/(?:\/([^\/]+))?\/uploads\/client-logos\/([^\/\?]+)$/);
  
  if (logoMatch) {
    const basePath = logoMatch[1] || null;
    const filename = logoMatch[2];
    
    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.error(`❌ Invalid filename (path traversal attempt): ${filename}`);
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Validate basePath is not a reserved route
    if (basePath && ['api', 'uploads', 'debug-path', 'test-uploads'].includes(basePath)) {
      console.log(`⚠️ Reserved basePath detected, skipping: ${basePath}`);
      return next(); // Let other routes handle it
    }
    
    console.log(`📸 Logo request detected and matched:`, {
      filename,
      originalUrl,
      url,
      basePath: basePath || 'none',
      method: req.method,
      matchedPattern: basePath ? `/${basePath}/uploads/client-logos/${filename}` : `/uploads/client-logos/${filename}`
    });
    
    // Serve the logo
    return serveClientLogo({ ...req, params: { filename, basePath } } as any, res);
  }
  
  next();
});

// Serve static files from uploads directory FIRST, before any path manipulation
// This ensures uploads are accessible regardless of base path configuration
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
  setHeaders: (res, filePath) => {
    // Set appropriate headers for images
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (ext === 'png') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (ext === 'gif') {
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (ext === 'webp') {
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (ext === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Increase JSON payload limit for large GL imports (32K+ transactions)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Middleware to handle base path prefix (e.g., /staging, /prod, /dev) from reverse proxy
// MUST run FIRST, before any other middleware that might use req.url or req.path
// This allows routes to work generically across all environments
// Strips any prefix before '/api' so routes can match correctly
// Skip this middleware for /uploads paths to ensure static file serving works
app.use((req, res, next) => {
  // Skip base path processing for uploads (static files)
  if (req.path.startsWith('/uploads')) {
    return next();
  }
  // Check multiple sources for the base path:
  // 1. Custom headers set by reverse proxy (X-Forwarded-Prefix, X-Original-URI, X-Forwarded-Path)
  // 2. Environment variable (BASE_PATH)
  // 3. URL path analysis (if prefix is in the incoming URL)
  
  let basePath = '';
  
  // First, check reverse proxy headers (most reliable)
  const forwardedPrefix = req.get('x-forwarded-prefix');
  const originalUri = req.get('x-original-uri');
  const forwardedPath = req.get('x-forwarded-path');
  
  if (forwardedPrefix) {
    basePath = forwardedPrefix;
    console.log(`🔍 Base path from X-Forwarded-Prefix header: ${basePath}`);
  } else if (originalUri && originalUri.includes('/api')) {
    const apiIndex = originalUri.indexOf('/api');
    if (apiIndex > 0) {
      basePath = originalUri.substring(0, apiIndex);
      console.log(`🔍 Base path from X-Original-URI header: ${basePath}`);
    }
  } else if (forwardedPath && forwardedPath.includes('/api')) {
    const apiIndex = forwardedPath.indexOf('/api');
    if (apiIndex > 0) {
      basePath = forwardedPath.substring(0, apiIndex);
      console.log(`🔍 Base path from X-Forwarded-Path header: ${basePath}`);
    }
  } else if (process.env.BASE_PATH) {
    // Fallback to environment variable
    basePath = process.env.BASE_PATH;
    console.log(`🔍 Base path from BASE_PATH env var: ${basePath}`);
  } else {
    // Last resort: try to detect from URL
    const incomingUrl = req.originalUrl || req.url || '';
    if (incomingUrl.includes('/api')) {
      const apiIndex = incomingUrl.indexOf('/api');
      if (apiIndex > 0) {
        basePath = incomingUrl.substring(0, apiIndex);
        console.log(`🔍 Base path detected from URL: ${basePath}`);
      }
    }
  }
  
  // Store the base path for later use
  (req as any).basePath = basePath;
  
  // If we found a base path, strip it from req.url for routing
  if (basePath) {
    const incomingUrl = req.originalUrl || req.url || '';
    if (incomingUrl.startsWith(basePath)) {
      const pathAfterBase = incomingUrl.substring(basePath.length);
      const queryString = incomingUrl.includes('?') ? incomingUrl.substring(incomingUrl.indexOf('?')) : '';
      req.url = pathAfterBase + queryString;
      console.log(`✅ Base path detected: ${basePath}, stripped to: ${req.url}`);
    }
  } else {
    console.log(`ℹ️ No base path detected - using direct routing`);
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  // Capture original path before any modifications
  const originalPath = req.originalUrl || req.url || req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Use the path that was actually matched (req.path) for logging
    const logPath = req.path || originalPath;
    if (logPath.includes("/api") || originalPath.includes("/api")) {
      let logLine = `${req.method} ${logPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// CORS configuration
const corsOptions = {
  origin: [
    // Development origins
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    // Production origins
    "https://master.d2ds7rb6f3ky5e.amplifyapp.com",
    "https://develop.d2or3xnbcd7nl9.amplifyapp.com",
    "https://feat-books-v2.drontly46uji.amplifyapp.com",
    "https://main.dc7chs5crnzgv.amplifyapp.com",
    // Staging/Production server origins
    "http://13.62.68.100",
    "https://13.62.68.100",
    "http://13.62.68.100:3000",
    "http://13.62.68.100:3001",
    "http://13.62.68.100:5000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Cookie",
    "Cache-Control",
    "Pragma",
    "Expires",
  ],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Test route to debug base path handling (remove in production if needed)
app.get('/debug-path', (req, res) => {
  res.json({
    originalUrl: req.originalUrl,
    url: req.url,
    path: req.path,
    basePath: (req as any).basePath,
    baseUrl: req.baseUrl,
    headers: {
      host: req.get('host'),
      'x-forwarded-path': req.get('x-forwarded-path'),
      'x-original-uri': req.get('x-original-uri'),
    }
  });
});

// Test route to verify static file serving
app.get('/test-uploads', (req, res) => {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'client-logos');
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({
      uploadsDir,
      files,
      cwd: process.cwd(),
      staticConfigured: true
    });
  } catch (error) {
    res.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      uploadsDir,
      cwd: process.cwd()
    });
  }
});

(async () => {
  const server = await registerRoutes(app);

  // Register AI Learning routes
  registerAILearningRoutes(app);

  // Register Milton AI routes
  registerMiltonAIRoutes(app);

  // Register simple import routes (no authentication)
  app.use("/api/simple", simpleImportRouter);

  // Register time tracking routes
  app.use("/api/time", timeTrackingRoutes);
  // Register Outlook email routes
  app.use(outlookEmailRoutes);

  // Register calendar integration routes
  app.use("/api/calendar", calendarIntegrationRoutes);

  // Register firm calendar settings routes
  app.use("/api/firm", firmCalendarSettingsRoutes);

  // Initialize automation scheduler for Phase 2 operations
  console.log("🚀 Initializing Phase 2 automation scheduler...");
  const { automationScheduler } = await import(
    "./services/automation-scheduler"
  );
  automationScheduler.start();

  // Initialize cron job scheduler for automated tasks
  console.log("⏰ Initializing cron job scheduler...");
  const { initializeCronJobs } = await import("./cron");
  initializeCronJobs();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("🚨 Express Error Handler:", err);

    // Don't crash the server, just return the error response
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // Frontend serving removed - backend only

  // Serve the backend API on port 5001 (matches Vite proxy config)
  const port = Number(process.env.PORT) || 5001;
  server.listen(port, "0.0.0.0", () => {
    console.log(`✅ Backend API serving on port ${port}`);
    console.log(`✅ Ready to accept requests from Vite proxy (localhost:3000 -> localhost:${port})`);
  });
})();
