import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { BookOpen } from 'lucide-react';

const PublicLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow w-full">
                <Outlet />
            </main>
            <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center mb-6">
                                <BookOpen className="h-8 w-8 text-brand-600 mr-2" />
                                <span className="font-bold text-xl text-gray-900 tracking-tight">AI Smart LMS</span>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Empowering students with modern AI-driven educational tools and resources. Join ABIT's smartest learning community today.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Platform</h4>
                            <ul className="space-y-4 text-sm text-gray-500">
                                <li><Link to="/subjects" className="hover:text-brand-600">Subjects</Link></li>
                                <li><Link to="/notices" className="hover:text-brand-600">Notices</Link></li>
                                <li><Link to="/class-chat" className="hover:text-brand-600">Doubts</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Support</h4>
                            <ul className="space-y-4 text-sm text-gray-500">
                                <li><Link to="/notices" className="hover:text-brand-600">Notices</Link></li>
                                <li><Link to="/results" className="hover:text-brand-600">Results</Link></li>
                                <li><Link to="/contact" className="hover:text-brand-600">Contact</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Social</h4>
                            <ul className="space-y-4 text-sm text-gray-500">
                                <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">LinkedIn</a></li>
                                <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">Twitter</a></li>
                                <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">Facebook</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-gray-100 text-center text-xs text-gray-400 font-bold tracking-widest uppercase">
                        &copy; {new Date().getFullYear()} AI Smart LMS for ABIT College. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
