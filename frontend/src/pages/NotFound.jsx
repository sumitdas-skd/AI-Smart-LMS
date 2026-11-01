import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6 py-12">
            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <div className="bg-red-50 p-6 rounded-full">
                        <ShieldAlert className="h-20 w-20 text-red-500 animate-pulse" />
                    </div>
                </div>
                <h1 className="text-6xl font-black text-gray-900 mb-4 tracking-tighter">404</h1>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Oops! Page not found</h2>
                <p className="text-lg text-gray-500 max-w-md mx-auto mb-10 leading-relaxed">
                    The requested page doesn't exist or has been moved. Don't worry, your academic progress is safe!
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link 
                        to="/dashboard" 
                        className="flex items-center px-8 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-500 transition-all hover:-translate-y-1"
                    >
                        <Home className="h-5 w-5 mr-2" />
                        Go to Dashboard
                    </Link>
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Go Back
                    </button>
                </div>

                <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto text-sm font-medium text-gray-400 uppercase tracking-widest">
                    <Link to="/subjects" className="hover:text-brand-600">Subjects</Link>
                    <Link to="/chat" className="hover:text-brand-600">AI Tutor</Link>
                    <Link to="/profile" className="hover:text-brand-600">Profile</Link>
                    <Link to="/class-chat" className="hover:text-brand-600">Doubts</Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
