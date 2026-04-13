import React from 'react';
import { Award, BookOpen, Star, FileText } from 'lucide-react';

const Results = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
                <Award className="h-8 w-8 text-yellow-500 mr-3" /> Academic Performance
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {[
                    { label: "Overall CGPA", value: "8.42", icon: Star, color: "text-brand-600" },
                    { label: "Completion Rate", value: "98%", icon: BookOpen, color: "text-teal-glow" },
                    { label: "Credits Earned", value: "112 / 160", icon: Award, color: "text-brand-900" }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</h3>
                                <p className={`text-4xl font-black mt-2 ${stat.color}`}>{stat.value}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-gray-50 rounded-full blur-3xl group-hover:bg-brand-50 transition-colors"></div>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden mb-12">
                <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Semester Wise Transcript</h2>
                        <p className="text-sm text-gray-400 mt-1 uppercase font-bold tracking-widest">Unofficial Grade Report (BPUT ODISHA)</p>
                    </div>
                    <button className="flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all">
                        <FileText className="h-4 w-4 mr-2" /> Download Transcript PDF
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Semester</th>
                                <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-gray-400">SGPA</th>
                                <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Arrears</th>
                                <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="px-10 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {[
                                { sem: "5th Semester", sgpa: "8.12", arrears: "0", status: "PASSED (GRADE A)" },
                                { sem: "4th Semester", sgpa: "8.56", arrears: "0", status: "PASSED (GRADE E)" },
                                { sem: "3rd Semester", sgpa: "7.98", arrears: "0", status: "PASSED (GRADE A)" },
                                { sem: "2nd Semester", sgpa: "8.22", arrears: "0", status: "PASSED (GRADE A)" },
                                { sem: "1st Semester", sgpa: "8.04", arrears: "0", status: "PASSED (GRADE A)" }
                            ].map((res, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 font-bold uppercase text-xs tracking-tighter">S{5-idx}</div>
                                            <span className="font-bold text-gray-900">{res.sem}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 font-black text-brand-600 tracking-tighter text-lg">{res.sgpa}</td>
                                    <td className="px-10 py-6 text-sm font-medium text-gray-500">{res.arrears}</td>
                                    <td className="px-10 py-6">
                                        <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                            {res.status}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6">
                                        <button className="text-gray-400 hover:text-brand-600 group-hover:scale-110 transition-all">
                                            <FileText className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-amber-50/50 border-2 border-dashed border-amber-200 p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start space-x-6 text-center md:text-left">
                    <div className="bg-white p-4 rounded-3xl shadow-sm text-amber-500 shrink-0">
                        <Award className="h-10 w-10" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-amber-900 leading-tight">6th Semester Results Pending</h3>
                        <p className="text-sm text-amber-700 mt-2 max-w-sm">Results for the 6th semester are expected to be announced by the university in the second week of April.</p>
                    </div>
                </div>
                <button className="px-8 py-3 bg-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all hover:-translate-y-1">
                    Set Notification Reminder
                </button>
            </div>
        </div>
    );
};

export default Results;
