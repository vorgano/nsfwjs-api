const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_BASE_URL = 'https://d1zv2aa70wpiur.cloudfront.net/tfjs_quant_nsfw_mobilenet/';
const MODEL_DIR = './models/nsfwjs';

// Model files to download
const MODEL_FILES = [
  'model.json',
  'weights_manifest.json',
  'weights.bin'
];

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadModel() {
  try {
    // Create model directory
    if (!fs.existsSync(MODEL_DIR)) {
      fs.mkdirSync(MODEL_DIR, { recursive: true });
      console.log(`📁 Created directory: ${MODEL_DIR}`);
    }

    console.log('🚀 Starting model download...');
    console.log(`📂 Target directory: ${MODEL_DIR}`);
    
    // Download each model file
    for (const filename of MODEL_FILES) {
      const url = MODEL_BASE_URL + filename;
      const filepath = path.join(MODEL_DIR, filename);
      
      console.log(`⬇️  Downloading: ${filename}`);
      await downloadFile(url, filepath);
    }
    
    console.log('🎉 Model download completed successfully!');
    console.log(`📁 Model files saved to: ${MODEL_DIR}`);
    console.log('🔧 You can now use: nsfwjs.load("./models/nsfwjs")');
    
  } catch (error) {
    console.error('❌ Download failed:', error.message);
    console.log('🔧 Possible solutions:');
    console.log('   1. Check internet connectivity');
    console.log('   2. Try again later (CDN might be temporarily down)');
    console.log('   3. Check firewall/proxy settings');
    process.exit(1);
  }
}

downloadModel();
