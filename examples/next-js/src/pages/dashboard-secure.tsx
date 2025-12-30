'use client'

import React, { useEffect, useState } from 'react';
import { googleLogout } from 'google-oauth-gsi';

interface Privileges {
  serviceCalls: number;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  createdAt: string;
  lastCallAt: string | null;
  version: number; // Добавляем версию
}

interface UserInfo {
  name?: string;
  email?: string;
  picture?: string;
}

interface ServiceResult {
  success: boolean;
  message: string;
  remainingCalls: number;
  serverVersion: number;
}

const DashboardSecure = () => {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [privileges, setPrivileges] = useState<Privileges | null>(null);
    const [loading, setLoading] = useState(true);
    const [serviceResult, setServiceResult] = useState<ServiceResult | null>(null);
    const [clientVersion, setClientVersion] = useState<number>(0);

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
                setClientVersion(data.privileges.version || 0);
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
            
            // 🔒 ВАЖНО: Отправляем запрос на endpoint с ПОСТОЯННЫМ ХРАНЕНИЕМ
            const response = await fetch('/api/service/persistent-usage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // НЕ отправляем привилегии с клиента - сервер сам проверяет!
                body: JSON.stringify({})
            });
            
            const result = await response.json();
            
            if (result.success) {
                setServiceResult(result);
                
                // Немедленно обновляем UI с данными из ответа сервера
                setPrivileges(prev => prev ? {
                    ...prev,
                    serviceCalls: result.remainingCalls,
                    lastCallAt: new Date().toISOString(),
                    version: result.serverVersion
                } : null);
                
                setClientVersion(result.serverVersion);
                
                console.log(`Server version: ${result.serverVersion}, Client version: ${clientVersion}`);
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
                <h1>Dashboard (Secure Version)</h1>
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
                <h2>Service Privileges (Server-Side)</h2>
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
                <p><strong>Server Version:</strong> {privileges.version}</p>
                <p><strong>Account Created:</strong> {new Date(privileges.createdAt).toLocaleDateString()}</p>
                {privileges.lastCallAt && (
                    <p><strong>Last Service Use:</strong> {new Date(privileges.lastCallAt).toLocaleString()}</p>
                )}

                <button 
                    onClick={handleUseService}
                    disabled={loading}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#4CAF50', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer',
                        marginTop: '15px'
                    }}
                >
                    {loading ? 'Processing...' : 'Use Secure Service (1 call)'}
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
                    backgroundColor: serviceResult.success ? '#d4edda' : '#f8d7da', 
                    padding: '20px', 
                    borderRadius: '10px',
                    border: `1px solid ${serviceResult.success ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                    <h2>Service Result</h2>
                    <p><strong>Status:</strong> {serviceResult.message}</p>
                    <p><strong>Calls Remaining:</strong> {serviceResult.remainingCalls}</p>
                    <p><strong>Server Version:</strong> {serviceResult.serverVersion}</p>
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
                <h3>🔒 Security Features:</h3>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                    <li><strong>Server-Side Validation:</strong> Все проверки на сервере</li>
                    <li><strong>Token Verification:</strong> Каждый запрос проверяется через Google OAuth</li>
                    <li><strong>Version Tracking:</strong> Отслеживание изменений на сервере</li>
                    <li><strong>No Client Trust:</strong> Сервер не доверяет данным от клиента</li>
                    <li><strong>HttpOnly Cookie:</strong> Токен защищен от XSS</li>
                </ul>
            </div>

            <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                backgroundColor: '#fff3cd', 
                borderRadius: '5px',
                fontSize: '14px'
            }}>
                <h3>⚠️ Почему эта версия безопаснее:</h3>
                <p>В предыдущей версии можно было подделать <code>g_state</code> cookie, чтобы обмануть клиентский интерфейс. В этой версии:</p>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                    <li>Сервер <strong>самостоятельно проверяет</strong> привилегии</li>
                    <li>Клиентские данные <strong>игнорируются</strong> при проверке лимитов</li>
                    <li>Каждый запрос <strong>верифицирует токен</strong> через Google</li>
                    <li>Даже если подделать cookie, сервер <strong>отклонит запрос</strong></li>
                </ul>
            </div>
        </div>
    );
};

export default DashboardSecure;