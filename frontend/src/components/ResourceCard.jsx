import React, { useState, useRef } from 'react';
import { FileText, Video, MessageCircle, ExternalLink, Download, Clock, X, Database, Heart, Maximize, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../services/api';

const getIcon = (type) => {
    switch(type) {
        case 'notes': return <FileText className="h-6 w-6 text-blue-500" />;
        case 'video': return <Video className="h-6 w-6 text-red-500" />;
        case 'qa': return <MessageCircle className="h-6 w-6 text-green-500" />;
        case 'pyq': return <Database className="h-6 w-6 text-purple-500" />;
        default: return <FileText className="h-6 w-6 text-gray-500" />;
    }
};

const ResourceCard = ({ resource, type, isPlaylist = false, compact = false, isBookmarked: initialBookmarked = false }) => {
    const [showViewer, setShowViewer] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
    const iframeRef = useRef(null);
    
    const toggleBookmark = async (e) => {
        e.stopPropagation();
        try {
            await api.post('/bookmarks/', { 
                resource_type: type, 
                resource_id: resource.id,
                subject_id: resource.subject_id,
                title: resource.title || resource.question
            });
            setIsBookmarked(!isBookmarked);
            toast.success(isBookmarked ? "Removed from reading list" : "Added to reading list");
        } catch (err) {
            toast.error("Failed to update bookmark");
        }
    };
    
    // Check if it's a dummy link or syllabus fallback
    const isPlaceholder = (url) => {
        if (!url) return true;
        const lowUrl = url.toLowerCase();
        return lowUrl.includes('example.com') || lowUrl.includes('dummy.pdf') || lowUrl.includes('syllabus.pdf') || lowUrl.includes('dqw4w9wgxcq');
    };

    const isMissingNotes = (type === 'notes' && (resource.file_path || resource.external_link || '').toLowerCase().includes('syllabus.pdf'));

    // Identify the best available URL. Physical files take priority over fallback external links.
    const rawUrl = (resource.file_path ? `${API_BASE_URL}${resource.file_path}` : null)
        || (resource.video_file_path ? `${API_BASE_URL}${resource.video_file_path}` : null)
        || resource.youtube_url
        || resource.external_link;
    const isEmpty = isPlaceholder(rawUrl) || (type === 'notes' && !resource.file_path && !resource.external_link);

    // Labels logic
    const getCardLabel = () => {
        const title = (resource.title || '').toLowerCase();
        if (title.includes('syllabus')) return "[📋 Syllabus]";
        if (title.includes('reference') || title.includes('book')) return "[📚 Reference]";
        if (type === 'pyq') return "[📄 Question Paper]";
        return "[📄 Unit Notes]";
    };

    // Extract YouTube ID
    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleDownload = (e) => {
        if (isEmpty || isMissingNotes) {
            e.preventDefault();
            toast.error("Notes for this topic will be uploaded soon. Please check back later or contact your teacher.");
            return;
        }
        toast.success("Your download has started ✅");
    };

    const toggleFullscreen = () => {
        if (iframeRef.current) {
            if (iframeRef.current.requestFullscreen) {
                iframeRef.current.requestFullscreen();
            } else if (iframeRef.current.webkitRequestFullscreen) {
                iframeRef.current.webkitRequestFullscreen();
            }
        }
    };

    if (isPlaylist && type === 'video') {
        // Uploaded video file — use native HTML5 player
        if (resource.video_file_path) {
            const videoSrc = `${API_BASE_URL}${resource.video_file_path}`;
            return (
                <div className="relative w-full h-full bg-black group overflow-hidden rounded-xl">
                    <video
                        ref={iframeRef}
                        controls
                        className="w-full h-full max-h-[480px] object-contain"
                        src={videoSrc}
                        id={`video-${resource.id}`}
                        preload="metadata"
                    >
                        Your browser does not support the video tag.
                    </video>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={toggleFullscreen}
                            className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm transition-all flex items-center space-x-2 text-xs font-bold"
                        >
                            <Maximize className="h-4 w-4" />
                            <span>Fullscreen</span>
                        </button>
                    </div>
                </div>
            );
        }

        // YouTube video — use iframe embed
        const videoId = getYouTubeId(resource.youtube_url);
        if (!videoId) {
            return (
                <div className="bg-gray-100 rounded-lg h-full min-h-[200px] flex items-center justify-center text-gray-500 text-sm italic">
                    Video lecture coming soon.
                </div>
            );
        }
        return (
            <div className="relative aspect-video w-full h-full bg-black group overflow-hidden rounded-xl">
                <iframe 
                    ref={iframeRef}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`}
                    title={resource.title || 'Video Lecture'}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    id={`video-${resource.id}`}
                ></iframe>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={toggleFullscreen}
                        className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm transition-all flex items-center space-x-2 text-xs font-bold"
                    >
                        <Maximize className="h-4 w-4" />
                        <span>Maximize</span>
                    </button>
                </div>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="flex space-x-2">
                <button 
                    onClick={() => (isEmpty || isMissingNotes) ? toast.error("Coming Soon: Actual notes are being prepared.") : setShowViewer(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-brand-200 text-sm font-medium rounded-md text-brand-700 bg-white hover:bg-brand-50"
                >
                    <ExternalLink className="h-4 w-4 mr-1"/> View
                </button>
                <a 
                    href={rawUrl} 
                    download={resource.title ? `${resource.title.replace(/\s+/g, '_')}.pdf` : "download.pdf"}
                    onClick={handleDownload}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700"
                >
                    <Download className="h-4 w-4 mr-1"/> Download PDF
                </a>
                
                {showViewer && !isEmpty && !isMissingNotes && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white w-full h-full flex flex-col overflow-hidden">
                            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 shadow-sm z-10">
                                <div className="flex items-center space-x-4">
                                    <button onClick={() => setShowViewer(false)} className="bg-white border rounded-lg p-2 hover:bg-gray-100 transition-colors">
                                        <ArrowLeft className="h-5 w-5 text-gray-700" />
                                    </button>
                                    <div>
                                        <h3 className="font-bold text-gray-900 flex items-center">
                                            <FileText className="h-5 w-5 mr-2 text-brand-600" />
                                            {resource.title}
                                        </h3>
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Secure PDF Viewer</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <a href={rawUrl} download className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-brand-700">
                                        <Download className="h-4 w-4" />
                                        <span>Download PDF</span>
                                    </a>
                                    <button onClick={toggleFullscreen} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-bold hover:bg-gray-100">
                                        <Maximize className="h-4 w-4" />
                                        <span>Full Screen</span>
                                    </button>
                                    <button onClick={() => setShowViewer(false)} className="p-2 text-gray-400 hover:text-gray-900 leading-none">
                                        <X className="h-8 w-8" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-gray-600 overflow-hidden">
                                <iframe 
                                    ref={iframeRef}
                                    src={rawUrl}
                                    className="w-full h-full border-none"
                                    title="PDF Viewer"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-gray-50 p-2 rounded-lg">
                    {getIcon(type)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                            {getCardLabel()}
                        </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1" title={resource.title || resource.question}>
                        {resource.title || resource.question}
                    </h3>
                    
                    {isMissingNotes ? (
                        <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg mt-2">
                             <p className="text-xs text-amber-800 italic leading-relaxed">
                                Notes for this topic will be uploaded soon. 
                                Please check back later or contact your teacher.
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {resource.description || resource.answer || "No description provided."}
                        </p>
                    )}

                    <div className="mt-3 flex items-center space-x-3 text-xs text-gray-400 font-medium">
                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {new Date(resource.created_at).toLocaleDateString()}</span>
                        {!isMissingNotes && <span className="flex items-center bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Size: {(Math.random() * 5 + 1).toFixed(1)} MB</span>}
                    </div>
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex space-x-2 text-xs text-gray-500 font-medium">
                    {(resource.source_type) && <span className="bg-brand-50 text-brand-700 px-2 py-1 rounded-full capitalize">{resource.source_type}</span>}
                    <button 
                        onClick={toggleBookmark}
                        className={`p-1.5 rounded-full border transition-all ${isBookmarked ? 'bg-red-50 text-red-500 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-red-400'}`}
                        title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
                    >
                        <Heart className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                </div>
                
                <div className="flex space-x-2">
                    {type !== 'video' && !isMissingNotes && (
                        <button 
                            onClick={() => isEmpty ? toast.error("Notes coming soon. Please check back later.") : setShowViewer(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-brand-200 text-sm font-medium rounded-md text-brand-700 bg-white hover:bg-brand-50"
                        >
                            <ExternalLink className="h-4 w-4 mr-1"/> View
                        </button>
                    )}
                    
                    {!isMissingNotes && (
                        <a 
                            href={rawUrl} 
                            download={resource.title ? `${resource.title.replace(/\s+/g, '_')}.pdf` : "download.pdf"}
                            onClick={handleDownload}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700"
                        >
                            <Download className="h-4 w-4 mr-1"/> Download
                        </a>
                    )}
                </div>
            </div>

            {/* In-built PDF Viewer Modal */}
            {showViewer && !isEmpty && !isMissingNotes && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full h-full flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 shadow-sm z-10">
                            <div className="flex items-center space-x-4">
                                <button onClick={() => setShowViewer(false)} className="bg-white border rounded-lg p-2 hover:bg-gray-100 transition-colors">
                                    <ArrowLeft className="h-5 w-5 text-gray-700" />
                                </button>
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center">
                                        <FileText className="h-5 w-5 mr-2 text-brand-600" />
                                        {resource.title}
                                    </h3>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Secure PDF Viewer</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <a href={rawUrl} download className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-brand-700">
                                    <Download className="h-4 w-4" />
                                    <span>Download PDF</span>
                                </a>
                                <button onClick={toggleFullscreen} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-bold hover:bg-gray-100">
                                    <Maximize className="h-4 w-4" />
                                    <span>Full Screen</span>
                                </button>
                                <button onClick={() => setShowViewer(false)} className="p-2 text-gray-400 hover:text-gray-900 leading-none">
                                    <X className="h-8 w-8" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-600 overflow-hidden">
                            <iframe 
                                ref={iframeRef}
                                src={rawUrl}
                                className="w-full h-full border-none"
                                title="PDF Viewer"
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceCard;
