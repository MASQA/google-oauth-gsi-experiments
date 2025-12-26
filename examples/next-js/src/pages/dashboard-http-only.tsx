'use client'

import React, { useEffect, useState } from 'react';
import { googleLogout } from 'google-oauth-gsi';

const DashboardHttpOnly = () => {
    const [userInfo, setUserInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Получаем информацию о пользователе с сервера
        fetch('/api/user-info')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user info');
                }
                return response.json();
            })
            .then(data => {
                setUserInfo(data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching user info:', error);
                setLoading(false);
                // Если не удалось получить информацию, перенаправляем на главную
                window.location.href = '/';
            });
    }, []);

    const handleLogout = async () => {
        try {
            // Вызываем API для выхода (очистка cookies)
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        // Google logout
        googleLogout();
        // Перенаправляем на главную страницу
        window.location.href = '/';
    };

    if (loading) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Loading...</h1>
            </div>
        );
    }

    if (!userInfo) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Not Authenticated</h1>
                <p>Please sign in first</p>
                <button onClick={() => window.location.href = '/'}>
                    Go to Login
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Dashboard (HttpOnly Cookie)</h1>
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
                <h2>User Information (from HttpOnly Cookie)</h2>
                
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
                
                <div style={{ 
                    marginTop: '20px', 
                    padding: '10px', 
                    backgroundColor: '#e8f5e8', 
                    borderRadius: '5px',
                    fontSize: '14px'
                }}>
                    <p><strong>Security:</strong> Token stored in HttpOnly cookie</p>
                    <p><strong>Benefits:</strong> More secure, not accessible via JavaScript</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardHttpOnly;