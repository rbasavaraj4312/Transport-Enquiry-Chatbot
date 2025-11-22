import React from "react";

const Profile = ({ user }) => {
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white shadow-lg rounded-2xl p-6 w-96 text-center">
          <h1 className="text-xl font-semibold text-gray-700">
            No User Logged In
          </h1>
          <p className="text-gray-500 mt-2">
            Please login to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-3xl">
        {/* Profile Header */}
        <div className="flex flex-col items-center border-b pb-6">
          <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-white text-3xl font-bold">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mt-4">{user.name}</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>

        {/* User Details */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <p className="text-gray-600 font-medium">Phone</p>
            <p className="text-gray-800">{user.phone}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <p className="text-gray-600 font-medium">Gender</p>
            <p className="text-gray-800">{user.gender || "N/A"}</p>
          </div>
        </div>

        {/* Bookings Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Bookings</h2>
          {user.bookings && user.bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-indigo-100 text-gray-700 text-sm">
                    <th className="border border-gray-200 px-3 py-2">
                      Bus No.
                    </th>
                    <th className="border border-gray-200 px-3 py-2">Date</th>
                    <th className="border border-gray-200 px-3 py-2">Seats</th>
                    <th className="border border-gray-200 px-3 py-2">Amount</th>
                    <th className="border border-gray-200 px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {user.bookings.map((booking, index) => (
                    <tr
                      key={index}
                      className="text-sm text-gray-700 hover:bg-gray-50">
                      <td className="border border-gray-200 px-3 py-2 text-center">
                        {booking.busNumber}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-center">
                        {booking.bookingDate
                          ? new Date(booking.bookingDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-center">
                        {booking.seats?.join(", ") || "-"}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-center">
                        ₹{booking.amount || 0}
                      </td>
                      <td
                        className={`border border-gray-200 px-3 py-2 text-center font-semibold ${
                          booking.status === "Confirmed"
                            ? "text-green-600"
                            : booking.status === "Cancelled"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}>
                        {booking.status || "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">You have no bookings yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
