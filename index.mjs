// Just route to the direct files
exports.handler = async (event, context) => {
    const path = event.resource || '';
    
    if (path.includes('assets/{id}') || (event.pathParameters && event.pathParameters.id)) {
        // This is a request to get asset details
        const assetDetailsHandler = require('./pilotforce_get_asset_details.mjs');
        return assetDetailsHandler.handler(event, context);
    } else {
        // Default to the get assets handler
        const getAssetsHandler = require('./pilotforce-get-assets.mjs');
        return getAssetsHandler.handler(event, context);
    }
};
