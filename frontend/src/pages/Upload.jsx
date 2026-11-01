import React, { useState, useEffect } from 'react';
import { resourceService, subjectService } from '../services/apiServices';
import { UploadCloud, FileType, FileText, Trash2, Film, Youtube, HardDrive } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';

const Upload = () => {
    const [file, setFile] = useState(null);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [resourceType, setResourceType] = useState('notes'); // notes, qa, pyq, video
    const [videoMode, setVideoMode] = useState('youtube'); // 'youtube' | 'file'
    const [year, setYear] = useState(new Date().getFullYear());
    const [examType, setExamType] = useState('End Semester');
    const [uploadProgress, setUploadProgress] = useState(0);

    const [semesters, setSemesters] = useState([]);
    const [semesterId, setSemesterId] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [myUploads, setMyUploads] = useState([]);

    const fetchMyUploads = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const decoded = jwtDecode(token);
            const curUserId = decoded.sub;
            const res = await api.get('/notes/');
            setMyUploads(res.data.filter(n => parseInt(n.uploaded_by) === parseInt(curUserId)));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchMyUploads();
    }, []);

    const handleDeleteRecord = async (id, type = 'notes') => {
        if (!window.confirm(`Delete this ${type}?`)) return;
        try {
            if (type === 'notes') await resourceService.deleteNote(id);
            else if (type === 'video') await resourceService.deleteVideo(id);
            else if (type === 'qa') await resourceService.deleteQA(id);
            else if (type === 'pyq') await resourceService.deletePYQ(id);
            toast.success("Deleted from LMS database");
            fetchMyUploads();
        } catch (e) {
            toast.error("Delete failed");
        }
    };

    useEffect(() => {
        const fetchSems = async () => {
            const sems = await subjectService.getSemesters();
            setSemesters(sems);
        };
        fetchSems();
    }, []);

    useEffect(() => {
        if (!semesterId) return;
        const fetchSubs = async () => {
            const subs = await subjectService.getSubjects(semesterId);
            setSubjects(subs);
        };
        fetchSubs();
    }, [semesterId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setUploadProgress(0);

        // Validation
        if (resourceType === 'video') {
            if (videoMode === 'youtube' && !youtubeUrl) {
                toast.error("Please enter a YouTube URL.");
                setLoading(false);
                return;
            }
            if (videoMode === 'file' && !file) {
                toast.error("Please select a video file.");
                setLoading(false);
                return;
            }
        } else if (!file) {
            toast.error("Please select a file.");
            setLoading(false);
            return;
        }

        try {
            const data = {
                title,
                description,
                subject_id: parseInt(subjectId),
                semester_id: parseInt(semesterId),
            };

            if (resourceType === 'notes') {
                toast.loading("Uploading PDF...", { id: 'upload' });
                const uploadRes = await resourceService.uploadFile(file);
                await resourceService.createNote({ ...data, file_path: uploadRes.file_path });

            } else if (resourceType === 'qa') {
                toast.loading("Uploading PDF...", { id: 'upload' });
                const uploadRes = await resourceService.uploadFile(file);
                await resourceService.createQA({
                    ...data,
                    question: title,
                    answer: description,
                    difficulty: 'Medium',
                    source: 'manual',
                    file_path: uploadRes.file_path
                });

            } else if (resourceType === 'pyq') {
                toast.loading("Uploading PDF...", { id: 'upload' });
                const uploadRes = await resourceService.uploadFile(file);
                await resourceService.createPYQ({
                    ...data,
                    file_path: uploadRes.file_path,
                    year: parseInt(year),
                    exam_type: examType
                });

            } else if (resourceType === 'video') {
                if (videoMode === 'youtube') {
                    // YouTube link — no file upload needed
                    await resourceService.createVideo({ ...data, youtube_url: youtubeUrl });
                } else {
                    // Direct video file upload
                    toast.loading("Uploading video file... 0%", { id: 'upload' });
                    const uploadRes = await resourceService.uploadVideoFile(file, (pct) => {
                        setUploadProgress(pct);
                        toast.loading(`Uploading video... ${pct}%`, { id: 'upload' });
                    });
                    await resourceService.createVideo({
                        ...data,
                        video_file_path: uploadRes.file_path
                    });
                }
            }

            toast.success("Material published successfully!", { id: 'upload' });
            setTitle('');
            setDescription('');
            setFile(null);
            setYoutubeUrl('');
            setUploadProgress(0);
        } catch (err) {
            console.error(err);
            const errMsg = err?.response?.data?.detail || "Failed to upload material.";
            toast.error(errMsg, { id: 'upload' });
        } finally {
            setLoading(false);
        }
    };

    const resetFile = () => { setFile(null); setUploadProgress(0); };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center">
                        <UploadCloud className="h-8 w-8 text-brand-600 mr-3" />
                        Teacher Upload Panel
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Upload notes, PYQs, videos, or Q&A for students.</p>
                </div>
            </div>

            <form className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-8" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    {/* Type selector */}
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Type</label>
                        <select
                            required
                            value={resourceType}
                            onChange={e => { setResourceType(e.target.value); resetFile(); }}
                            className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6"
                        >
                            <option value="notes">Notes PDF</option>
                            <option value="qa">Question & Answer PDF</option>
                            <option value="pyq">Previous Year Paper (PDF)</option>
                            <option value="video">Video</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Semester</label>
                        <select required value={semesterId} onChange={e => setSemesterId(e.target.value)} className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
                            <option value="">Select...</option>
                            {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Subject</label>
                        <select required value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!semesterId} className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 disabled:bg-gray-100">
                            <option value="">Select...</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className={resourceType === 'pyq' ? "sm:col-span-3" : "col-span-full"}>
                        <label className="block text-sm font-medium leading-6 text-gray-900">Title</label>
                        <div className="mt-2">
                            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Unit 1 Introduction Notes" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 px-3" />
                        </div>
                    </div>

                    {resourceType === 'pyq' && (
                        <>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium leading-6 text-gray-900">Year</label>
                                <input type="number" required value={year} onChange={e => setYear(e.target.value)} className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 px-3" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium leading-6 text-gray-900">Exam Type</label>
                                <input type="text" required value={examType} onChange={e => setExamType(e.target.value)} placeholder="e.g. End Semester" className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 px-3" />
                            </div>
                        </>
                    )}

                    <div className="col-span-full">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Description / Chapter Name</label>
                        <div className="mt-2">
                            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide context or chapter details..." className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 px-3" />
                        </div>
                    </div>

                    {/* ======== VIDEO SECTION ======== */}
                    {resourceType === 'video' ? (
                        <div className="col-span-full">
                            {/* Toggle: YouTube vs File Upload */}
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-5">
                                <button
                                    type="button"
                                    onClick={() => { setVideoMode('youtube'); resetFile(); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${videoMode === 'youtube' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <Youtube className="h-4 w-4" /> YouTube Link
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setVideoMode('file'); setYoutubeUrl(''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${videoMode === 'file' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <HardDrive className="h-4 w-4" /> Upload Video File
                                </button>
                            </div>

                            {videoMode === 'youtube' ? (
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">YouTube URL</label>
                                    <div className="mt-2">
                                        <input
                                            type="url"
                                            value={youtubeUrl}
                                            onChange={e => setYoutubeUrl(e.target.value)}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 px-3"
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 italic">The video will be embedded for students via the YouTube player.</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Video File</label>
                                    <div
                                        className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => document.getElementById('video-file-upload').click()}
                                    >
                                        <div className="text-center">
                                            <Film className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                            <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                                                <label htmlFor="video-file-upload" className="relative cursor-pointer rounded-md bg-transparent font-semibold text-brand-600 hover:text-brand-500">
                                                    <span>Click to browse</span>
                                                    <input
                                                        id="video-file-upload"
                                                        name="video-file-upload"
                                                        type="file"
                                                        accept="video/mp4,video/webm,video/ogg,video/avi,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.avi,.mov,.mkv,.ogv"
                                                        className="sr-only"
                                                        onChange={e => setFile(e.target.files[0])}
                                                    />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs leading-5 text-gray-600 mt-2">MP4, WebM, AVI, MOV, MKV — up to 500 MB</p>
                                            {file && (
                                                <div className="mt-4">
                                                    <p className="text-sm font-medium text-brand-600 bg-brand-50 inline-block px-3 py-1 rounded-full">{file.name}</p>
                                                    <p className="text-xs text-gray-400 mt-1">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Upload progress bar */}
                                    {loading && uploadProgress > 0 && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>Uploading video...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <p className="mt-2 text-xs text-gray-500 italic">Video will be stored on the server and played natively in the browser.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ======== PDF SECTION ======== */
                        <div className="col-span-full">
                            <label className="block text-sm font-medium leading-6 text-gray-900">PDF Attachment</label>
                            <div
                                className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => document.getElementById('file-upload').click()}
                            >
                                <div className="text-center">
                                    <FileType className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-transparent font-semibold text-brand-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-600 focus-within:ring-offset-2 hover:text-brand-500">
                                            <span>Click to browse</span>
                                            <input id="file-upload" name="file-upload" type="file" accept=".pdf" className="sr-only" onChange={e => setFile(e.target.files[0])} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-600 mt-2">PDF files only</p>
                                    {file && <p className="text-sm font-medium text-brand-600 mt-4 bg-brand-50 inline-block px-3 py-1 rounded-full">{file.name}</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex items-center justify-end border-t border-gray-900/10 pt-8">
                    <button type="submit" disabled={loading} className="rounded-md bg-brand-600 px-10 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50 flex items-center justify-center min-w-[160px]">
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {uploadProgress > 0 ? `${uploadProgress}%` : 'Publishing...'}
                            </>
                        ) : 'Publish Material'}
                    </button>
                </div>
            </form>

            {/* Recent uploads */}
            <div className="mt-12 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <FileType className="h-6 w-6 text-brand-600 mr-2" />
                        Your Recently Published Notes
                    </h3>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{myUploads.length} total</span>
                </div>
                <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-100">
                    <ul className="divide-y divide-gray-200">
                        {myUploads.length === 0 ? (
                            <li className="p-8 text-center text-gray-400 italic">No uploads found. Start by publishing your first unit!</li>
                        ) : (
                            myUploads.map((item) => (
                                <li key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-bold text-gray-900">{item.title}</p>
                                            <p className="text-xs text-gray-500">Subject ID: {item.subject_id} &bull; {new Date(item.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRecord(item.id)}
                                        className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Upload;
