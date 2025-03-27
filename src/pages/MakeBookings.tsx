import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import Map, { Source, Layer, NavigationControl, MapRef } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import AWS from 'aws-sdk';
import { Breadcrumbs, BreadcrumbItem } from '../components/Breadcrumbs';

// Define job types for each asset type
const jobTypesByAssetType = {
  buildings: [
    'Measured Survey/3D Model',
    'Visual Inspection',
    'Thermal/Infrared Survey',
    'Media Pack'
  ],
  area: [
    'Site Map',
    'Visual Inspection',
    '3D Model',
    'Thermal/Infrared Survey',
    'Media Pack'
  ],
  construction: [
    'Inspection/Flyover',
    'Live Site Visit',
    'Site Map',
    'Site 3D Model',
    'Documentation',
    'Security Patrol',
    'Media Pack'
  ]
};

// Define asset type
type AssetType = keyof typeof jobTypesByAssetType;

// Asset type details with icons and colors
const assetTypeDetails = {
  buildings: {
    title: 'Building',
    icon: 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z',
    color: '#3182ce',
    strokeColor: '#2c5282',
    description: 'Rooftop inspection and surveying services'
  },
  construction: {
    title: 'Construction Site',
    icon: 'M13.7 19C13.9 19.3 14 19.6 14 20C14 21.1 13.1 22 12 22C10.9 22 10 21.1 10 20C10 19.6 10.1 19.3 10.3 19H2V21H14V23H2C1.5 23 1 22.5 1 22V3C1 2.5 1.5 2 2 2H22C22.5 2 23 2.5 23 3V15C23 15.5 22.5 16 22 16H13.7ZM16 10.4L21 5.4V3H3V17H11.2C11.6 16.4 12.3 16 13 16C13.7 16 14.4 16.4 14.8 17H21V16C21 11.8 16.5 10.9 16 10.4ZM4 5H20V7H4V5ZM4 9H20V11H4V9ZM4 13H14V15H4V13Z',
    color: '#dd6b20',
    strokeColor: '#9c4221',
    description: 'Aerial mapping, orthophotos and progress monitoring services'
  },
  area: {
    title: 'Area/Estate',
    icon: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z',
    color: '#38a169',
    strokeColor: '#276749',
    description: 'High-resolution orthomasaics and detailed 3D models of defined areas'
  },
  security: {
    title: 'Security & Surveillance',
    icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    color: '#805ad5',
    strokeColor: '#553c9a',
    description: 'Security and surveillance services'
  },
  infrastructure: {
    title: 'Infrastructure',
    icon: 'M17.66 5.84C17.43 5.31 16.95 5 16.4 5H7.6c-.55 0-1.03.31-1.26.84l-3.23 8.94C2.97 15.33 3.34 16 4 16h16c.67 0 1.03-.67.9-1.22l-3.24-8.94zM12 13.5 7 9h10l-5 4.5zM3 18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-1H3v1z',
    color: '#e53e3e',
    strokeColor: '#c53030',
    description: 'Inspection and condition surveys for infrastructure'
  }
};

// Get asset type info
const getAssetTypeInfo = (type: string) => {
  return assetTypeDetails[type as keyof typeof assetTypeDetails] || {
    title: 'Unknown Type',
    icon: '',
    color: '#718096',
    strokeColor: '#4a5568',
    description: 'No description available'
  };
};

// Format date to readable string
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return 'Unknown date';
  }
};

// Add proper type checking for service details

// First define a proper type for service details to fix the type error
type ServiceOptionChoice = {
  [key: string]: string;
};

type ServiceOption = {
  label: string;
  type: 'singleSelect' | 'multiSelect';
  choices: string[];
  info: string | ServiceOptionChoice;
};

type ServiceOptions = {
  [key: string]: ServiceOption;
};

// Define the different service detail types
type ServiceWithOptions = {
  description: string;
  options: ServiceOptions;
};

type ServiceWithIncluded = {
  description: string;
  included: string[];
};

// Union type to allow for different service detail structures
type ServiceDetail = ServiceWithOptions | ServiceWithIncluded;

// Update the serviceDetails object with proper type annotation
const serviceDetails: Record<string, ServiceDetail> = {
  "Measured Survey/3D Model": {
    description: "Photogrammetry data capture and processing to produce point cloud and mesh model.",
    options: {
      coverage: {
        label: "Options",
        type: "multiSelect",
        choices: ["Roofs", "Elevations"],
        info: "Select areas to be included in the 3D model"
      },
      detail: {
        label: "Level of Detail",
        type: "singleSelect",
        choices: ["Low", "Medium", "High"],
        info: {
          "Low": "Suitable for general volume calculations and basic visualization",
          "Medium": "Higher resolution suitable for most architectural and planning purposes",
          "High": "Highest resolution with fine detail suitable for detailed inspection and analysis"
        }
      }
    }
  },
  "Visual Inspection": {
    description: "Imagery (RGB) captured systematically of a specified area and provided as an image catalogue oriented to a map.",
    options: {
      coverage: {
        label: "Options",
        type: "multiSelect",
        choices: ["Roofs", "Elevations"],
        info: "Select areas to be included in the visual inspection"
      },
      detail: {
        label: "Level of Detail",
        type: "singleSelect",
        choices: ["Overview", "Condition Survey", "Detailed Inspection"],
        info: {
          "Overview": "General view of conditions suitable for preliminary assessment",
          "Condition Survey": "Systematic capture of all visible surfaces with moderate detail",
          "Detailed Inspection": "Comprehensive high-resolution imagery suitable for detailed condition assessment"
        }
      }
    }
  },
  "Thermal/Infrared Survey": {
    description: "Infrared images captured systematically under suitable environmental conditions. Images are radiometric so can be 'tuned' for analysis by a thermographer. Images provided as an image catalogue oriented to a map. Does not include analysis or report writing.",
    options: {
      purpose: {
        label: "Options",
        type: "multiSelect",
        choices: ["Heat/Energy Loss", "Hidden Defects"],
        info: "Select the primary purpose of the thermal imaging survey"
      }
    }
  },
  "Media Pack": {
    description: "Images (RGB >12MP) and Video (RGB >1080p) for promotional and marketing purposes, provided as a file repository.",
    included: [
      "Set of still images from N,E,S,W perspectives",
      "Birds eye view from high altitude",
      "'Point of Interest' video orbit at 45° angle",
      "2× video traverses N-S,E-W at 45° angle"
    ]
  },
  // New descriptions for Area/Estate services
  "Site Map": {
    description: "Nadir imagery to produce 2D orthomosaic with a Ground Sampling Distance (GSD) of 2cm as standard.",
    options: {
      resolution: {
        label: "Resolution",
        type: "singleSelect",
        choices: ["Standard (2cm GSD)", "High (1cm GSD)", "Ultra-high (0.5cm GSD)"],
        info: {
          "Standard (2cm GSD)": "Suitable for general site planning and assessment",
          "High (1cm GSD)": "Higher detail suitable for precise measurements and small feature identification",
          "Ultra-high (0.5cm GSD)": "Maximum detail for critical applications requiring millimeter precision"
        }
      }
    }
  },
  "3D Model": {
    description: "Oblique imagery to produce photorealistic and point cloud 3D model.",
    options: {
      detail: {
        label: "Level of Detail",
        type: "singleSelect",
        choices: ["Low", "Medium", "High"],
        info: {
          "Low": "Suitable for general volume calculations and basic visualization",
          "Medium": "Higher resolution suitable for most planning and visualization purposes",
          "High": "Highest resolution with fine detail suitable for detailed inspection and analysis"
        }
      }
    }
  },
  // New descriptions for Construction Site services
  "Inspection/Flyover": {
    description: "Ad hoc site flyover or inspection of specific area of site.",
    options: {
      focus: {
        label: "Focus Areas",
        type: "multiSelect",
        choices: ["Site Overview", "Specific Construction Element", "Access Routes", "Material Storage"],
        info: "Select which areas of the site require inspection"
      }
    }
  },
  "Live Site Visit": {
    description: "View live feed and instruct drone in real time. Link accessible to multiple stakeholders.",
    options: {
      participants: {
        label: "Number of Stakeholders",
        type: "singleSelect",
        choices: ["Up to 5", "6-10", "11+"],
        info: {
          "Up to 5": "Suitable for small teams and focused inspections",
          "6-10": "Ideal for medium-sized project teams",
          "11+": "For large projects with multiple stakeholders and departments"
        }
      }
    }
  },
  "Documentation": {
    description: "Comprehensive documentation of construction site and surroundings.",
    options: {
      coverage: {
        label: "Areas to Document",
        type: "multiSelect",
        choices: ["Site", "Surrounding Environment", "Building Envelope"],
        info: "Select which areas need to be documented"
      }
    }
  },
  "Security Patrol": {
    description: "Perimeter patrol with high resolution infrared sensor to detect intruders. Live feed can be viewed in real time. Patrols can be requested nightly up to a frequency of once per hour.",
    options: {
      frequency: {
        label: "Patrol Frequency",
        type: "singleSelect",
        choices: ["Once nightly", "Twice nightly", "Every 2 hours", "Every hour"],
        info: {
          "Once nightly": "Single patrol during night hours",
          "Twice nightly": "Two patrols scheduled during night hours",
          "Every 2 hours": "Regular patrols every 2 hours throughout the night",
          "Every hour": "Maximum security with hourly patrols throughout the night"
        }
      },
      monitoring: {
        label: "Monitoring Options",
        type: "multiSelect",
        choices: ["Live feed access", "Incident reporting", "Integration with on-site security"],
        info: "Select how you want to monitor the security patrol results"
      }
    }
  }
};

// New type for site contact
type SiteContact = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  isAvailableOnsite: boolean;
};

const MakeBookings: React.FC = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 16
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [scheduleType, setScheduleType] = useState('scheduled');
  const [date, setDate] = useState('');
  const [flexibility, setFlexibility] = useState('exact');
  const [repeatFrequency, setRepeatFrequency] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/mvgkqjvr"; // Replace with your actual Formspree form ID
  
  // Add these missing state variables for service options
  const [selectedOptions, setSelectedOptions] = useState<{[serviceType: string]: {[key: string]: any}}>({});
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState<string | null>(null);
  const [activeServiceConfig, setActiveServiceConfig] = useState<string | null>(null);

  // New state variables for site contact
  const [siteContact, setSiteContact] = useState<SiteContact>({
    name: '',
    phone: '',
    email: '',
    isAvailableOnsite: false
  });
  const [previousContacts, setPreviousContacts] = useState<SiteContact[]>([]);
  const [showContactForm, setShowContactForm] = useState(true);
  const [selectedPreviousContact, setSelectedPreviousContact] = useState<string | null>(null);

  // Explicitly define AWS credentials and region
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  // Directly use the hardcoded credentials
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

  const mapRef = useRef<MapRef | null>(null);
  
  // Update the useEffect for handling the asset from location state
  useEffect(() => {
    // Prevent double initialization when receiving state from AssetDetails
    if (location.state && location.state.selectedAsset && !asset) {
      console.log('Setting asset from location state');
      setAsset(location.state.selectedAsset);
      
      try {
        const center = turf.centroid(turf.polygon(location.state.selectedAsset.coordinates)).geometry.coordinates;
        setViewState({
          longitude: center[0],
          latitude: center[1],
          zoom: 17
        });
      } catch (error) {
        console.warn('Error calculating center of asset:', error);
        // Use default view state if calculation fails
      }
    }
  }, [location.state, asset]);

  // Complete rework of the reload mechanism to be more robust
  useEffect(() => {
    // Only reload if this is first time visiting from AssetDetails
    const needsReload = 
      location.state?.fromAssetDetails && 
      !sessionStorage.getItem('makeBookings_loaded');
    
    if (needsReload) {
      console.log('First load from AssetDetails, marking as loaded');
      sessionStorage.setItem('makeBookings_loaded', 'true');
    }
    
    return () => {
      // Don't clear the flag on unmount as we want it to persist during navigation
    };
  }, [location.state]);

  // Improved map cleanup with proper ref handling
  useEffect(() => {
    return () => {
      console.log('MakeBookings component unmounting, cleaning up map');
      
      try {
        // Properly handle cleanup of the map to avoid the indoor error
        if (mapLoaded) {
          setMapLoaded(false);
          
          // Access the mapbox gl global instance to clean up
          if (mapRef.current) {
            mapRef.current.getMap().remove();
            console.log('Cleaning up global mapbox instance');
          }
        }
      } catch (error) {
        console.warn('Error during map cleanup in MakeBookings:', error);
      }
    };
  }, [mapLoaded]);

  // Fetch company details when component loads
  useEffect(() => {
    if (user && user.companyId) {
      fetchCompanyDetails(user.companyId);
    }
  }, [user]);

  // Fetch user details when component loads
  useEffect(() => {
    if (user && user.username) {
      fetchUserDetails(user.username);
    }
  }, [user]);

  // Fetch previous contacts when component loads
  useEffect(() => {
    if (user && user.companyId) {
      fetchPreviousContacts(user.companyId);
    }
  }, [user]);

  // Function to fetch company details including email domain
  const fetchCompanyDetails = async (companyId: string) => {
    try {
      console.log("Attempting to fetch company details for CompanyId:", companyId);
      
      // Use scan instead of get to find company by companyId
      const params = {
        TableName: 'Companies',
        FilterExpression: 'CompanyId = :companyId',
        ExpressionAttributeValues: {
          ':companyId': companyId
        }
      };
      
      const result = await dynamoDb.scan(params).promise();
      if (result.Items && result.Items.length > 0) {
        setCompanyDetails(result.Items[0]);
        console.log("Company details found:", result.Items[0]);
      } else {
        console.warn("No company found with CompanyId:", companyId);
        // Still create a basic company object with the ID to prevent errors
        setCompanyDetails({ 
          CompanyId: companyId, 
          CompanyName: 'Unknown Company' 
        });
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
      // Create fallback company object
      setCompanyDetails({ 
        CompanyId: companyId, 
        CompanyName: 'Unknown Company' 
      });
    }
  };

  // Function to fetch user details including email domain
  const fetchUserDetails = async (username: string) => {
    try {
      console.log("Attempting to fetch user details for username:", username);
      
      // Use scan with the correct key structure based on the table schema
      const params = {
        TableName: 'Users',
        FilterExpression: 'Username = :username',
        ExpressionAttributeValues: {
          ':username': username
        }
      };
      
      console.log("User query params:", params);
      
      const result = await dynamoDb.scan(params).promise();
      if (result.Items && result.Items.length > 0) {
        const userData = result.Items[0];
        setUserDetails(userData);
        console.log("User details found:", userData);
        
        // Log the specific attributes using the correct case from the schema
        console.log("User email:", userData.Email);
        console.log("User phone:", userData.PhoneNumber || "Not found");
        console.log("User email domain:", userData.EmailDomain || "Not found");
      } else {
        console.warn("No user found with username:", username);
        
        // Try alternative capitalization
        const altParams = {
          TableName: 'Users',
          FilterExpression: 'Username = :username OR username = :username',
          ExpressionAttributeValues: {
            ':username': username
          }
        };
        
        console.log("Trying alternative query:", altParams);
        const altResult = await dynamoDb.scan(altParams).promise();
        
        if (altResult.Items && altResult.Items.length > 0) {
          const userData = altResult.Items[0];
          setUserDetails(userData);
          console.log("User details found with alternative query:", userData);
        } else {
          // Create a fallback user object with the correct attribute names
          setUserDetails({ 
            Username: username, 
            Email: `${username}@example.com`,
            EmailDomain: 'example.com',
            PhoneNumber: '',
            UserRole: 'User',
            CompanyId: user?.companyId || ''
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      // Create fallback user object with correct attribute names
      setUserDetails({ 
        Username: username, 
        Email: `${username}@example.com`,
        EmailDomain: 'example.com',
        PhoneNumber: '',
        UserRole: 'User',
        CompanyId: user?.companyId || ''
      });
    }
  };

  // Function to fetch previous site contacts
  const fetchPreviousContacts = async (companyId: string) => {
    try {
      console.log("Fetching previous site contacts for company:", companyId);
      
      const params = {
        TableName: 'SiteContacts',
        FilterExpression: 'CompanyId = :cid',
        ExpressionAttributeValues: {
          ':cid': companyId
        }
      };
      
      const result = await dynamoDb.scan(params).promise();
      
      if (result.Items && result.Items.length > 0) {
        console.log("Found previous site contacts:", result.Items);
        setPreviousContacts(result.Items as SiteContact[]);
      } else {
        console.log("No previous site contacts found");
        setPreviousContacts([]);
      }
    } catch (error) {
      console.error("Error fetching previous site contacts:", error);
      setPreviousContacts([]);
    }
  };

  const toggleJobType = (type: string) => {
    setSelectedJobTypes(prev => {
      // If already selected, remove it
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      }
      // Otherwise add it
      return [...prev, type];
    });
    
    // Set this type as the active one being configured
    setActiveServiceConfig(type);
    
    // Initialize service info for this type
    const serviceDetail = serviceDetails[type as keyof typeof serviceDetails] || null;
    setServiceInfo(serviceDetail);
    
    // Initialize options for this service type if not already set
    if (serviceDetail && !selectedOptions[type]) {
      const initialOptions: {[key: string]: any} = {};
      
      // Type guard to check if this service has options
      if ('options' in serviceDetail) {
        const serviceOpts = serviceDetail.options;
        
        Object.keys(serviceOpts).forEach(optKey => {
          const opt = serviceOpts[optKey];
          if (opt.type === 'singleSelect' && opt.choices.length > 0) {
            initialOptions[optKey] = opt.choices[0];
          } else if (opt.type === 'multiSelect') {
            initialOptions[optKey] = [];
          }
        });
      }
      
      // Set initial options for this service type
      setSelectedOptions(prev => ({
        ...prev,
        [type]: initialOptions
      }));
    }
  };

  const handleOptionChange = (optionGroup: string, value: string, isMulti: boolean) => {
    if (!activeServiceConfig) return;
    
    if (isMulti) {
      setSelectedOptions(prev => {
        const serviceOptions = prev[activeServiceConfig] || {};
        const currentValues = serviceOptions[optionGroup] || [];
        
        if (currentValues.includes(value)) {
          return {
            ...prev,
            [activeServiceConfig]: {
              ...serviceOptions,
              [optionGroup]: currentValues.filter((v: string) => v !== value)
            }
          };
        } else {
          return {
            ...prev,
            [activeServiceConfig]: {
              ...serviceOptions,
              [optionGroup]: [...currentValues, value]
            }
          };
        }
      });
    } else {
      setSelectedOptions(prev => ({
        ...prev,
        [activeServiceConfig]: {
          ...(prev[activeServiceConfig] || {}),
          [optionGroup]: value
        }
      }));
    }
  };

  // Handle site contact field changes
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox differently
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSiteContact(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setSiteContact(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle selection of a previous contact
  const handleSelectPreviousContact = (contactId: string) => {
    const selected = previousContacts.find(contact => contact.id === contactId);
    if (selected) {
      setSiteContact(selected);
      setSelectedPreviousContact(contactId);
      setShowContactForm(false);
    }
  };
  
  // Clear contact form and show it for a new entry
  const handleNewContact = () => {
    setSiteContact({
      name: '',
      phone: '',
      email: '',
      isAvailableOnsite: false
    });
    setSelectedPreviousContact(null);
    setShowContactForm(true);
  };
  
  // Check if site contact form is valid
  const isContactFormValid = () => {
    return siteContact.name.trim() !== '' && siteContact.phone.trim() !== '';
  };

  // Add notes state variable
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!user) {
      setError('You must be logged in to make a booking');
      setIsSubmitting(false);
      return;
    }

    console.log("Submit booking initiated for user:", user.username);
    console.log("Current user details:", userDetails);
    console.log("Current company details:", companyDetails);

    if (selectedJobTypes.length === 0 || !asset) {
      setError('Please select at least one service type and an asset');
      setIsSubmitting(false);
      return;
    }

    // Validate schedule information based on the selected schedule type
    if ((scheduleType === 'scheduled' || scheduleType === 'flexible') && !date) {
      setError('Please select a date for the service');
      setIsSubmitting(false);
      return;
    }

    if (scheduleType === 'repeat' && (!startDate || !endDate)) {
      setError('Please provide both start and end dates for recurring service');
      setIsSubmitting(false);
      return;
    }

    if (!isContactFormValid()) {
      setError('Please provide a site contact name and phone number');
      setIsSubmitting(false);
      return;
    }

    // Generate a unique BookingId
    const bookingId = `booking_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Log the current user information before creating booking using correct case
    console.log("User email to add to booking:", userDetails?.Email || "Not available");
    console.log("User phone to add to booking:", userDetails?.PhoneNumber || "Not available");
    console.log("Email domain to add to booking:", userDetails?.EmailDomain || "Not available");
    console.log("Asset postcode to add to booking:", asset.postcode || "Not available");

    try {
      // Extract user contact information with correct attribute names
      const userEmail = userDetails?.Email || ''; 
      const userPhone = userDetails?.PhoneNumber || '';
      let emailDomain = userDetails?.EmailDomain || '';
      
      // If the EmailDomain is not available in userDetails, extract from email
      if (!emailDomain && userEmail) {
        const domainPart = userEmail.split('@')[1] || '';
        emailDomain = domainPart;
      }
      
      // Strip the domain to just the organization name (before any domain extension)
      let strippedDomain = '';
      if (emailDomain) {
        // Match only the first part of the domain (before any dot)
        const domainMatch = emailDomain.match(/^([^.]+)/);
        strippedDomain = domainMatch ? domainMatch[1] : '';
      }
      
      console.log("Original email domain:", emailDomain);
      console.log("Stripped email domain:", strippedDomain);
      
      const assetPostcode = asset.postcode || '';
      
      // Save the site contact if it's new or modified
      const contactId = selectedPreviousContact || `contact_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Only save new contacts to the database
      if (!selectedPreviousContact) {
        try {
          // Add to SiteContacts table
          await dynamoDb.put({
            TableName: 'SiteContacts',
            Item: {
              id: contactId,
              CompanyId: user.companyId,
              name: siteContact.name,
              phone: siteContact.phone,
              email: siteContact.email,
              isAvailableOnsite: siteContact.isAvailableOnsite,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }).promise();
          
          console.log("Saved new site contact:", contactId);
        } catch (contactError) {
          console.error("Error saving site contact, but continuing:", contactError);
          // We'll continue with the booking even if contact saving fails
        }
      }
      
      // Prepare scheduling information based on the selected schedule type
      const schedulingInfo = {
        scheduleType,
        // For scheduled and flexible, include the date
        ...(scheduleType === 'scheduled' || scheduleType === 'flexible' ? { date } : {}),
        // For flexible, include flexibility
        ...(scheduleType === 'flexible' ? { flexibility } : {}),
        // For recurring, include start date, end date, and frequency
        ...(scheduleType === 'repeat' ? { 
          startDate, 
          endDate, 
          repeatFrequency 
        } : {})
      };
      
      // Add site contact to booking object
      const newBooking = {
        CompanyId: user.companyId, // Use CompanyId as the partition key
        BookingId: bookingId, // Use BookingId as the sort key
        assetId: asset.AssetId,
        assetName: asset.name,
        createdAt: new Date().toISOString(),
        flightDate: scheduleType === 'scheduled' || scheduleType === 'flexible' ? date : startDate,
        // Change from jobType to jobTypes array
        jobTypes: selectedJobTypes,
        location: `${viewState.latitude}, ${viewState.longitude}`,
        status: 'pending',
        userName: user.username || 'Unknown User',
        
        // Add scheduling information
        scheduling: schedulingInfo,
        
        // Add service options if available - now for multiple services
        serviceOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : null,
        
        // Add the postcode from the asset
        postcode: assetPostcode,
        
        // Add user contact information
        userEmail: userEmail, // Add the email from userDetails
        userPhone: userPhone, // Add the phone number from userDetails
        emailDomain: strippedDomain, // Use the stripped domain name
        
        // Ensure there are some minimal company details
        companyName: companyDetails?.CompanyName || 'Unknown Company',
        
        // Add site contact information to booking
        siteContact: {
          id: contactId,
          name: siteContact.name,
          phone: siteContact.phone,
          email: siteContact.email,
          isAvailableOnsite: siteContact.isAvailableOnsite
        },
        
        // Add notes if provided
        notes: notes.trim() || null
      };

      console.log('Final booking object to be saved:', newBooking);

      // Save to DynamoDB
      const params = {
        TableName: 'Bookings',
        Item: newBooking,
      };

      setError(null);

      // Save to DynamoDB
      await dynamoDb.put(params).promise();
      console.log('Booking submitted successfully to DynamoDB with ID:', bookingId);
      
      // Prepare simplified email data with improved formatting and recipient information
      const emailData = {
        // Add the recipient email for Formspree to direct the notification to
        _replyto: "Mike@morriganconsulting.co.uk",
        
        // Add a subject line for the email notification
        _subject: `New Drone Service Booking: ${asset.name} - ${selectedJobTypes.join(', ')}`,
        
        // Booking information
        bookingId: bookingId,
        jobType: selectedJobTypes.join(', '),
        flightDate: scheduleType === 'scheduled' || scheduleType === 'flexible' ? date : startDate,
        status: 'pending',
        
        // Asset information
        assetName: asset.name,
        assetId: asset.AssetId,
        assetType: asset.type,
        assetLocation: `${viewState.latitude}, ${viewState.longitude}`,
        assetPostcode: assetPostcode || 'Not specified',
        
        // User contact information
        userName: user.username,
        userEmail: userEmail,
        userPhone: userPhone,
        emailDomain: strippedDomain,
        
        // Company information
        companyId: user.companyId,
        companyName: companyDetails?.CompanyName || 'Unknown Company',
        
        // Site contact information
        siteContact: {
          name: siteContact.name,
          phone: siteContact.phone,
          email: siteContact.email || 'Not provided',
          isAvailableOnsite: siteContact.isAvailableOnsite ? 'Yes' : 'No'
        },
        
        // Submission timestamp
        submittedAt: new Date().toISOString(),
        
        // Format schedule information for better email readability
        scheduleDetails: scheduleType === 'scheduled' 
          ? `Specific date: ${new Date(date).toLocaleDateString()}`
          : scheduleType === 'flexible'
            ? `Flexible date: ${new Date(date).toLocaleDateString()} (${flexibility} flexibility)`
            : `Recurring: ${repeatFrequency} from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
        
        // Add notes to email if provided
        notes: notes.trim() ? `Notes: ${notes.trim()}` : 'No additional notes provided'
      };
      
      // Send to Formspree
      console.log('Sending email data to Formspree:', emailData);
      const formspreeResponse = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      
      console.log('Formspree response status:', formspreeResponse.status);
      const responseText = await formspreeResponse.text();
      console.log('Formspree response:', responseText);
      
      if (!formspreeResponse.ok) {
        // If Formspree fails, still continue (the booking is already saved to DynamoDB)
        console.warn('Email notification failed, but booking was saved:', responseText);
      } else {
        console.log('Email notification sent successfully');
      }
      
      // After successful submission
      setBookingSuccess(true);
      
      // Navigate after a short delay to show success state
      setTimeout(() => {
        navigate('/my-bookings');
      }, 2000);
    } catch (err) {
      console.error('Error submitting booking:', err);
      if (err instanceof Error) {
        setError('Failed to submit booking: ' + err.message);
      } else {
        setError('Failed to submit booking');
      }
      setIsSubmitting(false);
    }
  };

  const getJobTypes = () => {
    if (!asset) return [];
    return jobTypesByAssetType[asset.type as AssetType] || [];
  };

  if (bookingSuccess) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="bg-white shadow-lg rounded-lg p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Successful!</h2>
            <p className="text-gray-600 mb-6">Your service has been scheduled successfully. You'll receive a confirmation soon.</p>
            <button 
              onClick={() => navigate('/my-bookings')}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View My Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero section with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 px-4 shadow-md">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center mb-2">
                <button
                  onClick={() => navigate(-1)}
                  className="mr-3 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition duration-150"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold">Book a Drone Service</h1>
              </div>
              {asset && (
                <p className="text-blue-100 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {asset.name} • {getAssetTypeInfo(asset.type).title}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Breadcrumbs component here */}
      <Breadcrumbs 
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Assets', path: '/assets' },
          { 
            label: asset?.name ? `${asset.name}` : 'Asset Details', 
            path: asset ? `/asset/${asset.AssetId}` : '/assets',
            onClick: () => {
              if (asset) {
                navigate(`/asset/${asset.AssetId}`, { state: { asset } });
              }
            }
          },
          { label: 'Book Service', isCurrent: true }
        ]} 
      />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.293-9.707a1 1 0 011.414 0L10 10.586l1.293-1.293a1 1 0 011.414 1.414L11.414 12l1.293 1.293a1 1 0 01-1.414 1.414L10 13.414l-1.293 1.293a1 1 0 01-1.414-1.414L8.586 12 7.293 10.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {!asset ? (
          <div className="bg-white shadow-lg rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Asset Selected</h3>
            <p className="mt-1 text-gray-500 mb-6">Please select an asset first to book a service.</p>
            <button
              onClick={() => navigate('/assets')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Assets
            </button>
          </div>
        ) : (
          <div>
            {/* Improved Progress Steps - Now at the top level */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center mb-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedJobTypes.length > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} mr-2`}>
                  <span className="text-sm font-semibold">1</span>
                </div>
                <div className="h-1 flex-1 bg-gray-200">
                  <div className={`h-full ${selectedJobTypes.length > 0 ? 'bg-green-500' : 'bg-gray-200'} transition-all duration-300`} style={{ width: selectedJobTypes.length > 0 ? '100%' : '0%' }}></div>
                </div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedJobTypes.length > 0 && date ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} mx-2`}>
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div className="h-1 flex-1 bg-gray-200">
                  <div className={`h-full ${date && isContactFormValid() ? 'bg-green-500' : 'bg-gray-200'} transition-all duration-300`} style={{ width: date && isContactFormValid() ? '100%' : '0%' }}></div>
                </div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isSubmitting ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'} ml-2`}>
                  <span className="text-sm font-semibold">3</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>Select Service</span>
                <span>Contact & Schedule</span>
                <span>Confirm</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Asset Info & Service Selection */}
              <div className="lg:col-span-1 space-y-6">
                {/* Asset Details Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-200 flex items-center">
                    <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{
                      backgroundColor: getAssetTypeInfo(asset.type).color,
                      color: 'white'
                    }}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAssetTypeInfo(asset.type).icon} />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h2 className="text-lg font-semibold text-gray-900">Asset Information</h2>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{asset.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getAssetTypeInfo(asset.type).title}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <dt className="text-gray-500 font-medium">Area Size</dt>
                        <dd className="text-gray-900">{asset.area ? asset.area.toLocaleString() : '0'} m²</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 font-medium">Postcode</dt>
                        <dd className="text-gray-900">{asset.postcode || "Not specified"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                
                {/* Map */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Service Location</h2>
                  </div>
                  <div className="h-[280px]">
                    <Map
                      {...viewState}
                      onMove={(evt: any) => setViewState(evt.viewState)}
                      style={{ width: '100%', height: '100%' }}
                      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                      mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
                      onLoad={() => setMapLoaded(true)}
                      reuseMaps={false}
                      ref={mapRef}
                      key={`map-${asset?.AssetId || 'default'}`}
                    >
                      {mapLoaded && asset && asset.coordinates && (
                        <Source
                          id="asset-polygon"
                          type="geojson"
                          data={{
                            type: 'Feature',
                            properties: {},
                            geometry: {
                              type: 'Polygon',
                              coordinates: asset.coordinates,
                            },
                          }}
                        >
                          <Layer
                            id="asset-polygon-fill"
                            type="fill"
                            paint={{
                              'fill-color': getAssetTypeInfo(asset.type).color,
                              'fill-opacity': 0.4,
                            }}
                          />
                          <Layer
                            id="asset-polygon-outline"
                            type="line"
                            paint={{
                              'line-color': getAssetTypeInfo(asset.type).strokeColor,
                              'line-width': 2,
                            }}
                          />
                        </Source>
                      )}
                      {/* <NavigationControl position="top-right" /> */}
                    </Map>
                  </div>
                </div>
                
                {/* Booking Summary - Shows dynamically as user completes form */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-4">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-white">Booking Summary</h2>
                  </div>
                  <div className="p-5">
                    {!selectedJobTypes.length && !date && !siteContact.name && (
                      <div className="text-center py-6">
                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">Your booking details will appear here as you complete the form.</p>
                      </div>
                    )}
                    
                    {selectedJobTypes.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Selected Services</p>
                        
                        {/* Display multiple selected services */}
                        {selectedJobTypes.map((jobType, index) => (
                          <div key={index} className="flex items-center mt-2 first:mt-0">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{jobType}</p>
                              <p className="text-xs text-gray-500">For {getAssetTypeInfo(asset.type).title}</p>
                            </div>
                          </div>
                        ))}
                        
                        {/* Show selected options for each service */}
                        {Object.entries(selectedOptions).map(([serviceType, options]) => {
                          // Only show if this service is selected
                          if (!selectedJobTypes.includes(serviceType)) return null;
                          
                          return (
                            <div key={serviceType} className="ml-11 mt-2 border-l-2 border-blue-100 pl-3">
                              <p className="text-xs font-medium text-gray-700">{serviceType} options:</p>
                              
                              {Object.entries(options).map(([optKey, optValue]) => {
                                // Get service info to display proper labels
                                const serviceDetail = serviceDetails[serviceType as keyof typeof serviceDetails];
                                if (!serviceDetail || !('options' in serviceDetail)) return null;
                                
                                const option = serviceDetail.options[optKey];
                                if (!option) return null;
                                
                                // Display option values
                                if (Array.isArray(optValue) && optValue.length > 0) {
                                  return (
                                    <div key={optKey} className="mt-1 text-xs text-gray-600">
                                      <span className="font-medium">{option.label}:</span> {optValue.join(', ')}
                                    </div>
                                  );
                                } else if (typeof optValue === 'string') {
                                  return (
                                    <div key={optKey} className="mt-1 text-xs text-gray-600">
                                      <span className="font-medium">{option.label}:</span> {optValue}
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {(date || startDate) && (
                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Schedule</p>
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            {scheduleType === 'scheduled' && date && (
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(date).toLocaleDateString('en-GB', { 
                                  weekday: 'long',
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            )}
                            
                            {scheduleType === 'flexible' && date && (
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(date).toLocaleDateString('en-GB', { 
                                    weekday: 'long',
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </p>
                                <p className="text-xs text-gray-500">With {flexibility} flexibility</p>
                              </div>
                            )}
                            
                            {scheduleType === 'repeat' && startDate && endDate && (
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {repeatFrequency.charAt(0).toUpperCase() + repeatFrequency.slice(1)} service
                                </p>
                                <p className="text-xs text-gray-500">
                                  From {new Date(startDate).toLocaleDateString()} 
                                  to {new Date(endDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {siteContact.name && (
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Site Contact</p>
                        <div className="flex items-start">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{siteContact.name}</p>
                            <p className="text-xs text-gray-600">{siteContact.phone}</p>
                            {siteContact.isAvailableOnsite && (
                              <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Available on-site
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Submit button moved to summary card for better UX */}
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !selectedJobTypes.length || !isContactFormValid() || 
                        (scheduleType === 'scheduled' && !date) || 
                        (scheduleType === 'flexible' && !date) || 
                        (scheduleType === 'repeat' && (!startDate || !endDate))}
                      className={`w-full mt-4 inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        isSubmitting || !selectedJobTypes.length || !isContactFormValid() || 
                        (scheduleType === 'scheduled' && !date) || 
                        (scheduleType === 'flexible' && !date) || 
                        (scheduleType === 'repeat' && (!startDate || !endDate))
                          ? 'bg-blue-300 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        <>Complete Booking</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Middle & Right Column - Booking Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Service Selection - Now with more visual appeal */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Select Services</h2>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Choose the type of drone services you need for this {getAssetTypeInfo(asset.type).title.toLowerCase()}:
                      <span className="text-blue-600 ml-1 font-medium">(Select one or more)</span>
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                      {getJobTypes().map((type, index) => (
                        <div 
                          key={index}
                          onClick={() => toggleJobType(type)}
                          className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200
                            ${selectedJobTypes.includes(type) 
                              ? 'border-blue-500 bg-blue-50 shadow-sm' 
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                        >
                          <input
                            type="checkbox"
                            id={`job-type-${index}`}
                            name="jobType"
                            checked={selectedJobTypes.includes(type)}
                            onChange={() => toggleJobType(type)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="ml-3 flex-1">
                            <label htmlFor={`job-type-${index}`} className="block text-sm font-medium text-gray-700">
                              {type}
                            </label>
                            {serviceDetails[type as keyof typeof serviceDetails]?.description && (
                              <p className="mt-1 text-xs text-gray-500">
                                {serviceDetails[type as keyof typeof serviceDetails].description}
                              </p>
                            )}
                          </div>
                          {selectedJobTypes.includes(type) && (
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Service configuration section */}
                    {selectedJobTypes.length > 0 && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-md font-medium text-gray-900">Configure Service Options</h3>
                          
                          {/* Service selector tabs */}
                          {selectedJobTypes.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                              {selectedJobTypes.map(type => (
                                <button
                                  key={type}
                                  onClick={() => setActiveServiceConfig(type)}
                                  className={`px-3 py-1 text-sm rounded-full transition
                                    ${activeServiceConfig === type 
                                      ? 'bg-blue-100 text-blue-800 font-medium' 
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Show service configuration for active service */}
                        {activeServiceConfig && selectedJobTypes.includes(activeServiceConfig) && (
                          <div className="animate-fadeIn">
                            <div className="mb-3 pb-3 border-b border-gray-100">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                                Configuring: {activeServiceConfig}
                              </span>
                            </div>
                            
                            {/* Render options based on selected service */}
                            {(() => {
                              const serviceDetail = serviceDetails[activeServiceConfig as keyof typeof serviceDetails];
                              
                              if (!serviceDetail) return (
                                <p className="text-sm text-gray-500 italic">No configuration options available for this service.</p>
                              );
                              
                              if ('options' in serviceDetail && serviceDetail.options) {
                                return Object.keys(serviceDetail.options).map((optKey) => {
                                  const option = serviceDetail.options[optKey];
                                  const isMulti = option.type === 'multiSelect';
                                  const currentOptions = selectedOptions[activeServiceConfig] || {};
                                  
                                  return (
                                    <div key={optKey} className="mb-5">
                                      <div className="flex items-center mb-2">
                                        <h4 className="text-sm font-medium text-gray-700">{option.label}</h4>
                                        {option.info && typeof option.info === 'string' && (
                                          <div className="relative ml-2">
                                            <button 
                                              type="button" 
                                              className="text-gray-400 hover:text-gray-500"
                                              onMouseEnter={() => setShowInfoTooltip(optKey)}
                                              onMouseLeave={() => setShowInfoTooltip(null)}
                                            >
                                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                              </svg>
                                            </button>
                                            {showInfoTooltip === optKey && (
                                              <div className="absolute z-10 w-64 px-4 py-2 mt-1 text-sm text-left bg-white rounded-lg shadow-lg border border-gray-200">
                                                {option.info}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                        {option.choices.map((choice: string) => {
                                          const isSelected = isMulti 
                                            ? (currentOptions[optKey] || []).includes(choice)
                                            : currentOptions[optKey] === choice;
                                          
                                          return (
                                            <div 
                                              key={choice}
                                              onClick={() => handleOptionChange(optKey, choice, isMulti)}
                                              className={`px-4 py-3 border rounded-md cursor-pointer transition-all duration-150 
                                                ${isSelected
                                                  ? 'border-blue-500 bg-blue-50'
                                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                            >
                                              <div className="flex items-center">
                                                {isMulti ? (
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleOptionChange(optKey, choice, isMulti)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                  />
                                                ) : (
                                                  <input
                                                    type="radio"
                                                    checked={isSelected}
                                                    onChange={() => handleOptionChange(optKey, choice, isMulti)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                  />
                                                )}
                                                <label className="ml-2 block text-sm font-medium text-gray-700">
                                                  {choice}
                                                </label>
                                              </div>
                                              
                                              {/* Show detail-specific info for single select options */}
                                              {!isMulti && typeof option.info === 'object' && option.info[choice] && isSelected && (
                                                <p className="mt-1 pl-6 text-xs text-gray-500">
                                                  {option.info[choice]}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                });
                              }
                              
                              if ('included' in serviceDetail) {
                                return (
                                  <div className="mt-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">What's Included:</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                      {serviceDetail.included.map((item: string, idx: number) => (
                                        <li key={idx} className="text-sm text-gray-600">{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              }
                              
                              return null;
                            })()}
                          </div>
                        )}
                        
                        {/* Instructions when multiple services are selected */}
                        {selectedJobTypes.length > 1 && !activeServiceConfig && (
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-800">
                              You've selected multiple services. Click on a service tab above to configure its options.
                            </p>
                          </div>
                        )}
                        
                        {/* Message when no service is being configured */}
                        {selectedJobTypes.length > 0 && !activeServiceConfig && (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500">
                              {selectedJobTypes.length === 1 
                                ? "Click on your selected service above to configure its options."
                                : "Select a service from the tabs above to configure its options."}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* New Site Contact Card - More spacious and user-friendly */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Site Contact</h2>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Please provide a site contact who will be available on the day of service:
                    </p>
                    
                    {previousContacts.length > 0 && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select a previous contact:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {previousContacts.map((contact) => (
                            <div 
                              key={contact.id}
                              onClick={() => handleSelectPreviousContact(contact.id || '')}
                              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200
                                ${selectedPreviousContact === contact.id 
                                  ? 'border-purple-500 bg-purple-50 shadow-sm' 
                                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}
                            >
                              <input
                                type="radio"
                                id={`contact-${contact.id}`}
                                name="previousContact"
                                checked={selectedPreviousContact === contact.id}
                                onChange={() => handleSelectPreviousContact(contact.id || '')}
                                className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                              />
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-800">{contact.name}</p>
                                <p className="text-xs text-gray-500">{contact.phone}</p>
                              </div>
                            </div>
                          ))}
                          
                          <div 
                            onClick={handleNewContact}
                            className={`flex items-center p-3 border border-dashed rounded-lg cursor-pointer transition-all duration-200
                              ${showContactForm && !selectedPreviousContact 
                                ? 'border-purple-500 bg-purple-50 shadow-sm' 
                                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}
                          >
                            <div className="flex items-center justify-center h-4 w-4 rounded-full border border-gray-300 text-gray-500">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <p className="ml-3 text-sm text-gray-700">Add a new contact</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Contact Form (shown when adding new contact or initially if no previous contacts) */}
                    {(showContactForm || previousContacts.length === 0) && (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">
                            Contact Name<span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="contact-name"
                            name="name"
                            value={siteContact.name}
                            onChange={handleContactChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="Full name"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700">
                            Phone Number<span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            id="contact-phone"
                            name="phone"
                            value={siteContact.phone}
                            onChange={handleContactChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="Mobile number for day of service"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="contact-email"
                            name="email"
                            value={siteContact.email}
                            onChange={handleContactChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="Email (optional)"
                          />
                        </div>
                        
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="available-onsite"
                            name="isAvailableOnsite"
                            checked={siteContact.isAvailableOnsite}
                            onChange={handleContactChange}
                            className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <label htmlFor="available-onsite" className="ml-2 block text-sm text-gray-700">
                            This contact will be available on-site during the drone service
                          </label>
                        </div>
                      </div>
                    )}
                    
                    {/* Show selected contact details when a previous contact is selected */}
                    {selectedPreviousContact && !showContactForm && (
                      <div className="mt-4 bg-purple-50 rounded-lg p-4 border border-purple-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">Selected Contact</h4>
                            <p className="text-sm text-gray-700 mt-1">{siteContact.name}</p>
                            <p className="text-sm text-gray-700">{siteContact.phone}</p>
                            {siteContact.email && <p className="text-sm text-gray-700">{siteContact.email}</p>}
                            
                            {siteContact.isAvailableOnsite && (
                              <p className="text-xs text-green-600 mt-2 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Will be available on-site
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleNewContact}
                            className="text-purple-600 hover:text-purple-800 text-sm"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Additional Notes Section - Now with better design */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Additional Notes</h2>
                  </div>
                  <div className="p-6">
                    <label htmlFor="booking-notes" className="block text-sm text-gray-700 mb-2">
                      Provide any additional information that might be helpful for this service:
                    </label>
                    <textarea
                      id="booking-notes"
                      name="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter any special requirements, access instructions, or other details..."
                      maxLength={500}
                    ></textarea>
                    <p className="mt-2 text-xs text-gray-500 flex justify-between">
                      <span>Optional - Add any special requirements or access information</span>
                      <span className={notes.length > 400 ? "text-orange-500" : ""}>{notes.length}/500</span>
                    </p>
                  </div>
                </div>
                
                {/* Scheduling Options - Enhanced with better UI */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Schedule Service</h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div 
                          onClick={() => setScheduleType('scheduled')}
                          className={`p-4 border rounded-lg cursor-pointer transition ${
                            scheduleType === 'scheduled' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center mb-2">
                            <input
                              type="radio"
                              id="scheduled"
                              name="scheduleType"
                              checked={scheduleType === 'scheduled'}
                              onChange={() => setScheduleType('scheduled')}
                              className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <label htmlFor="scheduled" className="ml-2 block text-sm font-medium text-gray-700">
                              Specific Date
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 ml-6">Choose an exact date for the drone service</p>
                        </div>
                        
                        <div 
                          onClick={() => setScheduleType('flexible')}
                          className={`p-4 border rounded-lg cursor-pointer transition ${
                            scheduleType === 'flexible' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center mb-2">
                            <input
                              type="radio"
                              id="flexible"
                              name="scheduleType"
                              checked={scheduleType === 'flexible'}
                              onChange={() => setScheduleType('flexible')}
                              className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <label htmlFor="flexible" className="ml-2 block text-sm font-medium text-gray-700">
                              Flexible Date
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 ml-6">Prefer a date but allow flexibility</p>
                        </div>
                        
                        <div 
                          onClick={() => setScheduleType('repeat')}
                          className={`p-4 border rounded-lg cursor-pointer transition ${
                            scheduleType === 'repeat' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center mb-2">
                            <input
                              type="radio"
                              id="repeat"
                              name="scheduleType"
                              checked={scheduleType === 'repeat'}
                              onChange={() => setScheduleType('repeat')}
                              className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <label htmlFor="repeat" className="ml-2 block text-sm font-medium text-gray-700">
                              Recurring
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 ml-6">Schedule repeated services over time</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 bg-gray-50 p-5 rounded-lg border border-gray-200">
                        {scheduleType === 'scheduled' && (
                          <>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                              Select a specific date for the service:
                            </label>
                            <input
                              type="date"
                              id="date"
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            />
                          </>
                        )}
                        
                        {scheduleType === 'flexible' && (
                          <>
                            <p className="text-sm text-gray-600 mb-3">
                              Select a preferred date with flexibility:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label htmlFor="flexible-date" className="block text-sm font-medium text-gray-700 mb-1">
                                  Preferred Date
                                </label>
                                <input
                                  type="date"
                                  id="flexible-date"
                                  value={date}
                                  min={new Date().toISOString().split('T')[0]}
                                  onChange={(e) => setDate(e.target.value)}
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                />
                              </div>
                              <div>
                                <label htmlFor="flexibility" className="block text-sm font-medium text-gray-700 mb-1">
                                  Flexibility
                                </label>
                                <select
                                  id="flexibility"
                                  value={flexibility}
                                  onChange={(e) => setFlexibility(e.target.value)}
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                >
                                  <option value="exact">Exact Date</option>
                                  <option value="1-day">±1 Day</option>
                                  <option value="3-days">±3 Days</option>
                                  <option value="1-week">±1 Week</option>
                                </select>
                              </div>
                            </div>
                          </>
                        )}
                        
                        {scheduleType === 'repeat' && (
                          <>
                            <p className="text-sm text-gray-600 mb-3">
                              Schedule a recurring service:
                            </p>
                            <div className="grid grid-cols-1 gap-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date
                                  </label>
                                  <input
                                    type="date"
                                    id="start-date"
                                    value={startDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                  />
                                </div>
                                <div>
                                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date
                                  </label>
                                  <input
                                    type="date"
                                    id="end-date"
                                    value={endDate}
                                    min={startDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label htmlFor="repeat-frequency" className="block text-sm font-medium text-gray-700 mb-1">
                                  Repeat Frequency
                                </label>
                                <select
                                  id="repeat-frequency"
                                  value={repeatFrequency}
                                  onChange={(e) => setRepeatFrequency(e.target.value)}
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                >
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="bi-weekly">Bi-Weekly</option>
                                  <option value="monthly">Monthly</option>
                                  <option value="quarterly">Quarterly</option>
                                </select>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

export default MakeBookings;