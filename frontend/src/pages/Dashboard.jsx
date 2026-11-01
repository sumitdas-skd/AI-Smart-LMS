import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { subjectService } from '../services/apiServices';
import { BookOpen, Network, Code, Cpu, Database, Heart, Flame, Star, Trophy, Zap } from 'lucide-react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// ── Gamification Mini-Widget ────────────────────────────────────────────────────
const GamificationWidget = () => {
    const [profile, setProfile] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        api.get('/gamification/me').then(r => setProfile(r.data)).catch(() => {});
        api.get('/gamification/leaderboard?limit=5').then(r => setLeaderboard(r.data || [])).catch(() => {});
    }, []);

    if (!profile) return null;

    const pct = Math.min(100, Math.round((profile.xp_points % 300) / 3));

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Streak + XP card */}
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-teal-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-75">Your Progress</p>
                        <h3 className="text-2xl font-black mt-1">{profile.level_title}</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl">
                        <Flame className="h-4 w-4 text-orange-300" />
                        <span className="font-black text-sm">{profile.study_streak_count} day streak</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                        { icon: Star, label: 'XP Points', val: profile.xp_points },
                        { icon: Trophy, label: 'Badge', val: profile.badge_level },
                        { icon: Zap, label: 'Level', val: profile.level },
                    ].map((s, i) => (
                        <div key={i} className="text-center">
                            <s.icon className="h-5 w-5 mx-auto mb-1 opacity-75" />
                            <div className="font-black text-xl">{s.val}</div>
                            <div className="text-xs opacity-60">{s.label}</div>
                        </div>
                    ))}
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1 opacity-75">
                        <span>XP Progress</span><span>{pct}%</span>
                    </div>
                    <div className="bg-white/20 rounded-full h-2">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2 }}
                            className="bg-white rounded-full h-2" />
                    </div>
                </div>
            </div>
            {/* Leaderboard */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm"><Trophy className="h-4 w-4 text-yellow-500" /> Top Learners</h3>
                <div className="space-y-2">
                    {leaderboard.map((u, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</span>
                            <span className="flex-1 text-sm font-semibold text-gray-700 truncate">{u.full_name}</span>
                            <span className="text-xs font-bold text-teal-600">{u.xp_points} XP</span>
                        </div>
                    ))}
                    {leaderboard.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Be the first on the board!</p>}
                </div>
            </div>
        </motion.div>
    );
};

const getSubjectIcon = (name) => {
    if (name.includes('Data') || name.includes('Database')) return <Database className="h-8 w-8 text-white" />;
    if (name.includes('Artificial') || name.includes('Machine')) return <Network className="h-8 w-8 text-white" />;
    if (name.includes('Program') || name.includes('C ')) return <Code className="h-8 w-8 text-white" />;
    if (name.includes('System') || name.includes('Arch')) return <Cpu className="h-8 w-8 text-white" />;
    return <BookOpen className="h-8 w-8 text-white" />;
};

const gradients = [
    'from-emerald-500 to-teal-400',
    'from-indigo-500 to-purple-500',
    'from-orange-500 to-amber-400',
    'from-rose-500 to-pink-500',
    'from-blue-500 to-cyan-400',
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 12
        }
    }
};

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [recentSubjects, setRecentSubjects] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBookmarks = async () => {
        try {
            const res = await api.get('/bookmarks/');
            setBookmarks(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const semArray = await subjectService.getSemesters();
                if (semArray.length > 0) {
                    const subs = await subjectService.getSubjects(semArray[0].id);
                    setRecentSubjects(subs.slice(0, 4));
                }
                await fetchBookmarks();
            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    return (
        <div className="w-full">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.full_name?.split(' ')[0]}!</h1>
                <p className="text-gray-500 mb-8">Ready to master your computer science curriculum today?</p>
            </motion.div>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Your Class Subjects</h2>
                <Link to="/subjects" className="text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors">Show all</Link>
            </div>

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                {loading ? (
                    [1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-2xl"></div>)
                ) : (
                    recentSubjects.map((sub, idx) => {
                        const gradient = gradients[idx % gradients.length];
                        const progress = Math.floor(Math.random() * 60) + 20;
                        return (
                            <motion.div 
                                key={sub.id} 
                                variants={itemVariants}
                                whileHover={{ y: -5, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                                className="glass-card-light flex flex-col justify-between group cursor-pointer border border-gray-100"
                            >
                                <div className={`relative h-28 -mx-6 -mt-6 mb-4 rounded-t-2xl bg-gradient-to-br ${gradient} p-5 overflow-hidden`}>
                                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] z-10"></div>
                                    <div className="relative z-20 flex justify-between items-start">
                                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-sm border border-white/20">
                                            {getSubjectIcon(sub.name)}
                                        </div>
                                        <div className="relative h-14 w-14">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <path
                                                    className="text-white/20"
                                                    strokeWidth="3"
                                                    stroke="currentColor"
                                                    fill="none"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                                <motion.path
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: progress / 100 }}
                                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                                    className="text-white"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    stroke="currentColor"
                                                    fill="none"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-white font-bold text-sm tracking-tighter">{progress}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1 line-clamp-1 group-hover:text-brand-600 transition-colors">{sub.name}</h3>
                                    <p className="text-xs font-medium text-gray-400 mb-4">{sub.code}</p>
                                    
                                    <Link to={`/subjects/${sub.id}`} className="block w-full text-center py-2.5 px-4 bg-gray-50 hover:bg-brand-50 text-gray-700 hover:text-brand-700 font-medium text-sm rounded-xl transition-all border border-gray-100 active:scale-95">
                                        Resume Learning
                                    </Link>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </motion.div>

            {/* Bookmarks Section */}
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-12 overflow-hidden pb-10"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <Heart className="h-6 w-6 text-red-500 mr-2 fill-current" />
                        Saved for Later
                    </h2>
                    <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase">{bookmarks.length} Items</span>
                </div>
                
                {loading ? (
                    <div className="flex space-x-6 overflow-x-auto pb-4 h-48 scrollbar-hide">
                        {[1,2,3].map(i => <div key={i} className="min-w-[300px] h-full bg-gray-100 animate-pulse rounded-2xl"></div>)}
                    </div>
                ) : bookmarks.length === 0 ? (
                    <div className="p-12 text-center bg-gray-100/30 rounded-2xl border-2 border-dashed border-gray-100 group hover:border-brand-200 transition-all cursor-pointer">
                        <motion.div 
                            whileHover={{ scale: 1.1, rotate: 10 }}
                            className="bg-white shadow-sm inline-flex p-4 rounded-2xl mb-4 text-gray-300 group-hover:text-red-400 transition-all"
                        >
                            <Heart className="h-10 w-10" />
                        </motion.div>
                        <p className="text-gray-500 font-medium">Your reading list is empty.</p>
                        <p className="text-xs text-gray-400 mt-2">Bookmark notes and videos while studying to see them here.</p>
                    </div>
                ) : (
                    <div className="flex hide-scrollbar space-x-6 overflow-x-auto pb-4 scroll-smooth">
                        {bookmarks.map((b) => (
                            <motion.div
                                key={b.id}
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Link 
                                    to={`/subjects/${b.subject_id || 1}`} 
                                    className="min-w-[320px] h-full bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest
                                                ${b.resource_type === 'video' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                                {b.resource_type}
                                            </span>
                                            <Heart className="h-4 w-4 text-red-500 fill-current opacity-80" />
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 mb-2 group-hover:text-brand-600 transition-colors">
                                            {b.title || "Bookmarked Resource"}
                                        </h4>
                                        <p className="text-sm text-gray-400 font-medium line-clamp-2">
                                            You saved this on {new Date(b.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="mt-6 flex items-center text-xs font-bold text-gray-500 group-hover:text-brand-600">
                                        Continue reading <BookOpen className="ml-2 h-4 w-4" />
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            <GamificationWidget />
        </div>
    );
};

export default Dashboard;
