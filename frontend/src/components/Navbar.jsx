import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { BookOpen, User as UserIcon, LogOut, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <motion.nav 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50 py-1"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center group">
                            <motion.div 
                                whileHover={{ rotate: 15, scale: 1.1 }}
                                className="bg-brand-50 p-1.5 rounded-xl border border-brand-100"
                            >
                                <BookOpen className="h-7 w-7 text-brand-600" />
                            </motion.div>
                            <span className="ml-3 font-extrabold text-xl text-gray-900 tracking-tight">AI Smart <span className="text-brand-600">LMS</span></span>
                        </Link>
                        <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                            {[
                                { name: 'Subjects', path: '/subjects' },
                                { name: 'Search', path: '/search' }
                            ].map((item) => (
                                <Link 
                                    key={item.name}
                                    to={item.path} 
                                    className={`relative inline-flex items-center px-1 pt-1 text-sm font-bold transition-colors ${
                                        isActive(item.path) ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    {item.name}
                                    {isActive(item.path) && (
                                        <motion.div 
                                            layoutId="navTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full"
                                        />
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center">
                        {user ? (
                            <div className="flex items-center space-x-6">
                                <Link to="/dashboard" className="text-sm font-bold text-gray-600 hover:text-brand-600 transition-colors">Dashboard</Link>
                                <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="flex items-center group cursor-pointer"
                                >
                                    <div className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center border border-brand-100 mr-2 group-hover:bg-brand-100 transition-colors">
                                        <UserIcon className="h-4 w-4 text-brand-600" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 hidden sm:block">{user.full_name}</span>
                                </motion.div>
                                <button 
                                    onClick={handleLogout} 
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    title="Log out"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-6">
                                <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Log in</Link>
                                <Link to="/register">
                                    <motion.div 
                                        whileHover={{ scale: 1.05, boxShadow: "0 10px 15px -3px rgba(20, 184, 166, 0.4)" }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
                                    >
                                        Sign up <ArrowRight className="h-4 w-4" />
                                    </motion.div>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.nav>
    );
};

export default Navbar;
