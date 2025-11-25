import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class HandTracker {
    constructor() {
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('canvas');
        this.handLandmarker = null;
        this.runningMode = 'VIDEO';
        this.lastVideoTime = -1;
        this.results = null;
        this.gestureFactor = 0; // 0 = closed, 1 = open
        this.handPosition = null;
    }

    async init() {
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: this.runningMode,
            numHands: 1
        });

        await this.setupCamera();
    }

    async setupCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('Browser API navigator.mediaDevices.getUserMedia not available');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480
                }
            });

            this.video.srcObject = stream;

            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
        } catch (e) {
            console.warn("Camera access denied or not available. Falling back to mouse interaction if implemented, or idle state.", e);
            // Create a dummy video element or just ignore
            this.video.style.display = 'none';
        }
    }

    detect() {
        if (!this.handLandmarker || !this.video.videoWidth) return;

        let startTimeMs = performance.now();
        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;
            this.results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
            this.processResults();
        }
    }

    processResults() {
        if (this.results && this.results.landmarks && this.results.landmarks.length > 0) {
            const landmarks = this.results.landmarks[0];

            // Calculate openness based on distance between wrist (0) and finger tips (4, 8, 12, 16, 20)
            // Or simply average distance of tips from palm center (0 or 9)

            const wrist = landmarks[0];
            const tips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips

            let totalDist = 0;
            for (const tipIdx of tips) {
                const tip = landmarks[tipIdx];
                const dist = Math.sqrt(
                    Math.pow(tip.x - wrist.x, 2) +
                    Math.pow(tip.y - wrist.y, 2) +
                    Math.pow(tip.z - wrist.z, 2)
                );
                totalDist += dist;
            }

            const avgDist = totalDist / 5;

            // Normalize avgDist. 
            // Closed fist is roughly 0.1 - 0.2
            // Open hand is roughly 0.4 - 0.6
            // These values depend on camera distance, but we can try to normalize roughly.
            // A better way is to compare tip-to-wrist vs mcp-to-wrist, but let's start simple.

            // Clamp and normalize
            const minClosed = 0.15;
            const maxOpen = 0.4;

            this.gestureFactor = (avgDist - minClosed) / (maxOpen - minClosed);
            this.gestureFactor = Math.max(0, Math.min(1, this.gestureFactor));

            // Track Index Finger Tip (Landmark 8) for rotation control
            const indexTip = landmarks[8];

            // Store normalized position (0-1)
            // Note: MediaPipe x is 0-1 (left-right), y is 0-1 (top-bottom)
            this.handPosition = { x: indexTip.x, y: indexTip.y };

            // console.log('Gesture Factor:', this.gestureFactor);
        } else {
            // No hand detected, maybe slowly return to default or keep last?
            // For now, let's drift to 0.5 or 1.0? 
            // Let's keep it as is or decay.
            this.handPosition = null;
        }
    }

    getGestureFactor() {
        return this.gestureFactor;
    }

    getHandPosition() {
        return this.handPosition;
    }
}
