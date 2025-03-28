/**
 * Custom link rendering for the visualization
 * Creates Three.js objects for links with particle flow
 */
import * as THREE from 'three';
import { ResourceManager } from '../utils/ResourceManager';

// Shared resources for link rendering
let linkResourceManager: ResourceManager | null = null;

/**
 * Initialize shared resources for link rendering
 */
export function initLinkResources(detail: 'high' | 'medium' | 'low' = 'medium'): ResourceManager {
  if (linkResourceManager) {
    return linkResourceManager;
  }

  linkResourceManager = new ResourceManager();

  // Create particle texture
  const particleTexture = createParticleTexture();
  linkResourceManager.addTexture('particle', particleTexture);

  // Base link material
  const linkMaterial = new THREE.LineBasicMaterial({
    transparent: true,
    opacity: 0.6,
  });
  linkResourceManager.addMaterial('linkBase', linkMaterial);

  // Determine max particles based on detail level
  let maxParticles: number;
  switch (detail) {
    case 'high':
      maxParticles = 50;
      break;
    case 'medium':
      maxParticles = 25;
      break;
    case 'low':
      maxParticles = 10;
      break;
  }
  linkResourceManager.setParameter('maxParticles', maxParticles);

  return linkResourceManager;
}

/**
 * Create a particle texture for flow animation
 */
function createParticleTexture(): THREE.Texture {
  // For server-side rendering, check if canvas is available
  if (typeof document === 'undefined') {
    // Create a stub texture for SSR
    return new THREE.Texture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;

  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 4
  );

  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a custom THREE.Object3D for a link with optional particle flow
 */
export function createLinkObject(
  link: any,
  showParticles: boolean = true,
  particleSpeed: number = 0.005,
  particleSize: number = 1.0
): THREE.Object3D {
  if (!linkResourceManager) {
    initLinkResources();
  }

  // Ensure the resource manager exists
  if (!linkResourceManager) {
    throw new Error('Failed to initialize link resources');
  }

  // Source and target positions come from the nodes
  const source = typeof link.source === 'object' ? link.source : { x: 0, y: 0, z: 0 };
  const target = typeof link.target === 'object' ? link.target : { x: 0, y: 0, z: 0 };

  // Create the group to hold everything
  const group = new THREE.Group();

  // Determine link color
  const linkColor = link.color || 0xaaaaaa;

  // Create the basic link line
  const linkGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array([source.x, source.y, source.z, target.x, target.y, target.z]);
  linkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Get the base material and cast to LineBasicMaterial
  const baseMaterial = linkResourceManager.getMaterial('linkBase') as THREE.LineBasicMaterial;
  const linkMaterial = baseMaterial.clone() as THREE.LineBasicMaterial;
  linkMaterial.color = new THREE.Color(linkColor);
  linkMaterial.opacity = Math.min(0.3 + (link.value || 1) * 0.05, 0.8);

  const linkLine = new THREE.Line(linkGeometry, linkMaterial);
  group.add(linkLine);

  // Handle potential link curvature later

  // Add particle flow if enabled
  if (showParticles && link.value > 0) {
    const maxParticles = linkResourceManager.getParameter('maxParticles') || 25;
    const particleCount = Math.min(Math.ceil(link.value * 2), maxParticles);

    const particleSystem = createParticleSystem(
      source,
      target,
      linkColor,
      particleSpeed,
      particleCount,
      particleSize
    );

    group.add(particleSystem);

    // Store the update function on the group for animation
    (group as any).__updateParticles = () => {
      updateParticles(particleSystem, source, target);
    };
  }

  return group;
}

/**
 * Creates a particle system for flow visualization
 */
function createParticleSystem(
  source: any,
  target: any,
  color: number | string,
  speed: number,
  count: number,
  size: number
): THREE.Points {
  if (!linkResourceManager) {
    throw new Error('Link resource manager is not initialized');
  }

  // Calculate direction vector
  const dir = {
    x: target.x - source.x,
    y: target.y - source.y,
    z: target.z - source.z,
  };

  const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);

  // Create particle material
  const particleMaterial = new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size: size,
    map: linkResourceManager.getTexture('particle'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Create particle positions
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const offsets = new Float32Array(count);

  // Initialize particles at random positions along the line
  for (let i = 0; i < count; i++) {
    const offset = Math.random();
    offsets[i] = offset;

    positions[i * 3] = source.x + dir.x * offset;
    positions[i * 3 + 1] = source.y + dir.y * offset;
    positions[i * 3 + 2] = source.z + dir.z * offset;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Create the particle system
  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);

  // Store metadata for animation
  (particleSystem as any).__metadata = {
    count,
    speed,
    length,
    dir,
    offsets,
  };

  return particleSystem;
}

/**
 * Updates particle positions for animation
 */
function updateParticles(particleSystem: THREE.Points, source: any, target: any): void {
  const metadata = (particleSystem as any).__metadata;
  if (!metadata) return;

  const { count, speed, offsets } = metadata;

  // Recalculate direction in case nodes moved
  const dir = {
    x: target.x - source.x,
    y: target.y - source.y,
    z: target.z - source.z,
  };

  const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);

  // Skip if positions are identical
  if (length === 0) return;

  // Normalize direction
  dir.x /= length;
  dir.y /= length;
  dir.z /= length;

  // Update metadata
  metadata.dir = dir;
  metadata.length = length;

  // Get position attribute
  const positions = particleSystem.geometry.getAttribute('position');

  // Update each particle
  for (let i = 0; i < count; i++) {
    // Update offset
    offsets[i] += speed;
    if (offsets[i] > 1) offsets[i] -= 1;

    // Calculate new position
    positions.setXYZ(
      i,
      source.x + dir.x * length * offsets[i],
      source.y + dir.y * length * offsets[i],
      source.z + dir.z * length * offsets[i]
    );
  }

  positions.needsUpdate = true;
}

/**
 * Updates all link objects in the scene
 */
export function updateLinkObjects(scene: THREE.Scene): void {
  if (!scene) return;

  // Find all groups with update functions
  scene.traverse(object => {
    if ((object as any).__updateParticles) {
      (object as any).__updateParticles();
    }
  });
}

/**
 * Clean up link rendering resources
 */
export function disposeLinkResources(): void {
  if (linkResourceManager) {
    linkResourceManager.dispose();
    linkResourceManager = null;
  }
}
