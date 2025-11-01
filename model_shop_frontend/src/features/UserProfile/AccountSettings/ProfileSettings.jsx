import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";

const ProfileSettings = ({ activeSection, user: initialUser, onUserUpdate }) => {
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [profilePicture, setProfilePicture] = useState("");
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone_number: "",
        address: "",
        gender: "",
        custom_gender: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        profile_image: null,
    });
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetched, setIsFetched] = useState(false);

    const fetchUserData = useCallback(async () => {
        try {
            const response = await api.get("/user");
            if (response.data.status === "success") {
                const fetchedUser = response.data.user;
                console.log("Fetched user data:", fetchedUser); // Debug fetched data
                setFormData((prev) => ({
                    ...prev,
                    full_name: fetchedUser.full_name || "Default Name",
                    email: fetchedUser.email || "",
                    phone_number: fetchedUser.phone_number || "",
                    address: fetchedUser.address || "",
                    gender: fetchedUser.gender || "",
                    custom_gender:
                        fetchedUser.gender && !["male", "female"].includes(fetchedUser.gender)
                            ? fetchedUser.gender
                            : "",
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                    profile_image: null,
                }));
                setProfilePicture(
                    fetchedUser.profile_image
                        ? `http://localhost:8080/${fetchedUser.profile_image}`
                        : ""
                );
                if (onUserUpdate) onUserUpdate(fetchedUser);
            } else {
                setErrors({ general: "Failed to fetch user data." });
                Toastify.error("Failed to fetch user data.");
            }
        } catch (err) {
            console.error("Error fetching user data:", err);
            setErrors({ general: err.response?.data?.message || "Error fetching user data." });
            Toastify.error(err.response?.data?.message || "Error fetching user data.");
        } finally {
            setIsFetched(true);
        }
    }, [onUserUpdate]);

    useEffect(() => {
        if (!isFetched) {
            fetchUserData();
        }
    }, [fetchUserData, isFetched]);

    useEffect(() => {
        if (initialUser) {
            setFormData((prev) => ({
                ...prev,
                full_name: initialUser.full_name || "",
                email: initialUser.email || "",
                phone_number: initialUser.phone_number || "",
                address: initialUser.address || "",
                gender: initialUser.gender || "",
                custom_gender:
                    initialUser.gender && !["male", "female"].includes(initialUser.gender)
                        ? initialUser.gender
                        : "",
            }));
            setProfilePicture(
                initialUser.profile_image
                    ? `http://localhost:8080/${initialUser.profile_image}`
                    : ""
            );
        }
    }, [initialUser]);

    const validateForm = (updatedFormData) => {
        const newErrors = {};
        if (updatedFormData.full_name.length < 2) {
            newErrors.full_name = "Full name must be at least 2 characters.";
        }
        if (!/^\S+@\S+\.\S+$/.test(updatedFormData.email)) {
            newErrors.email = "Invalid email format.";
        }
        if (updatedFormData.phone_number && !/^\d{10,15}$/.test(updatedFormData.phone_number)) {
            newErrors.phone_number = "Invalid phone number.";
        }
        if (updatedFormData.gender === "other" && !updatedFormData.custom_gender) {
            newErrors.custom_gender = "Please specify your gender.";
        }
        if (updatedFormData.currentPassword && updatedFormData.newPassword !== updatedFormData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match.";
        }
        if (updatedFormData.newPassword && updatedFormData.newPassword.length < 8) {
            newErrors.newPassword = "New password must be at least 8 characters.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        const updatedFormData = {
            ...formData,
            [name]: files ? files[0] : value,
        };
        setFormData(updatedFormData);
        validateForm(updatedFormData);
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!validateForm(formData)) return;

        setIsLoading(true);
        setErrors({});
        setSuccess("");

        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== "") {
                    data.append(key, value);
                }
            });

            if (formData.gender === "other" && formData.custom_gender) {
                data.append("gender", formData.custom_gender);
            }

            const response = await api.put("/user", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.data.status === "success") {
                setSuccess("Profile updated successfully!");
                Toastify.success("Profile updated successfully!");
                const updatedUser = response.data.user;
                sessionStorage.setItem("user", JSON.stringify(updatedUser));
                if (onUserUpdate) onUserUpdate(updatedUser);
                fetchUserData();
            } else {
                setErrors({ general: response.data.message || "Failed to update profile." });
                Toastify.error(response.data.message || "Failed to update profile.");
            }
        } catch (err) {
            console.error("Profile update error:", err);
            const errorMessage = err.response?.data?.message || "Error updating profile.";
            setErrors({ general: errorMessage });
            Toastify.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {activeSection === "profile" && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-6">Profile Settings</h2>
                    {success && <p className="text-green-500 mb-4">{success}</p>}
                    {errors.general && <p className="text-red-500 mb-4">{errors.general}</p>}
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="flex items-center mb-6">
                            <div className="relative">
                                <img
                                    src={profilePicture || "default-profile.jpg"}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full object-cover mr-4"
                                />
                                <input
                                    type="file"
                                    id="profile_image"
                                    name="profile_image"
                                    accept="image/*"
                                    onChange={handleInputChange}
                                    className="hidden"
                                    disabled={isLoading}
                                />
                                <label
                                    htmlFor="profile_image"
                                    className="absolute bottom-0 right-4 bg-blue-600 text-white p-1 rounded-full cursor-pointer"
                                >
                                    <i className="ri-camera-line"></i>
                                </label>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">{formData.full_name}</h3>
                                <p className="text-sm text-gray-500">{formData.email}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="mb-4">
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                {errors.full_name && (
                                    <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter your email"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    id="phone_number"
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleInputChange}
                                    placeholder="Enter your phone number"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                {errors.phone_number && (
                                    <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Enter your address"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            {formData.gender === "other" && (
                                <div className="mb-4">
                                    <label htmlFor="custom_gender" className="block text-sm font-medium text-gray-700 mb-1">
                                        Custom Gender
                                    </label>
                                    <input
                                        type="text"
                                        id="custom_gender"
                                        name="custom_gender"
                                        value={formData.custom_gender}
                                        onChange={handleInputChange}
                                        placeholder="Specify your gender"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    />
                                    {errors.custom_gender && (
                                        <p className="text-red-500 text-sm mt-1">{errors.custom_gender}</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <h2 className="text-xl font-bold mb-4">Change Password</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="mb-6">
                                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleInputChange}
                                    placeholder="Enter current password"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="mb-6">
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    placeholder="Enter new password"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="mb-6">
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Confirm new password"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                {errors.confirmPassword && (
                                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg mr-3 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer disabled:bg-blue-400"
                                disabled={isLoading}
                            >
                                {isLoading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default ProfileSettings;