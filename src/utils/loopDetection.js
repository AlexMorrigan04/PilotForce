// Loop detection and prevention script
(function() {
  const MAX_RENDERS = 10;
  const TIME_WINDOW = 3000; // 3 seconds
  let renderCount = 0;
  let firstRenderTime = Date.now();
  
  // This function will be called whenever a potential re-render happens
  window.checkRenderLoop = function() {
    const now = Date.now();
    
    // Reset counter if we're outside the time window
    if (now - firstRenderTime > TIME_WINDOW) {
      renderCount = 1;
      firstRenderTime = now;
      return false;
    }
    
    renderCount++;
    
    // If we exceed the maximum renders in the time window, we might be in a loop
    if (renderCount > MAX_RENDERS) {
      return true;
    }
    
    return false;
  };
})();
