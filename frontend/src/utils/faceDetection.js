/**
 * Face Detection using TensorFlow.js
 * Detects faces and calculates bounding boxes for smart crop
 */

class FaceDetection {
  constructor() {
    this.model = null;
    this.isModelLoaded = false;
    this.canvas = null;
    this.context = null;
  }

  /**
   * Load TensorFlow.js face detection model
   */
  async loadModel() {
    try {
      // Use BlazeFace from TensorFlow.js
      const faceLandmarks =
        typeof window !== 'undefined' && window.faceLandmarksDetection
          ? window.faceLandmarksDetection
          : undefined;
      if (faceLandmarks) {
        this.model = await faceLandmarks.load(
          faceLandmarks.SupportedModels.MediaPipeFaceMesh,
          { 
            runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
            maxFaces: 1 // Only track one face
          }
        );
      } else {
        // Fallback to basic detection
        console.warn('FaceLandmarksDetection not available, using fallback detection');
      }
      
      this.isModelLoaded = true;
      console.log('Face detection model loaded');
      return true;
    } catch (error) {
      console.error('Error loading face detection model:', error);
      this.isModelLoaded = false;
      return false;
    }
  }

  /**
   * Create a temporary canvas for face detection
   */
  createCanvas(width, height) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.context = this.canvas.getContext('2d');
  }

  /**
   * Detect faces in a video frame
   */
  async detectFaces(videoElement) {
    if (!this.isModelLoaded || !this.model) {
      return null;
    }

    try {
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;

      // Create canvas if not exists or if dimensions changed
      if (!this.canvas || this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
        this.createCanvas(videoWidth, videoHeight);
      }

      // Draw current video frame to canvas
      this.context.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

      // Detect faces
      const faces = await this.model.estimateFaces({
        input: this.canvas,
        returnTensors: false,
        flipHorizontal: false,
        staticImageMode: false
      });

      if (faces && faces.length > 0) {
        // Get bounding box of first face
        const face = faces[0];
        const box = face.box;

        return {
          x: box.xMin,
          y: box.yMin,
          width: box.width,
          height: box.height,
          confidence: box.probability || 0.95
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting faces:', error);
      return null;
    }
  }

  /**
   * Calculate crop frame to center on face
   */
  calculateCropFrame(faceBox, videoWidth, videoHeight, aspectRatio = 9/16) {
    if (!faceBox) {
      return null;
    }

    // Calculate desired crop dimensions
    const faceCenterX = faceBox.x + faceBox.width / 2;
    const faceCenterY = faceBox.y + faceBox.height / 2;

    // Vertical crop (TikTok style)
    let cropWidth, cropHeight;
    if (videoWidth / videoHeight > aspectRatio) {
      // Video is wider than desired, crop width
      cropHeight = videoHeight;
      cropWidth = cropHeight * aspectRatio;
    } else {
      // Video is taller, crop height
      cropWidth = videoWidth;
      cropHeight = cropWidth / aspectRatio;
    }

    // Make crop at least 2x face size for context
    const minCropSize = Math.max(faceBox.width, faceBox.height) * 2;
    if (cropWidth < minCropSize) {
      cropWidth = Math.min(minCropSize, videoWidth);
      cropHeight = cropWidth / aspectRatio;
    }
    if (cropHeight < minCropSize) {
      cropHeight = Math.min(minCropSize, videoHeight);
      cropWidth = cropHeight * aspectRatio;
    }

    // Center crop around face
    let cropX = faceCenterX - cropWidth / 2;
    let cropY = faceCenterY - cropHeight / 2;

    // Clamp to video boundaries
    cropX = Math.max(0, Math.min(cropX, videoWidth - cropWidth));
    cropY = Math.max(0, Math.min(cropY, videoHeight - cropHeight));

    // Normalize to 0-1 range
    return {
      x: cropX / videoWidth,
      y: cropY / videoHeight,
      width: cropWidth / videoWidth,
      height: cropHeight / videoHeight
    };
  }

  /**
   * Interpolate between bounding boxes for smooth tracking
   */
  interpolateBoxes(box1, box2, factor = 0.5) {
    if (!box1) return box2;
    if (!box2) return box1;

    return {
      x: box1.x * (1 - factor) + box2.x * factor,
      y: box1.y * (1 - factor) + box2.y * factor,
      width: box1.width * (1 - factor) + box2.width * factor,
      height: box1.height * (1 - factor) + box2.height * factor,
      confidence: (box1.confidence || 0) * (1 - factor) + (box2.confidence || 0) * factor
    };
  }
}

const faceDetection = new FaceDetection();

export default faceDetection;













