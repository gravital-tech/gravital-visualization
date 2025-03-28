/**
 * Custom node rendering for the visualization
 * Creates Three.js objects for tokens with glow effects
 */
import * as THREE from 'three';
import { ResourceManager } from '../utils/ResourceManager';

// Shared resources to optimize memory usage
let resourceManager: ResourceManager | null = null;

/**
 * Initialize shared resources for node rendering
 */
export function initNodeResources(detail: 'high' | 'medium' | 'low' = 'medium'): ResourceManager {
  if (resourceManager) {
    return resourceManager;
  }

  // Create geometries with different detail levels
  const getResolution = (base: number) => {
    switch (detail) {
      case 'high':
        return base;
      case 'medium':
        return Math.max(8, Math.floor(base * 0.7));
      case 'low':
        return Math.max(6, Math.floor(base * 0.5));
    }
  };

  // Create and track resources
  resourceManager = new ResourceManager();

  // Add geometries with different detail levels
  resourceManager.addGeometry(
    'rootNode',
    new THREE.SphereGeometry(1, getResolution(32), getResolution(32))
  );
  resourceManager.addGeometry(
    'branchNode',
    new THREE.SphereGeometry(1, getResolution(24), getResolution(24))
  );
  resourceManager.addGeometry(
    'leafNode',
    new THREE.SphereGeometry(1, getResolution(16), getResolution(16))
  );

  // Create a glow sprite texture
  const glowTexture = createGlowTexture();
  resourceManager.addTexture('glow', glowTexture);

  return resourceManager;
}

/**
 * Create a glow texture for sprites
 */
function createGlowTexture(): THREE.Texture {
  // For server-side rendering, check if canvas is available
  if (typeof document === 'undefined') {
    // Create a stub texture for SSR
    return new THREE.Texture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2
  );

  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Create a custom THREE.Object3D for a token node
 */
export function createNodeObject(node: any, highlightedNode: string | null = null): THREE.Object3D {
  if (!resourceManager) {
    initNodeResources();
  }

  // Create a group to hold all components
  const group = new THREE.Group();

  // Determine if node is highlighted
  const isHighlighted = highlightedNode === node.id;

  // Choose geometry based on node type
  let geometryName: string;
  switch (node.type) {
    case 'root':
      geometryName = 'rootNode';
      break;
    case 'branch':
      geometryName = 'branchNode';
      break;
    case 'leaf':
    default:
      geometryName = 'leafNode';
      break;
  }

  // Get base geometry from resource manager
  const geometry = resourceManager!.getGeometry(geometryName);

  // Create material with node color
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(node.color),
    transparent: true,
    opacity: 0.9,
    shininess: 80,
  });

  // Add emissive property if highlighted
  if (isHighlighted) {
    material.emissive = new THREE.Color(node.color).multiplyScalar(0.5);
  }

  // Create mesh with scaled geometry
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(node.size, node.size, node.size);
  group.add(mesh);

  // Add glow effect if node has success metric
  if (node.success > 0) {
    const glowMaterial = new THREE.SpriteMaterial({
      map: resourceManager!.getTexture('glow'),
      color: new THREE.Color(node.color),
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: node.success * (isHighlighted ? 1.2 : 0.8),
    });

    const glow = new THREE.Sprite(glowMaterial);
    const glowSize = node.size * (2 + node.success * 2);
    glow.scale.set(glowSize, glowSize, 1);
    group.add(glow);
  }

  // Add highlight effect if node is highlighted
  if (isHighlighted) {
    const highlightMaterial = new THREE.SpriteMaterial({
      map: resourceManager!.getTexture('glow'),
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.4,
    });

    const highlight = new THREE.Sprite(highlightMaterial);
    highlight.scale.set(node.size * 5, node.size * 5, 1);
    group.add(highlight);
  }

  return group;
}

/**
 * Clean up node rendering resources
 */
export function disposeNodeResources(): void {
  if (resourceManager) {
    resourceManager.dispose();
    resourceManager = null;
  }
}
