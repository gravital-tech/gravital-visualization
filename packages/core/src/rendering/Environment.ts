/**
 * Environment effects for the visualization
 * Creates starfield, nebula, and other background elements
 */
import * as THREE from 'three';

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
