// import React, { useEffect, useState } from 'react';
// import { Booking, BookingImage } from '../../types/bookingTypes';
// import { fetchBookingImages } from '../../services/bookingService';
// import { BookingImageGallery } from './BookingImageGallery';
// import AWS from 'aws-sdk';
// import { ImageMap } from './ImageMap';
// import { GeoTiffUploader } from './GeoTiffUploader'; // Import GeoTiffUploader

// interface BookingDetailsModalProps {
//   booking: Booking;
//   onClose: () => void;
//   images: { url: string; key: string }[];
//   imageLocations: { url: string; latitude: number; longitude: number }[];
//   mapboxAccessToken: string;
//   geoTiffUrl?: string | null;
// }

// export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ booking, onClose, images, imageLocations, mapboxAccessToken }) => {
//   const [activeTab, setActiveTab] = useState<'details' | 'images' | 'imageMap'>('details');
//   const [bookingImages, setBookingImages] = useState<BookingImage[]>([]);
//   const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
//   const [imageError, setImageError] = useState<string | null>(null);
//   const [imageGeolocations, setImageGeolocations] = useState<{ url: string; latitude: number; longitude: number }[]>([]);
//   const [geoTiffFilename, setGeoTiffFilename] = useState<string | null>(null);
//   const [geoTiffUrl, setGeoTiffUrl] = useState<string | null>(null);

//   // AWS configuration
//   const awsRegion = process.env.REACT_APP_AWS_REGION;
//   const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
//   const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

//   AWS.config.update({
//     accessKeyId: accessKey,
//     secretAccessKey: secretKey,
//     region: awsRegion
//   });

//   const dynamoDb = new AWS.DynamoDB.DocumentClient({ 
//     region: awsRegion,
//     accessKeyId: accessKey,
//     secretAccessKey: secretKey
//   });

//   // Close modal on escape key
//   useEffect(() => {
//     const handleEsc = (e: KeyboardEvent) => {
//       if (e.key === 'Escape') onClose();
//     };
    
//     window.addEventListener('keydown', handleEsc);
//     return () => window.removeEventListener('keydown', handleEsc);
//   }, [onClose]);
  
//   // Prevent scroll when modal is open
//   useEffect(() => {
//     document.body.style.overflow = 'hidden';
//     return () => {
//       document.body.style.overflow = 'unset';
//     };
//   }, []);

//   // Fetch images when the modal opens or when switching to the images tab
//   useEffect(() => {
//     if ((activeTab === 'images' || activeTab === 'imageMap') && bookingImages.length === 0 && !imageError) {
//       const loadImages = async () => {
//         setIsLoadingImages(true);
//         try {
//           const images = await fetchBookingImages(booking.id);
//           setBookingImages(images);
//         } catch (error) {
//           console.error('Failed to load booking images:', error);
//           setImageError('Failed to load images. Please try again later.');
//         } finally {
//           setIsLoadingImages(false);
//         }
//       };
//       loadImages();
//     }
//   }, [activeTab, booking.id, bookingImages.length, imageError]);

//   // Only fetch geolocation data when the imageMap tab is active
//   useEffect(() => {
//     if (activeTab === 'imageMap' && images.length > 0) {
//       console.log('Image Map tab is active, fetching geolocation data');
//       const fetchGeolocations = async () => {
//         const geolocations = await Promise.all(
//           images.map(async (image) => {
//             const params = {
//               TableName: 'ImageUploads',
//               Key: {
//                 's3Key': image.key
//               }
//             };
//             try {
//               const data = await dynamoDb.get(params).promise();
//               if (data.Item && data.Item.geolocation) {
//                 const geolocation = {
//                   url: image.url,
//                   latitude: parseFloat(data.Item.geolocation.latitude.N),
//                   longitude: parseFloat(data.Item.geolocation.longitude.N),
//                 };
//                 console.log(`Geolocation for ${image.url}: Latitude ${geolocation.latitude}, Longitude ${geolocation.longitude}`);
//                 return geolocation;
//               }
//             } catch (error) {
//               console.error('Error fetching geolocation data:', error);
//             }
//             return null;
//           })
//         );
//         setImageGeolocations(geolocations.filter(Boolean) as { url: string; latitude: number; longitude: number }[]);
//       };
//       fetchGeolocations();
//     }
//   }, [activeTab, images]);

//   // Only fetch GeoTIFF data when the imageMap tab is active
//   useEffect(() => {
//     if (activeTab === 'imageMap') {
//       console.log('Image Map tab is active, fetching GeoTIFF data');
//       const fetchGeoTiffData = async () => {
//         // Query the GeoTiffUploads table to find entries for this booking
//         const params = {
//           TableName: 'GeoTiffUploads',
//           FilterExpression: 'BookingId = :bookingId',
//           ExpressionAttributeValues: {
//             ':bookingId': booking.id
//           }
//         };

//         try {
//           const data = await dynamoDb.scan(params).promise();
//           if (data.Items && data.Items.length > 0) {
//             const geoTiff = data.Items[0];
//             setGeoTiffFilename(geoTiff.filename);
//             console.log('GeoTIFF file details found:', geoTiff);
            
//             // Check if the GeoTIFF entry has a direct S3 URL we can use
//             if (geoTiff.s3Url) {
//               console.log('Found direct S3 URL for GeoTIFF:', geoTiff.s3Url);
//               setGeoTiffUrl(geoTiff.s3Url);
//             }
            
//             // Check if the entry has an S3 key we can use
//             if (geoTiff.s3Key) {
//               console.log('Found S3 key for GeoTIFF:', geoTiff.s3Key);
//               // We'll let the ImageMap component handle generating a signed URL
//             }
//           } else {
//             console.log('No GeoTIFF files found in DynamoDB for booking:', booking.id);
//           }
//         } catch (error) {
//           console.error('Error fetching GeoTIFF data:', error);
//         }
//       };
//       fetchGeoTiffData();
//     }
//   }, [activeTab, booking.id]);

//   const formatServiceType = (type: string): string => {
//     return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
//   };

//   const formatPropertyType = (type: string): string => {
//     return type.charAt(0).toUpperCase() + type.slice(1);
//   };

//   const formatPropertySize = (size: string): string => {
//     const sizeMap: Record<string, string> = {
//       small: 'Small (< 1 acre)',
//       medium: 'Medium (1-5 acres)',
//       large: 'Large (5-20 acres)',
//       xlarge: 'Extra Large (> 20 acres)',
//     };
//     return sizeMap[size] || size;
//   };

//   const formatDateTime = (date?: string): string => {
//     if (!date) return 'Date not specified';
//     return new Date(date).toLocaleString('en-US', {
//       weekday: 'long',
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const getStatusColor = (status: string): string => {
//     switch (status) {
//       case 'scheduled':
//         return 'bg-yellow-100 text-yellow-800';
//       case 'in-progress':
//         return 'bg-blue-100 text-blue-800';
//       case 'completed':
//         return 'bg-green-100 text-green-800';
//       case 'cancelled':
//         return 'bg-red-100 text-red-800';
//       default:
//         return 'bg-gray-100 text-gray-800';
//     }
//   };

//   const getStatusText = (status: string): string => {
//     switch (status) {
//       case 'scheduled':
//         return 'Scheduled';
//       case 'in-progress':
//         return 'In Progress';
//       case 'completed':
//         return 'Completed';
//       case 'cancelled':
//         return 'Cancelled';
//       default:
//         return status;
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto">
//       <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
//         {/* Background overlay */}
//         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
//         {/* Modal panel */}
//         <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
//           {/* Header with tabs and close button */}
//           <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 sm:px-6 flex justify-between items-center">
//             <div className="flex space-x-4">
//               <button
//                 onClick={() => setActiveTab('details')}
//                 className={`py-2 px-1 font-medium text-sm ${
//                   activeTab === 'details'
//                     ? 'text-blue-600 border-b-2 border-blue-600'
//                     : 'text-gray-500 hover:text-gray-700'
//                 }`}
//               >
//                 Details
//               </button>
//               <button
//                 onClick={() => setActiveTab('images')}
//                 className={`py-2 px-1 font-medium text-sm relative ${
//                   activeTab === 'images'
//                     ? 'text-blue-600 border-b-2 border-blue-600'
//                     : 'text-gray-500 hover:text-gray-700'
//                 }`}
//               >
//                 Images
//                 {bookingImages.length > 0 && (
//                   <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full px-1.5">
//                     {bookingImages.length}
//                   </span>
//                 )}
//               </button>
//               <button
//                 onClick={() => setActiveTab('imageMap')}
//                 className={`py-2 px-1 font-medium text-sm ${
//                   activeTab === 'imageMap'
//                     ? 'text-blue-600 border-b-2 border-blue-600'
//                     : 'text-gray-500 hover:text-gray-700'
//                 }`}
//               >
//                 Image Map
//               </button>
//             </div>
//             <button
//               onClick={onClose}
//               className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//             >
//               <span className="sr-only">Close</span>
//               <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           </div>
          
//           {/* Booking image (only show in details tab) */}
//           {activeTab === 'details' && (
//             <div className="relative h-56">
//               <img
//                 src={'https://via.placeholder.com/600x300?text=Property+Inspection'}
//                 alt={`Property at ${booking.address}`}
//                 className="w-full h-full object-cover"
//               />
//             </div>
//           )}
          
//           {/* Tab content */}
//           <div className="px-4 py-5 sm:px-6">
//             {/* Show status badge in both tabs */}
//             <div className="mb-4">
//               <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
//                 {getStatusText(booking.status)}
//               </span>
//             </div>
//             <h2 className="text-xl font-semibold text-gray-900 mb-2">{booking.address}</h2>
//             {activeTab === 'details' && (
//               <>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Service Type</p>
//                     <p className="text-sm text-gray-900">{formatServiceType(booking.serviceType)}</p>
//                   </div>
                  
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Date & Time</p>
//                     <p className="text-sm text-gray-900">{formatDateTime(booking.dateTime)}</p>
//                   </div>
                  
//                   <div>
//                     <p className="text-sm font-medium text-gray-500">Property Type</p>
//                     <p className="text-sm text-gray-900">{formatPropertyType(booking.propertyType)}</p>
//                   </div>
//                 </div>
                
//                 {booking.contactPerson && (
//                   <div className="border-t border-gray-200 pt-4 mt-4">
//                     <p className="text-sm font-medium text-gray-500">Contact Information</p>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
//                       <div>
//                         <p className="text-xs text-gray-500">Contact Person</p>
//                         <p className="text-sm text-gray-900">{booking.contactPerson}</p>
//                       </div>
                      
//                       <div>
//                         <p className="text-xs text-gray-500">Phone</p>
//                         <p className="text-sm text-gray-900">{booking.contactPhone}</p>
//                       </div>
                      
//                       <div className="sm:col-span-2">
//                         <p className="text-xs text-gray-500">Email</p>
//                         <p className="text-sm text-gray-900">{booking.contactEmail}</p>
//                       </div>
//                     </div>
//                   </div>
//                 )}
                
//                 {/* Action buttons */}
//                 <div className="mt-6 flex space-x-3">
//                   {booking.status === 'scheduled' && (
//                     <>
//                       <button className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
//                         Reschedule
//                       </button>
//                       <button className="flex-1 bg-red-50 py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
//                         Cancel
//                       </button>
//                     </>
//                   )}
                  
//                   {booking.status === 'completed' && (
//                     <button className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
//                       View Report
//                     </button>
//                   )}
                  
//                   {booking.status === 'in-progress' && (
//                     <button className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
//                       Track Progress
//                     </button>
//                   )}
                  
//                   <button 
//                     onClick={onClose}
//                     className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </>
//             )}
            
//             {activeTab === 'images' && (
//               <div className="py-2">
//                 {imageError ? (
//                   <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
//                     <strong className="font-bold">Error: </strong>
//                     <span className="block sm:inline">{imageError}</span>
//                     <button 
//                       onClick={() => setImageError(null)}
//                       className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded text-sm"
//                     >
//                       Try Again
//                     </button>
//                   </div>
//                 ) : (
//                   <BookingImageGallery 
//                     images={bookingImages} 
//                     isLoading={isLoadingImages} 
//                   />
//                 )}
                
//                 <div className="mt-6 text-right">
//                   <button 
//                     onClick={onClose}
//                     className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </div>
//             )}

//             {activeTab === 'imageMap' && (
//               <div>
//                 <h3 className="text-lg font-semibold mb-2">Image Map</h3>
//                 <ImageMap 
//                   imageLocations={imageGeolocations} 
//                   bookingId={booking.id}
//                   mapboxAccessToken={mapboxAccessToken}
//                   geoTiffFilename={geoTiffFilename} // Pass filename to ImageMap
//                   geoTiffUrl={geoTiffUrl} // Pass geoTiffUrl to ImageMap
//                 />
                
//                 {/* No image locations message (if needed) */}
//                 {imageGeolocations.length === 0 && (
//                   <div className="bg-yellow-50 p-4 rounded-md mt-4">
//                     <div className="flex">
//                       <div className="flex-shrink-0">
//                         <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
//                           <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
//                         </svg>
//                       </div>
//                       <div className="ml-3">
//                         <p className="text-sm text-yellow-700">
//                           {geoTiffFilename ? 
//                             "GeoTIFF file found but no image location data is available." : 
//                             "No image location data or GeoTIFF is available for this booking."}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

export {}