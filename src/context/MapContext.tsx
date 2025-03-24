import React, { createContext, useContext, useState } from 'react';

interface MapContextProps {
  map: any;
  selectedAsset: any;
  setSelectedAsset: (asset: any) => void;
}

const MapContext = createContext<MapContextProps>({
  map: null,
  selectedAsset: null,
  setSelectedAsset: () => {}
});

interface MapProviderProps {
  children: React.ReactNode;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [map, setMap] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  return (
    <MapContext.Provider value={{ map, selectedAsset, setSelectedAsset }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => useContext(MapContext);
