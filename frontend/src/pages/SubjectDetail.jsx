import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { subjectService, resourceService } from '../services/apiServices';
import ResourceCard from '../components/ResourceCard';
import { MessageSquare, ArrowLeft, Bot, BookOpen, Search, ChevronDown, ChevronUp, Download, FileText, Video, Clock, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import api, { API_BASE_URL } from '../services/api';

const SubjectDetail = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'notes';
    const [subject, setSubject] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedQaId, setExpandedQaId] = useState(null);
    const [viewingPaper, setViewingPaper] = useState(null);
    const [bookmarks, setBookmarks] = useState([]);
    const [qaFilter, setQaFilter] = useState({ unit: 'all', importance: 'all' });
    const paperRef = useRef(null);

    const tabs = [
        { id: 'notes', name: 'Notes & Materials' },
        { id: 'videos', name: 'Video Lectures' },
        { id: 'qa', name: 'Question & Answers' },
        { id: 'pyq', name: 'Previous Year Questions' },
        { id: 'syllabus', name: 'Syllabus' }
    ];

    useEffect(() => {
        const fetchSubj = async () => {
            try {
                const sub = await subjectService.getSubjectDetails(id);
                setSubject(sub);
            } catch (err) {
                console.error(err);
            }
        };
        fetchSubj();
    }, [id]);

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t && tabs.some(tab => tab.id === t)) {
            setActiveTab(t);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchResources = async () => {
            setLoading(true);
            setSearchQuery('');
            setViewingPaper(null);
            try {
                let data = [];
                switch (activeTab) {
                    case 'notes': data = await resourceService.getNotes(id); break;
                    case 'videos': data = await resourceService.getVideos(id); break;
                    case 'qa': data = await resourceService.getQAs(id); break;
                    case 'pyq': data = await resourceService.getPYQs(id); break;
                    case 'syllabus': data = await resourceService.getSyllabus(id); break;
                }
                setResources(data);
                const bRes = await api.get('/bookmarks/');
                setBookmarks(bRes.data);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchResources();
    }, [id, activeTab]);

    const filteredResources = useMemo(() => {
        let items = resources;

        // Apply Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(r =>
                (r.title && r.title.toLowerCase().includes(q)) ||
                (r.description && r.description.toLowerCase().includes(q)) ||
                (r.question && r.question.toLowerCase().includes(q)) ||
                (r.answer && r.answer.toLowerCase().includes(q))
            );
        }

        // Apply Q&A specifics
        if (activeTab === 'qa') {
            if (qaFilter.unit !== 'all') {
                items = items.filter(r => r.unit_number === parseInt(qaFilter.unit));
            }
            if (qaFilter.importance === 'high') {
                items = items.filter(r => r.tags && r.tags.toLowerCase().includes('important'));
            }
        }

        return items;
    }, [resources, searchQuery, activeTab, qaFilter]);

    const pyqsSorted = useMemo(() => {
        if (activeTab !== 'pyq') return [];
        return [...filteredResources].sort((a, b) => (b.year || 2025) - (a.year || 2025));
    }, [filteredResources, activeTab]);

    const handleDownloadPDF = (elementId, filename) => {
        const element = document.getElementById(elementId);
        if (!element) {
            toast.error('Nothing to download yet. Make sure content is visible.');
            return;
        }
        const opt = {
            margin: 10,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        toast.success('Preparing PDF, please wait...');
        html2pdf().from(element).set(opt).save();
    };

    const highlightText = (text) => {
        if (!text) return text;
        const keywords = ['Algorithm', 'Architecture', 'Theory', 'Model', 'Theorem', 'Calculus', 'Matrix', 'Equation', 'Properties', 'Concept', 'Basics', 'System', 'Protocol'];
        let result = text;
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
            result = result.replace(regex, '<mark class="bg-yellow-200 px-1 rounded font-medium">$1</mark>');
        });
        return <span dangerouslySetInnerHTML={{ __html: result }} />;
    };

    if (!subject) return <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>;

    const renderFullPaper = (paper) => {
        if (!paper.content) return (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium italic">Full question paper format is currently being digitalized.</p>
                <button onClick={() => setViewingPaper(null)} className="mt-4 text-brand-600 font-bold hover:underline">Go Back</button>
            </div>
        );
        let content;
        try {
            // Check if already an object
            content = typeof paper.content === 'string' ? JSON.parse(paper.content) : paper.content;
        } catch (e) {
            return <div className="p-4 text-red-500">Error parsing paper content. Please check back later.</div>;
        }

        return (
            <div className="bg-gray-100 p-4 sm:p-8 rounded-xl border border-gray-200 shadow-inner animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto">
                    <button
                        onClick={() => setViewingPaper(null)}
                        className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:text-brand-600 font-bold flex items-center transition-all"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Paper List
                    </button>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-black transition-all"
                        >
                            🖨️ Print Paper
                        </button>
                        <button
                            onClick={() => handleDownloadPDF('paper-content', `${paper.title.replace(/ /g, '_')}.pdf`)}
                            className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-brand-700 transition-all"
                        >
                            📥 Download PDF
                        </button>
                    </div>
                </div>

                <div id="paper-content" className="bg-white p-12 sm:p-16 shadow-2xl border border-gray-300 max-w-4xl mx-auto font-serif text-black leading-tight">
                    {/* Header Block */}
                    <div className="text-center border-[3px] border-black p-6 mb-8 relative">
                        <div className="absolute top-4 left-4 border border-black px-2 py-1 text-[10px] font-bold">REG. NO: .................</div>
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-white border-2 border-black flex items-center justify-center">
                                <span className="font-bold text-[8px] text-center px-1">UNIVERSITY<br />LOGO</span>
                            </div>
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-[0.1em]">{content.university || "BPUT UNIVERSITY, ODISHA"}</h1>
                        <p className="mt-1 text-lg font-bold uppercase">{content.course || "B.Tech End Semester Examination"}</p>

                        <div className="mt-6 grid grid-cols-2 gap-y-2 text-left text-sm font-bold border-t border-black pt-4">
                            <div>Subject: <span className="uppercase">{subject.name}</span></div>
                            <div className="text-right">Subject Code: <span className="uppercase">{subject.code}</span></div>
                            <div>Year: {paper.year}</div>
                            <div className="text-right">Semester: {subject.semester_id} Semester</div>
                        </div>

                        <div className="mt-4 pt-4 border-t-[2px] border-black flex justify-between text-base font-black">
                            <span>Time: {paper.duration || "3 Hours"}</span>
                            <span>Max Marks: {paper.max_marks || 100}</span>
                        </div>
                    </div>

                    <div className="text-sm font-bold italic mb-8 border-b-2 border-black pb-2 text-center">
                        Figures in the right hand margin indicate marks. Candidates are required to give their answers in their own words as far as practicable.
                    </div>

                    {/* Section A */}
                    <div className="mb-10">
                        <div className="flex justify-between items-end border-b-2 border-black mb-4">
                            <h2 className="text-xl font-black uppercase">Section A</h2>
                            <span className="font-bold mb-1">(20 Marks)</span>
                        </div>
                        <p className="italic font-bold text-sm mb-6 underline">Attempt ALL questions. Each question carries 2 marks.</p>
                        <div className="space-y-4">
                            {(content.sectionA?.questions || []).map((q, idx) => (
                                <div key={idx} className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <span className="font-bold mr-2">Q{idx + 1}.</span>
                                        <span>{q.question || q.text}</span>
                                    </div>
                                    <div className="font-bold whitespace-nowrap">[{q.marks || 2}]</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section B */}
                    <div className="mb-10">
                        <div className="flex justify-between items-end border-b-2 border-black mb-4">
                            <h2 className="text-xl font-black uppercase">Section B</h2>
                            <span className="font-bold mb-1">(30 Marks)</span>
                        </div>
                        <p className="italic font-bold text-sm mb-6 underline">Attempt ANY THREE questions. Each question carries 10 marks.</p>
                        <div className="space-y-6">
                            {(content.sectionB?.questions || []).map((q, idx) => (
                                <div key={idx} className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <span className="font-bold mr-2">Q{idx + 1}.</span>
                                        <span>{q.question || q.text}</span>
                                    </div>
                                    <div className="font-bold whitespace-nowrap">[{q.marks || 10}]</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section C */}
                    <div className="mb-10">
                        <div className="flex justify-between items-end border-b-2 border-black mb-4">
                            <h2 className="text-xl font-black uppercase">Section C</h2>
                            <span className="font-bold mb-1">(50 Marks)</span>
                        </div>
                        <p className="italic font-bold text-sm mb-6 underline">Attempt ANY TWO questions. Each question carries 25 marks.</p>
                        <div className="space-y-8">
                            {(content.sectionC?.questions || []).map((q, idx) => (
                                <div key={idx} className="space-y-3">
                                    <div className="font-bold">Q{idx + 1}.</div>
                                    <div className="flex justify-between items-start pl-4">
                                        <div className="flex-1">
                                            <span className="mr-2 font-bold">(a)</span>
                                            <span>{q.partA?.question || q.partA?.text || "Calculative or analytical sub-question part A."}</span>
                                        </div>
                                        <div className="font-bold whitespace-nowrap">[{q.partA?.marks || 15}]</div>
                                    </div>
                                    <div className="flex justify-between items-start pl-4">
                                        <div className="flex-1">
                                            <span className="mr-2 font-bold">(b)</span>
                                            <span>{q.partB?.question || q.partB?.text || "Application based sub-question part B."}</span>
                                        </div>
                                        <div className="font-bold whitespace-nowrap">[{q.partB?.marks || 10}]</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-center mt-12 pt-8 border-t-2 border-black text-sm font-black tracking-[0.4em] uppercase">
                        — END OF PAPER —
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumbs */}
            <nav className="flex mb-4 text-xs font-bold uppercase tracking-widest text-gray-400" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                    <li><Link to="/dashboard" className="hover:text-brand-600 transition-colors">Home</Link></li>
                    <li><span className="mx-2">/</span></li>
                    <li><Link to="/subjects" className="hover:text-brand-600 transition-colors">Subjects</Link></li>
                    <li><span className="mx-2">/</span></li>
                    <li className="text-brand-600 truncate max-w-[150px]">{subject.name}</li>
                </ol>
            </nav>

            {/* Header */}
            <div className="mb-8">
                <Link to="/subjects" className="text-brand-600 hover:underline flex items-center text-sm mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Subjects
                </Link>
                <div className="sm:flex sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{subject.name}</h1>
                        <p className="mt-2 text-gray-500 max-w-2xl">{subject.description}</p>
                    </div>
                    <div className="mt-4 sm:flex-none flex space-x-3">
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 sticky top-16 bg-white/90 backdrop-blur-md z-40 -mx-4 px-4 sm:mx-0 sm:px-0">
                <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-widest snap-start
                                ${activeTab === tab.id
                                    ? 'border-brand-500 text-brand-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="mt-8 bg-white shadow-sm rounded-xl border border-gray-100 p-6 min-h-[500px]">

                {!viewingPaper && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                        <div className="relative max-w-md w-full">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder={`Search in ${tabs.find(t => t.id === activeTab)?.name}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                        {activeTab === 'syllabus' && resources.length > 0 && (
                            <button 
                                onClick={() => handleDownloadPDF('syllabus-table', `${subject.name}_Syllabus.pdf`)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <Download className="h-4 w-4 mr-2" /> Download Syllabus PDF
                            </button>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-50 animate-pulse rounded-lg border border-gray-100"></div>)}
                    </div>
                ) : activeTab === 'qa' ? (
                    // Q&A tab always renders its own container so filters are never hidden
                    <div className="flex flex-col space-y-6">
                        {/* Q&A Filters — always visible so users can reset */}
                        {resources.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm animate-in slide-in-from-top-2">
                                <span className="text-xs font-black uppercase tracking-widest text-gray-400 mr-2">Filter Bank:</span>
                                <div className="flex bg-white border rounded-lg p-1">
                                    {['all', '1', '2', '3', '4', '5'].map(u => (
                                        <button
                                            key={u}
                                            onClick={() => setQaFilter({ ...qaFilter, unit: u })}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${qaFilter.unit === u ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            {u === 'all' ? 'All Units' : `U${u}`}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex bg-white border rounded-lg p-1">
                                    <button
                                        onClick={() => setQaFilter({ ...qaFilter, importance: 'all' })}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${qaFilter.importance === 'all' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        All Qs
                                    </button>
                                    <button
                                        onClick={() => setQaFilter({ ...qaFilter, importance: 'high' })}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${qaFilter.importance === 'high' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        ⭐ Important
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleDownloadPDF('qa-list', `${subject.name}_QA_Bank.pdf`)}
                                    className="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
                                >
                                    <Download className="h-4 w-4 mr-2" /> Download PDF
                                </button>
                                <span className="text-xs font-bold text-gray-400 italic">{filteredResources.length} questions found</span>
                            </div>
                        )}

                        {resources.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-4 text-base font-semibold text-gray-900">Questions &amp; Answers coming soon.</h3>
                            </div>
                        ) : filteredResources.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                                <Search className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                                <p className="text-gray-600 font-semibold text-sm">No questions match your current filter.</p>
                                <button
                                    onClick={() => { setQaFilter({ unit: 'all', importance: 'all' }); setSearchQuery(''); }}
                                    className="mt-3 text-brand-600 font-bold text-sm hover:underline"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        ) : (
                            <div id="qa-list" className="space-y-6">
                                {filteredResources.map((qa) => (
                                    <div key={qa.id} className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm hover:border-brand-300 transition-all hover:shadow-md">
                                        <button
                                            onClick={() => setExpandedQaId(expandedQaId === qa.id ? null : qa.id)}
                                            className="w-full px-6 py-5 flex items-start justify-between bg-gray-50/50 hover:bg-gray-50 transition-colors focus:outline-none"
                                        >
                                            <div className="flex items-start space-x-4 text-left">
                                                <div className="flex-shrink-0 mt-1">
                                                    <span className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                                        Q
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-bold text-gray-900 leading-tight">
                                                        {qa.question || "Untitled Question"}
                                                        {qa.tags?.toLowerCase().includes('important') && <span className="ml-2 text-orange-500">⭐</span>}
                                                    </h4>
                                                    <div className="flex items-center mt-2 space-x-4">
                                                        {qa.unit_number && (
                                                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-blue-100">
                                                                Unit {qa.unit_number}
                                                            </span>
                                                        )}
                                                        {qa.marks && (
                                                            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-indigo-100">
                                                                {qa.marks} Marks
                                                            </span>
                                                        )}
                                                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border
                                                            ${qa.difficulty === 'easy' ? 'bg-green-50 text-green-700 border-green-100' :
                                                                qa.difficulty === 'hard' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                    'bg-yellow-50 text-yellow-700 border-yellow-100'}`}
                                                        >
                                                            {qa.difficulty || 'Medium'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ml-4 mt-2 shrink-0">
                                                {expandedQaId === qa.id ?
                                                    <div className="bg-white p-1 rounded-full shadow-sm ring-1 ring-gray-200"><ChevronUp className="h-5 w-5 text-brand-600" /></div> :
                                                    <div className="bg-white p-1 rounded-full shadow-sm ring-1 ring-gray-200"><ChevronDown className="h-5 w-5 text-gray-500" /></div>
                                                }
                                            </div>
                                        </button>

                                        {expandedQaId === qa.id && (
                                            <div className="px-6 py-8 bg-white border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
                                                <div className="flex items-start space-x-4">
                                                    <div className="flex-shrink-0">
                                                        <span className="h-9 w-9 rounded-lg bg-gray-800 flex items-center justify-center text-white font-extrabold text-sm shadow-sm capitalize">
                                                            Ans
                                                        </span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Detailed Expert Solution</div>
                                                        <div className="prose prose-brand max-w-none text-gray-800 whitespace-pre-line leading-relaxed text-base border-l-4 border-gray-100 pl-6 academic-prose">
                                                            {qa.answer || "Technical solution for this conceptual query is currently being updated by the department faculty."}
                                                        </div>
                                                        {qa.unit_number && (
                                                            <div className="mt-8 pt-4 border-t border-gray-50 flex items-center text-[10px] font-bold text-gray-400 italic">
                                                                Refer to Unit {qa.unit_number} curriculum for further context.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : filteredResources.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-base font-semibold text-gray-900">
                            {activeTab === 'videos' ? 'Video lecture coming soon.' :
                                activeTab === 'pyq' ? 'Previous Year Questions coming soon.' :
                                    'Notes coming soon. Please check back later.'}
                        </h3>
                    </div>
                ) : (
                    <>
                        {/* Tab Content Rendering */}
                        {activeTab === 'syllabus' && (
                            <div id="syllabus-table" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Curriculum Structure</h3>
                                    <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded italic">UGC / BPUT Compatible</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead>
                                            <tr className="bg-gray-50/30">
                                                <th className="py-4 pl-6 pr-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-24">Unit</th>
                                                <th className="px-3 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Content Breakdown</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {[...resources].sort((a, b) => a.unit_number - b.unit_number).map((entry) => (
                                                <tr key={entry.id} className="hover:bg-brand-50/20 transition-colors group">
                                                    <td className="py-6 pl-6 pr-3 align-top">
                                                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col items-center justify-center group-hover:border-brand-300 group-hover:scale-110 transition-all">
                                                            <span className="text-[8px] font-black text-gray-400 uppercase leading-none">Part</span>
                                                            <span className="text-lg font-black text-brand-600 leading-tight">0{entry.unit_number}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-6 align-top">
                                                        <div className="max-w-3xl">
                                                            <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-700 transition-colors">
                                                                {entry.title}
                                                            </h4>
                                                            <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none academic-prose">
                                                                {highlightText(entry.description)}
                                                            </div>
                                                            <div className="mt-4 flex items-center space-x-4">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-brand-400"></span>
                                                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">End of Module 0{entry.unit_number}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}



                        {activeTab === 'videos' && (
                            <div className="flex flex-col space-y-6">
                                {filteredResources.map((video, index) => (
                                    <div key={video.id} className="flex flex-col md:flex-row bg-white border rounded-xl overflow-hidden shadow-sm">
                                        <div className="md:w-1/3 shrink-0">
                                            <ResourceCard
                                                resource={video}
                                                type="video"
                                                isPlaylist={true}
                                                isBookmarked={bookmarks.some(b => b.resource_id === video.id && b.resource_type === 'video')}
                                            />
                                        </div>
                                        <div className="p-6 flex flex-col justify-center">
                                            <div className="text-xs font-bold tracking-wide text-brand-600 uppercase mb-2">Lecture {index + 1}</div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">{video.title}</h3>
                                            <p className="text-gray-600 mb-4">{video.description || "In-depth video lecture covering core concepts for this module."}</p>
                                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                                                <span className="flex items-center"><Video className="h-4 w-4 mr-1" /> YouTube Video</span>
                                                <span className="flex items-center"><Clock className="h-4 w-4 mr-1" /> ~45 mins</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'pyq' && (
                            viewingPaper ? (
                                renderFullPaper(viewingPaper)
                            ) : (
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {pyqsSorted.map((pyq) => (
                                        <div key={pyq.id} className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-all border-l-4 border-l-purple-500 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700 mb-2">Year {pyq.year || 2025}</span>
                                                        <h3 className="text-lg font-bold text-gray-900">{pyq.title || "Previous Year Question Paper"}</h3>
                                                        <div className="mt-2 text-sm text-gray-500 grid flex-wrap gap-1">
                                                            <p className="font-medium text-gray-700">{pyq.exam_type?.toUpperCase() || "BPUT END-SEM"}</p>
                                                            <p>Duration: 3 Hours &bull; Marks: 100</p>
                                                        </div>
                                                    </div>
                                                    <FileText className="h-8 w-8 text-purple-200" />
                                                </div>
                                            </div>
                                            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                {pyq.content ? (
                                                    <button
                                                        onClick={() => setViewingPaper(pyq)}
                                                        className="inline-flex items-center text-brand-600 font-bold text-sm hover:underline"
                                                    >
                                                        View Full Paper <ChevronDown className="h-4 w-4 ml-1 -rotate-90" />
                                                    </button>
                                                ) : (
                                                    <a 
                                                        href={`${API_BASE_URL}/${pyq.file_path}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-brand-600 font-bold hover:underline flex items-center"
                                                    >
                                                        <FileText className="h-3 w-3 mr-1" /> View PDF
                                                    </a>
                                                )}
                                                <ResourceCard
                                                    resource={pyq}
                                                    type="pyq"
                                                    compact={true}
                                                    isBookmarked={bookmarks.some(b => b.resource_id === pyq.id && b.resource_type === 'pyq')}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {activeTab === 'notes' && (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredResources.map((note) => (
                                    <ResourceCard
                                        key={note.id}
                                        resource={note}
                                        type="notes"
                                        isBookmarked={bookmarks.some(b => b.resource_id === note.id && b.resource_type === 'notes')}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SubjectDetail;
