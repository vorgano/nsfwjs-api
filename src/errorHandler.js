/**
 * Standardized error response handler
 */
class ErrorHandler {
  /**
   * Create standardized error response
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @returns {Object} Standardized error response
   */
  static createErrorResponse(error, req = null) {
    const timestamp = new Date().toISOString();
    const requestId = req ? req.id || 'unknown' : 'unknown';
    
    // Determine error type and status code
    const { statusCode, type, message } = this.categorizeError(error);
    
    return {
      error: {
        type,
        message,
        statusCode,
        timestamp,
        requestId
      }
    };
  }

  /**
   * Categorize error and determine appropriate status code
   * @param {Error} error - Error object
   * @returns {Object} Error categorization
   */
  static categorizeError(error) {
    const message = error.message || 'Unknown error occurred';
    
    // URL validation errors
    if (message.includes('Invalid URL') || message.includes('not found')) {
      return {
        statusCode: 400,
        type: 'INVALID_URL',
        message: 'The provided URL is invalid or unreachable'
      };
    }
    
    // Image processing errors
    if (message.includes('Image processing failed') || 
        message.includes('Image resizing failed') ||
        message.includes('Empty response')) {
      return {
        statusCode: 422,
        type: 'IMAGE_PROCESSING_ERROR',
        message: 'Failed to process the image. Please ensure the URL points to a valid image.'
      };
    }
    
    // Model errors
    if (message.includes('Model not loaded') || 
        message.includes('Model loading failed')) {
      return {
        statusCode: 503,
        type: 'MODEL_ERROR',
        message: 'The analysis model is not available. Please try again later.'
      };
    }
    
    // Analysis errors
    if (message.includes('Image analysis failed')) {
      return {
        statusCode: 422,
        type: 'ANALYSIS_ERROR',
        message: 'Failed to analyze the image. The image may be corrupted or in an unsupported format.'
      };
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('Request timeout')) {
      return {
        statusCode: 408,
        type: 'TIMEOUT_ERROR',
        message: 'Request timed out. The image may be too large or the server is busy.'
      };
    }
    
    // Validation errors
    if (message.includes('validation') || message.includes('required')) {
      return {
        statusCode: 400,
        type: 'VALIDATION_ERROR',
        message: 'Invalid request. Please check your input and try again.'
      };
    }
    
    // Default server error
    return {
      statusCode: 500,
      type: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.'
    };
  }

  /**
   * Express error handling middleware
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static handleError(error, req, res, next) {
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    const errorResponse = ErrorHandler.createErrorResponse(error, req);
    const statusCode = errorResponse.error.statusCode;
    
    res.status(statusCode).json(errorResponse);
  }

  /**
   * Handle 404 errors
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static handleNotFound(req, res) {
    const errorResponse = {
      error: {
        type: 'NOT_FOUND',
        message: `Route ${req.method} ${req.url} not found`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    };
    
    res.status(404).json(errorResponse);
  }

  /**
   * Handle validation errors
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} message - Validation error message
   */
  static handleValidationError(req, res, message) {
    const errorResponse = {
      error: {
        type: 'VALIDATION_ERROR',
        message,
        statusCode: 400,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    };
    
    res.status(400).json(errorResponse);
  }

  /**
   * Create success response
   * @param {Object} data - Response data
   * @param {Object} req - Express request object
   * @param {number} statusCode - HTTP status code
   * @returns {Object} Success response
   */
  static createSuccessResponse(data, req, statusCode = 200) {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    };
  }
}

module.exports = ErrorHandler;
