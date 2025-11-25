import * as THREE from 'three';

export class PatternGenerator {
    static generateSphere(count, radius = 10) {
        const positions = [];
        for (let i = 0; i < count; i++) {
            const r = radius * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }
        return positions;
    }

    static generateCube(count, size = 15) {
        const positions = [];
        for (let i = 0; i < count; i++) {
            positions.push(
                (Math.random() - 0.5) * size,
                (Math.random() - 0.5) * size,
                (Math.random() - 0.5) * size
            );
        }
        return positions;
    }

    static generateHeart(count, scale = 1) {
        const positions = [];
        for (let i = 0; i < count; i++) {
            // Heart surface equation or volume? Let's do a simple 2D shape extruded or 3D parametric.
            // 3D Heart: (x^2 + 9/4 y^2 + z^2 - 1)^3 - x^2 z^3 - 9/80 y^2 z^3 = 0
            // Rejection sampling is easy but slow.
            // Let's use a parametric equation or just a 2D heart with some thickness.

            // Parametric:
            // x = 16 sin^3(t)
            // y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
            // z = random thickness

            const t = Math.random() * 2 * Math.PI;
            const r = Math.sqrt(Math.random()); // For filling inside

            // 2D Heart shape filled
            let x = 16 * Math.pow(Math.sin(t), 3);
            let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

            // Scale down to fit
            x *= scale * 0.5 * r;
            y *= scale * 0.5 * r;
            const z = (Math.random() - 0.5) * 5 * scale; // Thickness

            positions.push(x, y, z);
        }
        return positions;
    }

    // For image based, we need to load image asynchronously.
    // We will return a Promise.
    static generateFromImage(url, count, scale = 0.1) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const data = ctx.getImageData(0, 0, img.width, img.height).data;
                const validPixels = [];

                for (let y = 0; y < img.height; y += 2) { // Skip some pixels for performance
                    for (let x = 0; x < img.width; x += 2) {
                        const index = (y * img.width + x) * 4;
                        const alpha = data[index + 3];
                        const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;

                        if (alpha > 128 && brightness > 50) {
                            validPixels.push({
                                x: (x - img.width / 2) * scale,
                                y: -(y - img.height / 2) * scale, // Flip Y
                                z: 0
                            });
                        }
                    }
                }

                const positions = [];
                if (validPixels.length === 0) {
                    resolve(this.generateSphere(count)); // Fallback
                    return;
                }

                for (let i = 0; i < count; i++) {
                    const p = validPixels[Math.floor(Math.random() * validPixels.length)];
                    // Add some depth noise
                    positions.push(p.x, p.y, p.z + (Math.random() - 0.5) * 2);
                }
                resolve(positions);
            };
            img.onerror = reject;
            img.src = url;
        });
    }
}
