/**
 * ChunkReassembler utility for PilotForce
 * 
 * This module handles reassembling chunked files into a single file,
 * particularly useful for large files like GeoTIFFs.
 */

class ChunkReassembler {
  /**
   * Identify resources that are chunks of larger files
   * @param resources Array of resources to check
   * @returns Map of base resource IDs to arrays of chunks
   */
  static identifyChunkedResources(resources: any[]): Map<string, any[]> {
    if (!resources || !Array.isArray(resources)) {
      return new Map();
    }
    
    // Create a map to group chunks by their base resource ID
    const chunkedResourcesMap = new Map<string, any[]>();
    
    // Find all resources that appear to be chunks
    const chunkPattern = /(_part\d+_|_part\d+$)/;
    const chunkResources = resources.filter(resource => {
      const name = resource.FileName || resource.name || '';
      const id = resource.ResourceId || resource.resourceId || '';
      return chunkPattern.test(name) || chunkPattern.test(id);
    });
    
    // Group chunks by their base resource ID
    for (const chunk of chunkResources) {
      const resourceId = chunk.ResourceId || chunk.resourceId || '';
      const fileName = chunk.FileName || chunk.name || '';
      
      // Extract the base resource ID (everything before _part)
      let baseResourceId = '';
      
      if (resourceId && resourceId.includes('_part')) {
        baseResourceId = resourceId.split('_part')[0];
      } else if (fileName && fileName.includes('_part')) {
        baseResourceId = fileName.split('_part')[0];
      }
      
      if (baseResourceId) {
        // Add this chunk to the map
        if (!chunkedResourcesMap.has(baseResourceId)) {
          chunkedResourcesMap.set(baseResourceId, []);
        }
        chunkedResourcesMap.get(baseResourceId)?.push(chunk);
      }
    }
    
    // Sort chunks within each group by part number
    for (const [baseResourceId, chunks] of chunkedResourcesMap.entries()) {
      chunks.sort((a, b) => {
        // Extract part number
        const aId = a.ResourceId || a.resourceId || '';
        const bId = b.ResourceId || b.resourceId || '';
        const aName = a.FileName || a.name || '';
        const bName = b.FileName || b.name || '';
        
        // Try to extract part number from ID or name
        const aPartMatch = aId.match(/_part(\d+)/) || aName.match(/_part(\d+)/);
        const bPartMatch = bId.match(/_part(\d+)/) || bName.match(/_part(\d+)/);
        
        const aPart = aPartMatch ? parseInt(aPartMatch[1], 10) : 0;
        const bPart = bPartMatch ? parseInt(bPartMatch[1], 10) : 0;
        
        return aPart - bPart;
      });
    }
    
    // Filter out any groups with only one chunk (not actually chunked)
    for (const [baseResourceId, chunks] of chunkedResourcesMap.entries()) {
      if (chunks.length <= 1) {
        chunkedResourcesMap.delete(baseResourceId);
      }
    }
    
    return chunkedResourcesMap;
  }

  /**
   * Reassemble chunks into a single blob
   * @param chunks Array of chunk resources
   * @returns Object containing the reassembled blob, filename, and content type
   */
  static async reassembleChunks(chunks: any[]): Promise<{ 
    blob: Blob, 
    fileName: string, 
    contentType: string 
  }> {
    if (!chunks || chunks.length === 0) {
      throw new Error('No chunks provided for reassembly');
    }
    
    try {
      // Fetch each chunk's data
      const chunkPromises = chunks.map(async (chunk) => {
        const url = chunk.url || chunk.ResourceUrl || chunk.resourceUrl || chunk.s3Url;
        if (!url) {
          throw new Error(`No URL found for chunk: ${chunk.ResourceId || 'unknown'}`);
        }
        
        // Fetch the chunk data
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch chunk ${chunk.ResourceId || 'unknown'}: ${response.status} ${response.statusText}`);
        }
        
        return await response.blob();
      });
      
      // Wait for all chunks to be fetched
      const chunkBlobs = await Promise.all(chunkPromises);
      
      // Determine the content type from the first chunk
      const firstChunk = chunks[0];
      const contentType = firstChunk.ContentType || firstChunk.contentType || 'application/octet-stream';
      
      // Determine the filename by removing the part suffix
      let fileName = firstChunk.FileName || firstChunk.name || 'reassembled_file';
      fileName = fileName.replace(/_part\d+/, '');
      
      // Reassemble the chunks
      const reassembledBlob = new Blob(chunkBlobs, { type: contentType });
      
      return { blob: reassembledBlob, fileName, contentType };
    } catch (error) {
      console.error('Error reassembling chunks:', error);
      throw error;
    }
  }

  /**
   * Create a local URL for a blob
   * @param blob Blob to create URL for
   * @returns Local URL
   */
  static createLocalUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Revoke a local URL to free up memory
   * @param url URL to revoke
   */
  static revokeLocalUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export default ChunkReassembler;
