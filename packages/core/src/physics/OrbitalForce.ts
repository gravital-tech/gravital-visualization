/**
 * Custom orbital force implementation for d3-force
 * Creates orbital motion of child nodes around parent nodes
 */

// Custom force interface that extends d3's Force
export interface OrbitalForce {
  (alpha: number): void;
  initialize(nodes: any[], links?: any[]): void;
  strength(strength?: number): number | OrbitalForce;
  focalPoint(node?: any): any | OrbitalForce;
}

/**
 * Creates a custom orbital force for use with d3-force
 */
export function orbitalForce(): OrbitalForce {
  let nodes: any[] = [];
  let links: any[] = [];
  let strength = 1;
  let focalPoint: any = null;

  // Main force function that gets called by d3 on each tick
  function force(alpha: number) {
    // Skip if strength is too low
    if (strength <= 0) return;

    // Process each node
    nodes.forEach(node => {
      // Root tokens don't orbit anything
      if (node.type === 'root') return;

      // Find this node's parent by checking links
      const parentLinks = links.filter(link => {
        // Check both source->target and target->source connections
        if (typeof link.source === 'object' && typeof link.target === 'object') {
          if (
            link.source.id === node.id &&
            (link.target.type === 'branch' || link.target.type === 'root')
          ) {
            return true;
          }
          if (
            link.target.id === node.id &&
            (link.source.type === 'branch' || link.source.type === 'root')
          ) {
            return true;
          }
        }
        return false;
      });

      // Skip if no parent found
      if (parentLinks.length === 0) return;

      // Get the parent node
      const parentLink = parentLinks[0];
      const parent = parentLink.source.id === node.id ? parentLink.target : parentLink.source;

      // Calculate orbital parameters based on node type and size
      const nodeIndex = nodes.findIndex(n => n.id === node.id);
      const orbitSpeed = node.type === 'leaf' ? 0.00025 * strength : 0.0001 * strength;
      const orbitRadius = calculateOrbitRadius(parent, node, parentLink.value);

      // Create different orbital planes to prevent collisions
      // Each node gets a unique plane offset based on its index
      const planeOffset = (nodeIndex % 5) * (Math.PI / 10) + Math.PI / 20;

      // Get current timestamp for animation
      const now = Date.now();

      // Calculate target position on the orbit
      const angle = now * orbitSpeed + nodeIndex * (Math.PI / 6);
      const targetX = parent.x + Math.cos(angle) * orbitRadius;
      const targetY = parent.y + Math.sin(angle) * orbitRadius * Math.cos(planeOffset);
      const targetZ = parent.z + Math.sin(angle) * orbitRadius * Math.sin(planeOffset);

      // Apply force toward the orbital position (with alpha decay)
      const dx = targetX - node.x;
      const dy = targetY - node.y;
      const dz = targetZ - node.z;

      // Calculate distance and force magnitude
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance === 0) return;

      // Adjust force based on distance, alpha, and strength
      const forceMagnitude = Math.min(distance, 2) * alpha * strength;

      // Apply force to node velocity
      node.vx += (dx / distance) * forceMagnitude;
      node.vy += (dy / distance) * forceMagnitude;
      node.vz += (dz / distance) * forceMagnitude;
    });
  }

  // Helper function to calculate appropriate orbit radius
  function calculateOrbitRadius(parent: any, node: any, linkValue: number) {
    // Base radius on parent size, node size, and link value
    const baseRadius = parent.size + node.size + 10;
    // Add variation based on link value (stronger connections orbit closer)
    const valueAdjustment = linkValue ? 30 / Math.max(linkValue, 1) : 30;
    return baseRadius + valueAdjustment;
  }

  // Initialize the force with nodes and links
  force.initialize = function (_nodes: any[], _links?: any[]) {
    nodes = _nodes;
    links = _links || [];
  };

  // Setter/getter for strength parameter
  force.strength = function (_?: number) {
    return arguments.length ? ((strength = _!), force) : strength;
  };

  // Setter/getter for focal point
  force.focalPoint = function (_?: any) {
    return arguments.length ? ((focalPoint = _), force) : focalPoint;
  };

  // Return the force function
  return force as OrbitalForce;
}

/**
 * Sets up orbital physics in the force graph
 * @returns The orbital force instance
 */
export function setupOrbitalPhysics(forceGraph: any, orbitalStrength: number = 1): OrbitalForce {
  if (!forceGraph) {
    throw new Error('Force graph reference is required');
  }

  // Get the d3 force simulation
  const simulation = forceGraph.d3Force();
  if (!simulation) {
    throw new Error('Simulation not available from force graph');
  }

  // Create and add our custom orbital force
  const orbital = orbitalForce();
  orbital.strength(orbitalStrength);
  simulation.force('orbital', orbital);

  // Add links to the orbital force when links change
  simulation.on('tick', () => {
    const links = forceGraph.graphData().links;
    const orbitalForce = simulation.force('orbital');
    if (orbitalForce && typeof orbitalForce.initialize === 'function' && links) {
      orbitalForce.initialize(simulation.nodes(), links);
    }
  });

  // Return the orbital force for external control
  return orbital;
}
