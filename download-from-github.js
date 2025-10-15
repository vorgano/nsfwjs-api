const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_DIR = './models/nsfwjs';

// GitHub raw URLs for the model files
const MODEL_FILES = [
  {
    filename: 'model.json',
    url: 'https://raw.githubusercontent.com/infinitered/nsfwjs/master/example/nsfw_demo/public/model/model.json'
  },
  {
    filename: 'weights_manifest.json', 
    url: 'https://raw.githubusercontent.com/infinitered/nsfwjs/master/example/nsfw_demo/public/model/weights_manifest.json'
  },
  {
    filename: 'weights.bin',
    url: 'https://raw.githubusercontent.com/infinitered/nsfwjs/master/example/nsfw_demo/public/model/weights.bin'
  }
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

    console.log('🚀 Starting model download from GitHub...');
    console.log(`📂 Target directory: ${MODEL_DIR}`);
    
    // Download each model file
    for (const fileInfo of MODEL_FILES) {
      const filepath = path.join(MODEL_DIR, fileInfo.filename);
      
      console.log(`⬇️  Downloading: ${fileInfo.filename}`);
      await downloadFile(fileInfo.url, filepath);
    }
    
    console.log('🎉 Model download completed successfully!');
    console.log(`📁 Model files saved to: ${MODEL_DIR}`);
    console.log('🔧 You can now use: nsfwjs.load("./models/nsfwjs")');
    
  } catch (error) {
    console.error('❌ Download failed:', error.message);
    console.log('🔧 Possible solutions:');
    console.log('   1. Check internet connectivity');
    console.log('   2. Try again later (GitHub might be temporarily down)');
    console.log('   3. Check firewall/proxy settings');
    process.exit(1);
  }
}

downloadModel();
