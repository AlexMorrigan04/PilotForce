import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { Asset } from '../types/assetTypes';
import * as turf from '@turf/turf';

// AWS Configuration - reusing the same config from bookingService
const awsRegion = process.env.REACT_APP_AWS_REGION;
const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

// Configure AWS SDK
AWS.config.update({
  accessKeyId: accessKey,
  secretAccessKey: secretKey,
  region: awsRegion
});

const dynamoDb = new AWS.DynamoDB.DocumentClient({
  region: awsRegion,
  accessKeyId: accessKey,
  secretAccessKey: secretKey
});

// Mock storage for development/fallback
let mockAssets: Asset[] = [];
let nextId = 1;

// Helper function to calculate area of a polygon
export const calculatePolygonArea = (coordinates: number[][][]): number => {
  try {
    const polygon = turf.polygon(coordinates);
    const area = turf.area(polygon);
    return Math.round(area * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating area:', error);
    return 0;
  }
};

// Fetch assets for a specific user
export const fetchUserAssets = async (userId: string): Promise<Asset[]> => {
  try {
    console.log(`Fetching assets for user ${userId} from DynamoDB...`);
    const params = {
      TableName: 'Assets',
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    const data = await dynamoDb.query(params).promise();
    
    // Process the results
    const assets: Asset[] = [];
    
    if (data && data.Items && Array.isArray(data.Items)) {
      data.Items.forEach(item => {
        try {
          assets.push({
            id: item.AssetId || item.id || '',
            userId: item.UserId || item.userId || '',
            name: item.Name || item.name || '',
            description: item.Description || item.description || '',
            assetType: item.AssetType || item.assetType || '',
            address: item.Address || item.address || '',
            coordinates: item.Coordinates || item.coordinates || {
              type: 'Feature',
              geometry: { 
                type: 'Polygon', 
                coordinates: [] 
              },
              properties: {}
            },
            area: item.Area || item.area || 0,
            createdAt: item.CreatedAt || item.createdAt || new Date().toISOString(),
            updatedAt: item.UpdatedAt || item.updatedAt,
            tags: item.Tags || item.tags || []
          });
        } catch (itemError) {
          console.error('Error transforming asset item:', itemError, item);
        }
      });
    }
    
    return assets;
  } catch (error) {
    console.error('Error fetching user assets from DynamoDB:', error);
    // Fallback to mock data if DynamoDB fails
    return getAssets(userId);
  }
};

// Create a new asset
export const createAsset = async (asset: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset> => {
  const now = new Date().toISOString();
  const newAsset: Asset = {
    ...asset,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now
  };

  try {
    const params = {
      TableName: 'Assets',
      Item: {
        AssetId: newAsset.id,
        UserId: newAsset.userId,
        Name: newAsset.name,
        Description: newAsset.description || '',
        AssetType: newAsset.assetType,
        Address: newAsset.address,
        Coordinates: newAsset.coordinates,
        Area: newAsset.area || 0,
        CreatedAt: newAsset.createdAt,
        UpdatedAt: newAsset.updatedAt,
        Tags: newAsset.tags || []
      }
    };

    await dynamoDb.put(params).promise();
    return newAsset;
  } catch (error) {
    console.error('Error creating asset in DynamoDB:', error);
    
    // Fall back to mock implementation if DynamoDB fails
    return addAsset({
      ...asset,
      id: '',
      createdAt: now
    } as Asset);
  }
};

// Update an existing asset in DynamoDB
export const updateAssetInDb = async (asset: Asset): Promise<Asset> => {
  try {
    const updatedAsset = {
      ...asset,
      updatedAt: new Date().toISOString()
    };

    const params = {
      TableName: 'Assets',
      Key: {
        AssetId: asset.id,
        UserId: asset.userId
      },
      UpdateExpression: 'set #name = :name, Description = :description, AssetType = :assetType, ' +
        'Address = :address, Coordinates = :coordinates, Area = :area, UpdatedAt = :updatedAt, Tags = :tags',
      ExpressionAttributeNames: {
        '#name': 'Name' // 'Name' is a reserved keyword in DynamoDB
      },
      ExpressionAttributeValues: {
        ':name': updatedAsset.name,
        ':description': updatedAsset.description || '',
        ':assetType': updatedAsset.assetType,
        ':address': updatedAsset.address || '',
        ':coordinates': updatedAsset.coordinates || null,
        ':area': updatedAsset.area || 0,
        ':updatedAt': updatedAsset.updatedAt,
        ':tags': updatedAsset.tags || []
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDb.update(params).promise();
    return updatedAsset;
  } catch (error) {
    console.error('Error updating asset in DynamoDB:', error);
    
    // Fall back to mock implementation
    return updateAsset(asset.id, asset);
  }
};

// Delete an asset from DynamoDB
export const deleteAssetFromDb = async (assetId: string, userId: string): Promise<void> => {
  try {
    const params = {
      TableName: 'Assets',
      Key: {
        AssetId: assetId,
        UserId: userId
      }
    };

    await dynamoDb.delete(params).promise();
  } catch (error) {
    console.error('Error deleting asset from DynamoDB:', error);
    // Fall back to mock delete
    await deleteAsset(assetId, userId);
  }
};

// === Mock API functions (for development/fallback) === 

// Add an asset (legacy/mock interface)
export const addAsset = async (asset: Asset): Promise<Asset> => {
  const now = new Date().toISOString();
  const newAsset: Asset = {
    ...asset,
    id: asset.id || `asset-${nextId++}`,
    createdAt: now,
    updatedAt: now
  };
  mockAssets.push(newAsset);
  return newAsset;
};

// Get all assets (mock)
export const getAssets = async (userId?: string): Promise<Asset[]> => {
  if (userId) {
    return mockAssets.filter(asset => asset.userId === userId);
  }
  return mockAssets;
};

// Get a single asset by ID (mock)
export const getAssetById = async (id: string): Promise<Asset | null> => {
  const asset = mockAssets.find(a => a.id === id);
  return asset || null;
};

// Update an asset (mock)
export const updateAsset = async (id: string, updates: Partial<Asset>): Promise<Asset> => {
  const index = mockAssets.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error(`Asset with ID ${id} not found`);
  }

  const updatedAsset = {
    ...mockAssets[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  mockAssets[index] = updatedAsset;
  return updatedAsset;
};

// Delete an asset (mock)
export const deleteAsset = async (id: string, userId: string): Promise<boolean> => {
  const initialLength = mockAssets.length;
  mockAssets = mockAssets.filter(a => a.id !== id);
  return mockAssets.length !== initialLength;
};
