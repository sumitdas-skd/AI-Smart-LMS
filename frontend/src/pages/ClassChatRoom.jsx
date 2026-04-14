import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { classChatService } from '../services/apiServices';
import { API_BASE_URL } from '../services/api';

import { Send, ArrowLeft, Mic, Image as ImageIcon, FileText, CheckCircle, Paperclip, X, StopCircle, Pin } from 'lucide-react';
import toast from 'react-hot-toast';

const ClassChatRoom = () => {
    const { threadId } = useParams();
    const { user } = useContext(AuthContext);
    
    const [messages, setMessages] = useState([]);
    const [isResolved, setIsResolved] = useState(false);
    
    // Input state
    const [inputText, setInputText] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    
    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const messagesEndRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const data = await classChatService.getMessages(threadId);
            setMessages(data);
            
            // To figure out if it's resolved, ideally we should get the thread obj. 
            // We'll skip it for simplicity or assume if a specific condition is met, but teacher has a button anyway 
            // Since we didn't fetch the thread object independently, let's just show resolve button always for teachers
        } catch (err) {
            console.error('Error fetching messages', err);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [threadId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendText = async (e) => {
        e?.preventDefault();
        if (!inputText.trim()) return;
        try {
            await classChatService.postMessage(threadId, {
                message_type: 'text',
                content: inputText
            });
            setInputText('');
            fetchMessages();
        } catch (err) {
            toast.error("Failed to send message");
        }
    };

    const handleImageSelected = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input
        e.target.value = "";

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file only.");
            return;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast.error("Image too large. Maximum size is 10MB.");
            return;
        }

        setUploading(true);
        const tempId = Date.now().toString();
        // Add a temporary progress message
        setMessages(prev => [...prev, {
            id: tempId,
            message_type: 'text',
            content: `📷 Uploading image...`,
            sender_id: user.id,
            created_at: new Date().toISOString(),
            is_temp: true
        }]);

        try {
            const uploadRes = await classChatService.uploadChatFile(file);
            
            // Remove temp message and post actual image
            setMessages(prev => prev.filter(m => m.id !== tempId));
            
            await classChatService.postMessage(threadId, {
                message_type: 'image',
                file_url: uploadRes.file_path,
                file_name: file.name
            });
            toast.success("Image sent!");
            fetchMessages();
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            toast.error("Image upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleDocumentSelected = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input
        e.target.value = "";

        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain"
        ];
        
        if (!allowedTypes.includes(file.type)) {
            toast.error("Unsupported file type. Please upload: PDF, Word, PowerPoint, Excel, or Text files.");
            return;
        }

        const maxSize = 20 * 1024 * 1024; // 20MB
        if (file.size > maxSize) {
            toast.error("Document too large. Maximum is 20MB.");
            return;
        }

        setUploading(true);
        const tempId = Date.now().toString();
        setMessages(prev => [...prev, {
            id: tempId,
            message_type: 'text',
            content: `📎 Uploading ${file.name}...`,
            sender_id: user.id,
            created_at: new Date().toISOString(),
            is_temp: true
        }]);

        try {
            const uploadRes = await classChatService.uploadChatFile(file);
            
            setMessages(prev => prev.filter(m => m.id !== tempId));
            
            await classChatService.postMessage(threadId, {
                message_type: 'document',
                file_url: uploadRes.file_path,
                file_name: file.name
            });
            toast.success("Document sent!");
            fetchMessages();
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            toast.error("Document upload failed");
        } finally {
            setUploading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = event => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            toast.error("Microphone access denied or error occurred.");
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const sendVoiceMessage = async () => {
        if (!audioBlob) return;
        setUploading(true);
        try {
            // Need to create a file out of the blob
            const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
            const uploadRes = await classChatService.uploadChatFile(audioFile);
            
            await classChatService.postMessage(threadId, {
                message_type: 'voice',
                file_url: uploadRes.file_path,
                file_name: 'Voice Message'
            });
            setAudioBlob(null);
            toast.success("Voice message sent!");
            fetchMessages();
        } catch(err) {
            toast.error("Failed to send voice message");
        } finally {
            setUploading(false);
        }
    };
    
    const cancelVoice = () => {
        setAudioBlob(null);
    };

    const markResolved = async () => {
        try {
            await classChatService.resolveDoubt(threadId);
            toast.success("Thread marked as resolved!");
            setIsResolved(true);
        } catch (err) {
            toast.error("Failed to resolve");
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col bg-gray-100 rounded-xl overflow-hidden shadow-lg border border-gray-200">
            {/* Header */}
            <div className="bg-white p-4 flex justify-between items-center shadow-sm z-10 border-b border-gray-200">
                <div className="flex items-center">
                    <Link to="/class-chat" className="text-gray-500 hover:border-gray-300 p-2 rounded-full mr-2 transition-colors hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Doubt Thread #{threadId}</h2>
                        <p className="text-xs text-green-500 font-medium flex items-center">
                            Real-time connection active
                        </p>
                    </div>
                </div>
                
                {user?.role !== 'student' && (
                    <button 
                        onClick={markResolved}
                        className="flex items-center px-4 py-2 bg-green-50 text-green-700 font-medium text-sm rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                    >
                        <CheckCircle className="h-4 w-4 mr-2" /> Mark Resolved
                    </button>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]">
                {messages.length === 0 && (
                    <div className="flex justify-center my-6">
                        <div className="bg-yellow-100 text-yellow-800 text-xs px-4 py-2 rounded-xl text-center shadow-sm border border-yellow-200">
                            Loading messages or no messages yet...
                        </div>
                    </div>
                )}
                
                {messages.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    const isTeacher = m.sender?.role === 'teacher';

                    return (
                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {m.is_pinned && (
                                <div className="text-xs text-gray-500 mb-1 flex items-center bg-white/80 px-2 py-0.5 rounded-full border border-gray-200 backdrop-blur-sm">
                                    <Pin className="h-3 w-3 mr-1 text-brand-500" /> Pinned
                                </div>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] shadow-sm overflow-hidden 
                                ${isMe ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none border border-gray-200'}`}>
                                
                                {!isMe && m.sender && (
                                    <div className={`text-xs font-bold mb-1 ${isTeacher ? 'text-blue-600' : 'text-gray-500'}`}>
                                        {m.sender.full_name} {isTeacher ? '(Teacher)' : ''}
                                    </div>
                                )}
                                
                                {/* Message Content Rendering Based on Type */}
                                {m.message_type === 'text' && (
                                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                                )}
                                
                                {m.message_type === 'image' && (
                                    <div className="flex flex-col">
                                        <div className="-mx-4 -mt-2.5 mb-2 overflow-hidden bg-gray-100 cursor-pointer">
                                            {/* We route the file URL through localhost backend static path if necessary, but here we assume it serves directly via API url */}
                                            <img src={`${API_BASE_URL}${m.file_url}`} alt="Attached" className="w-full max-h-64 object-cover hover:opacity-90 transition-opacity" loading="lazy" />
                                        </div>
                                        {m.content && <p className="text-sm text-gray-700 mt-2">{m.content}</p>}
                                    </div>
                                )}

                                {m.message_type === 'document' && (
                                    <a href={`${API_BASE_URL}${m.file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-black/5 rounded-xl hover:bg-black/10 transition-colors group">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3 group-hover:scale-110 transition-transform">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate">{m.file_name}</p>
                                            <p className="text-xs text-gray-500">Document</p>
                                        </div>
                                    </a>
                                )}

                                {m.message_type === 'voice' && (
                                    <div className="flex items-center space-x-2 py-1 min-w-[200px]">
                                        <button className="h-10 w-10 bg-brand-500 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-brand-600 transition-colors shadow-sm">
                                            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>
                                        <audio controls src={`${API_BASE_URL}${m.file_url}`} className="w-full h-10 max-w-[200px]" />
                                    </div>
                                )}

                                <div className="text-[10px] text-gray-500 text-right mt-1.5 font-medium">
                                    {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="bg-[#f0f2f5] px-4 py-3 flex items-center space-x-2 z-10 shadow-inner">
                {uploading ? (
                    <div className="flex-1 text-center text-sm font-medium text-brand-600 py-2 animate-pulse">
                        Uploading attachment...
                    </div>
                ) : audioBlob ? (
                    <div className="flex-1 flex items-center bg-white rounded-full px-4 py-2 border border-gray-200">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
                        <span className="text-sm font-medium flex-1">Voice message ready</span>
                        <button onClick={cancelVoice} className="text-gray-400 hover:text-red-500 mr-2 p-1">
                            <X className="h-5 w-5" />
                        </button>
                        <button onClick={sendVoiceMessage} className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600">
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex space-x-1">
                            <input
                                type="file"
                                id="image-upload-input"
                                accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
                                style={{ display: "none" }}
                                onChange={handleImageSelected}
                            />
                            <input
                                type="file"
                                id="document-upload-input"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                                style={{ display: "none" }}
                                onChange={handleDocumentSelected}
                            />
                            
                            <button
                                type="button"
                                className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full cursor-pointer transition-colors"
                                title="Send Image"
                                onClick={() => document.getElementById('image-upload-input').click()}
                            >
                                <ImageIcon className="h-6 w-6" />
                            </button>
                            
                            <button
                                type="button"
                                className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full cursor-pointer transition-colors"
                                title="Send Document"
                                onClick={() => document.getElementById('document-upload-input').click()}
                            >
                                <Paperclip className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSendText} className="flex-1">
                            <input
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full rounded-2xl py-2.5 px-4 bg-white border-0 shadow-sm focus:ring-1 focus:ring-brand-500 outline-none text-gray-900"
                            />
                        </form>
                        
                        {inputText.trim() ? (
                            <button onClick={handleSendText} className="bg-brand-600 p-2.5 text-white rounded-full hover:bg-brand-700 shadow-sm transition-transform hover:scale-105">
                                <Send className="h-5 w-5" />
                            </button>
                        ) : (
                            <button 
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onTouchStart={startRecording}
                                onTouchEnd={stopRecording}
                                className={`p-2.5 rounded-full text-white shadow-sm transition-all focus:outline-none ${isRecording ? 'bg-red-500 scale-110 animate-pulse' : 'bg-brand-600 hover:bg-brand-700'}`}
                                title="Hold to record voice message"
                            >
                                {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ClassChatRoom;
