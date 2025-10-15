const nsfwjs = require('nsfwjs');
const tf = require('@tensorflow/tfjs-node');

class NSFWAnalyzer {
  constructor() {
    this.model = null;
    this.isLoaded = false;
    this.loadStartTime = null;
  }

  /**
   * Load the NSFW model
   * @returns {Promise<void>}
   */
  async loadModel() {
    try {
      console.log('Loading NSFW model using NSFWJS constructor...');
      this.loadStartTime = Date.now();
      
      // Load from local inception_v3 model using NSFWJS constructor
      const path = require('path');
      // Use absolute path to model.json and tf.io.fileSystem handler for Node
      const localModelJson = path.resolve('./models/inception_v3/model.json');
      console.log(`📁 Loading inception_v3 model from: ${localModelJson}`);
      
      // Instantiate with explicit options and then load weights
      const ioHandler = tf.io.fileSystem(localModelJson);
      this.model = new nsfwjs.NSFWJS(ioHandler, { size: 299, type: 'layers' });
      await this.model.load();
      
      const loadTime = Date.now() - this.loadStartTime;
      this.isLoaded = true;
      
      console.log(`✅ NSFW model (inception_v3) loaded successfully in ${loadTime}ms`);
    } catch (error) {
      console.error('❌ Failed to load NSFW model:', error.message);
      console.log('🔧 Error details:', error);
      this.isLoaded = false;
      this.model = null;
    }
  }

  /**
   * Load model from local path (alternative method)
   * @param {string} modelPath - Path to local model
   * @returns {Promise<void>}
   */
  async loadLocalModel(modelPath = './models/nsfwjs') {
    try {
      console.log('Loading local NSFW model...');
      this.loadStartTime = Date.now();
      
      // Load model from local path
      this.model = await nsfwjs.load(modelPath);
      
      const loadTime = Date.now() - this.loadStartTime;
      this.isLoaded = true;
      
      console.log(`Local NSFW model loaded successfully in ${loadTime}ms`);
    } catch (error) {
      console.error('Failed to load local NSFW model:', error.message);
      this.isLoaded = false;
      this.model = null;
    }
  }

  /**
   * Analyze image buffer for NSFW content
   * @param {Buffer} imageBuffer - Image buffer to analyze
   * @returns {Promise<Object>} Classification results
   */
  async analyzeImage(imageBuffer) {
    if (!this.isLoaded || !this.model) {
      throw new Error('Model not loaded. The nsfwjs model failed to download from the CDN. Please check your internet connection and try again.');
    }

    try {
      // Convert buffer to tensor
      const imageTensor = tf.node.decodeImage(imageBuffer, 3);
      
      // Classify the image
      const predictions = await this.model.classify(imageTensor);
      
      // Clean up tensor to prevent memory leaks
      imageTensor.dispose();
      
      // Format results
      const results = this.formatResults(predictions);
      
      return {
        success: true,
        predictions: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  /**
   * Format prediction results into a clean object
   * @param {Array} predictions - Raw predictions from nsfwjs
   * @returns {Object} Formatted results
   */
  formatResults(predictions) {
    const results = {};
    
    predictions.forEach(prediction => {
      // Round to 4 decimal places for cleaner output
      results[prediction.className] = Math.round(prediction.probability * 10000) / 10000;
    });
    
    return results;
  }

  /**
   * Get model status and information
   * @returns {Object} Model status
   */
  getModelStatus() {
    return {
      isLoaded: this.isLoaded,
      loadTime: this.loadStartTime ? Date.now() - this.loadStartTime : null,
      modelType: 'nsfwjs',
      version: '2.4.2'
    };
  }

  /**
   * Check if model is ready for analysis
   * @returns {boolean} True if model is loaded and ready
   */
  isReady() {
    return this.isLoaded && this.model !== null;
  }

  /**
   * Get the most likely classification
   * @param {Object} predictions - Formatted prediction results
   * @returns {Object} Most likely classification with confidence
   */
  getMostLikelyClassification(predictions) {
    let maxProbability = 0;
    let mostLikely = null;
    
    for (const [className, probability] of Object.entries(predictions)) {
      if (probability > maxProbability) {
        maxProbability = probability;
        mostLikely = className;
      }
    }
    
    return {
      classification: mostLikely,
      confidence: maxProbability
    };
  }

  /**
   * Determine if image is safe based on predictions
   * @param {Object} predictions - Formatted prediction results
   * @param {number} threshold - Confidence threshold (default 0.5)
   * @returns {Object} Safety assessment
   */
  assessSafety(predictions, threshold = 0.5) {
    // Find the most likely classification
    let maxProbability = 0;
    let mostLikelyCategory = null;
    
    for (const [category, probability] of Object.entries(predictions)) {
      if (probability > maxProbability) {
        maxProbability = probability;
        mostLikelyCategory = category;
      }
    }
    
    // Define what we consider "safe" vs "nsfw"
    const safeCategories = ['Neutral', 'Drawing'];
    const nsfwCategories = ['Porn', 'Sexy', 'Hentai'];
    
    const isSafe = safeCategories.includes(mostLikelyCategory);
    const isNsfw = nsfwCategories.includes(mostLikelyCategory);
    
    // Only make assessment if confidence is above threshold
    const confidentEnough = maxProbability >= threshold;
    
    let assessment;
    if (!confidentEnough) {
      assessment = 'uncertain';
    } else if (isSafe) {
      assessment = 'safe';
    } else if (isNsfw) {
      assessment = 'nsfw';
    } else {
      assessment = 'unknown';
    }
    
    return {
      isSafe: confidentEnough && isSafe,
      mostLikelyCategory,
      confidence: maxProbability,
      threshold,
      assessment,
      allPredictions: predictions
    };
  }
}

module.exports = NSFWAnalyzer;