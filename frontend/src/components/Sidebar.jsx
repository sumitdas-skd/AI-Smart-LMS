import React, { useContext } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, BookOpen, ShieldAlert, Bot, LogOut, MessageCircle, Bell, Award, ChevronRight, User, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen, closeSidebar }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const baseLinks = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'All Subjects', path: '/subjects', icon: BookOpen },
        { name: 'Class Chat', path: '/class-chat', icon: MessageCircle },
        { name: 'Notices', path: '/notices', icon: Bell },
        { name: 'Results', path: '/results', icon: Award },
    ];

    const studentLinks = [

    ];

    const teacherLinks = [
        { name: 'Upload Portal', path: '/upload', icon: UploadCloud },
    ];

    const adminLinks = [
        { name: 'Admin Console', path: '/admin', icon: ShieldAlert },
    ];

    let links = [...baseLinks];
    if (user?.role === 'student') {
        links = [...links, ...studentLinks];
    } else if (user?.role === 'teacher') {
        links = [...links, ...studentLinks, ...teacherLinks];
    } else if (user?.role === 'admin') {
        links = [...links, ...studentLinks, ...teacherLinks, ...adminLinks];
    }

    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 1024 : false;

    const sidebarVariants = {
        open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
        closed: { x: isDesktop ? 0 : '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } }
    };

    const linkVariants = {
        hover: { x: 5 },
        tap: { scale: 0.98 }
    };

    return (
        <motion.div 
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={sidebarVariants}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-indigo-dark text-white lg:relative lg:translate-x-0 flex flex-col rounded-r-[2.5rem] shadow-2xl border-r border-white/5 overflow-hidden"
        >
            {/* Gradient Glow */}
            <div className="absolute top-0 right-0 w-32 h-64 bg-teal-500/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="pt-10 pb-8 px-6 flex items-center justify-between relative z-10">
                <Link to="/dashboard" onClick={closeSidebar} className="flex items-center group">
                    <motion.div 
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10"
                    >
                        <BookOpen className="h-6 w-6 text-teal-glow" />
                    </motion.div>
                    <div className="ml-3">
                        <span className="font-extrabold text-lg tracking-tight text-white block">AI Smart</span>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-teal-400 -mt-1 block">LMS Platform</span>
                    </div>
                </Link>
                <motion.button 
                    whileTap={{ scale: 0.8 }}
                    onClick={closeSidebar} 
                    className="lg:hidden p-2 bg-white/5 rounded-full text-gray-400 hover:text-white"
                >
                    <ChevronRight className="h-5 w-5 rotate-180" />
                </motion.button>
            </div>
            
            {/* Navigation */}
            <div className="flex-1 mt-4 overflow-y-auto scrollbar-hide px-4 relative z-10">
                <nav className="space-y-1.5">
                    {links.map((link) => (
                        <NavLink
                            key={link.name}
                            to={link.path}
                            onClick={closeSidebar}
                        >
                            {({ isActive }) => (
                                <motion.div
                                    variants={linkVariants}
                                    whileHover="hover"
                                    whileTap="tap"
                                    className={`group flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all duration-300 relative ${
                                        isActive
                                            ? 'bg-gradient-to-r from-teal-500/20 to-teal-400/5 text-teal-glow shadow-glow border border-teal-500/30'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="activeTab"
                                            className="absolute left-0 w-1 h-6 bg-teal-400 rounded-full"
                                        />
                                    )}
                                    <link.icon className={`h-5 w-5 mr-3 transition-colors duration-300 ${
                                        isActive ? 'text-teal-400' : 'group-hover:text-teal-400'
                                    }`} />
                                    {link.name}
                                </motion.div>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* User Profile Summary */}
            <div className="p-6 relative z-10">
                <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-4 border border-white/5 shadow-inner">
                    <Link to="/profile" onClick={closeSidebar} className="flex items-center group mb-4">
                        <motion.div 
                            whileHover={{ scale: 1.1 }}
                            className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
                        >
                            {user?.full_name ? user.full_name[0].toUpperCase() : <User className="h-5 w-5" />}
                        </motion.div>
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors truncate">{user?.full_name}</p>
                            <span className="text-[9px] uppercase tracking-tighter font-bold text-gray-500 px-1.5 py-0.5 bg-white/5 rounded-md inline-block mt-0.5">{user?.role}</span>
                        </div>
                    </Link>
                    
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-gray-400 hover:text-red-400 transition-all border border-white/5"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default Sidebar;
