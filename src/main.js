import './style.css'
import { HandTracker } from './vision/HandTracker.js';
import { ParticleSystem } from './scene/ParticleSystem.js';
import { Interface } from './ui/Interface.js';

async function init() {
  const handTracker = new HandTracker();
  const particleSystem = new ParticleSystem();

  // Ensure DOM is ready
  if (document.readyState === 'loading') {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r));
  }

  const ui = new Interface(particleSystem);

  try {
    // Initialize particles first so we see something immediately
    particleSystem.init();

    await handTracker.init();
    console.log('Hand tracking initialized');

    animate(handTracker, particleSystem);
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

function animate(handTracker, particleSystem) {
  requestAnimationFrame(() => animate(handTracker, particleSystem));

  handTracker.detect();
  const factor = handTracker.getGestureFactor();
  const handPos = handTracker.getHandPosition();

  particleSystem.update(factor);
  particleSystem.updateRotation(handPos);
}

init();
