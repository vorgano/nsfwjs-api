require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import our modules
const ImageProcessor = require('./src/imageProcessor');
const NSFWAnalyzer = require('./src/nsfwAnalyzer');
const QueueManager = require('./src/queue');
const ErrorHandler = require('./src/errorHandler');

class NSFWImageAPI {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.startTime = Date.now();
    
    // Initialize components
    this.imageProcessor = new ImageProcessor({
      maxDimension: parseInt(process.env.MAX_IMAGE_DIMENSION) || 1024,
      timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000
    });
    
    this.nsfwAnalyzer = new NSFWAnalyzer();
    
    this.queueManager = new QueueManager({
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 5,
      timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // CORS
    this.app.use(cors());
    
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      req.id = Math.random().toString(36).substr(2, 9);
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url} [${req.id}]`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      try {
        const modelStatus = this.nsfwAnalyzer.getModelStatus();
        const queueHealth = this.queueManager.getHealth();
        const uptime = Date.now() - this.startTime;
        
        const healthData = {
          status: 'healthy',
          uptime: uptime,
          model: modelStatus,
          queue: queueHealth,
          timestamp: new Date().toISOString()
        };
        
        const response = ErrorHandler.createSuccessResponse(healthData, req);
        res.json(response);
      } catch (error) {
        const errorResponse = ErrorHandler.createErrorResponse(error, req);
        res.status(500).json(errorResponse);
      }
    });

    // Image analysis endpoint
    this.app.post('/analyze', async (req, res) => {
      try {
        // Validate request body
        if (!req.body || !req.body.url) {
          return ErrorHandler.handleValidationError(req, res, 'URL is required in request body');
        }

        const { url } = req.body;
        
        // Add task to queue
        const result = await this.queueManager.addTask(async () => {
          // Process image
          const imageBuffer = await this.imageProcessor.processImage(url);
          
          // Analyze image
          const analysisResult = await this.nsfwAnalyzer.analyzeImage(imageBuffer);
          
          // Get additional insights
          const mostLikely = this.nsfwAnalyzer.getMostLikelyClassification(analysisResult.predictions);
          const safetyAssessment = this.nsfwAnalyzer.assessSafety(analysisResult.predictions);
          
          return {
            ...analysisResult,
            insights: {
              mostLikelyClassification: mostLikely,
              safetyAssessment: safetyAssessment
            }
          };
        });

        const response = ErrorHandler.createSuccessResponse(result, req);
        res.json(response);
        
      } catch (error) {
        const errorResponse = ErrorHandler.createErrorResponse(error, req);
        const statusCode = errorResponse.error.statusCode;
        res.status(statusCode).json(errorResponse);
      }
    });

    // Get queue statistics
    this.app.get('/queue/stats', (req, res) => {
      try {
        const stats = this.queueManager.getStats();
        const response = ErrorHandler.createSuccessResponse(stats, req);
        res.json(response);
      } catch (error) {
        const errorResponse = ErrorHandler.createErrorResponse(error, req);
        res.status(500).json(errorResponse);
      }
    });

    // Get image metadata without analysis
    this.app.post('/metadata', async (req, res) => {
      try {
        if (!req.body || !req.body.url) {
          return ErrorHandler.handleValidationError(req, res, 'URL is required in request body');
        }

        const { url } = req.body;
        const metadata = await this.imageProcessor.getImageMetadata(url);
        
        const response = ErrorHandler.createSuccessResponse(metadata, req);
        res.json(response);
        
      } catch (error) {
        const errorResponse = ErrorHandler.createErrorResponse(error, req);
        const statusCode = errorResponse.error.statusCode;
        res.status(statusCode).json(errorResponse);
      }
    });
  }

  /**
   * Setup error handling middleware
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use(ErrorHandler.handleNotFound);
    
    // Global error handler
    this.app.use(ErrorHandler.handleError);
  }

  /**
   * Initialize and start the server
   */
  async start() {
    try {
      console.log('Starting NSFW Image Analysis API...');
      
      // Start the server first
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 Server running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`🔍 Analysis endpoint: POST http://localhost:${this.port}/analyze`);
        console.log(`📈 Queue stats: http://localhost:${this.port}/queue/stats`);
        console.log(`📋 Metadata endpoint: POST http://localhost:${this.port}/metadata`);
      });
      
      // Load the NSFW model in background (non-blocking)
      this.nsfwAnalyzer.loadModel().catch(error => {
        console.error('Background model loading failed:', error);
      });
      
      // Graceful shutdown handling
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handling
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      // Stop accepting new requests
      this.server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          // Wait for queue to finish processing
          await this.queueManager.onIdleWithTimeout(10000);
          console.log('Queue processing completed');
        } catch (error) {
          console.log('Queue shutdown timeout reached');
        }
        
        console.log('Graceful shutdown completed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the server
const api = new NSFWImageAPI();
api.start().catch(error => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
