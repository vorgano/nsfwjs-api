const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_DIR = './models/nsfwjs';

// Try different possible URLs for the model files
const POSSIBLE_URLS = [
  // GitHub raw URLs
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/model.json',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard1of1.bin',
  
  // Alternative paths
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/example/public/model/model.json',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/example/public/model/group1-shard1of1.bin',
  
  // Try the dist directory
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard1of9.bin',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard2of9.bin',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard3of9.bin',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard4of9.bin',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard5of9.bin',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard6of9.bin',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard7of9.bin',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard8of9.bin',
  'https://raw.githubusercontent.com/infinitered/nsfwjs/master/dist/group1-shard9of9.bin'
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      resolve({
        url,
        status: res.statusCode,
        success: res.statusCode === 200,
        contentLength: res.headers['content-length']
      });
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        status: 0,
        success: false,
        error: err.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        success: false,
        error: 'timeout'
      });
    });
  });
}

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
        console.log(`✅ Downloaded: ${path.basename(filepath)} (${response.headers['content-length']} bytes)`);
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

async function findAndDownloadModel() {
  try {
    // Create model directory
    if (!fs.existsSync(MODEL_DIR)) {
      fs.mkdirSync(MODEL_DIR, { recursive: true });
      console.log(`📁 Created directory: ${MODEL_DIR}`);
    }

    console.log('🔍 Testing URLs to find working model files...');
    
    // Test all URLs to find working ones
    const results = [];
    for (const url of POSSIBLE_URLS) {
      console.log(`Testing: ${url}`);
      const result = await testUrl(url);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ Working: ${url} (${result.contentLength} bytes)`);
      } else {
        console.log(`❌ Failed: ${url} - ${result.error || result.status}`);
      }
    }
    
    // Find working URLs
    const workingUrls = results.filter(r => r.success);
    
    if (workingUrls.length === 0) {
      console.log('❌ No working URLs found. All model download URLs are currently unavailable.');
      console.log('🔧 Possible solutions:');
      console.log('   1. Check if the nsfwjs repository structure has changed');
      console.log('   2. Try downloading manually from: https://github.com/infinitered/nsfwjs');
      console.log('   3. Use a different model or approach');
      return;
    }
    
    console.log(`\n🎉 Found ${workingUrls.length} working URLs!`);
    
    // Download the working files
    for (const result of workingUrls) {
      const filename = path.basename(result.url);
      const filepath = path.join(MODEL_DIR, filename);
      
      console.log(`⬇️  Downloading: ${filename}`);
      try {
        await downloadFile(result.url, filepath);
      } catch (error) {
        console.error(`❌ Failed to download ${filename}:`, error.message);
      }
    }
    
    console.log('\n🎉 Model download completed!');
    console.log(`📁 Model files saved to: ${MODEL_DIR}`);
    console.log('🔧 You can now use: nsfwjs.load("./models/nsfwjs")');
    
  } catch (error) {
    console.error('❌ Download failed:', error.message);
  }
}

findAndDownloadModel();
