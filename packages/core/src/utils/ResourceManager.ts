import * as THREE from 'three';

/**
 * ResourceManager - Manages Three.js resources to prevent memory leaks
 */
export class ResourceManager {
  private geometries: Map<string, THREE.BufferGeometry>;
  private materials: Map<string, THREE.Material>;
  private textures: Map<string, THREE.Texture>;
  private parameters: Map<string, any>;

  constructor() {
    this.geometries = new Map();
    this.materials = new Map();
    this.textures = new Map();
    this.parameters = new Map();
  }

  /**
   * Add a geometry to the manager
   */
  addGeometry(name: string, geometry: THREE.BufferGeometry): void {
    if (this.geometries.has(name)) {
      this.geometries.get(name)?.dispose();
    }
    this.geometries.set(name, geometry);
  }

  /**
   * Get a geometry by name
   */
  getGeometry(name: string): THREE.BufferGeometry {
    const geometry = this.geometries.get(name);
    if (!geometry) {
      throw new Error(`Geometry "${name}" not found in ResourceManager`);
    }
    return geometry;
  }

  /**
   * Add a material to the manager
   */
  addMaterial(name: string, material: THREE.Material): void {
    if (this.materials.has(name)) {
      this.materials.get(name)?.dispose();
    }
    this.materials.set(name, material);
  }

  /**
   * Get a material by name
   */
  getMaterial(name: string): THREE.Material {
    const material = this.materials.get(name);
    if (!material) {
      throw new Error(`Material "${name}" not found in ResourceManager`);
    }
    return material;
  }

  /**
   * Add a texture to the manager
   */
  addTexture(name: string, texture: THREE.Texture): void {
    if (this.textures.has(name)) {
      this.textures.get(name)?.dispose();
    }
    this.textures.set(name, texture);
  }

  /**
   * Get a texture by name
   */
  getTexture(name: string): THREE.Texture {
    const texture = this.textures.get(name);
    if (!texture) {
      throw new Error(`Texture "${name}" not found in ResourceManager`);
    }
    return texture;
  }

  /**
   * Set a parameter value
   */
  setParameter(name: string, value: any): void {
    this.parameters.set(name, value);
  }

  /**
   * Get a parameter value
   */
  getParameter(name: string): any {
    return this.parameters.get(name);
  }

  /**
   * Dispose all managed resources
   */
  dispose(): void {
    // Dispose geometries
    this.geometries.forEach(geometry => {
      geometry.dispose();
    });
    this.geometries.clear();

    // Dispose materials
    this.materials.forEach(material => {
      material.dispose();
    });
    this.materials.clear();

    // Dispose textures
    this.textures.forEach(texture => {
      texture.dispose();
    });
    this.textures.clear();

    // Clear parameters
    this.parameters.clear();
  }

  /**
   * Get resource usage statistics
   */
  getStats(): { geometries: number; materials: number; textures: number } {
    return {
      geometries: this.geometries.size,
      materials: this.materials.size,
      textures: this.textures.size,
    };
  }
}

/**
 * PerformanceMonitor - Monitors FPS and provides performance data
 */
export class PerformanceMonitor {
  private fps: number;
  private frames: number;
  private lastTime: number;
  private callback: ((fps: number) => void) | null;
  private rafId: number | null;
  private interval: number;
  private tracking: boolean;
  private memoryHistory: Array<{ time: number; memory: any }>;

  constructor() {
    this.fps = 0;
    this.frames = 0;
    this.lastTime = 0;
    this.callback = null;
    this.rafId = null;
    this.interval = 1000; // 1 second update interval
    this.tracking = false;
    this.memoryHistory = [];
  }

  /**
   * Start monitoring performance with a callback function
   */
  startMonitoring(callback?: (fps: number) => void, interval: number = 1000): void {
    if (this.tracking) {
      this.stopMonitoring();
    }

    this.callback = callback || null;
    this.interval = interval;
    this.frames = 0;
    this.lastTime = performance.now();
    this.tracking = true;

    // Start frame counting
    const updateFPS = () => {
      this.frames++;
      const time = performance.now();
      const elapsed = time - this.lastTime;

      // Update FPS measurement every interval
      if (elapsed >= this.interval) {
        this.fps = Math.round((this.frames * 1000) / elapsed);

        // Track memory usage where available
        if (window.performance && (window.performance as any).memory) {
          this.memoryHistory.push({
            time: time,
            memory: (window.performance as any).memory,
          });

          // Limit history to 60 entries
          if (this.memoryHistory.length > 60) {
            this.memoryHistory.shift();
          }
        }

        // Call the callback with current FPS
        if (this.callback) {
          this.callback(this.fps);
        }

        // Reset counters
        this.frames = 0;
        this.lastTime = time;
      }

      this.rafId = requestAnimationFrame(updateFPS);
    };

    this.rafId = requestAnimationFrame(updateFPS);
  }

  /**
   * Stop monitoring performance
   */
  stopMonitoring(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.tracking = false;
  }

  /**
   * Get the current FPS value
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(): Array<{ time: number; memory: any }> {
    return [...this.memoryHistory];
  }

  /**
   * Get current memory usage if available
   */
  getCurrentMemoryUsage(): any | null {
    if (window.performance && (window.performance as any).memory) {
      return (window.performance as any).memory;
    }
    return null;
  }

  /**
   * Determine the appropriate quality level based on current performance
   */
  getRecommendedQualityLevel(): 'high' | 'medium' | 'low' {
    const fps = this.getFPS();

    // Simple quality determination based on framerate
    if (fps < 15) {
      return 'low';
    } else if (fps < 30) {
      return 'medium';
    } else {
      return 'high';
    }
  }
}

/**
 * Create a basic environment for the scene
 */
export function createEnvironment(backgroundColor: string): THREE.Group {
  const group = new THREE.Group();

  // Create a starfield background
  const starCount = 1000;
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starColors = new Float32Array(starCount * 3);

  // Generate random stars
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    // Position in a large sphere around the center
    const radius = 1000 + Math.random() * 1000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i3 + 2] = radius * Math.cos(phi);

    // Random size
    starSizes[i] = Math.random() * 2 + 0.5;

    // Color variation (white to blue-ish)
    starColors[i3] = 0.8 + Math.random() * 0.2; // R
    starColors[i3 + 1] = 0.8 + Math.random() * 0.2; // G
    starColors[i3 + 2] = 0.9 + Math.random() * 0.1; // B
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  // Create material with custom shader
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      pointSize: { value: 1.0 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z) * pointSize;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      
      void main() {
        float r = length(gl_PointCoord - vec2(0.5, 0.5));
        if (r > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.3, 0.5, r);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
  });

  const starField = new THREE.Points(starGeometry, starMaterial);
  group.add(starField);

  // Add a subtle nebula effect in the background
  if (backgroundColor !== '#000000') {
    const bgColor = new THREE.Color(backgroundColor);
    const nebulaCount = 5;

    for (let i = 0; i < nebulaCount; i++) {
      // Create a nebula cloud
      const nebulaGeometry = new THREE.SphereGeometry(800, 16, 16);

      // Distort the geometry for a cloud-like effect
      const positionAttribute = nebulaGeometry.getAttribute('position');
      const positions = positionAttribute.array;

      for (let j = 0; j < positions.length; j += 3) {
        positions[j] += (Math.random() - 0.5) * 400;
        positions[j + 1] += (Math.random() - 0.5) * 400;
        positions[j + 2] += (Math.random() - 0.5) * 400;
      }

      positionAttribute.needsUpdate = true;

      // Create a material with the background color but very transparent
      const nebulaMaterial = new THREE.MeshBasicMaterial({
        color: bgColor,
        transparent: true,
        opacity: 0.015,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);

      // Position the nebula randomly
      nebula.position.set(
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000
      );

      // Add some rotation
      nebula.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      group.add(nebula);
    }
  }

  return group;
}

/**
 * Dispose all resources in the environment
 */
export function disposeEnvironment(environment: THREE.Group): void {
  if (!environment) return;

  // Recursively dispose all geometries and materials
  environment.traverse(object => {
    if (object instanceof THREE.Mesh) {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    } else if (object instanceof THREE.Points) {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
  });
}
