import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const ProtectedRoute = () => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return null; // Or a spinner
    return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export const RoleRoute = ({ allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    
    return allowedRoles.includes(user.role) ? <Outlet /> : <Navigate to="/dashboard" replace />;
};
