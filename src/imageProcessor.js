const axios = require('axios');
const sharp = require('sharp');

class ImageProcessor {
  constructor(config = {}) {
    this.maxDimension = config.maxDimension || 1024;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Fetch image from URL and process it
   * @param {string} url - Image URL
   * @returns {Promise<Buffer>} Processed image buffer
   */
  async processImage(url) {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }

      // Fetch image
      const imageBuffer = await this.fetchImage(url);
      
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      const needsResize = metadata.width > this.maxDimension || metadata.height > this.maxDimension;
      const isSupportedFormat = ['jpeg', 'jpg', 'png'].includes((metadata.format || '').toLowerCase());

      if (needsResize) {
        return await this.resizeImage(imageBuffer, metadata);
      }

      // Transcode unsupported formats (e.g., webp, avif) to JPEG
      if (!isSupportedFormat) {
        return await sharp(imageBuffer)
          .rotate() // respect EXIF orientation
          .jpeg({ quality: 90 })
          .toBuffer();
      }

      return imageBuffer;
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Fetch image from URL
   * @param {string} url - Image URL
   * @returns {Promise<Buffer>} Image buffer
   */
  async fetchImage(url) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: this.timeout,
        maxRedirects: 10,
        // Some image CDNs (e.g., Unsplash) are picky about headers
        headers: {
          'User-Agent': 'NSFWJS-API/1.0.0 (+https://localhost) Node.js',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Encoding': 'identity',
          // A permissive referer helps with some hosts that gate hotlinking
          'Referer': 'https://localhost/'
        },
        // Allow axios to treat 2xx only as success; redirects are followed above
        validateStatus: (status) => status >= 200 && status < 300
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('Empty response from image URL');
      }

      // Basic content-type validation when provided
      const contentType = response.headers && response.headers['content-type'];
      if (contentType && !contentType.startsWith('image/')) {
        throw new Error(`Unexpected content-type: ${contentType}`);
      }

      return Buffer.from(response.data);
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - image took too long to download');
      } else if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Image URL not found');
      } else {
        throw new Error(`Failed to fetch image: ${error.message}`);
      }
    }
  }

  /**
   * Resize image while maintaining aspect ratio
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {Object} metadata - Image metadata
   * @returns {Promise<Buffer>} Resized image buffer
   */
  async resizeImage(imageBuffer, metadata) {
    try {
      const { width, height } = metadata;
      
      // Calculate new dimensions maintaining aspect ratio
      let newWidth, newHeight;
      if (width > height) {
        newWidth = this.maxDimension;
        newHeight = Math.round((height * this.maxDimension) / width);
      } else {
        newHeight = this.maxDimension;
        newWidth = Math.round((width * this.maxDimension) / height);
      }

      const resizedBuffer = await sharp(imageBuffer)
        .rotate()
        .resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return resizedBuffer;
    } catch (error) {
      throw new Error(`Image resizing failed: ${error.message}`);
    }
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL
   */
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Get image metadata without processing
   * @param {string} url - Image URL
   * @returns {Promise<Object>} Image metadata
   */
  async getImageMetadata(url) {
    try {
      const imageBuffer = await this.fetchImage(url);
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
        needsResizing: metadata.width > this.maxDimension || metadata.height > this.maxDimension
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }
}

module.exports = ImageProcessor;
