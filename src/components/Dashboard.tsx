"use client";
import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Navbar } from "./Navbar";
import { motion } from "framer-motion";
import { getBookings } from "../utils/bookingUtils";
import { Booking } from "../types/bookingTypes";

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const cardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 70,
        damping: 14,
      },
    },
    hover: {
      scale: 1.03,
      boxShadow: "0 10px 15px rgba(0, 0, 0, 0.07)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
  };

  useEffect(() => {
    const fetchRecentBookings = async () => {
      if (!user || !user.companyId) return;

      try {
        setLoading(true);
        const bookings = await getBookings(user.companyId);

        const sorted = [...bookings]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 3);

        setRecentBookings(sorted);
        setError(null);
      } catch (error) {
        console.error("Error fetching recent bookings:", error);
        setError("Failed to load recent bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentBookings();
  }, [user]);

  useEffect(() => {
    const loadUserAndCompanyInfo = async () => {
      if (!user) return;

      try {
        setUserProfile({
          name: user.username || user.name || "User",
          email: user.email || "No email provided",
          role: user.role || user["custom:userRole"] || "User",
          id: user.id || user.sub || "Unknown",
          joinDate: new Date().toLocaleDateString(),
        });

        let companyId = user.companyId || user["custom:companyId"];

        if (!companyId) {
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              companyId = parsedUser.companyId || parsedUser["custom:companyId"];
            } catch (e) {
              console.error("Error parsing saved user data", e);
            }
          }
        }

        setCompanyDetails({
          name: user.companyName || "Your Company",
          id: companyId || "Unknown",
          plan: "Professional",
          assets: recentBookings.length > 0 ? Math.floor(Math.random() * 10) + 1 : 0,
          status: "Active",
        });
      } catch (error) {
        console.error("Error loading user or company information:", error);
      }
    };

    loadUserAndCompanyInfo();
  }, [user, recentBookings.length]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />

      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-700 py-12 px-4 sm:px-6 lg:px-8 text-white"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
              Welcome to PilotForce
            </h1>
            <p className="max-w-xl mx-auto text-lg text-blue-100">
              Your complete drone operations platform for managing assets,
              bookings, and flights
            </p>
          </motion.div>

          <motion.div
            className="mt-10 flex justify-center gap-5 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/make-booking")}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Book a Flight
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/assets")}
              className="inline-flex items-center px-6 py-3 border border-white text-base font-medium rounded-md shadow-sm text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              View Assets
            </motion.button>
          </motion.div>
        </div>
      </motion.section>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h3 className="text-lg font-semibold">Company Information</h3>
            </div>
            <div className="p-6">
              {companyDetails ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {companyDetails.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Account ID: {companyDetails.id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-medium">
                        Subscription
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-1">
                        {companyDetails.plan}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-medium">
                        Status
                      </p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                        {companyDetails.status}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-medium">
                        Assets
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-1">
                        {companyDetails.assets}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-medium">
                        Flights
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-1">
                        {recentBookings.length || 0}
                      </p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md text-sm transition-colors"
                  >
                    Manage Company
                  </motion.button>
                </div>
              ) : (
                <div className="py-6 flex justify-center">
                  <motion.div
                    className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <h3 className="text-lg font-semibold">Your Profile</h3>
            </div>
            <div className="p-6">
              {userProfile ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-4 text-2xl font-bold text-purple-600">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-lg">
                        {userProfile.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {userProfile.email}
                      </p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                        {userProfile.role}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-sm font-medium text-gray-700">
                        Recent Activity
                      </h5>
                      <span className="text-xs text-gray-500">Last 7 days</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      {recentBookings.length > 0 ? (
                        <div>
                          <p className="text-gray-600">
                            <span className="font-medium">
                              {recentBookings.length}
                            </span>{" "}
                            flight bookings
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium">
                              {
                                recentBookings.filter(
                                  (b) => b.status === "completed"
                                ).length
                              }
                            </span>{" "}
                            completed flights
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-600">No recent activity</p>
                      )}

                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              recentBookings.length * 20
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium py-2 px-4 rounded-md text-sm transition-colors"
                      onClick={() => navigate("/profile")}
                    >
                      View Profile
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md text-sm transition-colors"
                      onClick={() => navigate("/settings")}
                    >
                      Settings
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="py-6 flex justify-center">
                  <motion.div
                    className="w-8 h-8 border-2 border-gray-200 border-t-purple-600 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-12"
        >
          <motion.h2
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 mb-6"
          >
            Quick Actions
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-400 transition-colors duration-200"
              onClick={() => navigate("/make-booking")}
            >
              <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Book a Flight
              </h3>
              <p className="text-gray-600 text-sm">
                Schedule a new drone operation
              </p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-green-400 transition-colors duration-200"
              onClick={() => navigate("/my-bookings")}
            >
              <div className="bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                View My Flights
              </h3>
              <p className="text-gray-600 text-sm">
                Check status of your bookings
              </p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-purple-400 transition-colors duration-200"
              onClick={() => navigate("/assets")}
            >
              <div className="bg-purple-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Manage Assets
              </h3>
              <p className="text-gray-600 text-sm">
                View and manage your properties
              </p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-orange-400 transition-colors duration-200"
              onClick={() => navigate("/new-asset")}
            >
              <div className="bg-orange-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Add New Asset
              </h3>
              <p className="text-gray-600 text-sm">Register a new property</p>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-12"
        >
          <motion.div
            variants={itemVariants}
            className="flex justify-between items-center mb-6"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              Recent Flights
            </h2>
            <Link
              to="/my-bookings"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </Link>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-12">
              <motion.div
                className="w-12 h-12 rounded-full border-4 border-gray-200"
                style={{ borderTopColor: "#3B82F6" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : error ? (
            <motion.div
              variants={itemVariants}
              className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600"
            >
              {error}
            </motion.div>
          ) : recentBookings.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-200">
                {recentBookings.map((booking, index) => (
                  <motion.div
                    key={booking.BookingId || booking.id || index}
                    variants={itemVariants}
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      navigate(
                        `/flight-details/${booking.BookingId || booking.id}`
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {booking.assetName || "Unnamed Asset"}
                        </h3>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <svg
                            className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {new Date(
                            booking.flightDate || booking.createdAt
                          ).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : booking.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {booking.status.charAt(0).toUpperCase() +
                          booking.status.slice(1)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-xl border border-gray-200 p-12 text-center"
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2V6a2 2 0 002-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No recent flights
              </h3>
              <p className="mt-2 text-gray-500">
                Get started by creating your first booking
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/make-booking")}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="mr-2 -ml-1 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Book a Flight
              </motion.button>
            </motion.div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Platform Stats
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <motion.div
              whileHover={{
                y: -5,
                boxShadow:
                  "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Flights</p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="text-3xl font-bold mt-1"
                  >
                    {recentBookings.length || 0}
                  </motion.p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <svg
                  className="h-5 w-5 mr-1 text-blue-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                <p className="text-blue-100">View recent activity</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{
                y: -5,
                boxShadow:
                  "0 10px 25px -5px rgba(16, 185, 129, 0.1), 0 10px 10px -5px rgba(16, 185, 129, 0.04)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Completed Flights</p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.1, duration: 0.5 }}
                    className="text-3xl font-bold mt-1"
                  >
                    {recentBookings.filter((b) => b.status === "completed")
                      .length || 0}
                  </motion.p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <svg
                  className="h-5 w-5 mr-1 text-green-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <p className="text-green-100">View flight data</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{
                y: -5,
                boxShadow:
                  "0 10px 25px -5px rgba(124, 58, 237, 0.1), 0 10px 10px -5px rgba(124, 58, 237, 0.04)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Upcoming Flights</p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="text-3xl font-bold mt-1"
                  >
                    {recentBookings.filter((b) => b.status === "scheduled")
                      .length || 0}
                  </motion.p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <svg
                  className="h-5 w-5 mr-1 text-purple-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-purple-100">View schedule</p>
              </div>
            </motion.div>
          </div>
        </motion.section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 px-4 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-gray-900">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-900">
                Terms of Service
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-900">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;

