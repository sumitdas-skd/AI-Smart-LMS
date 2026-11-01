import React, { useContext, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            navigate(`/search?q=${e.target.value}`);
        }
    };

    return (
        <div className="min-h-screen bg-[#f4f7f6] flex overflow-hidden">
            {/* Mobile Sidebar Backdrop */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 z-40 lg:hidden bg-gray-600/50 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative z-0 overflow-y-auto focus:outline-none">
                
                {/* Minimal Topbar */}
                <motion.header 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100"
                >
                    <div className="flex items-center space-x-4 flex-1">
                        <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 text-gray-400 hover:text-teal-600 lg:hidden transition-colors"
                        >
                            <Menu className="h-6 w-6" />
                        </motion.button>
                        <div className="w-full max-w-md relative hidden sm:block">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search..."
                                onKeyDown={handleSearch}
                                className="block w-full rounded-2xl border-0 py-2.5 pl-10 pr-3 text-gray-900 bg-white shadow-sm ring-1 ring-inset ring-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-500 sm:text-sm sm:leading-6 transition-all focus:shadow-md outline-none"
                            />
                        </div>
                    </div>                    
                    <div className="flex items-center space-x-6 ml-4">
                        <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="relative text-gray-400 hover:text-teal-500 transition-colors"
                        >
                            <Bell className="h-6 w-6" />
                            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-[#f4f7f6]"></span>
                        </motion.button>
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.full_name}</span>
                            <motion.div 
                                whileHover={{ scale: 1.05 }}
                                className="h-9 w-9 rounded-full bg-gradient-to-r from-teal-400 to-blue-500 border-2 border-white shadow-sm"
                            ></motion.div>
                        </div>
                        <motion.button 
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                logout();
                                navigate('/login');
                            }}
                            className="p-2 text-gray-400 transition-all rounded-full"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </motion.button>
                    </div>
                </motion.header>

                {/* Page Content */}
                <div className="flex-1 flex flex-col">
                    <main className="flex-1 px-4 sm:px-8 pb-8 overflow-y-auto scrollbar-hide">
                        <div className="max-w-7xl mx-auto py-6">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
