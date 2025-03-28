/**
 * Type declarations for d3-force-3d
 */
declare module 'd3-force-3d' {
  export function forceSimulation<NodeDatum extends object>(
    nodes?: NodeDatum[]
  ): Simulation<NodeDatum>;

  export function forceManyBody<NodeDatum extends object>(): ManyBody<NodeDatum>;

  export function forceLink<NodeDatum extends object, LinkDatum extends object>(
    links?: LinkDatum[]
  ): Link<NodeDatum, LinkDatum>;

  export function forceCenter<NodeDatum extends object>(
    x?: number,
    y?: number,
    z?: number
  ): Center<NodeDatum>;

  export function forceCollide<NodeDatum extends object>(
    radius?: number | ((d: NodeDatum) => number)
  ): Collide<NodeDatum>;

  export interface Simulation<NodeDatum extends object> {
    nodes(): NodeDatum[];
    nodes(nodes: NodeDatum[]): this;

    alpha(): number;
    alpha(alpha: number): this;

    alphaMin(): number;
    alphaMin(min: number): this;

    alphaDecay(): number;
    alphaDecay(decay: number): this;

    alphaTarget(): number;
    alphaTarget(target: number): this;

    velocityDecay(): number;
    velocityDecay(decay: number): this;

    force(name: string): Force<NodeDatum> | null;
    force(name: string, force: Force<NodeDatum> | null): this;

    find(x: number, y: number, z?: number, radius?: number): NodeDatum | undefined;

    on(typenames: string, listener: (this: any, ...args: any[]) => void): this;

    tick(iterations?: number): this;

    restart(): this;

    stop(): this;
  }

  export interface Force<NodeDatum extends object> {
    (alpha: number): void;
    initialize?(nodes: NodeDatum[]): void;
  }

  export interface Center<NodeDatum extends object> extends Force<NodeDatum> {
    x(): number;
    x(x: number): this;

    y(): number;
    y(y: number): this;

    z(): number;
    z(z: number): this;
  }

  export interface Collide<NodeDatum extends object> extends Force<NodeDatum> {
    radius(): ((d: NodeDatum) => number) | number;
    radius(radius: ((d: NodeDatum) => number) | number): this;

    strength(): number;
    strength(strength: number): this;

    iterations(): number;
    iterations(iterations: number): this;
  }

  export interface ManyBody<NodeDatum extends object> extends Force<NodeDatum> {
    strength(): ((d: NodeDatum) => number) | number;
    strength(strength: ((d: NodeDatum) => number) | number): this;

    theta(): number;
    theta(theta: number): this;

    distanceMin(): number;
    distanceMin(distance: number): this;

    distanceMax(): number;
    distanceMax(distance: number): this;
  }

  export interface Link<NodeDatum extends object, LinkDatum extends object>
    extends Force<NodeDatum> {
    links(): LinkDatum[];
    links(links: LinkDatum[]): this;

    id(): (d: NodeDatum) => any;
    id(id: (d: NodeDatum) => any): this;

    distance(): ((l: LinkDatum) => number) | number;
    distance(distance: ((l: LinkDatum) => number) | number): this;

    strength(): ((l: LinkDatum) => number) | number;
    strength(strength: ((l: LinkDatum) => number) | number): this;

    iterations(): number;
    iterations(iterations: number): this;
  }
}
