import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({ full_name: '', email: '', password: '', confirmPassword: '', role: 'student' });
    const { register: registerUser, login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        try {
            // Remove confirmPassword before sending to API
            const { confirmPassword, ...data } = formData;
            await registerUser(data);
            await login(formData.email, formData.password);
            toast.success('Registration and Login successful!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Registration failed');
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm border bg-white p-8 rounded-xl shadow-sm">
                <div className="flex justify-center mb-6">
                    <BookOpen className="h-10 w-10 text-brand-600" />
                </div>
                <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 mb-6">
                    Create your account
                </h2>
                
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900">Full Name</label>
                        <input type="text" required value={formData.full_name} onChange={e => setFormData(prev => ({...prev, full_name: e.target.value}))} className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 px-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900">Email address</label>
                        <input type="email" required value={formData.email} onChange={e => setFormData(prev => ({...prev, email: e.target.value}))} className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 px-3" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900">Password</label>
                            <input type="password" required value={formData.password} onChange={e => setFormData(prev => ({...prev, password: e.target.value}))} className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 px-3" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900">Confirm Password</label>
                            <input type="password" required value={formData.confirmPassword} onChange={e => setFormData(prev => ({...prev, confirmPassword: e.target.value}))} className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 px-3" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900">I am a</label>
                        <select value={formData.role} onChange={e => setFormData(prev => ({...prev, role: e.target.value}))} className="mt-1 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 px-3">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
                    </div>

                    <div className="pt-2">
                        <button type="submit" className="flex w-full justify-center rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                            Create Account
                        </button>
                    </div>
                </form>
                
                <p className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold leading-6 text-brand-600 hover:text-brand-500">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
