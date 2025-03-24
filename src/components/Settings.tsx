import React from "react";

const Settings: React.FC = () => {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold">API Keys</h3>
        <p className="text-gray-700">Manage your API keys here.</p>
        {/* Add more settings options as needed */}
      </div>
    </section>
  );
};

export default Settings;
