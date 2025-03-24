import React, { useState } from "react";

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState([
    { name: "John Doe", email: "john@example.com", role: "User" },
    { name: "Jane Smith", email: "jane@example.com", role: "Admin" },
  ]);

  const handleAddUser = () => {
    // Implement add user logic here
  };

  const handleEditUser = (index: number) => {
    // Implement edit user logic here
  };

  const handleDeleteUser = (index: number) => {
    // Implement delete user logic here
    setUsers(users.filter((_, i) => i !== index));
  };

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <div className="mb-4">
        <button
          onClick={handleAddUser}
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Add User
        </button>
      </div>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Name</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Role</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={index}>
              <td className="py-2 px-4 border-b">{user.name}</td>
              <td className="py-2 px-4 border-b">{user.email}</td>
              <td className="py-2 px-4 border-b">{user.role}</td>
              <td className="py-2 px-4 border-b">
                <button
                  onClick={() => handleEditUser(index)}
                  className="bg-yellow-500 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteUser(index)}
                  className="bg-red-500 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default UserManagement;
