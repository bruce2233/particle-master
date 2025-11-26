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
        this.isPinched = false; // State for hysteresis
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

            // Calculate distance from wrist (landmark 0) to finger tips
            // const wrist = landmarks[0];

            // Finger tips: 4 (Thumb), 8 (Index)
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];

            const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

            // Pinch Detection (Thumb Tip to Index Tip)
            const pinchDist = getDist(thumbTip, indexTip);

            // Hysteresis Logic
            // Enter Pinch Mode: Distance < 0.03 (Strict)
            // Exit Pinch Mode: Distance > 0.06 (Relaxed)

            if (!this.isPinched && pinchDist < 0.03) {
                this.isPinched = true;
            } else if (this.isPinched && pinchDist > 0.06) {
                this.isPinched = false;
            }

            // Track Index Finger Tip (Landmark 8) for position
            // Store normalized position (0-1)
            const currentHandPos = { x: indexTip.x, y: indexTip.y };

            if (this.isPinched) {
                // --- SCALING MODE ---
                // Use Extension of remaining 3 fingers (Middle, Ring, Pinky) to control Scale
                // Tips: 12 (Middle), 16 (Ring), 20 (Pinky)
                // Wrist: 0

                const wrist = landmarks[0];
                const d1 = getDist(landmarks[12], wrist);
                const d2 = getDist(landmarks[16], wrist);
                const d3 = getDist(landmarks[20], wrist);

                const avgDist = (d1 + d2 + d3) / 3;

                // Map avgDist to 0..1
                // Closed fist is approx 0.1 - 0.15
                // Open hand is approx 0.3 - 0.4
                // Let's set range: 0.15 (Closed) -> 0.35 (Open)

                const minD = 0.15;
                const maxD = 0.35;
                const targetScale = Math.max(0, Math.min(1, (avgDist - minD) / (maxD - minD)));

                // Smoothly interpolate gestureFactor
                this.gestureFactor += (targetScale - this.gestureFactor) * 0.1;

                // Lock Rotation (do not update this.handPosition)

            } else {
                // --- ROTATION MODE ---
                // Update Rotation
                this.handPosition = currentHandPos;

                // Lock Scaling (do not update gestureFactor)
            }

            // console.log(`Pinch: ${isPinch}, Dist: ${pinchDist.toFixed(3)}, Factor: ${this.gestureFactor.toFixed(2)}`);

        } else {
            // No hand detected
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
