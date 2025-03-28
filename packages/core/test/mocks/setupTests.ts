// Mock for THREE.js and WebGL context
class MockWebGLRenderer {
  domElement = document.createElement('canvas');
  setSize = jest.fn();
  setPixelRatio = jest.fn();
  render = jest.fn();
  dispose = jest.fn();
  setClearColor = jest.fn();
  compile = jest.fn();
}

// Mock for THREE
jest.mock('three', () => {
  const originalModule = jest.requireActual('three');

  return {
    ...originalModule,
    WebGLRenderer: MockWebGLRenderer,
    // Add other mocks as needed
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      traverse: jest.fn(),
      children: [],
      background: null,
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      lookAt: jest.fn(),
      updateProjectionMatrix: jest.fn(),
    })),
    Texture: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
      needsUpdate: false,
    })),
    Material: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    BufferGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
      setAttribute: jest.fn(),
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0 },
    })),
    Group: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      children: [],
    })),
    Color: jest.fn().mockImplementation(() => ({
      multiplyScalar: jest.fn().mockReturnThis(),
    })),
  };
});

// Mock for react-force-graph-3d
jest.mock('react-force-graph-3d', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(props => {
      return null; // Mock component
    }),
  };
});

// Mock canvas for tests
global.HTMLCanvasElement.prototype.getContext = function (contextId: string, options?: any): any {
  if (contextId === '2d') {
    return {
      drawImage: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      fillStyle: '',
      canvas: document.createElement('canvas'),
      beginPath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
    } as unknown as CanvasRenderingContext2D;
  }
  if (contextId === 'bitmaprenderer') {
    return {
      transferFromImageBitmap: jest.fn(),
    } as unknown as ImageBitmapRenderingContext;
  }
  return null;
};

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn(callback => {
  return Number(setTimeout(() => callback(Date.now()), 0));
});

global.cancelAnimationFrame = jest.fn(id => {
  clearTimeout(id);
});

// Mock Performance.now()
global.performance.now = jest.fn(() => Date.now());
