import React from 'react';

const Debug = () => {
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      right: 0, 
      background: 'white', 
      padding: '10px', 
      zIndex: 1000, 
      maxWidth: '400px',
      border: '1px solid black'
    }}>
      <h4>Environment Debug:</h4>
      <p>MAPBOX_TOKEN: {process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ? "Defined" : "Undefined"}</p>
      <p>NODE_ENV: {process.env.NODE_ENV}</p>
    </div>
  );
};

export default Debug;
