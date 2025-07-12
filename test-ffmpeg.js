const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing FFmpeg Installation and Functionality...\n');

// Test 1: Check if FFmpeg is installed
function testFFmpegInstallation() {
  return new Promise((resolve, reject) => {
    console.log('1. Testing FFmpeg installation...');
    
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    let output = '';
    ffmpeg.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffmpeg.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const version = output.match(/ffmpeg version ([^\s]+)/);
        console.log('✅ FFmpeg installed successfully!');
        if (version) {
          console.log(`   Version: ${version[1]}`);
        }
        resolve();
      } else {
        console.log('❌ FFmpeg not found or not working');
        console.log('   Please install FFmpeg:');
        console.log('   - macOS: brew install ffmpeg');
        console.log('   - Ubuntu: sudo apt install ffmpeg');
        console.log('   - Windows: Download from https://ffmpeg.org/download.html');
        reject(new Error('FFmpeg not installed'));
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.log('❌ FFmpeg not found:', error.message);
      reject(error);
    });
  });
}

// Test 2: Test basic video creation
function testBasicVideoCreation() {
  return new Promise((resolve, reject) => {
    console.log('\n2. Testing basic video creation...');
    
    const outputPath = path.join(__dirname, 'test-output.mp4');
    
    // Create a simple 5-second test video
    const ffmpegArgs = [
      '-y', // Overwrite output file
      '-f', 'lavfi', // Use lavfi (libavfilter) input
      '-i', 'color=size=1080x1920:duration=5:rate=30:color=black', // Black video
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', // Silent audio
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-t', '5', // 5 seconds
      outputPath
    ];
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log('✅ Basic video creation successful!');
        console.log(`   Output: ${outputPath}`);
        console.log(`   Size: ${Math.round(stats.size / 1024)} KB`);
        
        // Clean up test file
        fs.unlinkSync(outputPath);
        resolve();
      } else {
        console.log('❌ Basic video creation failed');
        console.log('   Error output:', stderr);
        reject(new Error('Video creation failed'));
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.log('❌ FFmpeg process error:', error.message);
      reject(error);
    });
  });
}

// Test 3: Test subtitle support
function testSubtitleSupport() {
  return new Promise((resolve, reject) => {
    console.log('\n3. Testing subtitle support...');
    
    const ffmpeg = spawn('ffmpeg', ['-filters']);
    
    let output = '';
    ffmpeg.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffmpeg.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      const hasSubtitles = output.includes('subtitles') || output.includes('ass');
      const hasDrawtext = output.includes('drawtext');
      
      if (hasSubtitles && hasDrawtext) {
        console.log('✅ Subtitle support available!');
        console.log('   - Subtitles filter: ✓');
        console.log('   - Drawtext filter: ✓');
        resolve();
      } else {
        console.log('⚠️  Limited subtitle support');
        console.log(`   - Subtitles filter: ${hasSubtitles ? '✓' : '✗'}`);
        console.log(`   - Drawtext filter: ${hasDrawtext ? '✓' : '✗'}`);
        resolve(); // Don't fail, just warn
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.log('❌ Could not test subtitle support:', error.message);
      reject(error);
    });
  });
}

// Run all tests
async function runTests() {
  try {
    await testFFmpegInstallation();
    await testBasicVideoCreation();
    await testSubtitleSupport();
    
    console.log('\n🎉 All tests passed! FFmpeg is ready for video generation.');
    console.log('\nYou can now run:');
    console.log('  npm run dev');
    console.log('  and start generating videos!');
    
  } catch (error) {
    console.log('\n❌ Tests failed:', error.message);
    console.log('\nPlease fix the issues above before proceeding.');
    process.exit(1);
  }
}

runTests(); 