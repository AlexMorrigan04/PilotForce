import React, { useEffect, useState } from 'react';
import { useMap } from '../context/MapContext';
import { useAuth } from '../context/AuthContext';
import { getAssetsForCompany } from '../utils/companyData';

const Assets: React.FC = () => {
  const { map, selectedAsset, setSelectedAsset } = useMap();
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!user || !user.companyId) {
        console.log("User not authenticated or missing companyId");
        return;
      }

      try {
        const companyId = user.companyId;
        const assetsData = await getAssetsForCompany(companyId);
        setAssets(assetsData);
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [user]);

  useEffect(() => {
    if (selectedAsset) {
      console.log('Selected asset changed:', selectedAsset);
    } else {
      console.log('Selected asset changed: undefined');
    }

    if (map && selectedAsset) {
      try {
        // Ensure map and selectedAsset are defined before accessing properties
        if (map.loaded()) {
          if (map.indoor && selectedAsset.indoor) {
            map.indoor.setIndoor(selectedAsset.indoor);
          }
        } else {
          map.once('load', () => {
            if (map.indoor && selectedAsset.indoor) {
              map.indoor.setIndoor(selectedAsset.indoor);
            }
          });
        }
      } catch (error) {
        console.error('Map not initialized, cannot update selected asset', error);
        // Reload the page if the error occurs
        if (!sessionStorage.getItem('reloaded')) {
          sessionStorage.setItem('reloaded', 'true');
          window.location.reload();
        }
      }
    }
  }, [map, selectedAsset]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Assets</h1>
      <ul>
        {assets.map(asset => (
          <li key={asset.id} onClick={() => setSelectedAsset(asset)}>
            {asset.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Assets;
