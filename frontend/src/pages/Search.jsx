import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Search as SearchIcon, Database, Video, BookOpen, MessageCircle, FileText } from 'lucide-react';

const typeIcons = {
    'subject': <BookOpen className="h-5 w-5 text-indigo-500" />,
    'note': <FileText className="h-5 w-5 text-blue-500" />,
    'qa': <MessageCircle className="h-5 w-5 text-green-500" />,
    'video': <Video className="h-5 w-5 text-red-500" />,
    'pyq': <Database className="h-5 w-5 text-purple-500" />
};

const typeToTab = {
    'note': 'notes',
    'qa': 'qa',
    'video': 'videos',
    'pyq': 'pyq'
};

const Search = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    
    const [input, setInput] = useState(query);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        if (query) {
            handleSearch(query);
        }
    }, [query]);

    const handleSearch = async (q) => {
        if (!q.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const res = await api.get(`/search/?q=${encodeURIComponent(q)}`);
            setResults(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const submitSearch = (e) => {
        e.preventDefault();
        setSearchParams({ q: input });
    };

    const getLink = (res) => {
        if (res.type === 'subject') return `/subjects/${res.id}`;
        const tab = typeToTab[res.type] || 'notes';
        return `/subjects/${res.subject_id}?tab=${tab}`;
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto text-center py-12">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Search Smart Library</h1>
                <p className="text-gray-500 mb-8 max-w-xl mx-auto">Find notes, video lectures, and previous year questions instantly using our AI-indexed database.</p>
                
                <form onSubmit={submitSearch} className="relative group max-w-2xl mx-auto">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                        <SearchIcon className="h-6 w-6 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="block w-full rounded-2xl border-0 py-5 pl-14 pr-32 text-gray-900 shadow-xl ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-lg transition-all"
                        placeholder="Topics, subject codes, or questions..."
                    />
                    <button type="submit" className="absolute right-3 top-3 bg-brand-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-brand-700 hover:scale-105 transition-all">
                        Search
                    </button>
                </form>
            </div>

            <div className="mt-8 max-w-5xl mx-auto px-4 pb-20">
                {loading ? (
                    <div className="space-y-4">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center space-x-4 animate-pulse">
                                <div className="h-10 w-10 bg-gray-100 rounded-lg"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                                    <div className="h-6 bg-gray-100 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : searched && results.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="bg-white p-4 rounded-full w-20 h-20 mx-auto shadow-sm flex items-center justify-center mb-6">
                            <Database className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No matches found</h3>
                        <p className="mt-2 text-gray-500 max-w-sm mx-auto">We couldn't find anything matching "{query}". Try searching for broader terms or subject codes.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {results.length > 0 && (
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">{results.length} Results for "{query}"</h2>
                            </div>
                        )}
                        {results.map((res, idx) => (
                            <Link 
                                to={getLink(res)} 
                                key={idx}
                                className="group block bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:border-brand-300 hover:shadow-xl transition-all animate-in slide-in-from-bottom-2 duration-300"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0 bg-gray-50 p-3 rounded-xl group-hover:bg-brand-50 transition-colors">
                                            {/* Safe fallback for icon */}
                                            {typeIcons[res.type] || <FileText className="h-6 w-6 text-gray-500" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2 mb-1.5">
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${
                                                    res.type === 'subject' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                                                    res.type === 'qa' ? 'bg-green-50 border-green-100 text-green-600' :
                                                    res.type === 'video' ? 'bg-red-50 border-red-100 text-red-600' :
                                                    res.type === 'pyq' ? 'bg-purple-50 border-purple-100 text-purple-600' :
                                                    'bg-blue-50 border-blue-100 text-blue-600'
                                                }`}>
                                                    {res.type === 'pyq' ? 'Previous Paper' : res.type}
                                                </span>
                                                {res.subject_id && <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Subject ID: {res.subject_id}</span>}
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-1">{res.title}</h3>
                                            <p className="text-gray-500 mt-1 line-clamp-2 text-sm leading-relaxed">{res.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-brand-50 p-2 rounded-full">
                                            <SearchIcon className="h-5 w-5 text-brand-600" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;
