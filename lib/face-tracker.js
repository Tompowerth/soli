// ============================================================
// SOLI — On-Device Face Tracking (MediaPipe Face Mesh)
// lib/face-tracker.js
// Runs entirely on the user's device — ZERO server cost
// Feeds data to the UI and triggers Claude deep analysis
// ============================================================

// MediaPipe Face Mesh detects 478 facial landmarks in real-time
// We track specific landmarks to detect emotions and behaviors

const ANALYSIS_INTERVAL = 2000; // Check every 2 seconds
const DEEP_ANALYSIS_INTERVAL = 30000; // Claude deep analysis every 30 sec
const ANOMALY_THRESHOLD = 0.3; // Trigger Claude if big change detected

export class SOLIFaceTracker {
  constructor({ onLocalAnalysis, onRequestDeepAnalysis, onAnomalyDetected }) {
    this.faceMesh = null;
    this.camera = null;
    this.canvas = null;
    this.ctx = null;
    this.isRunning = false;
    this.baseline = null;
    this.lastDeepAnalysis = 0;
    this.blinkHistory = [];
    this.expressionHistory = [];
    
    // Callbacks
    this.onLocalAnalysis = onLocalAnalysis;       // Every 2 sec — UI update
    this.onRequestDeepAnalysis = onRequestDeepAnalysis; // Every 30 sec — send to Claude
    this.onAnomalyDetected = onAnomalyDetected;   // On sudden change — trigger Claude
  }

  async init(videoElement, canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    // Load MediaPipe Face Mesh
    const { FaceMesh } = await import('@mediapipe/face_mesh');
    const { Camera } = await import('@mediapipe/camera_utils');
    
    this.faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,  // Includes iris tracking
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    
    this.faceMesh.onResults((results) => this.processFrame(results));
    
    // Start camera
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.faceMesh.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });
    
    await this.camera.start();
    this.isRunning = true;
  }

  processFrame(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    
    const landmarks = results.multiFaceLandmarks[0];
    const now = Date.now();
    
    // ============================================================
    // LOCAL ANALYSIS — Every frame, processed on device
    // ============================================================
    
    const analysis = {
      timestamp: now,
      
      // Eye Analysis
      leftEyeOpenness: this.getEyeOpenness(landmarks, 'left'),
      rightEyeOpenness: this.getEyeOpenness(landmarks, 'right'),
      blinkDetected: false,
      blinkRate: 0, // per minute
      
      // Mouth Analysis
      mouthOpenness: this.getMouthOpenness(landmarks),
      smileIntensity: this.getSmileIntensity(landmarks),
      lipPress: this.getLipPress(landmarks),
      
      // Brow Analysis
      browRaise: this.getBrowRaise(landmarks),
      browFurrow: this.getBrowFurrow(landmarks),
      
      // Head Position
      headTilt: this.getHeadTilt(landmarks),
      headNod: this.getHeadNod(landmarks),
      lookingAway: this.isLookingAway(landmarks),
      
      // Jaw
      jawClench: this.getJawClench(landmarks),
      
      // Derived emotion estimate
      estimatedEmotion: 'neutral',
      emotionConfidence: 0,
    };
    
    // Blink detection
    const avgEyeOpen = (analysis.leftEyeOpenness + analysis.rightEyeOpenness) / 2;
    if (avgEyeOpen < 0.15) {
      analysis.blinkDetected = true;
      this.blinkHistory.push(now);
    }
    // Clean old blinks (keep last 60 seconds)
    this.blinkHistory = this.blinkHistory.filter(t => now - t < 60000);
    analysis.blinkRate = this.blinkHistory.length; // blinks per minute
    
    // Emotion estimation from facial landmarks
    analysis.estimatedEmotion = this.estimateEmotion(analysis);
    
    // Store for history
    this.expressionHistory.push({
      time: now,
      emotion: analysis.estimatedEmotion,
      blinkRate: analysis.blinkRate,
      stress: analysis.browFurrow + analysis.jawClench + (analysis.blinkRate > 25 ? 0.3 : 0),
    });
    // Keep last 5 minutes
    this.expressionHistory = this.expressionHistory.filter(e => now - e.time < 300000);
    
    // ============================================================
    // CALLBACKS
    // ============================================================
    
    // Every 2 seconds — local UI update
    if (this.onLocalAnalysis) {
      this.onLocalAnalysis(analysis);
    }
    
    // Every 30 seconds — request Claude deep analysis
    if (now - this.lastDeepAnalysis > DEEP_ANALYSIS_INTERVAL) {
      this.lastDeepAnalysis = now;
      if (this.onRequestDeepAnalysis) {
        // Capture frame for Claude
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
        const frameBase64 = this.canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        this.onRequestDeepAnalysis(frameBase64, analysis);
      }
    }
    
    // Anomaly detection — sudden change triggers Claude
    if (this.baseline && this.onAnomalyDetected) {
      const stressNow = analysis.browFurrow + analysis.jawClench;
      const stressBaseline = this.baseline.avgStress || 0;
      const emotionChanged = analysis.estimatedEmotion !== this.baseline.dominantEmotion;
      const blinkSpike = analysis.blinkRate > this.baseline.avgBlinkRate * 2;
      
      if (Math.abs(stressNow - stressBaseline) > ANOMALY_THRESHOLD || 
          (emotionChanged && analysis.emotionConfidence > 0.6) ||
          blinkSpike) {
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
        const frameBase64 = this.canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        this.onAnomalyDetected(frameBase64, analysis, {
          stressDelta: stressNow - stressBaseline,
          emotionChanged,
          blinkSpike,
        });
      }
    }
    
    // Update baseline (rolling average over 2 minutes)
    this.updateBaseline(analysis);
  }

  // ============================================================
  // LANDMARK MEASUREMENTS
  // ============================================================
  
  getEyeOpenness(landmarks, side) {
    // Eye Aspect Ratio (EAR)
    const top = side === 'left' ? 159 : 386;
    const bottom = side === 'left' ? 145 : 374;
    const left = side === 'left' ? 33 : 263;
    const right = side === 'left' ? 133 : 362;
    
    const vertical = Math.abs(landmarks[top].y - landmarks[bottom].y);
    const horizontal = Math.abs(landmarks[left].x - landmarks[right].x);
    return vertical / (horizontal + 0.001);
  }
  
  getMouthOpenness(landmarks) {
    const top = landmarks[13];    // Upper lip
    const bottom = landmarks[14]; // Lower lip
    return Math.abs(top.y - bottom.y);
  }
  
  getSmileIntensity(landmarks) {
    // Distance between mouth corners relative to nose width
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];
    const mouthWidth = Math.abs(leftCorner.x - rightCorner.x);
    const noseLeft = landmarks[129];
    const noseRight = landmarks[358];
    const noseWidth = Math.abs(noseLeft.x - noseRight.x);
    
    // Smile raises corners relative to center
    const centerY = (landmarks[13].y + landmarks[14].y) / 2;
    const cornerAvgY = (leftCorner.y + rightCorner.y) / 2;
    const lift = centerY - cornerAvgY;
    
    return Math.max(0, lift * 10); // Normalize
  }
  
  getLipPress(landmarks) {
    const topLip = landmarks[13];
    const bottomLip = landmarks[14];
    const distance = Math.abs(topLip.y - bottomLip.y);
    return distance < 0.005 ? 1 : 0; // Pressed lips = stress/suppression
  }
  
  getBrowRaise(landmarks) {
    const leftBrow = landmarks[66];
    const rightBrow = landmarks[296];
    const leftEye = landmarks[159];
    const rightEye = landmarks[386];
    
    const leftDist = Math.abs(leftBrow.y - leftEye.y);
    const rightDist = Math.abs(rightBrow.y - rightEye.y);
    return (leftDist + rightDist) / 2;
  }
  
  getBrowFurrow(landmarks) {
    // Inner brow points getting closer = furrow
    const leftInner = landmarks[107];
    const rightInner = landmarks[336];
    const distance = Math.abs(leftInner.x - rightInner.x);
    return Math.max(0, 0.05 - distance) * 20; // Normalize: closer = more furrow
  }
  
  getHeadTilt(landmarks) {
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];
    return Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x);
  }
  
  getHeadNod(landmarks) {
    const nose = landmarks[1];
    return nose.y; // Track vertical position changes
  }
  
  isLookingAway(landmarks) {
    const nose = landmarks[1];
    // If nose tip is significantly off-center, they're looking away
    return Math.abs(nose.x - 0.5) > 0.2;
  }
  
  getJawClench(landmarks) {
    // When jaw clenches, lower face gets more compact
    const chin = landmarks[152];
    const nose = landmarks[1];
    const distance = Math.abs(chin.y - nose.y);
    // Shorter distance = more clench
    return Math.max(0, 0.15 - distance) * 10;
  }

  // ============================================================
  // EMOTION ESTIMATION (on-device, fast)
  // ============================================================
  
  estimateEmotion(analysis) {
    const { smileIntensity, browFurrow, browRaise, jawClench, 
            lipPress, blinkRate, mouthOpenness, lookingAway } = analysis;
    
    let scores = {
      happy: smileIntensity * 2,
      stressed: browFurrow + jawClench + lipPress + (blinkRate > 25 ? 0.5 : 0),
      surprised: browRaise * 3 + (mouthOpenness > 0.03 ? 0.5 : 0),
      sad: (lookingAway ? 0.3 : 0) + (smileIntensity < 0.05 ? 0.2 : 0) + (browFurrow * 0.5),
      neutral: 0.3, // baseline
    };
    
    // Find dominant
    let maxEmotion = 'neutral';
    let maxScore = 0;
    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion;
      }
    }
    
    analysis.emotionConfidence = Math.min(1, maxScore);
    return maxEmotion;
  }

  // ============================================================
  // BASELINE (rolling average)
  // ============================================================
  
  updateBaseline(analysis) {
    if (!this.baseline) {
      this.baseline = {
        avgStress: analysis.browFurrow + analysis.jawClench,
        avgBlinkRate: analysis.blinkRate,
        dominantEmotion: analysis.estimatedEmotion,
        count: 1,
      };
    } else {
      const n = Math.min(this.baseline.count + 1, 60); // Max 60 samples (2 min)
      this.baseline.avgStress = ((this.baseline.avgStress * (n - 1)) + (analysis.browFurrow + analysis.jawClench)) / n;
      this.baseline.avgBlinkRate = ((this.baseline.avgBlinkRate * (n - 1)) + analysis.blinkRate) / n;
      this.baseline.count = n;
      
      // Update dominant emotion (mode of last 30 samples)
      const recent = this.expressionHistory.slice(-30);
      const counts = {};
      recent.forEach(e => { counts[e.emotion] = (counts[e.emotion] || 0) + 1; });
      this.baseline.dominantEmotion = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    }
  }

  // ============================================================
  // CONTROL
  // ============================================================
  
  stop() {
    this.isRunning = false;
    if (this.camera) this.camera.stop();
  }
  
  getHistory() {
    return this.expressionHistory;
  }
  
  getBaseline() {
    return this.baseline;
  }
}
