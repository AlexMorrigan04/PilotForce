// Provide a browser-compatible fallback for the 'canvas' package
const createCanvas = (width, height) => {
  if (typeof window !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  
  // Return a minimal mock for SSR or environments without canvas
  return {
    width,
    height,
    getContext: () => ({
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
      fillRect: () => {},
      fillText: () => {},
      measureText: () => ({ width: 0 }),
      // Add more mock methods as needed
    }),
    toDataURL: () => '',
    toBlob: (callback) => callback(null),
  };
};

// Export Canvas API compatible methods
module.exports = {
  createCanvas,
  loadImage: async (src) => {
    // Client-side only
    if (typeof window !== 'undefined') {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }
    // SSR mock
    return { width: 0, height: 0 };
  },
  // Add more Canvas API methods as needed
};
