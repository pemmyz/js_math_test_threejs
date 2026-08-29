// --- 1. Scene & Camera Setup ---
const container = document.getElementById("container");
const scene = new THREE.Scene();

// Orthographic camera for full-screen quad rendering
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Optimized DPR cap
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// --- 2. Shader Uniforms ---
const uniforms = {
  r: { value: new THREE.Vector2(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio()) },
  t: { value: 0.0 }
};

// --- 3. Optimized Shaders ---
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  
  uniform vec2 r;
  uniform float t;

  #define PI 3.14159265358979323846

  // Fast hash/noise
  float fsnoise(vec2 v) {
    return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 p = vec3(0.0, 0.0, 5.0);
    vec4 o = vec4(0.0);
    
    // Ray direction step vector
    vec3 dir = 0.5 - gl_FragCoord.xyz / r.y;
    
    float e = 0.0;
    float b = 0.0;
    float seed = 0.0;

    // Structured outer (raymarching) and inner (stochastic curve search) loops
    // 16 ray steps x 36 stochastic samples = 576 evaluations
    for (int step = 0; step < 16; step++) {
      float minD = 1e4;
      
      for (int sampleIdx = 0; sampleIdx < 36; sampleIdx++) {
        seed += 1.0;
        float n = fsnoise(p.xy * seed) * 2.0 - 1.0;
        float R = b + (n * n * n) * PI;
        
        float r2 = R * 2.0;
        vec3 knotPos = vec3(
          sin(R) + 2.0 * sin(r2),
          cos(R) - 2.0 * cos(r2),
          -sin(3.0 * R)
        );
        
        float D = length(p - knotPos) - sin(R * 36.0 + t * 9.0) * 0.1 - 1.0;
        
        if (D < minD) {
          minD = D;
          b = R;
        }
      }
      
      e = minD;
      
      // Accumulate glow and advance ray
      o += 0.1 / exp(e * 1000.0);
      p -= dir * (e + float(step) + 1.0);
    }

    gl_FragColor = vec4(o.rgb, 1.0);
  }
`;

// --- 4. Full-Screen Quad ---
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  depthWrite: false,
  depthTest: false
});

const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// --- 5. Resize Handling ---
function onWindowResize() {
  const dpr = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.r.value.set(window.innerWidth * dpr, window.innerHeight * dpr);
}
window.addEventListener("resize", onWindowResize);

// --- 6. Render Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  uniforms.t.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}

animate();
