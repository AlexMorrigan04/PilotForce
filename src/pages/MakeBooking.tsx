import React, { useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AWS from 'aws-sdk';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';

const MakeBooking: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [jobName, setJobName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [assetName, setAssetName] = useState<string>('');
  const [flightDate, setFlightDate] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingType, setBookingType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [assetsLoading, setAssetsLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Explicitly define AWS credentials and region
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  // Directly use the environment variables
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setFormError('You must be logged in to make a booking');
      return;
    }
    
    if (!jobName.trim()) {
      setFormError('Please enter a job name');
      return;
    }
    
    if (!flightDate) {
      setFormError('Please select a flight date');
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      // Generate a unique BookingId
      const bookingId = `booking_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Create the booking object with the new structure, ensuring CompanyId is included
      const newBooking = {
        CompanyId: user.companyId, // Make sure this is set and not undefined
        BookingId: bookingId,
        assetId: selectedAsset?.AssetId || '',
        assetName: assetName,
        createdAt: new Date().toISOString(),
        flightDate: flightDate,
        jobType: bookingType || 'Standard',
        location: location,
        status: 'scheduled',
        userName: user.username || 'Unknown User'
      };
      
      
      // Save to DynamoDB
      const params = {
        TableName: 'Bookings',
        Item: newBooking
      };
      
      await dynamoDb.put(params).promise();
      setSuccess(true);
      
      // Reset form
      setJobName('');
      setCompanyName('');
      setAssetName('');
      setFlightDate('');
      setLocation('');
      setNotes('');
      
      // Redirect to bookings page after a delay
      setTimeout(() => {
        navigate('/my-bookings');
      }, 2000);
    } catch (error: any) {
      setFormError(`Failed to create booking: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAssets = useCallback(async () => {
    if (!user) return;
    
    setAssetsLoading(true);
    
    const params = {
      TableName: 'Assets',
      KeyConditionExpression: 'CompanyId = :companyId',
      ExpressionAttributeValues: {
        ':companyId': user.companyId
      }
    };
    
    try {
      const result = await dynamoDb.query(params).promise();
      setAssets(result.Items || []);
    } catch (error) {
      setFormError('Failed to load assets');
    } finally {
      setAssetsLoading(false);
    }
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Make a Booking</h1>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
            <p className="font-bold">Success!</p>
            <p>Your booking has been created. Redirecting to bookings page...</p>
          </div>
        ) : (
          <>
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-4">
                <label htmlFor="jobName" className="block text-sm font-medium text-gray-700">
                  Job Name
                </label>
                <input
                  type="text"
                  id="jobName"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="assetName" className="block text-sm font-medium text-gray-700">
                  Asset Name
                </label>
                <input
                  type="text"
                  id="assetName"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="flightDate" className="block text-sm font-medium text-gray-700">
                  Flight Date
                </label>
                <input
                  type="date"
                  id="flightDate"
                  value={flightDate}
                  onChange={(e) => setFlightDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="bookingType" className="block text-sm font-medium text-gray-700">
                  Job Type
                </label>
                <select
                  id="bookingType"
                  value={bookingType}
                  onChange={(e) => setBookingType(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select a job type</option>
                  <option value="Measured Survey/3D Model">Measured Survey/3D Model</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Thermal">Thermal</option>
                  <option value="Media">Media</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  rows={4}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/my-bookings')}
                  className="mr-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Booking'}
                </button>
              </div>
            </form>

            {selectedAsset && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Asset Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedAsset.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Type</h3>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedAsset.type}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Area</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedAsset.area} m²</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Postcode</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedAsset.postcode || "Not specified"}</p>
                  </div>
                </div>
                {/* Map will be rendered here */}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default MakeBooking;