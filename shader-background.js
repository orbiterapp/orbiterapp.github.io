// Animated Shader Background for Orbiter Login Page
// Uses Three.js for WebGL rendering

(function() {
  'use strict';

  function initShaderBackground() {
    const container = document.getElementById('login-shader-container');
    if (!container) return;

    // Check for Three.js
    if (typeof THREE === 'undefined') {
      console.error('Three.js not loaded');
      container.style.display = 'none';
      return;
    }

    // Detect mobile for performance tuning
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: isMobile ? 'low-power' : 'high-performance'
      });
    } catch (e) {
      console.warn('Shader background: WebGL not available', e.message);
      container.style.display = 'none';
      return;
    }

    // Lower resolution on mobile for big perf win
    const pixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Fewer loop iterations and octaves on mobile
    const numLoops = isMobile ? 18 : 40;
    const numOctaves = isMobile ? 3 : 5;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        // iOffset shifts the focal center of the aurora.
        // Negative X = right side, negative Y = top (in WebGL Y-up space focal calc)
        iOffset: { value: new THREE.Vector2(-0.18, -0.22) }
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision ${isMobile ? 'mediump' : 'highp'} float;
        uniform float iTime;
        uniform vec2 iResolution;
        uniform vec2 iOffset;

        #define NUM_OCTAVES ${numOctaves}
        #define NUM_LOOPS ${numLoops}.0

        float rand(vec2 n) {
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 u = fract(p);
          u = u*u*(3.0-2.0*u);

          float res = mix(
            mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
            mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
          return res * res;
        }

        float fbm(vec2 x) {
          float v = 0.0;
          float a = 0.3;
          vec2 shift = vec2(100);
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
          for (int i = 0; i < NUM_OCTAVES; ++i) {
            v += a * noise(x);
            x = rot * x * 2.0 + shift;
            a *= 0.4;
          }
          return v;
        }

        void main() {
          vec2 shake = vec2(sin(iTime * 1.2) * 0.005, cos(iTime * 2.1) * 0.005);
          vec2 centeredCoord = (gl_FragCoord.xy - iResolution.xy * 0.5) * 0.85 + iOffset * iResolution.xy;
          vec2 p = (centeredCoord + shake * iResolution.xy) / iResolution.y * mat2(4.0, -3.0, 3.0, 4.0);
          vec2 v;
          vec4 o = vec4(0.0);

          float f = 1.5 + fbm(p + vec2(iTime * 3.0, 0.0)) * 0.8;

          for (float i = 0.0; i < NUM_LOOPS; i++) {
            v = p + cos(i * i * 0.15 + (iTime + p.x * 0.05) * 0.03 + i * vec2(11.0, 9.0)) * 4.0 + vec2(sin(iTime * 2.5 + i) * 0.004, cos(iTime * 3.0 - i) * 0.004);
            float tailNoise = fbm(v + vec2(iTime * 0.4, i)) * 0.4 * (1.0 - (i / (NUM_LOOPS + 10.0)));
            vec4 auroraColors = vec4(
              0.2 + 0.4 * sin(i * 0.15 + iTime * 0.3),
              0.4 + 0.6 * cos(i * 0.25 + iTime * 0.4),
              0.8 + 0.4 * sin(i * 0.35 + iTime * 0.25),
              1.0
            );
            vec4 currentContribution = auroraColors * exp(sin(i * i * 0.08 + iTime * 0.6)) / length(max(v, vec2(v.x * f * 0.012, v.y * 1.3)));
            float thinnessFactor = smoothstep(0.0, 1.0, i / NUM_LOOPS) * 0.7;
            o += currentContribution * (1.0 + tailNoise * 0.9) * thinnessFactor;
          }

          o = tanh(pow(o / 60.0, vec4(1.4)));
          gl_FragColor = o * 2.0;
        }
      `,
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frameId;
    let lastTime = 0;
    // On mobile, cap at ~30fps to save battery and reduce lag
    const targetInterval = isMobile ? 1000 / 30 : 0;

    const animate = (timestamp) => {
      frameId = requestAnimationFrame(animate);
      if (isMobile && timestamp - lastTime < targetInterval) return;
      lastTime = timestamp;
      material.uniforms.iTime.value += isMobile ? 0.033 : 0.016;
      renderer.render(scene, camera);
    };
    frameId = requestAnimationFrame(animate);

    // Pause when tab is hidden to save resources
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Store cleanup function
    container.cleanup = function() {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      container.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShaderBackground);
  } else {
    initShaderBackground();
  }
})();
