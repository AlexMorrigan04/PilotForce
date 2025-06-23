import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiMoon, FiSun, FiPhone, FiBriefcase, FiAlertCircle } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import SignupApprovalModal from '../components/SignupApprovalModal';
import EmailExistsModal from '../components/EmailExistsModal';

const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

const Signup: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-white" />
  );
};

export default Signup;
