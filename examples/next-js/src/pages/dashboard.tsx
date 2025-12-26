'use client'

import React, { useEffect, useState } from 'react';
import { googleLogout } from 'google-oauth-gsi';

const Dashboard = () => {
    const [token, setToken] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        // Get token from localStorage
        const storedToken = localStorage.getItem('google_token');
        if (storedToken) {
            setToken(storedToken);
            // Decode JWT token to get user info
            try {
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                setUserInfo(payload);
            } catch (error) {
                console.error('Failed to decode token:', error);
            }
        } else {
            // If no token, redirect to home page
            window.location.href = '/';
        }
    }, []);

    const handleLogout = () => {
        // Remove token from localStorage
        localStorage.removeItem('google_token');
        // Google logout
        googleLogout();
        // Redirect to home page
        window.location.href = '/';
    };

    if (!token) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Loading...</h1>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Dashboard</h1>
                <button 
                    onClick={handleLogout}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#ff4444', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer' 
                    }}
                >
                    Logout
                </button>
            </div>

            <div style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '20px', 
                borderRadius: '10px',
                maxWidth: '600px'
            }}>
                <h2>User Information</h2>
                {userInfo && (
                    <div>
                        {userInfo.picture && (
                            <img 
                                src={userInfo.picture} 
                                alt="Profile" 
                                style={{ 
                                    width: '100px', 
                                    height: '100px', 
                                    borderRadius: '50%',
                                    marginBottom: '15px'
                                }}
                            />
                        )}
                        <p><strong>Name:</strong> {userInfo.name || 'N/A'}</p>
                        <p><strong>Email:</strong> {userInfo.email || 'N/A'}</p>
                        {userInfo.email_verified !== undefined && (
                            <p><strong>Email Verified:</strong> {userInfo.email_verified ? 'Yes' : 'No'}</p>
                        )}
                        <p><strong>Token (first 50 chars):</strong> {token.substring(0, 50)}...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;