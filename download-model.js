#!/usr/bin/env node

/**
 * Script to download nsfwjs model locally
 * Run this to download the model when internet is available
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_URL = 'https://d1zv2aa70wpiur.cloudfront.net/tfjs_quant_nsfw_mobilenet/tfjs_quant_nsfw_mobilenet.json';
const MODEL_DIR = './models/nsfwjs';

async function downloadModel() {
  try {
    console.log('Creating model directory...');
    if (!fs.existsSync(MODEL_DIR)) {
      fs.mkdirSync(MODEL_DIR, { recursive: true });
    }

    console.log('Downloading model files...');
    console.log('Note: This requires internet access to the nsfwjs CDN');
    
    // For now, just create a placeholder
    const placeholder = {
      message: 'Model download script',
      instructions: [
        '1. Ensure internet connectivity',
        '2. Run: npm run download-model',
        '3. Or manually download from: https://d1zv2aa70wpiur.cloudfront.net/',
        '4. Place files in ./models/nsfwjs/ directory'
      ],
      files: [
        'tfjs_quant_nsfw_mobilenet.json',
        'tfjs_quant_nsfw_mobilenet.weights.bin'
      ]
    };

    fs.writeFileSync(
      path.join(MODEL_DIR, 'README.md'), 
      JSON.stringify(placeholder, null, 2)
    );

    console.log('Model directory created at:', MODEL_DIR);
    console.log('To download the actual model:');
    console.log('1. Ensure internet connectivity');
    console.log('2. Visit: https://d1zv2aa70wpiur.cloudfront.net/');
    console.log('3. Download the model files to:', MODEL_DIR);
    
  } catch (error) {
    console.error('Error setting up model directory:', error);
  }
}

if (require.main === module) {
  downloadModel();
}

module.exports = { downloadModel };
