import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { subjectService, classChatService } from '../services/apiServices';
import { MessageCircle, Plus, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const ClassChatDashboard = () => {
    const { user } = useContext(AuthContext);
    const [semesters, setSemesters] = useState([]);
    const [selectedSem, setSelectedSem] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [doubts, setDoubts] = useState([]);
    
    // For new doubt modal
    const [isAsking, setIsAsking] = useState(false);
    const [newDoubtText, setNewDoubtText] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchSems = async () => {
            try {
                const sems = await subjectService.getSemesters();
                setSemesters(sems);
                if (sems.length > 0) {
                    setSelectedSem(sems[0].id);
                }
            } catch (err) {
                console.error('Error fetching semesters', err);
            }
        };
        fetchSems();
    }, []);

    useEffect(() => {
        if (!selectedSem) return;
        const fetchSubjects = async () => {
            try {
                const subs = await subjectService.getSubjects(selectedSem);
                setSubjects(subs);
                if (subs.length > 0) setSelectedSubject(subs[0]);
                else setSelectedSubject(null);
            } catch (err) {
                console.error('Error fetching subjects', err);
            }
        };
        fetchSubjects();
    }, [selectedSem]);

    useEffect(() => {
        if (selectedSubject) {
            fetchDoubts();
        }
    }, [selectedSubject]);

    const fetchDoubts = async () => {
        try {
            const data = await classChatService.getDoubts(selectedSubject.id);
            setDoubts(data);
        } catch (err) {
            console.error('Error fetching doubts', err);
        }
    };

    const handleAskDoubt = async (e) => {
        e.preventDefault();
        if (!newDoubtText.trim()) return;
        
        try {
            const res = await classChatService.createDoubt(selectedSubject.id, {
                message_type: 'text',
                content: newDoubtText
            });
            setIsAsking(false);
            setNewDoubtText('');
            // Navigate directly to the new doubt thread
            navigate(`/class-chat/${res.id}`);
            toast.success('Doubt created!');
        } catch (err) {
            toast.error('Failed to ask doubt');
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Left Sidebar: Subjects ListView */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-xl font-bold flex items-center text-gray-900 mb-4">
                        <MessageCircle className="mr-2 h-6 w-6 text-brand-600" />
                        Class Chat Filter 
                    </h2>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="semester-select" className="text-sm font-semibold text-gray-700">Select Semester</label>
                        <select
                            id="semester-select"
                            value={selectedSem || ''}
                            onChange={(e) => setSelectedSem(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white cursor-pointer"
                        >
                            {semesters.map(sem => (
                                <option key={sem.id} value={sem.id}>{sem.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {subjects.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => setSelectedSubject(s)}
                            className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-brand-50 transition-colors ${selectedSubject?.id === s.id ? 'bg-brand-50 border-l-4 border-l-brand-600' : ''}`}
                        >
                            <h3 className="font-semibold text-gray-900">{s.name}</h3>
                            <p className="text-xs text-gray-500">{s.code}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Side: Doubts List */}
            <div className="w-2/3 flex flex-col bg-white overflow-hidden relative">
                {selectedSubject ? (
                    <>
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{selectedSubject.name} Doubts</h2>
                                <p className="text-sm text-gray-500">{doubts.length} doubts found</p>
                            </div>
                            {user?.role === 'student' && (
                                <button 
                                    onClick={() => setIsAsking(true)}
                                    className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium text-sm transition-colors shadow-sm"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Ask New Doubt
                                </button>
                            )}
                        </div>

                        {/* Doubts ListView */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {doubts.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No doubts found for this subject.
                                </div>
                            ) : (
                                doubts.map(doubt => (
                                    <Link 
                                        to={`/class-chat/${doubt.id}`} 
                                        key={doubt.id}
                                        className="block bg-white p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-gray-900 text-base mb-1">
                                                    Doubt #{doubt.id}
                                                </h4>
                                                <p className="text-xs text-gray-500 flex items-center mb-2">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {new Date(doubt.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                {doubt.is_resolved ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <CheckCircle className="h-3 w-3 mr-1" /> Resolved
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 mt-2 group-hover:text-gray-900 transition-colors">
                                            Click to view the conversation...
                                        </p>
                                    </Link>
                                ))
                            )}
                        </div>
                        
                        {/* Ask Modal */}
                        {isAsking && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center p-6">
                                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg p-6 flex flex-col">
                                    <h3 className="text-xl font-bold mb-4">Ask a Doubt in {selectedSubject.name}</h3>
                                    <form onSubmit={handleAskDoubt} className="flex flex-col flex-1">
                                        <textarea
                                            value={newDoubtText}
                                            onChange={e => setNewDoubtText(e.target.value)}
                                            placeholder="What's your question? You can attach files in the next step."
                                            className="w-full h-32 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none mb-4"
                                            required
                                        ></textarea>
                                        <div className="flex justify-end space-x-3 mt-auto">
                                            <button 
                                                type="button" 
                                                onClick={() => setIsAsking(false)}
                                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition-colors"
                                                disabled={!newDoubtText.trim()}
                                            >
                                                Post Doubt
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 p-8 text-center">
                        Select a subject from the left panel to browse or ask doubts.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassChatDashboard;
