const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    // Set up CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    };
    
    // Handle OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }
    
    try {
        // Extract authentication token
        const authHeader = event.headers['Authorization'] || event.headers['authorization'];
        if (!authHeader) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Authorization token required' })
            };
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        // Get user info from token
        const userParams = {
            AccessToken: token
        };
        
        const userInfo = await cognito.getUser(userParams).promise();
        
        // Extract attributes
        const userAttributes = {};
        userInfo.UserAttributes.forEach(attr => {
            userAttributes[attr.Name] = attr.Value;
        });
        
        const userId = userAttributes.sub;
        const companyId = userAttributes['custom:companyId'];
        
        // Parse the booking data from the request body
        const bookingData = JSON.parse(event.body);
        
        // Validate required fields
        if (!bookingData.assetName || !bookingData.jobType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing required booking information' })
            };
        }
        
        // Create a new booking record
        const bookingId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const booking = {
            BookingId: bookingId,
            UserId: userId,
            CompanyId: companyId,
            AssetId: bookingData.assetId || null,
            AssetName: bookingData.assetName,
            JobType: bookingData.jobType,
            JobDescription: bookingData.jobDescription || '',
            Location: bookingData.location || '',
            FlightDate: bookingData.flightDate || null,
            Status: 'Pending',
            CreatedAt: timestamp,
            UpdatedAt: timestamp,
            CreatedBy: userId,
            Notes: bookingData.notes || ''
        };
        
        // Save to DynamoDB
        const params = {
            TableName: 'Bookings',
            Item: booking
        };
        
        await dynamoDB.put(params).promise();
        
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Booking created successfully',
                booking: booking
            })
        };
    } catch (error) {
        console.error('Error creating booking:', error);
        
        let statusCode = 500;
        let message = 'Internal server error';
        
        if (error.code === 'NotAuthorizedException') {
            statusCode = 401;
            message = 'Invalid or expired token';
        }
        
        return {
            statusCode,
            headers,
            body: JSON.stringify({ 
                message, 
                error: error.message
            })
        };
    }
};