import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subjectService } from '../services/apiServices';
import { BookOpen, Layers, Network, Database, Code, Cpu } from 'lucide-react';

const getSubjectIcon = (name) => {
    if (name.includes('Data') || name.includes('Database')) return <Database className="h-6 w-6 text-white" />;
    if (name.includes('Artificial') || name.includes('Machine')) return <Network className="h-6 w-6 text-white" />;
    if (name.includes('Program') || name.includes('C ')) return <Code className="h-6 w-6 text-white" />;
    if (name.includes('System') || name.includes('Arch')) return <Cpu className="h-6 w-6 text-white" />;
    return <BookOpen className="h-6 w-6 text-white" />;
};

const gradients = [
    'from-indigo-500 to-purple-500',
    'from-emerald-500 to-teal-400',
    'from-blue-500 to-cyan-400',
    'from-orange-500 to-amber-400',
    'from-rose-500 to-pink-500',
];

const Subjects = () => {
    const [semesters, setSemesters] = useState([]);
    const [selectedSem, setSelectedSem] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSems = async () => {
            try {
                const sems = await subjectService.getSemesters();
                setSemesters(sems);
                if (sems.length > 0) {
                    setSelectedSem(sems[0].id);
                }
            } catch (err) {
                console.error("Error fetching semesters:", err);
            }
        };
        fetchSems();
    }, []);

    useEffect(() => {
        if (!selectedSem) return;
        const fetchSubs = async () => {
            setLoading(true);
            try {
                const subs = await subjectService.getSubjects(selectedSem);
                setSubjects(subs);
            } catch (err) {
                console.error("Error fetching subjects:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubs();
    }, [selectedSem]);

    return (
        <div className="max-w-7xl mx-auto page-enter">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-indigo-dark to-teal-500">
                    BPUT Curriculum
                </h1>
                <p className="mt-2 text-sm text-gray-500">Browse all computer science subjects organized by semester.</p>
            </div>

            {/* Premium Pill-shaped Semester Selector */}
            <div className="mb-8 overflow-x-auto pb-4 scrollbar-hide">
                <div className="inline-flex bg-white shadow-sm p-1.5 rounded-full border border-gray-100">
                    {semesters.map((sem) => (
                        <button
                            key={sem.id}
                            onClick={() => setSelectedSem(sem.id)}
                            className={`
                                whitespace-nowrap px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-300
                                ${selectedSem === sem.id 
                                    ? 'bg-gradient-to-r from-teal-400 to-teal-500 text-white shadow-md' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }
                            `}
                        >
                            {sem.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Subject Grid */}
            <div className="mt-8">
                {loading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-white/50 animate-pulse rounded-2xl border border-gray-100"></div>)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 tab-content-enter">
                        {subjects.length === 0 ? (
                            <p className="text-gray-500 col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                                No subjects mapped for this semester yet.
                            </p>
                        ) : (
                            subjects.map((sub, idx) => {
                                const gradient = gradients[idx % gradients.length];
                                return (
                                    <Link 
                                        to={`/subjects/${sub.id}`} 
                                        key={sub.id}
                                        className="glass-card-light flex flex-col justify-between group cursor-pointer hover:border-brand-200 card-enter"
                                    >
                                        <div className={`relative h-24 -mx-6 -mt-6 mb-4 rounded-t-2xl bg-gradient-to-r ${gradient} p-5 overflow-hidden flex items-center justify-between`}>
                                            <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] z-10"></div>
                                            <div className="relative z-20 bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-sm border border-white/20">
                                                {getSubjectIcon(sub.name)}
                                            </div>
                                            <div className="relative z-20 bg-black/20 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 shadow-sm">
                                                {sub.code}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight pr-2">{sub.name}</h3>
                                                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{sub.description}</p>
                                            </div>
                                            
                                            <div className="pt-4 mt-auto border-t border-gray-100 flex items-center justify-between">
                                                <span className="text-sm font-semibold text-brand-600 group-hover:text-brand-500 transition-colors uppercase tracking-wider text-xs">Explore Module</span>
                                                <span className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">&rarr;</span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Subjects;
