import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Send, ArrowLeft, Users, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SubjectChat = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    
    const [room, setRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const fetchRoomAndMessages = async () => {
        try {
            const roomRes = await api.get(`/chat/rooms/${id}`);
            setRoom(roomRes.data);
            
            const msgRes = await api.get(`/chat/rooms/${roomRes.data.id}/messages`);
            setMessages(msgRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchRoomAndMessages();
        // Polling every 3 seconds for real-time requirement
        const interval = setInterval(fetchRoomAndMessages, 3000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || !room) return;
        
        try {
            await api.post(`/chat/rooms/${room.id}/messages`, {
                message_type: 'text',
                content: input
            });
            setInput('');
            fetchRoomAndMessages(); // Immediately re-fetch
        } catch (err) {
            console.error(err);
        }
    };

    if (!room) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg"></div>;

    return (
        <div className="h-[calc(100vh-[10rem])] flex flex-col">
            <div className="mb-4">
                <Link to={`/subjects/${id}`} className="text-brand-600 hover:underline flex items-center text-sm mb-2">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Subject
                </Link>
                <div className="flex items-center">
                    <Users className="h-6 w-6 text-gray-500 mr-2" />
                    <h1 className="text-2xl font-bold text-gray-900">Subject #{id} Community Chat</h1>
                </div>
            </div>

            <div className="flex-1 flex flex-col border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            Be the first to say hello!
                        </div>
                    )}
                    {messages.map((m, i) => {
                        const isMe = m.sender_id === user?.id;
                        return (
                            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="text-xs text-gray-400 mb-1 px-1">
                                    {isMe ? 'You' : `User ID: ${m.sender_id}`} • {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] ${isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none shadow-sm'}`}>
                                    {m.message_type === 'file' ? (
                                        <div className="flex items-center">
                                            <FileText className="h-4 w-4 mr-2" />
                                            {m.content}
                                        </div>
                                    ) : (
                                        <div className={`prose prose-sm max-w-none ${isMe ? 'prose-invert text-white' : 'text-gray-900'}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {m.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input form */}
                <div className="p-3 border-t border-gray-200 bg-white">
                    <form onSubmit={sendMessage} className="flex space-x-2 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Type a message..."
                            className="block w-full rounded-md border-0 py-2.5 pl-3 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-1 top-1.5 p-1.5 rounded-md bg-transparent text-brand-600 hover:bg-brand-50 disabled:opacity-50 transition-colors"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SubjectChat;
