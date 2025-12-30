'use client'

import React, { useEffect, useState } from 'react';
import { googleLogout } from 'google-oauth-gsi';

interface Privileges {
  serviceCalls: number;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  createdAt: string;
  lastCallAt: string | null;
  version?: number;
}

interface UserInfo {
  name?: string;
  email?: string;
  picture?: string;
}

const DashboardPrivileges = () => {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [privileges, setPrivileges] = useState<Privileges | null>(null);
    const [loading, setLoading] = useState(true);
    const [serviceResult, setServiceResult] = useState<any>(null);

    useEffect(() => {
        // Получаем информацию о пользователе
        fetch('/api/user-info')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user info');
                }
                return response.json();
            })
            .then(data => {
                setUserInfo(data);
                // Получаем привилегии
                return fetch('/api/user/privileges');
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch privileges');
                }
                return response.json();
            })
            .then(data => {
                setPrivileges(data.privileges);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                setLoading(false);
                // Если не удалось получить информацию, перенаправляем на главную
                window.location.href = '/';
            });
    }, []);

    const handleUseService = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/service/persistent-usage', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                setServiceResult(result);
                // Немедленно обновляем UI с данными из ответа сервера
                setPrivileges(prev => prev ? {
                    ...prev,
                    serviceCalls: result.remainingCalls,
                    lastCallAt: new Date().toISOString()
                } : null);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Service usage error:', error);
            alert('Failed to use service');
        } finally {
            setLoading(false);
        }
    };

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

    if (!userInfo || !privileges) {
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
                <h1>Dashboard with Privileges</h1>
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
                marginBottom: '20px'
            }}>
                <h2>User Information</h2>
                
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
            </div>

            <div style={{ 
                backgroundColor: privileges.serviceCalls > 0 ? '#e8f5e8' : '#ffe8e8', 
                padding: '20px', 
                borderRadius: '10px',
                marginBottom: '20px'
            }}>
                <h2>Service Privileges</h2>
                <p><strong>Subscription:</strong> {privileges.subscriptionTier.toUpperCase()}</p>
                <p><strong>Remaining Service Calls:</strong> 
                    <span style={{ 
                        color: privileges.serviceCalls > 3 ? 'green' : privileges.serviceCalls > 0 ? 'orange' : 'red',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        marginLeft: '10px'
                    }}>
                        {privileges.serviceCalls}
                    </span>
                </p>
                <p><strong>Account Created:</strong> {new Date(privileges.createdAt).toLocaleDateString()}</p>
                {privileges.lastCallAt && (
                    <p><strong>Last Service Use:</strong> {new Date(privileges.lastCallAt).toLocaleString()}</p>
                )}

                <button 
                    onClick={handleUseService}
                    disabled={privileges.serviceCalls <= 0 || loading}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: privileges.serviceCalls > 0 ? '#4CAF50' : '#cccccc', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: privileges.serviceCalls > 0 ? 'pointer' : 'not-allowed',
                        marginTop: '15px'
                    }}
                >
                    {loading ? 'Processing...' : 'Use Service (1 call)'}
                </button>

                {privileges.serviceCalls <= 0 && (
                    <div style={{
                        marginTop: '15px',
                        padding: '20px',
                        backgroundColor: '#fff3cd',
                        borderRadius: '5px',
                        border: '1px solid #ffeaa7'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#856404' }}>
                            ⚠️ Limit Exceeded!
                        </h3>
                        <p style={{ margin: '0 0 20px 0', color: '#856404' }}>
                            You've used all {privileges.subscriptionTier === 'free' ? '10 free' : privileges.subscriptionTier === 'premium' ? '100 premium' : '1000 enterprise'} service calls.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => window.location.href = '/payment'}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                💳 Upgrade Plan
                            </button>
                            
                            <button
                                onClick={() => window.open('https://t.me/your_telegram', '_blank')}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                💬 Contact Developer
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {serviceResult && (
                <div style={{ 
                    backgroundColor: '#d4edda', 
                    padding: '20px', 
                    borderRadius: '10px',
                    border: '1px solid #c3e6cb'
                }}>
                    <h2>Last Service Result</h2>
                    <p><strong>Status:</strong> {serviceResult.message}</p>
                    <p><strong>Calls Remaining:</strong> {serviceResult.remainingCalls}</p>
                    <p><strong>Executed at:</strong> {new Date().toLocaleString()}</p>
                </div>
            )}

            <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                backgroundColor: '#e3f2fd', 
                borderRadius: '5px',
                fontSize: '14px'
            }}>
                <h3>How it works:</h3>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                    <li>Each user starts with <strong>10 free service calls</strong></li>
                    <li>Each service use consumes <strong>1 call</strong></li>
                    <li>When calls reach <strong>0</strong>, service is blocked</li>
                    <li>Token is stored in <strong>HttpOnly cookie</strong> (secure)</li>
                    <li>Privileges are managed on the <strong>server side</strong></li>
                </ul>
            </div>
        </div>
    );
};

export default DashboardPrivileges;