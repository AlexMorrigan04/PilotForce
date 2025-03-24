import React, { useState, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { GoogleMap, useLoadScript, Marker, Autocomplete } from "@react-google-maps/api";

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];
const mapContainerStyle = {
  width: "100%",
  height: "100%",
};
const center = {
  lat: 51.454514, // default latitude
  lng: -2.587910, // default longitude
};

const steps = ["Location", "Inspection", "Schedule", "Extras", "Review"];

const Booking: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [jobDetails, setJobDetails] = useState({
    asset: "",
    location: "",
    jobName: "",
    inspectionType: "",
    schedule: "",
    extras: [],
  });
  const [selectedLocation, setSelectedLocation] = useState(center);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "", // Use your API key here
    libraries,
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setJobDetails({ ...jobDetails, [name]: value });
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const location = place.geometry.location;
        if (location) {
          const lat = location.lat();
          const lng = location.lng();
          setSelectedLocation({ lat, lng });
          setJobDetails({ ...jobDetails, location: place.formatted_address || "" });
        }
      }
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">Location</h2>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="asset">
                Select Asset
              </label>
              <select
                id="asset"
                name="asset"
                value={jobDetails.asset}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">Select an asset</option>
                <option value="asset1">Asset 1</option>
                <option value="asset2">Asset 2</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
                Job Location
              </label>
              {isLoaded && (
                <Autocomplete
                  onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                  onPlaceChanged={handlePlaceChanged}
                >
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={jobDetails.location}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Enter job location"
                  />
                </Autocomplete>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="jobName">
                Job Name
              </label>
              <input
                id="jobName"
                name="jobName"
                type="text"
                value={jobDetails.jobName}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter job name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="map">
                Job Location Map
              </label>
              <div id="map" className="w-full h-80 bg-gray-200 rounded p-0 m-0">
                {loadError ? (
                  <div>Error loading maps</div>
                ) : !isLoaded ? (
                  <div>Loading maps</div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    zoom={10}
                    center={selectedLocation}
                  >
                    <Marker position={selectedLocation} />
                  </GoogleMap>
                )}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">Inspection</h2>
            {/* Add inspection options here */}
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">Schedule</h2>
            {/* Add schedule options here */}
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">Extras</h2>
            {/* Add extras options here */}
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">Review</h2>
            {/* Add review details here */}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white"> {/* Changed background color to white */}
      <Navbar />
      <div className="flex justify-center items-center w-full p-4 mx-auto mt-6">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full ${
                  currentStep >= index ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-20 h-1 ${currentStep > index ? "bg-blue-600" : "bg-gray-300"} mx-5 rounded-full`}></div>
              )}
            </div>
          ))}
        </div>
      </div>
      <main className="flex flex-grow p-6">
        <div className="w-2/3 bg-white p-8 rounded-lg shadow-md">
          {renderStepContent(currentStep)}
        </div>
        <div className="w-1/3 p-8 rounded-lg ml-6">
          <h2 className="text-xl font-bold mb-4">Inspection Cart</h2>
          <p>Total Price: $0.00</p>
          {/* Add cart details here */}
          <div className="flex justify-between mt-4">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="bg-gray-500 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="bg-blue-500 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Continue to {steps[currentStep + 1] || "Finish"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Booking;

