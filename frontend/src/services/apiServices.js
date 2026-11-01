import api from './api';

export const authService = {
    forgotPassword: async (email) => {
        const res = await api.post('/auth/forgot-password', { email });
        return res.data;
    },
    resetPassword: async (token, new_password) => {
        const res = await api.post('/auth/reset-password', { token, new_password });
        return res.data;
    }
};

export const subjectService = {
    getSemesters: async () => {
        const res = await api.get('/subjects/semesters');
        return res.data;
    },
    getSubjects: async (semester_id = null) => {
        const postfix = semester_id ? `?semester_id=${semester_id}` : '';
        const res = await api.get(`/subjects/${postfix}`);
        return res.data;
    },
    getSubjectDetails: async (id) => {
        const res = await api.get(`/subjects/${id}`);
        return res.data;
    }
};

export const resourceService = {
    getNotes: async (subject_id) => {
        const res = await api.get(`/notes/?subject_id=${subject_id}`);
        return res.data;
    },
    getQAs: async (subject_id) => {
        const res = await api.get(`/qa/?subject_id=${subject_id}`);
        return res.data;
    },
    getVideos: async (subject_id) => {
        const res = await api.get(`/videos/?subject_id=${subject_id}`);
        return res.data;
    },
    getPYQs: async (subject_id) => {
        const res = await api.get(`/pyq/?subject_id=${subject_id}`);
        return res.data;
    },
    getSyllabus: async (subject_id) => {
        const res = await api.get(`/syllabus/?subject_id=${subject_id}`);
        return res.data;
    },
    // Upload a PDF/document for notes or PYQ
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    },
    // Upload a video file directly (mp4, webm, etc.)
    uploadVideoFile: async (file, onProgress) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload/video-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress
                ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
                : undefined,
            timeout: 0 // no timeout for large video files
        });
        return res.data;
    },
    createNote: async (data) => {
        const res = await api.post('/notes/', data);
        return res.data;
    },
    createPYQ: async (data) => {
        const res = await api.post('/pyq/', data);
        return res.data;
    },
    createVideo: async (data) => {
        const res = await api.post('/videos/', data);
        return res.data;
    },
    createQA: async (data) => {
        const res = await api.post('/qa/', data);
        return res.data;
    },
    deleteNote: async (id) => {
        const res = await api.delete(`/notes/${id}`);
        return res.data;
    },
    deleteVideo: async (id) => {
        const res = await api.delete(`/videos/${id}`);
        return res.data;
    },
    deleteQA: async (id) => {
        const res = await api.delete(`/qa/${id}`);
        return res.data;
    },
    deletePYQ: async (id) => {
        const res = await api.delete(`/pyq/${id}`);
        return res.data;
    }
};

export const classChatService = {
    getDoubts: async (subject_id) => {
        const res = await api.get(`/class-chat/subjects/${subject_id}/doubts`);
        return res.data;
    },
    createDoubt: async (subject_id, initial_message) => {
        const res = await api.post(`/class-chat/subjects/${subject_id}/doubts`, { subject_id, initial_message });
        return res.data;
    },
    getMessages: async (thread_id) => {
        const res = await api.get(`/class-chat/doubts/${thread_id}/messages`);
        return res.data;
    },
    postMessage: async (thread_id, data) => {
        const res = await api.post(`/class-chat/doubts/${thread_id}/messages`, data);
        return res.data;
    },
    resolveDoubt: async (thread_id) => {
        const res = await api.patch(`/class-chat/doubts/${thread_id}/resolve`);
        return res.data;
    },
    uploadChatFile: async (file, onProgress) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload/chat', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress
                ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
                : undefined,
            timeout: 60000 // 60s timeout for documents
        });
        return res.data;
    }
};
