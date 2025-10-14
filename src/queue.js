class QueueManager {
  constructor(config = {}) {
    this.concurrency = config.concurrency || 5;
    this.timeout = config.timeout || 30000;
    
    this.queue = [];
    this.running = 0;
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0
    };
  }

  /**
   * Add a task to the queue
   * @param {Function} task - Async function to execute
   * @param {Object} options - Task options
   * @returns {Promise} Task result
   */
  async addTask(task, options = {}) {
    this.stats.total++;
    this.stats.pending++;
    
    return new Promise((resolve, reject) => {
      const queueItem = {
        task,
        resolve,
        reject,
        timeout: options.timeout || this.timeout,
        priority: options.priority || 0,
        startTime: Date.now()
      };
      
      // Add to queue and sort by priority (higher priority first)
      this.queue.push(queueItem);
      this.queue.sort((a, b) => b.priority - a.priority);
      
      // Process queue
      this.processQueue();
    });
  }

  /**
   * Process the queue
   */
  async processQueue() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;
    this.stats.pending--;

    try {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.stats.failed++;
        this.running--;
        item.reject(new Error('Task timeout'));
        this.processQueue();
      }, item.timeout);

      // Execute task
      const result = await item.task();
      
      // Clear timeout and resolve
      clearTimeout(timeoutId);
      this.stats.completed++;
      this.running--;
      item.resolve(result);
      
      // Process next item
      this.processQueue();
      
    } catch (error) {
      this.stats.failed++;
      this.running--;
      item.reject(error);
      
      // Process next item
      this.processQueue();
    }
  }

  /**
   * Get current queue statistics
   * @returns {Object} Queue statistics
   */
  getStats() {
    return {
      ...this.stats,
      concurrency: this.concurrency,
      size: this.queue.length,
      pending: this.running,
      isPaused: false
    };
  }

  /**
   * Pause the queue (not implemented in this simple version)
   */
  pause() {
    // Simple implementation - just log
    console.log('Queue pause requested (not implemented in simple version)');
  }

  /**
   * Resume the queue (not implemented in this simple version)
   */
  resume() {
    // Simple implementation - just log
    console.log('Queue resume requested (not implemented in simple version)');
  }

  /**
   * Clear all pending tasks
   */
  clear() {
    // Reject all pending tasks
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.stats.pending = 0;
  }

  /**
   * Wait for all tasks to complete
   * @returns {Promise} Resolves when all tasks are done
   */
  async onIdle() {
    return new Promise((resolve) => {
      const checkIdle = () => {
        if (this.running === 0 && this.queue.length === 0) {
          resolve();
        } else {
          setTimeout(checkIdle, 100);
        }
      };
      checkIdle();
    });
  }

  /**
   * Wait for all tasks to complete with timeout
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Resolves when all tasks are done or timeout reached
   */
  async onIdleWithTimeout(timeout = 10000) {
    return Promise.race([
      this.onIdle(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Queue idle timeout')), timeout)
      )
    ]);
  }

  /**
   * Reset queue statistics
   */
  resetStats() {
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0
    };
  }

  /**
   * Get queue health status
   * @returns {Object} Health information
   */
  getHealth() {
    const stats = this.getStats();
    const isHealthy = stats.pending < (this.concurrency * 2);
    
    return {
      isHealthy,
      stats,
      recommendations: this.getRecommendations(stats)
    };
  }

  /**
   * Get performance recommendations based on stats
   * @param {Object} stats - Current statistics
   * @returns {Array} Array of recommendations
   */
  getRecommendations(stats) {
    const recommendations = [];
    
    if (stats.failed > stats.completed * 0.1) {
      recommendations.push('High failure rate detected. Consider investigating error causes.');
    }
    
    if (stats.pending > this.concurrency * 3) {
      recommendations.push('Queue backlog is high. Consider increasing concurrency or optimizing tasks.');
    }
    
    if (stats.completed > 0 && stats.failed === 0) {
      recommendations.push('Queue is performing well with no failures.');
    }
    
    return recommendations;
  }
}

module.exports = QueueManager;