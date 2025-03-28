/**
 * Data validation and transformation for the ecosystem visualization
 */
import { EcosystemData, ForceGraphData } from '../types';

/**
 * Validate the ecosystem data structure
 */
export function validateEcosystemData(data: any): EcosystemData {
  // Basic validation
  if (!data) {
    throw new Error('Data is null or undefined');
  }

  if (!Array.isArray(data.nodes)) {
    throw new Error('Data must contain a nodes array');
  }

  if (!Array.isArray(data.links)) {
    throw new Error('Data must contain a links array');
  }

  // Validate each node
  data.nodes.forEach((node: any, index: number) => {
    if (!node.id) {
      throw new Error(`Node at index ${index} is missing required id property`);
    }

    if (!node.name) {
      throw new Error(`Node ${node.id} is missing required name property`);
    }

    if (!['root', 'branch', 'leaf'].includes(node.type)) {
      throw new Error(`Node ${node.id} has invalid type (must be root, branch, or leaf)`);
    }

    if (typeof node.size !== 'number' || node.size <= 0) {
      throw new Error(`Node ${node.id} has invalid size (must be a positive number)`);
    }

    if (!node.color) {
      throw new Error(`Node ${node.id} is missing required color property`);
    }

    if (typeof node.success !== 'number' || node.success < 0 || node.success > 1) {
      throw new Error(`Node ${node.id} has invalid success (must be a number between 0 and 1)`);
    }

    if (!Array.isArray(node.reserves)) {
      throw new Error(`Node ${node.id} reserves must be an array`);
    }

    // Validate reserves
    node.reserves.forEach((reserve: any, rIndex: number) => {
      if (!reserve.tokenId) {
        throw new Error(`Reserve at index ${rIndex} in node ${node.id} is missing tokenId`);
      }

      if (
        typeof reserve.percentage !== 'number' ||
        reserve.percentage < 0 ||
        reserve.percentage > 100
      ) {
        throw new Error(
          `Reserve ${reserve.tokenId} in node ${node.id} has invalid percentage (must be between 0 and 100)`
        );
      }
    });
  });

  // Validate each link
  data.links.forEach((link: any, index: number) => {
    if (!link.source) {
      throw new Error(`Link at index ${index} is missing required source property`);
    }

    if (!link.target) {
      throw new Error(`Link at index ${index} is missing required target property`);
    }

    if (typeof link.value !== 'number' || link.value < 0) {
      throw new Error(`Link at index ${index} has invalid value (must be a non-negative number)`);
    }

    // Check that source and target reference valid nodes
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    const sourceExists = data.nodes.some((node: any) => node.id === sourceId);
    if (!sourceExists) {
      throw new Error(`Link at index ${index} references non-existent source node: ${sourceId}`);
    }

    const targetExists = data.nodes.some((node: any) => node.id === targetId);
    if (!targetExists) {
      throw new Error(`Link at index ${index} references non-existent target node: ${targetId}`);
    }
  });

  // Return the validated data
  return data as EcosystemData;
}

/**
 * Transform ecosystem data to the format expected by react-force-graph-3d
 */
export function adaptToForceGraphFormat(data: EcosystemData): ForceGraphData {
  // Create a map of nodes by id for easy lookup
  const nodeMap = new Map<string, any>();
  data.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });

  // Process nodes - clone to avoid mutating the original
  const nodes = data.nodes.map(node => ({
    ...node,
    // Add any additional properties needed by force graph
  }));

  // Process links - ensure source and target are strings (ids)
  const links = data.links.map(link => {
    const source = typeof link.source === 'string' ? link.source : link.source.id;
    const target = typeof link.target === 'string' ? link.target : link.target.id;

    // Get the actual nodes for additional properties we might need
    const sourceNode = nodeMap.get(source);
    const targetNode = nodeMap.get(target);

    // Calculate link color if not provided
    let color = link.color;
    if (!color && sourceNode && targetNode) {
      color = blendColors(sourceNode.color, targetNode.color);
    }

    return {
      source,
      target,
      value: link.value,
      color,
      type: link.type,
    };
  });

  return { nodes, links };
}

/**
 * Blend two colors together
 */
function blendColors(color1: string, color2: string): string {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  // Convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // Blend colors with 50/50 ratio
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const r = Math.round((rgb1.r + rgb2.r) / 2);
  const g = Math.round((rgb1.g + rgb2.g) / 2);
  const b = Math.round((rgb1.b + rgb2.b) / 2);

  return rgbToHex(r, g, b);
}
