/**
 * Main GravitalVisualization component
 * Core visualization component for the Gravital Ecosystem
 */
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import * as d3 from 'd3-force-3d';

// Import our custom implementations
import { setupOrbitalPhysics, OrbitalForce } from '../physics/OrbitalForce';
import {
  createNodeObject,
  initNodeResources,
  disposeNodeResources,
} from '../rendering/NodeObjects';
import {
  createLinkObject,
  initLinkResources,
  disposeLinkResources,
  updateLinkObjects,
} from '../rendering/LinkObjects';
import { createEnvironment, disposeEnvironment } from '../rendering/Environment';
import { PerformanceMonitor } from '../utils/ResourceManager';
import { adaptToForceGraphFormat, validateEcosystemData } from '../data/Adapter';

// Types
import { EcosystemData, VisualizationPreferences, Token, Link, ForceGraphMethods } from '../types';

// Default preferences
const DEFAULT_PREFERENCES: VisualizationPreferences = {
  showValueFlow: true, // Show particle effects
  enableOrbitalMovement: true, // Enable orbital animations
  orbitalSpeed: 1, // Default orbital speed
  glowIntensity: 1, // Default glow intensity
  particleSpeed: 0.005, // Default particle flow speed
  backgroundColor: '#050520', // Dark background

  focusOnRootToken: true, // Auto-focus on root token
  initialZoom: 1, // Default zoom level

  visibleTypes: ['root', 'branch', 'leaf'], // Show all types
  visibleCategories: [], // No category filtering by default

  reducedMotion: false, // Full animation by default
  highContrast: false, // Normal contrast

  d3AlphaDecay: 0.02, // Default d3 alpha decay
  d3VelocityDecay: 0.1, // Default velocity decay
};

// Component props
export interface GravitalVisualizationProps {
  // Data
  data?: EcosystemData;
  dataUrl?: string;

  // Visual configuration
  backgroundColor?: string;
  nodeResolution?: 'high' | 'medium' | 'low';

  // Physics configuration
  d3AlphaDecay?: number;
  d3VelocityDecay?: number;
  cooldownTime?: number;
  warmupTicks?: number;
  orbitalForce?: number;

  // Interaction configuration
  controlType?: 'trackball' | 'orbit' | 'fly';
  enableNodeDrag?: boolean;
  enableNavigationControls?: boolean;

  // Standard configuration
  width?: number | string;
  height?: number | string;

  // Callbacks
  onNodeClick?: (node: Token) => void;
  onNodeHover?: (node: Token | null) => void;
  onLinkClick?: (link: Link) => void;
  onLinkHover?: (link: Link | null) => void;
  onFilterChange?: (filters: any) => void;
  onVisualizationEvent?: (event: any) => void;

  // Feature flags
  enableTour?: boolean;
  enableExport?: boolean;
  enableFilters?: boolean;
  enableFocalPoint?: boolean;

  // Initial state
  initialPreferences?: Partial<VisualizationPreferences>;
}

/**
 * Main GravitalVisualization component
 */
const GravitalVisualization = forwardRef<ForceGraphMethods, GravitalVisualizationProps>(
  (props, ref) => {
    // Extract props with defaults
    const {
      data,
      dataUrl,
      backgroundColor = DEFAULT_PREFERENCES.backgroundColor,
      nodeResolution = 'medium',
      d3AlphaDecay = DEFAULT_PREFERENCES.d3AlphaDecay,
      d3VelocityDecay = DEFAULT_PREFERENCES.d3VelocityDecay,
      cooldownTime = 15000,
      warmupTicks = 100,
      orbitalForce = 1,
      controlType = 'orbit',
      enableNodeDrag = true,
      enableNavigationControls = true,
      width = '100%',
      height = '100%',
      onNodeClick,
      onNodeHover,
      onLinkClick,
      onLinkHover,
      onFilterChange,
      onVisualizationEvent,
      enableTour = false,
      enableExport = false,
      enableFilters = true,
      enableFocalPoint = true,
      initialPreferences = {},
    } = props;

    // Refs
    const forceGraphRef = useRef<any>(null);
    const requestRef = useRef<number | null>(null);
    const environmentRef = useRef<THREE.Group | null>(null);
    const orbitalForceRef = useRef<OrbitalForce | null>(null);
    const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
    const [loadingStatus, setLoadingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
      'idle'
    );
    const [preferences, setPreferences] = useState<VisualizationPreferences>({
      ...DEFAULT_PREFERENCES,
      ...initialPreferences,
    });
    const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
    const [focalPointNode, setFocalPointNode] = useState<Token | null>(null);
    const [deviceCapability, setDeviceCapability] = useState<'high' | 'medium' | 'low'>('medium');
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Handle component mounting
    useEffect(() => {
      setIsMounted(true);
      return () => setIsMounted(false);
    }, []);

    // Handle visibility detection for performance optimization
    useEffect(() => {
      if (!containerRef.current || !isMounted) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(entry.isIntersecting);
        },
        { threshold: 0.1 }
      );

      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    }, [containerRef.current, isMounted]);

    // Performance monitoring
    useEffect(() => {
      if (!isMounted || !isVisible) return;

      // Initialize performance monitor
      performanceMonitorRef.current = new PerformanceMonitor();

      // Start monitoring FPS
      performanceMonitorRef.current.startMonitoring(fps => {
        // Adjust device capability based on FPS
        if (fps < 20) {
          setDeviceCapability('low');
        } else if (fps < 40) {
          setDeviceCapability('medium');
        } else {
          setDeviceCapability('high');
        }

        // Apply quality settings based on device capability
        if (nodeResolution !== deviceCapability) {
          // This is where we would apply different quality settings
          // Currently we don't modify the prop directly, but use the state
        }

        // Emit event for performance monitoring
        if (onVisualizationEvent) {
          onVisualizationEvent({
            type: 'performance',
            timestamp: Date.now(),
            data: { fps, deviceCapability },
          });
        }
      });

      return () => {
        if (performanceMonitorRef.current) {
          performanceMonitorRef.current.stopMonitoring();
        }
      };
    }, [isMounted, isVisible, onVisualizationEvent, nodeResolution, deviceCapability]);

    // Data loading and processing
    useEffect(() => {
      if (!isMounted) return;

      if (data) {
        try {
          // Validate data
          const validData = validateEcosystemData(data);

          // Transform to force graph format
          const formattedData = adaptToForceGraphFormat(validData);

          // Set the data
          setGraphData(formattedData);
          setLoadingStatus('success');

          // Auto-focus on root token if enabled
          if (preferences.focusOnRootToken) {
            const rootNode = validData.nodes.find(node => node.type === 'root');
            if (rootNode) {
              setFocalPointNode(rootNode);
            }
          }

          // Notify of successful data load
          if (onVisualizationEvent) {
            onVisualizationEvent({
              type: 'data-loaded',
              timestamp: Date.now(),
              data: { nodeCount: validData.nodes.length, linkCount: validData.links.length },
            });
          }

          // Apply any filters if they're enabled
          if (enableFilters && onFilterChange) {
            onFilterChange({
              visibleTypes: preferences.visibleTypes,
              visibleCategories: preferences.visibleCategories,
            });
          }
        } catch (error) {
          console.error('Error processing data:', error);
          setLoadingStatus('error');

          // Notify of error
          if (onVisualizationEvent) {
            onVisualizationEvent({
              type: 'error',
              timestamp: Date.now(),
              data: { error: 'Failed to process data' },
            });
          }
        }
      } else if (dataUrl) {
        // Fetch data from URL
        setLoadingStatus('loading');

        fetch(dataUrl)
          .then(response => response.json())
          .then(fetchedData => {
            try {
              // Validate data
              const validData = validateEcosystemData(fetchedData);

              // Transform to force graph format
              const formattedData = adaptToForceGraphFormat(validData);

              // Set the data
              setGraphData(formattedData);
              setLoadingStatus('success');

              // Auto-focus on root token if enabled
              if (preferences.focusOnRootToken) {
                const rootNode = validData.nodes.find(node => node.type === 'root');
                if (rootNode) {
                  setFocalPointNode(rootNode);
                }
              }

              // Notify of successful data load
              if (onVisualizationEvent) {
                onVisualizationEvent({
                  type: 'data-loaded',
                  timestamp: Date.now(),
                  data: { nodeCount: validData.nodes.length, linkCount: validData.links.length },
                });
              }
            } catch (error) {
              console.error('Error processing data:', error);
              setLoadingStatus('error');

              // Notify of error
              if (onVisualizationEvent) {
                onVisualizationEvent({
                  type: 'error',
                  timestamp: Date.now(),
                  data: { error: 'Failed to process fetched data' },
                });
              }
            }
          })
          .catch(error => {
            console.error('Error fetching data:', error);
            setLoadingStatus('error');

            // Notify of error
            if (onVisualizationEvent) {
              onVisualizationEvent({
                type: 'error',
                timestamp: Date.now(),
                data: { error: 'Failed to fetch data from URL' },
              });
            }
          });
      }
    }, [
      data,
      dataUrl,
      isMounted,
      preferences.focusOnRootToken,
      onVisualizationEvent,
      enableFilters,
      onFilterChange,
      preferences.visibleTypes,
      preferences.visibleCategories,
    ]);

    // Initialize rendering resources based on device capability
    useEffect(() => {
      if (!isMounted || !isVisible) return;

      // Initialize resources with appropriate detail level
      initNodeResources(deviceCapability);
      initLinkResources(deviceCapability);

      return () => {
        // Cleanup resources
        disposeNodeResources();
        disposeLinkResources();
      };
    }, [deviceCapability, isMounted, isVisible]);

    // Set up orbital physics when graph is ready
    useEffect(() => {
      if (!forceGraphRef.current || !isMounted || !isVisible) return;

      try {
        // Set up orbital physics
        const orbitalForceInstance = setupOrbitalPhysics(
          forceGraphRef.current,
          preferences.enableOrbitalMovement ? preferences.orbitalSpeed * orbitalForce : 0
        );

        orbitalForceRef.current = orbitalForceInstance;

        // Set focal point if available
        if (focalPointNode && orbitalForceInstance) {
          orbitalForceInstance.focalPoint(focalPointNode);
        }

        // Update d3 force parameters
        const simulation = forceGraphRef.current.d3Force();
        if (simulation) {
          simulation.alphaDecay(d3AlphaDecay);
          simulation.velocityDecay(d3VelocityDecay);

          // Add more forces for stability
          simulation.force('charge', d3.forceManyBody().strength(-50));
          simulation.force(
            'link',
            d3
              .forceLink()
              .id((d: any) => d.id)
              .distance(100)
          );
        }

        // Reheat simulation
        forceGraphRef.current.d3ReheatSimulation();
      } catch (error) {
        console.error('Error setting up orbital physics:', error);

        // Notify of error
        if (onVisualizationEvent) {
          onVisualizationEvent({
            type: 'error',
            timestamp: Date.now(),
            data: { error: 'Failed to set up orbital physics' },
          });
        }
      }

      return () => {
        // Cleanup any forces
        if (forceGraphRef.current) {
          const simulation = forceGraphRef.current.d3Force();
          if (simulation) {
            simulation.force('orbital', null);
          }
        }
      };
    }, [
      forceGraphRef.current,
      preferences.enableOrbitalMovement,
      preferences.orbitalSpeed,
      orbitalForce,
      d3AlphaDecay,
      d3VelocityDecay,
      focalPointNode,
      isMounted,
      isVisible,
      onVisualizationEvent,
    ]);

    // Set up environmental effects
    useEffect(() => {
      if (!forceGraphRef.current || !isMounted || !isVisible) return;

      const scene = forceGraphRef.current.scene();
      if (!scene) return;

      // Create environment
      const environment = createEnvironment(backgroundColor);
      scene.add(environment);
      environmentRef.current = environment;

      // Set background color
      const renderer = forceGraphRef.current.renderer();
      if (renderer) {
        renderer.setClearColor(new THREE.Color(backgroundColor));
      }

      return () => {
        if (environmentRef.current && scene) {
          scene.remove(environmentRef.current);
          disposeEnvironment(environmentRef.current);
          environmentRef.current = null;
        }
      };
    }, [forceGraphRef.current, backgroundColor, isMounted, isVisible]);

    // Animation loop for link particles
    useEffect(() => {
      if (!forceGraphRef.current || !preferences.showValueFlow || !isMounted || !isVisible) return;

      const scene = forceGraphRef.current.scene();
      if (!scene) return;

      const animate = () => {
        updateLinkObjects(scene);
        requestRef.current = requestAnimationFrame(animate);
      };

      requestRef.current = requestAnimationFrame(animate);

      return () => {
        if (requestRef.current !== null) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
        }
      };
    }, [forceGraphRef.current, preferences.showValueFlow, isMounted, isVisible]);

    // Handle visibility changes - pause/resume animation
    useEffect(() => {
      if (!forceGraphRef.current) return;

      if (isVisible) {
        forceGraphRef.current.resumeAnimation();
      } else {
        forceGraphRef.current.pauseAnimation();
      }
    }, [forceGraphRef.current, isVisible]);

    // Custom node object with caching
    const nodeThreeObject = useCallback(
      (node: Token) => {
        return createNodeObject(node, highlightedNode);
      },
      [highlightedNode, deviceCapability]
    );

    // Custom link object with particle flow
    const linkThreeObject = useCallback(
      (link: Link) => {
        return createLinkObject(
          link,
          preferences.showValueFlow,
          preferences.reducedMotion ? preferences.particleSpeed / 2 : preferences.particleSpeed,
          deviceCapability === 'low' ? 1.0 : deviceCapability === 'medium' ? 1.5 : 2.0
        );
      },
      [
        preferences.showValueFlow,
        preferences.particleSpeed,
        preferences.reducedMotion,
        deviceCapability,
      ]
    );

    // Custom node label for tooltips
    const nodeLabel = useCallback((node: Token) => {
      return `
      <div style="
        background-color: rgba(0,0,0,0.7);
        color: white;
        padding: 8px;
        border-radius: 4px;
        font-family: sans-serif;
        font-size: 12px;
        line-height: 1.4;
        max-width: 200px;
      ">
        <div style="font-weight: bold; margin-bottom: 4px;">${node.name}</div>
        <div style="font-size: 10px;">Type: ${node.type}</div>
        ${node.category ? `<div style="font-size: 10px;">Category: ${node.category}</div>` : ''}
        <div style="font-size: 10px;">Success: ${(node.success * 100).toFixed(1)}%</div>
      </div>
    `;
    }, []);

    // Focus on a specific node
    const focusOnNode = useCallback(
      (nodeId: string, duration: number = 1000) => {
        if (!forceGraphRef.current) return;

        const node = graphData.nodes.find((n: Token) => n.id === nodeId);
        if (!node) return;

        // Set as focal point
        setFocalPointNode(node);

        // Update orbital force focal point
        if (orbitalForceRef.current) {
          orbitalForceRef.current.focalPoint(node);
        }

        // Calculate appropriate distance based on node size
        const distance = node.size * 10 + 40;

        // Move camera to focus on the node
        forceGraphRef.current.cameraPosition(
          { x: node.x, y: node.y, z: node.z + distance }, // position
          { x: node.x, y: node.y, z: node.z }, // lookAt
          duration // ms transition duration
        );

        // Reheat simulation to reorganize nodes around new focal point
        forceGraphRef.current.d3ReheatSimulation();

        // Notify of focal point change
        if (onVisualizationEvent) {
          onVisualizationEvent({
            type: 'focal-point-changed',
            timestamp: Date.now(),
            data: { nodeId, node },
          });
        }
      },
      [forceGraphRef.current, graphData.nodes, orbitalForceRef.current, onVisualizationEvent]
    );

    // Handle node click - set focal point and notify parent
    const handleNodeClick = useCallback(
      (node: Token) => {
        setHighlightedNode(node.id);

        // Notify parent if callback provided
        if (onNodeClick) {
          onNodeClick(node);
        }

        // Focus camera on node with animation if enabled
        if (forceGraphRef.current && enableFocalPoint) {
          focusOnNode(node.id);
        }

        // Launch tour if enabled and requested
        if (enableTour) {
          // This is where we would trigger tour functionality
        }
      },
      [onNodeClick, enableFocalPoint, focusOnNode, forceGraphRef, enableTour]
    );

    // Handle node hover - highlight node and notify parent
    const handleNodeHover = useCallback(
      (node: Token | null) => {
        setHighlightedNode(node ? node.id : null);

        // Notify parent if callback provided
        if (onNodeHover) {
          onNodeHover(node);
        }
      },
      [onNodeHover]
    );

    // Exposed methods via ref
    useImperativeHandle(
      ref,
      () => ({
        // Built-in react-force-graph-3d methods
        centerAt: (
          x?: number,
          y?: number,
          z?: number,
          lookAt?: { x: number; y: number; z: number },
          transitionDuration?: number
        ) => {
          if (forceGraphRef.current) {
            forceGraphRef.current.centerAt(x, y, z, lookAt, transitionDuration);
          }
        },
        zoom: (distance: number, transitionDuration?: number) => {
          if (forceGraphRef.current) {
            forceGraphRef.current.zoom(distance, transitionDuration);
          }
        },
        cameraPosition: (
          position?: { x: number; y: number; z: number },
          lookAt?: { x: number; y: number; z: number },
          transitionDuration?: number
        ) => {
          if (forceGraphRef.current) {
            forceGraphRef.current.cameraPosition(position, lookAt, transitionDuration);
          }
        },
        pauseAnimation: () => {
          if (forceGraphRef.current) {
            forceGraphRef.current.pauseAnimation();
          }
        },
        resumeAnimation: () => {
          if (forceGraphRef.current) {
            forceGraphRef.current.resumeAnimation();
          }
        },
        d3Force: (forceName?: string, forceInstance?: any) => {
          if (forceGraphRef.current) {
            return forceGraphRef.current.d3Force(forceName, forceInstance);
          }
          return null;
        },
        d3ReheatSimulation: () => {
          if (forceGraphRef.current) {
            forceGraphRef.current.d3ReheatSimulation();
          }
        },

        // Extended methods for Gravital
        focusOnNode: (nodeId: string, transitionDuration?: number) => {
          focusOnNode(nodeId, transitionDuration);
        },
        highlightNode: (nodeId: string | null) => {
          setHighlightedNode(nodeId);
        },
        highlightPath: () => {
          // Implementation for path highlighting
          if (enableExport) {
            // This would involve highlighting multiple nodes along a path
          }
        },
        resetView: (transitionDuration?: number) => {
          if (forceGraphRef.current) {
            forceGraphRef.current.zoomToFit(transitionDuration);
          }

          // Reset focal point to root if available
          const rootNode = graphData.nodes.find((n: Token) => n.type === 'root');
          if (rootNode) {
            setFocalPointNode(rootNode);
            if (orbitalForceRef.current) {
              orbitalForceRef.current.focalPoint(rootNode);
            }
          } else {
            setFocalPointNode(null);
            if (orbitalForceRef.current) {
              orbitalForceRef.current.focalPoint(null);
            }
          }
        },
        updatePreferences: (prefs: Partial<VisualizationPreferences>) => {
          setPreferences(current => ({ ...current, ...prefs }));
        },

        // Tour functionality
        startTour: () => {
          // Implementation for tour system
          if (enableTour) {
            // This is where tour functionality would be implemented
            if (onVisualizationEvent) {
              onVisualizationEvent({
                type: 'tour-started',
                timestamp: Date.now(),
                data: {},
              });
            }
          }
        },
        endTour: () => {
          // Implementation for tour system
          if (enableTour) {
            // This is where tour would be ended
            if (onVisualizationEvent) {
              onVisualizationEvent({
                type: 'tour-ended',
                timestamp: Date.now(),
                data: {},
              });
            }
          }
        },
        goToTourStep: () => {
          // Implementation for tour system step navigation
          if (enableTour) {
            // This is where tour step navigation would be implemented
          }
        },

        // Data methods
        updateData: (newData: Partial<EcosystemData>) => {
          if (data) {
            const updatedData = {
              nodes: [...data.nodes],
              links: [...data.links],
              ...newData,
            };
            try {
              const validData = validateEcosystemData(updatedData as EcosystemData);
              const formattedData = adaptToForceGraphFormat(validData);
              setGraphData(formattedData);

              // Notify of data update
              if (onVisualizationEvent) {
                onVisualizationEvent({
                  type: 'data-updated',
                  timestamp: Date.now(),
                  data: { nodeCount: validData.nodes.length, linkCount: validData.links.length },
                });
              }
            } catch (error) {
              console.error('Error updating data:', error);

              // Notify of error
              if (onVisualizationEvent) {
                onVisualizationEvent({
                  type: 'error',
                  timestamp: Date.now(),
                  data: { error: 'Failed to update data' },
                });
              }
            }
          }
        },
      }),
      [
        forceGraphRef.current,
        graphData.nodes,
        focusOnNode,
        orbitalForceRef.current,
        data,
        onVisualizationEvent,
        enableTour,
        enableExport,
      ]
    );

    // Memoized graph props to avoid unnecessary re-renders
    const graphProps = useMemo(() => {
      // Convert width and height to numbers for ForceGraph3D if needed
      const numWidth = typeof width === 'string' ? undefined : width;
      const numHeight = typeof height === 'string' ? undefined : height;

      return {
        graphData,
        width: numWidth,
        height: numHeight,
        backgroundColor,
        cooldownTime: preferences.reducedMotion ? cooldownTime / 2 : cooldownTime,
        warmupTicks,
        controlType,
        enableNodeDrag,
        enableNavigationControls,
        nodeThreeObject,
        nodeThreeObjectExtend: false,
        linkThreeObject,
        linkThreeObjectExtend: false,
        nodeLabel,
        onNodeClick: handleNodeClick,
        onNodeHover: handleNodeHover,
        onLinkClick,
        onLinkHover,
      };
    }, [
      width,
      height,
      graphData,
      backgroundColor,
      cooldownTime,
      warmupTicks,
      controlType,
      enableNodeDrag,
      enableNavigationControls,
      nodeThreeObject,
      linkThreeObject,
      nodeLabel,
      handleNodeClick,
      handleNodeHover,
      onLinkClick,
      onLinkHover,
      preferences.reducedMotion,
    ]);

    // If not mounted or there's no WebGL support, show an appropriate message
    if (!isMounted) {
      return (
        <div
          ref={containerRef}
          style={{
            width,
            height,
            position: 'relative',
            backgroundColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
          }}
        >
          Initializing visualization...
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        style={{
          width,
          height,
          position: 'relative',
        }}
      >
        {loadingStatus === 'loading' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              zIndex: 10,
            }}
          >
            Loading visualization...
          </div>
        )}

        {loadingStatus === 'error' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              zIndex: 10,
            }}
          >
            Error loading visualization data. Please try again.
          </div>
        )}

        <ForceGraph3D ref={forceGraphRef} {...graphProps} />
      </div>
    );
  }
);

export default GravitalVisualization;
