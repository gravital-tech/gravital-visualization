/**
 * Type definitions for the Gravital Ecosystem visualization
 */

// Core data models
export interface Token {
  // Core properties
  id: string;
  name: string;
  type: 'root' | 'branch' | 'leaf';
  category?: string;

  // Visual properties
  size: number;
  color: string;
  success: number;

  // Relationship properties
  reserves: Reserve[];

  // Optional metadata
  description?: string;
  created?: string;
  stats?: Record<string, number>;

  // Optional position properties (managed by visualization)
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export interface Reserve {
  tokenId: string;
  percentage: number;
}

export interface Link {
  source: string | Token;
  target: string | Token;
  value: number;
  color?: string;
  type?: string;
}

export interface EcosystemData {
  nodes: Token[];
  links: Link[];
  metadata?: {
    version: string;
    timestamp: string;
    totalTokens: number;
    categories: string[];
  };
}

export interface ForceGraphData {
  nodes: any[];
  links: any[];
}

// Visualization preferences
export interface VisualizationPreferences {
  // Display preferences
  showValueFlow: boolean; // Show particle flow effects
  enableOrbitalMovement: boolean; // Enable orbital animations
  orbitalSpeed: number; // 0-1 speed multiplier
  glowIntensity: number; // 0-2 glow intensity
  particleSpeed: number; // Particle flow speed (0.001-0.01)
  backgroundColor: string; // Background color in hex

  // View preferences
  focusOnRootToken: boolean; // Auto-focus on root token
  initialZoom: number; // Initial zoom level (0.5-2)

  // Filter preferences
  visibleTypes: ('root' | 'branch' | 'leaf')[];
  visibleCategories: string[];

  // Accessibility preferences
  reducedMotion: boolean; // Reduce/disable animations
  highContrast: boolean; // Enhance contrast for readability

  // Physics preferences
  d3AlphaDecay: number; // Controls simulation cooling (0-1)
  d3VelocityDecay: number; // Controls movement damping (0-1)
}

// Component methods interface
export interface ForceGraphMethods {
  // Built-in react-force-graph-3d methods
  centerAt: (
    x?: number,
    y?: number,
    z?: number,
    lookAt?: { x: number; y: number; z: number },
    transitionDuration?: number
  ) => void;
  zoom: (distance: number, transitionDuration?: number) => void;
  cameraPosition: (
    position?: { x: number; y: number; z: number },
    lookAt?: { x: number; y: number; z: number },
    transitionDuration?: number
  ) => void;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  d3Force: (forceName?: string, forceInstance?: any) => any;
  d3ReheatSimulation: () => void;

  // Extended methods for Gravital
  focusOnNode: (nodeId: string, transitionDuration?: number) => void;
  highlightNode: (nodeId: string | null) => void;
  highlightPath: (nodeIds: string[]) => void;
  resetView: (transitionDuration?: number) => void;
  updatePreferences: (prefs: Partial<VisualizationPreferences>) => void;

  // Tour functionality
  startTour?: () => void;
  endTour?: () => void;
  goToTourStep?: (stepIndex: number) => void;

  // Data methods
  updateData: (newData: Partial<EcosystemData>) => void;
}

// Events
export interface VisualizationEvent {
  type: string;
  timestamp: number;
  data: unknown;
}
