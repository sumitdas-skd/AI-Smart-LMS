import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { BookOpen, Lock, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
            toast.success('Logged in successfully!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50/50">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="sm:mx-auto sm:w-full sm:max-w-sm"
            >
                <div className="flex justify-center">
                    <motion.div 
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100"
                    >
                        <BookOpen className="h-10 w-10 text-brand-600" />
                    </motion.div>
                </div>
                <h2 className="mt-8 text-center text-3xl font-extrabold tracking-tight text-gray-900">
                    Welcome Back
                </h2>
                <p className="mt-2 text-center text-sm text-gray-500">
                    Sign in to continue your learning journey
                </p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-10 sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="bg-white px-8 py-10 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100/50 backdrop-blur-sm">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 ml-1 mb-2 uppercase tracking-wider text-[10px]">Email address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-brand-600 transition-colors">
                                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-brand-500" />
                                </div>
                                <input 
                                    type="email" 
                                    required 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    className="block w-full rounded-2xl border-0 py-3 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:text-sm transition-all focus:bg-white bg-gray-50/50 outline-none" 
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between ml-1 mb-2">
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Password</label>
                                <div className="text-sm">
                                    <Link to="/forgot-password" size="sm" className="font-bold text-brand-600 hover:text-brand-500 transition-colors text-xs">Forgot password?</Link>
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-brand-600 transition-colors">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-brand-500" />
                                </div>
                                <input 
                                    type="password" 
                                    required 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    className="block w-full rounded-2xl border-0 py-3 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:text-sm transition-all focus:bg-white bg-gray-50/50 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit" 
                                disabled={isLoading}
                                className="flex w-full justify-center rounded-2xl bg-brand-600 px-4 py-3.5 text-sm font-bold leading-6 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-500 transition-all items-center gap-2 group"
                            >
                                {isLoading ? "Signing in..." : (
                                    <>
                                        Sign in
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </form>

                    <p className="mt-10 text-center text-sm text-gray-500">
                        Not a member?{' '}
                        <Link to="/register" className="font-bold leading-6 text-brand-600 hover:text-brand-500 transition-colors">Create an account</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
