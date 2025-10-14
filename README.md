# NSFWJS Image Analysis API

A Node.js backend API that analyzes images from URLs using nsfwjs to detect NSFW content, with automatic image resizing and queue management.

## Features

- 🔍 **NSFW Detection**: Uses nsfwjs model to classify images (Porn, Sexy, Hentai, Neutral, Drawing)
- 🖼️ **Image Processing**: Automatically resizes large images to optimize analysis
- ⚡ **Queue Management**: Handles concurrent requests with configurable limits
- 🏥 **Health Monitoring**: Built-in health checks and queue statistics
- 🛡️ **Error Handling**: Comprehensive error handling with standardized responses
- 📊 **Metadata Extraction**: Get image information without full analysis

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nsfwjs-api
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Start the server:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### POST /analyze

Analyze an image for NSFW content.

**Request:**
```json
{
  "url": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "predictions": {
      "Porn": 0.0234,
      "Sexy": 0.1456,
      "Hentai": 0.0012,
      "Neutral": 0.8234,
      "Drawing": 0.0064
    },
    "insights": {
      "mostLikelyClassification": {
        "classification": "Neutral",
        "confidence": 0.8234
      },
      "safetyAssessment": {
        "isSafe": true,
        "nsfwScore": 0.1702,
        "safeScore": 0.8298,
        "threshold": 0.5,
        "assessment": "safe"
      }
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "abc123def"
}
```

### GET /health

Check the health status of the API and model.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600000,
    "model": {
      "isLoaded": true,
      "loadTime": 2500,
      "modelType": "nsfwjs",
      "version": "2.4.2"
    },
    "queue": {
      "isHealthy": true,
      "stats": {
        "total": 150,
        "completed": 145,
        "failed": 2,
        "pending": 3,
        "concurrency": 5,
        "size": 0,
        "pending": 3,
        "isPaused": false
      },
      "recommendations": ["Queue is performing well with no failures."]
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST /metadata

Get image metadata without performing NSFW analysis.

**Request:**
```json
{
  "url": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "width": 1920,
    "height": 1080,
    "format": "jpeg",
    "size": 245760,
    "needsResizing": true
  }
}
```

### GET /queue/stats

Get current queue statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "completed": 145,
    "failed": 2,
    "pending": 3,
    "concurrency": 5,
    "size": 0,
    "pending": 3,
    "isPaused": false
  }
}
```

## Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000

# Image Processing
MAX_IMAGE_DIMENSION=1024
REQUEST_TIMEOUT=30000

# Queue Configuration
QUEUE_CONCURRENCY=5

# Logging
LOG_LEVEL=info
```

### Configuration Options

- `PORT`: Server port (default: 3000)
- `MAX_IMAGE_DIMENSION`: Maximum image dimension before resizing (default: 1024)
- `REQUEST_TIMEOUT`: Request timeout in milliseconds (default: 30000)
- `QUEUE_CONCURRENCY`: Maximum concurrent requests (default: 5)
- `LOG_LEVEL`: Logging level (default: info)

## Error Handling

The API returns standardized error responses:

```json
{
  "error": {
    "type": "INVALID_URL",
    "message": "The provided URL is invalid or unreachable",
    "statusCode": 400,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "abc123def"
  }
}
```

### Error Types

- `INVALID_URL` (400): Invalid or unreachable URL
- `IMAGE_PROCESSING_ERROR` (422): Failed to process image
- `MODEL_ERROR` (503): Model not available
- `ANALYSIS_ERROR` (422): Failed to analyze image
- `TIMEOUT_ERROR` (408): Request timeout
- `VALIDATION_ERROR` (400): Invalid request data
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error

## Usage Examples

### Using curl

```bash
# Analyze an image
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/image.jpg"}'

# Check health
curl http://localhost:3000/health

# Get queue stats
curl http://localhost:3000/queue/stats
```

### Using JavaScript

```javascript
const response = await fetch('http://localhost:3000/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com/image.jpg'
  })
});

const result = await response.json();
console.log(result.data.predictions);
```

## Architecture

The API is built with a modular architecture:

- **ImageProcessor**: Handles image fetching and resizing
- **NSFWAnalyzer**: Manages the nsfwjs model and analysis
- **QueueManager**: Handles concurrent request processing
- **ErrorHandler**: Provides standardized error responses

## Performance Considerations

- The NSFW model loads once at startup and stays in memory
- Images larger than the configured dimension are automatically resized
- Queue system prevents overwhelming the model with too many concurrent requests
- Memory cleanup is performed after each analysis

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the server with file watching for automatic restarts.

### Project Structure

```
/
├── package.json
├── .env.example
├── .gitignore
├── index.js (main server)
├── src/
│   ├── imageProcessor.js
│   ├── nsfwAnalyzer.js
│   ├── queue.js
│   └── errorHandler.js
└── README.md
```

## License

MIT
