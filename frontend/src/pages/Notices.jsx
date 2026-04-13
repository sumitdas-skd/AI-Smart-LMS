import React from 'react';
import { Bell, ShieldAlert, Award, Database, MessageSquare } from 'lucide-react';

const Notices = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
                <Bell className="h-8 w-8 text-brand-600 mr-3" /> College Notice Board
            </h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Important Notice */}
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <ShieldAlert className="h-6 w-6 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-bold text-red-800 uppercase tracking-widest">Urgent: End Semester Exam Schedule</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>The revised schedule for 6th and 8th Semester B.Tech End Term Examinations has been released. Please download the PDF from the examination cell portal.</p>
                                </div>
                                <div className="mt-4">
                                    <span className="text-xs font-medium text-red-600 italic">Posted: 2 hours ago &bull; Academic Cell</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {[
                        { title: 'AI Hackathon 2026 Registration Open', type: 'Event', date: 'Yesterday' },
                        { title: 'Placement Drive: Google India Off-campus', type: 'Placement', date: '2 days ago' },
                        { title: 'National Holiday: Holi Holiday Notice', type: 'Holiday', date: '3 days ago' },
                        { title: 'Internal Assessment Marks Uploaded', type: 'Academic', date: '4 days ago' },
                        { title: 'Subject Choice Selection Form Active', type: 'Registration', date: '1 week ago' },
                    ].map((notice, idx) => (
                        <div key={idx} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start space-x-4">
                                    <div className="bg-gray-50 p-3 rounded-xl group-hover:bg-brand-50 transition-colors">
                                        <Award className="h-6 w-6 text-gray-400 group-hover:text-brand-600" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-brand-600">{notice.type}</span>
                                        <h4 className="text-lg font-bold text-gray-900 mt-1">{notice.title}</h4>
                                        <p className="text-sm text-gray-500 mt-1">Official announcement from the college administration regarding {notice.type.toLowerCase()}.</p>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-xs font-bold text-gray-400 italic mb-2">{notice.date}</span>
                                    <button className="text-xs font-black uppercase tracking-widest text-brand-600 hover:text-brand-500 flex items-center">
                                        Read More <span className="ml-2">→</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Sidebar Stats/Extra Info */}
                <div className="space-y-6">
                    <div className="bg-indigo-dark p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-teal-glow/20 rounded-full blur-3xl"></div>
                        <h3 className="text-xl font-bold mb-4 relative z-10">Quick Stats</h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="text-sm text-gray-400">Total Notifications</span>
                                <span className="font-bold">42</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="text-sm text-gray-400">Unread</span>
                                <span className="font-bold text-teal-glow">3</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="text-sm text-gray-400">Archived</span>
                                <span className="font-bold">256</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Admin Cell</h3>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <Database className="h-4 w-4 text-brand-600" />
                                <span>admin@abit.edu.in</span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <MessageSquare className="h-4 w-4 text-brand-600" />
                                <span>Room 402, Block A</span>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                            Raise a Support Query
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notices;
