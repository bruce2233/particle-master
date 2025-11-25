import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PatternGenerator } from './PatternGenerator.js';

export class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.controls = null;
        this.count = 8000; // Reduced from 20000 for performance
        this.basePositions = []; // The target shape positions
        this.velocities = [];    // For noise/movement
        this.color = new THREE.Color(0x00ffff);
        this.currentPattern = 'sphere';
        this.autoRotate = true;
        this.rotationSpeed = 0.001;
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 30;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = false; // We handle rotation manually or let controls do it

        // Particles
        this.createParticles();

        // Resize listener
        window.addEventListener('resize', () => this.resize());
    }

    generateTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);

        // Initial pattern
        const patternPos = PatternGenerator.generateSphere(this.count);

        for (let i = 0; i < this.count; i++) {
            positions[i * 3] = patternPos[i * 3];
            positions[i * 3 + 1] = patternPos[i * 3 + 1];
            positions[i * 3 + 2] = patternPos[i * 3 + 2];

            this.basePositions.push(
                patternPos[i * 3],
                patternPos[i * 3 + 1],
                patternPos[i * 3 + 2]
            );

            // Random velocities for "breathing" or noise
            this.velocities.push(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            );
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: this.color,
            size: 0.3, // Slightly larger for soft texture
            map: this.generateTexture(),
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    update(gestureFactor) {
        // gestureFactor: 0 (closed) -> 1 (open)
        // We want:
        // 0 -> Tight shape (basePositions)
        // 1 -> Exploded/Dispersed

        // Actually, let's map:
        // Closed hand (0) -> Particles contract/form shape
        // Open hand (1) -> Particles expand/disperse

        // Let's say "base" is the contracted shape.
        // We add an offset based on gestureFactor.

        const positions = this.particles.geometry.attributes.position.array;
        const time = Date.now() * 0.001;

        // Smoothly interpolate current positions towards target (basePositions * expansion)
        // But for now, we just set them directly with noise for responsiveness.
        // Expansion factor: 
        // Closed (0) -> 0.5 (Contracted/Small)
        // Open (1) -> 4.0 (Expanded/Large - Increased for "filling" effect)
        const expansion = 0.5 + (gestureFactor * 3.5);
        const noiseAmt = gestureFactor * 2.0;

        for (let i = 0; i < this.count; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            const bx = this.basePositions[ix];
            const by = this.basePositions[iy];
            const bz = this.basePositions[iz];

            // Simple expansion from center (0,0,0)
            // Current pos = base * expansion

            // Add some curl noise or sine wave movement
            const noiseX = Math.sin(time + by) * noiseAmt;
            const noiseY = Math.cos(time + bz) * noiseAmt;
            const noiseZ = Math.sin(time + bx) * noiseAmt;

            positions[ix] = bx * expansion + noiseX;
            positions[iy] = by * expansion + noiseY;
            positions[iz] = bz * expansion + noiseZ;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    updateRotation(handPos) {
        // If hand is present, use it for rotation regardless of autoRotate setting
        if (handPos) {
            // Map hand X (0-1) to Rotation Y (-PI to PI)
            // Map hand Y (0-1) to Rotation X (-PI/2 to PI/2)

            // Invert X mapping to match user expectation (Left hand -> Rotate Left)
            // Previously: (handPos.x - 0.5) * 4 * PI
            // New: -(handPos.x - 0.5) * 4 * PI

            const targetRotY = -(handPos.x - 0.5) * Math.PI * 4;
            const targetRotX = (handPos.y - 0.5) * Math.PI * 2;

            // Smoothly interpolate
            this.particles.rotation.y += (targetRotY - this.particles.rotation.y) * 0.1;
            this.particles.rotation.x += (targetRotX - this.particles.rotation.x) * 0.1;
        } else if (this.autoRotate) {
            this.particles.rotation.y += this.rotationSpeed;
        }
    }

    toggleAutoRotate(enabled) {
        this.autoRotate = enabled;
    }

    resize() {
        if (!this.camera || !this.renderer) return;

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setColor(hex) {
        this.color.set(hex);
        if (this.particles) {
            this.particles.material.color = this.color;
        }
    }

    async setPattern(type, url = null) {
        if (type === this.currentPattern && !url) return;
        this.currentPattern = type;

        let newPositions = [];

        if (type === 'sphere') {
            newPositions = PatternGenerator.generateSphere(this.count);
        } else if (type === 'cube') {
            newPositions = PatternGenerator.generateCube(this.count);
        } else if (type === 'heart') {
            newPositions = PatternGenerator.generateHeart(this.count);
        } else if (type === 'galaxy') {
            // Simple galaxy spiral
            newPositions = [];
            for (let i = 0; i < this.count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 10;
                const spiral = angle + radius;
                newPositions.push(
                    Math.cos(spiral) * radius,
                    (Math.random() - 0.5) * 2,
                    Math.sin(spiral) * radius
                );
            }
        } else if (type === 'image' && url) {
            try {
                newPositions = await PatternGenerator.generateFromImage(url, this.count);
            } catch (e) {
                console.error("Failed to load image pattern", e);
                return;
            }
        }

        // Update basePositions
        // If newPositions is smaller than count, loop or fill.
        // If larger, truncate.
        // Our generators return exactly count items (except image which we might need to handle).

        if (newPositions.length > 0) {
            this.basePositions = [];
            for (let i = 0; i < this.count; i++) {
                const idx = (i % (newPositions.length / 3)) * 3;
                this.basePositions.push(
                    newPositions[idx],
                    newPositions[idx + 1],
                    newPositions[idx + 2]
                );
            }
        }
    }
}
