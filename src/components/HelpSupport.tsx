import React from "react";

const HelpSupport: React.FC = () => {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Help & Support</h2>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold">Documentation</h3>
        <p className="text-gray-700">Find the documentation and FAQs here.</p>
        <h3 className="text-lg font-semibold mt-4">Contact Support</h3>
        <p className="text-gray-700">Reach out to customer support for help.</p>
        {/* Add more help & support options as needed */}
      </div>
    </section>
  );
};

export default HelpSupport;
