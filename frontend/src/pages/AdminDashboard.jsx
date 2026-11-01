import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { resourceService } from '../services/apiServices';
import { 
    Users, Video, FileText, HelpCircle, BookOpen, 
    ShieldAlert, Activity, GitBranch, Trash2, Edit3, 
    Plus, Search, Filter, CheckCircle, XCircle, UploadCloud 
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [content, setContent] = useState([]);
    const [contentType, setContentType] = useState('videos');
    const [activeTab, setActiveTab] = useState('stats'); // stats, users, content, academic, scraper
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Universal Content Upload Form State
    const [showAddModal, setShowAddModal] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState(null);
    const [form, setForm] = useState({
        title: '',
        description: '',
        youtube_url: '',
        subject_id: '',
        semester_id: 1,
        topic: '',
        year: new Date().getFullYear(),
        exam_type: 'End Semester'
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        
        // Helper to fetch individually so one failure doesn't block others
        const safeFetch = async (endpoint, setter, label) => {
            try {
                const res = await api.get(endpoint);
                setter(res.data);
            } catch (err) {
                console.error(`Failed to fetch ${label}:`, err);
                toast.error(`Failed to load ${label}`);
            }
        };

        await Promise.all([
            safeFetch('/admin/stats', setStats, 'Statistics'),
            safeFetch('/admin/users', setUsers, 'Users List'),
            safeFetch('/import/jobs', setJobs, 'Import Jobs'),
            safeFetch('/subjects/', setSubjects, 'Subjects')
        ]);
        
        setLoading(false);
    };

    const fetchContent = async (type) => {
        // Standardize type mapping if needed
        let fetchType = type;
        try {
            const res = await api.get(`/admin/content/${fetchType}`);
            setContent(res.data);
            setContentType(type);
        } catch (err) {
            console.error(`Failed to fetch ${type}`, err);
        }
    };

    useEffect(() => {
        if (activeTab === 'content') {
            fetchContent(contentType);
        }
    }, [activeTab, contentType]);

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers(users.filter(u => u.id !== userId));
            toast.success("User deleted successfully.");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to delete user");
        }
    };

    const handleDeleteContent = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this item?`)) return;
        try {
            await api.delete(`/admin/content/${contentType}/${id}`);
            setContent(content.filter(item => item.id !== id));
            toast.success("Content deleted successfully.");
        } catch (err) {
            toast.error("Failed to delete content");
        }
    };

    const handleUpdateUserRole = async (userId, role, isActive) => {
        try {
            await api.put(`/admin/users/${userId}`, { role, is_active: isActive });
            setUsers(users.map(u => u.id === userId ? { ...u, role, is_active: isActive } : u));
            toast.success("User updated successfully.");
        } catch (err) {
            toast.error("Failed to update user");
        }
    };

    const handleUniversalUpload = async (e) => {
        e.preventDefault();
        setUploading(true);
        const tId = toast.loading("Processing upload...");
        
        try {
            let file_path = "";
            if (contentType !== 'videos' && contentType !== 'qa') {
                if (!file) throw new Error("File is required");
                const uploadRes = await resourceService.uploadFile(file);
                file_path = uploadRes.file_path;
            }

            const baseData = {
                title: form.title,
                description: form.description,
                subject_id: parseInt(form.subject_id),
                semester_id: parseInt(form.semester_id),
                topic: form.topic
            };

            if (contentType === 'videos') {
                await resourceService.createVideo({ ...baseData, youtube_url: form.youtube_url });
            } else if (contentType === 'notes') {
                await resourceService.createNote({ ...baseData, file_path });
            } else if (contentType === 'qa') {
                await resourceService.createQA({ ...baseData, question: form.title, answer: form.description });
            } else if (contentType === 'pyqs') {
                await resourceService.createPYQ({ ...baseData, file_path, year: parseInt(form.year), exam_type: form.exam_type });
            }

            toast.success("Material added successfully!", { id: tId });
            setShowAddModal(false);
            fetchContent(contentType);
            fetchInitialData(); // Update stats
            setFile(null);
            setForm({ ...form, title: '', description: '', youtube_url: '', topic: '' });
        } catch (err) {
            toast.error(err.message || "Failed to add material", { id: tId });
        } finally {
            setUploading(false);
        }
    };

    const triggerImport = async () => {
        const urlsArr = prompt("Enter URLs to scrape separated by comma (YouTube, Documentation, etc.):");
        if (!urlsArr) return;
        const urls = urlsArr.split(',').map(u => u.trim());
        try {
            await api.post('/import/trigger', urls);
            toast.success("Import job started!");
            fetchInitialData();
        } catch (err) {
            toast.error("Failed to start import");
        }
    };

    const deleteSubject = async (id) => {
        if (!window.confirm("Are you sure you want to delete this subject? All linked content will stay but lose its subject link.")) return;
        try {
            await api.delete(`/subjects/${id}`);
            toast.success("Subject deleted");
            fetchInitialData();
        } catch (err) {
            toast.error("Failed to delete subject");
        }
    };

    const [activeSubTab, setActiveSubTab] = useState('subjects'); // subjects, syllabus

    const academicContent = () => {
        if (activeSubTab === 'subjects') {
            return (
                <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Code</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Semester</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {subjects.map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{sub.name}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono text-xs">{sub.code}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">Semester {sub.semester_id}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                                        <button className="text-gray-400 hover:text-brand-600 mr-3 px-2 py-1 bg-gray-50 rounded-lg transition"><Edit3 className="h-4 w-4" /></button>
                                        <button onClick={() => deleteSubject(sub.id)} className="text-gray-400 hover:text-red-600 px-2 py-1 bg-gray-50 rounded-lg transition"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        return (
            <div className="p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Syllabus Management</h3>
                <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">Upload and manage syllabus units for each subject. Students use this for quick reference.</p>
                <button 
                    onClick={() => toast.info("Syllabus unit creation coming soon!")}
                    className="mt-6 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-2" /> Define New Unit
                </button>
            </div>
        );
    };

    const filteredUsers = users.filter(u => 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50 text-brand-600 font-bold animate-pulse">Loading Admin Console...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                            <ShieldAlert className="h-8 w-8 mr-4 text-brand-600" />
                            Admin Console
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">Complete control over users, content, and system operations.</p>
                    </div>
                    <div className="hidden md:block">
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-brand-100 text-brand-800">
                            <Activity className="h-4 w-4 mr-2" />
                            System Online
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 mb-8 overflow-x-auto">
                <nav className="-mb-px flex space-x-8 min-w-max">
                    {['stats', 'users', 'content', 'academic', 'scraper'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                py-4 px-1 border-b-2 font-medium text-sm capitalize
                                ${activeTab === tab 
                                    ? 'border-brand-500 text-brand-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab: Stats */}
            {activeTab === 'stats' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard icon={<Users className="text-blue-600" />} label="Total Students" value={stats?.users?.students || 0} color="bg-blue-50" />
                        <StatCard icon={<ShieldAlert className="text-purple-600" />} label="Total Teachers" value={stats?.users?.teachers || 0} color="bg-purple-50" />
                        <StatCard icon={<Activity className="text-green-600" />} label="System Users" value={stats?.users?.total || 0} color="bg-green-50" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <ContentStatCard 
                            icon={<Video className="h-5 w-5" />} 
                            label="Videos" 
                            count={stats?.content?.videos || 0} 
                            onClick={() => { setActiveTab('content'); setContentType('videos'); }}
                        />
                        <ContentStatCard 
                            icon={<FileText className="h-5 w-5" />} 
                            label="Notes" 
                            count={stats?.content?.notes || 0} 
                            onClick={() => { setActiveTab('content'); setContentType('notes'); }}
                        />
                        <ContentStatCard 
                            icon={<HelpCircle className="h-5 w-5" />} 
                            label="Q&A" 
                            count={stats?.content?.qa || 0} 
                            onClick={() => { setActiveTab('content'); setContentType('qa'); }}
                        />
                        <ContentStatCard 
                            icon={<BookOpen className="h-5 w-5" />} 
                            label="PYQs" 
                            count={stats?.content?.pyqs || 0} 
                            onClick={() => { setActiveTab('content'); setContentType('pyqs'); }}
                        />
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold mb-4">Quick Overview</h3>
                        <div className="w-full bg-gray-100 rounded-full h-4 mb-4">
                            <div 
                                className="bg-brand-500 h-4 rounded-full" 
                                style={{ width: `${(stats?.users?.teachers / stats?.users?.total) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500 flex justify-between">
                            <span>Teachers: {stats?.users?.teachers}</span>
                            <span>Students: {stats?.users?.students}</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Tab: Users */}
            {activeTab === 'users' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search by name or email..." 
                                className="pl-10 w-full rounded-lg border-gray-300 focus:ring-brand-500 focus:border-brand-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Joined</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3">
                                            <div className="font-medium text-gray-900">{user.full_name}</div>
                                            <div className="text-gray-500 text-xs">{user.email}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleUpdateUserRole(user.id, e.target.value, user.is_active)}
                                                className="text-sm rounded-md border-gray-300 py-1"
                                            >
                                                <option value="student">Student</option>
                                                <option value="teacher">Teacher</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <button 
                                                onClick={() => handleUpdateUserRole(user.id, user.role, !user.is_active)}
                                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                                {user.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                                {user.is_active ? 'Active' : 'Deactivated'}
                                            </button>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900 flex items-center justify-end w-full">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab: Content */}
            {activeTab === 'content' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {[
                                { id: 'videos', icon: <Video className="h-4 w-4 mr-2" /> },
                                { id: 'notes', icon: <FileText className="h-4 w-4 mr-2" /> },
                                { id: 'qa', icon: <HelpCircle className="h-4 w-4 mr-2" /> },
                                { id: 'pyqs', icon: <BookOpen className="h-4 w-4 mr-2" /> }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setContentType(item.id)}
                                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md capitalize ${contentType === item.id ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {item.icon}
                                    {item.id}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Upload {contentType === 'pyqs' ? 'PYQ' : contentType.slice(0, -1)}
                        </button>
                    </div>

                    <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Title / Subject</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Details</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Added On</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {content.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4 pl-4 pr-3 text-sm">
                                            <div className="font-medium text-gray-900 line-clamp-1">{item.title || item.topic || item.question || `ID: ${item.id}`}</div>
                                            {item.youtube_url && <div className="text-gray-400 text-xs truncate max-w-xs">{item.youtube_url}</div>}
                                            {item.file_path && <div className="text-brand-500 text-[10px] break-all max-w-[200px]">{item.file_path}</div>}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-gray-500">
                                            <div className="font-medium text-gray-700">{item.topic || (item.year ? `${item.year} - ${item.exam_type}` : 'N/A')}</div>
                                            <div className="text-xs text-gray-400">Sem: {item.semester_id} | Sub ID: {item.subject_id}</div>
                                        </td>
                                        <td className="px-3 py-4 text-sm text-gray-500">{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td className="px-3 py-4 text-right text-sm font-medium">
                                            <button onClick={() => handleDeleteContent(item.id)} className="text-red-100 p-2 hover:bg-red-500 hover:text-white rounded-lg transition">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {content.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="py-10 text-center text-gray-500 italic">No {contentType} found in the database.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab: Scraper */}
            {activeTab === 'scraper' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="sm:flex sm:items-center sm:justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <GitBranch className="h-5 w-5 mr-2 text-green-500" />
                            Import Jobs Flow
                        </h2>
                        <button onClick={triggerImport} className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 transition">
                            <Plus className="h-4 w-4 mr-2" />
                            Run New Scraper
                        </button>
                    </div>
                    
                    <div className="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-xl">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Job ID</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Progress</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date Executed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">#IM-{job.id}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                job.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                                job.status === 'running' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{job.resource_count} Items Parsed</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(job.started_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {jobs.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="py-12 text-center text-gray-500 italic">No scraper runs detected yet. Use the 'Run New Scraper' button to start importing university data.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
...
            {/* Tab: Academic */}
            {activeTab === 'academic' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setActiveSubTab('subjects')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSubTab === 'subjects' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Subjects
                            </button>
                            <button 
                                onClick={() => setActiveSubTab('syllabus')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSubTab === 'syllabus' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Syllabus
                            </button>
                        </div>
                        {activeSubTab === 'subjects' && (
                            <button 
                                onClick={async () => {
                                    const name = prompt("Enter Subject Name:");
                                    if (!name) return;
                                    const code = prompt("Enter Subject Code:");
                                    if (!code) return;
                                    const sem = prompt("Enter Semester ID (1-8):");
                                    if (!sem) return;
                                    try {
                                        await api.post('/subjects/', { name, code, semester_id: parseInt(sem) });
                                        toast.success("Subject added!");
                                        fetchInitialData();
                                    } catch (err) { toast.error("Failed to add subject"); }
                                }}
                                className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition shadow-sm font-semibold"
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Subject
                            </button>
                        )}
                    </div>
                    {academicContent()}
                </div>
            )}

            {/* Universal Add Modal Overlay */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-8 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-full">
                            <XCircle className="h-6 w-6" />
                        </button>
                        <h2 className="text-2xl font-bold mb-6 flex items-center">
                            <UploadCloud className="h-6 w-6 mr-3 text-brand-600" />
                            Add New {contentType.slice(0, -1).toUpperCase()}
                        </h2>
                        
                        <form onSubmit={handleUniversalUpload} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    {contentType === 'qa' ? 'Question' : 'Title'}
                                </label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder={contentType === 'qa' ? "Enter the question" : "e.g. Introduction to Algorithms Note"}
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500 transition-all font-medium h-12 px-4 bg-gray-50/50"
                                    value={form.title}
                                    onChange={e => setForm({...form, title: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                                    <select 
                                        required
                                        className="w-full rounded-xl border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500 transition-all h-12 px-3 bg-gray-50/50"
                                        value={form.subject_id}
                                        onChange={e => setForm({...form, subject_id: parseInt(e.target.value)})}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (Sem {s.semester_id})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Semester</label>
                                    <select 
                                        className="w-full rounded-xl border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500 h-12 px-3 bg-gray-50/50"
                                        value={form.semester_id}
                                        onChange={e => setForm({...form, semester_id: parseInt(e.target.value)})}
                                    >
                                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {contentType === 'videos' ? (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">YouTube URL</label>
                                    <input 
                                        required
                                        type="url" 
                                        placeholder="https://youtube.com/watch?v=..."
                                        className="w-full rounded-xl border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500 h-12 px-4 bg-gray-50/50"
                                        value={form.youtube_url}
                                        onChange={e => setForm({...form, youtube_url: e.target.value})}
                                    />
                                </div>
                            ) : contentType === 'pyqs' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Year</label>
                                        <input 
                                            type="number" 
                                            className="w-full rounded-xl border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500 h-12 px-4 bg-gray-50/50"
                                            value={form.year}
                                            onChange={e => setForm({...form, year: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Exam Type</label>
                                        <input 
                                            type="text" 
                                            placeholder="Mid Semester"
                                            className="w-full rounded-xl border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500 h-12 px-4 bg-gray-50/50"
                                            value={form.exam_type}
                                            onChange={e => setForm({...form, exam_type: e.target.value})}
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {(contentType === 'notes' || contentType === 'pyqs') && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">PDF File Attachment</label>
                                    <div 
                                        onClick={() => document.getElementById('file-input').click()}
                                        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand-400 hover:bg-brand-50/30 transition cursor-pointer"
                                    >
                                        <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-600">{file ? file.name : "Click to select or drag PDF file"}</p>
                                        <input 
                                            id="file-input"
                                            type="file" 
                                            className="hidden" 
                                            accept=".pdf"
                                            onChange={e => setFile(e.target.files[0])}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    {contentType === 'qa' ? 'The Answer' : 'Topic / Description'}
                                </label>
                                <textarea 
                                    rows={3}
                                    placeholder={contentType === 'qa' ? "Provide a detailed answer..." : "Topic, unit details, or description..."}
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500 transition-all font-medium p-4 bg-gray-50/50"
                                    value={form.description}
                                    onChange={e => setForm({...form, description: e.target.value})}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={uploading}
                                className="w-full bg-brand-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-brand-700 shadow-lg transform transition active:scale-95 disabled:opacity-50 flex items-center justify-center ring-offset-2 focus:ring-2 focus:ring-brand-600"
                            >
                                {uploading ? "Processing..." : `Publish ${contentType.toUpperCase()}`}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon, label, value, color }) => (
    <div className={`p-6 rounded-2xl shadow-sm border border-gray-100 ${color} transition-transform hover:scale-[1.02]`}>
        <div className="flex items-center justify-between">
            <div className="p-3 rounded-lg bg-white shadow-sm">{icon}</div>
            <span className="text-3xl font-bold">{value}</span>
        </div>
        <p className="mt-4 text-gray-600 font-medium">{label}</p>
    </div>
);

const ContentStatCard = ({ icon, label, count, onClick }) => (
    <div 
        onClick={onClick}
        className="flex items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md cursor-pointer border-b-2 hover:border-b-brand-500"
    >
        <div className="p-2 rounded-lg bg-gray-50 text-brand-600 mr-4">{icon}</div>
        <div>
            <div className="text-xl font-bold">{count}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
        </div>
    </div>
);

export default AdminDashboard;
