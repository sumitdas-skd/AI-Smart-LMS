import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and account settings.</p>
                    </div>
                    <button onClick={handleLogout} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none">
                        <LogOut className="h-4 w-4 mr-1.5" /> Sign out
                    </button>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 flex items-center">
                            <dt className="text-sm font-medium text-gray-500">Avatar</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
                                    <span className="text-xl font-medium leading-none text-brand-700 uppercase">{user.full_name[0]}</span>
                                </span>
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Full name</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.full_name}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Email address</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.email}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Role</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 capitalize">
                                    {user.role}
                                </span>
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Member since</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{new Date(user.created_at).toLocaleDateString()}</dd>
                        </div>
                    </dl>
                </div>
            </div>
            
            {/* Future expansion: Change password form could go here */}
        </div>
    );
};

export default Profile;
