import React from "react";
import ImageManagement from "../components/ImageManagement";
import UserManagement from "../components/UserManagement";
import Settings from "../components/Settings";
import HelpSupport from "../components/HelpSupport";

const AdminDashboard: React.FC = () => {
  return (
    <>
      <ImageManagement />
      <UserManagement />
      <Settings />
      <HelpSupport />
    </>
  );
};

export default AdminDashboard;
