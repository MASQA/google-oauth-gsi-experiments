'use client'

import React, { useState, useEffect } from 'react';
import { provider } from "../services";
import { Credentials } from 'google-auth-library';
import {
    googleLogout,
    type SuccessAuthCodeResponse,
    type SuccessTokenResponse,
} from "google-oauth-gsi";

interface UserInfo {
    id_token?: string;
    access_token?: string;
    name?: string;
    email?: string;
    picture?: string;
    grantedScopes?: string[];
    isAuthenticated: boolean;
}

const AuthStatus = () => {
    const [userInfo, setUserInfo] = useState<UserInfo>({
        isAuthenticated: false
    });

    // Проверяем статус аутентификации при загрузке компонента
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = () => {
        // Проверяем наличие токенов в localStorage
        const storedTokens = localStorage.getItem('google_auth_tokens');
        if (storedTokens) {
            try {
                const tokens = JSON.parse(storedTokens);
                setUserInfo(prev => ({
                    ...prev,
                    ...tokens,
                    isAuthenticated: true
                }));
            } catch (error) {
                console.error('Error parsing stored tokens:', error);
                localStorage.removeItem('google_auth_tokens');
            }
        }
    };

    const handleLoginSuccess = async (tokenResponse: SuccessAuthCodeResponse) => {
        console.log("(auth-code) tokenResponse: ", tokenResponse);
        const { code } = tokenResponse;
        
        try {
            const response = await fetch(`/api/auth/google`, {
                method: 'POST',
                body: JSON.stringify({ code }),
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = (await response.json()) as Credentials;
            
            if (data.id_token) {
                // Получаем информацию о пользователе
                const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
                    headers: {
                        'Authorization': `Bearer ${data.access_token}`
                    }
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    
                    const newUserInfo = {
                        id_token: data.id_token,
                        access_token: data.access_token || undefined,
                        name: userData.name,
                        email: userData.email,
                        picture: userData.picture,
                        grantedScopes: data.scope?.split(' ') || [],
                        isAuthenticated: true
                    };
                    
                    setUserInfo(newUserInfo);
                    
                    // Сохраняем токены в localStorage
                    localStorage.setItem('google_auth_tokens', JSON.stringify(newUserInfo));
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
            setUserInfo({ isAuthenticated: false });
        }
    };

    const handleImplicitLogin = (tokenResponse: SuccessTokenResponse) => {
        console.log("(implicit) tokenResponse: ", tokenResponse);

        // Для implicit flow получаем информацию о пользователе
        if (tokenResponse.access_token) {
            fetch('https://openidconnect.googleapis.com/v1/userinfo', {
                headers: {
                    'Authorization': `Bearer ${tokenResponse.access_token}`
                }
            })
            .then(response => response.json())
            .then(userData => {
                const newUserInfo = {
                    access_token: tokenResponse.access_token,
                    name: userData.name,
                    email: userData.email,
                    picture: userData.picture,
                    grantedScopes: tokenResponse.scope?.split(' ') || [],
                    isAuthenticated: true
                };
                
                setUserInfo(newUserInfo);
                localStorage.setItem('google_auth_tokens', JSON.stringify(newUserInfo));
            })
            .catch(err => console.error('Error fetching user info:', err));
        }
    };

    const handleLogout = () => {
        googleLogout();
        setUserInfo({ isAuthenticated: false });
        localStorage.removeItem('google_auth_tokens');
        console.log('User logged out');
    };

    const loginWithCode = provider.useGoogleLogin({
        flow: 'auth-code',
        ux_mode: 'popup',
        onSuccess: handleLoginSuccess,
        onError: (res) => {
            console.error('Failed to login with google', res);
            setUserInfo({ isAuthenticated: false });
        },
    });

    const loginWithToken = provider.useGoogleLogin({
        flow: 'implicit',
        prompt: 'select_account',
        onSuccess: handleImplicitLogin,
        onError: (res) => {
            console.error('Failed to login with google', res);
            setUserInfo({ isAuthenticated: false });
        }
    });

    if (!userInfo.isAuthenticated) {
        return (
            <div style={styles.container}>
                <div style={styles.status}>
                    <div style={{...styles.statusIndicator, backgroundColor: '#ef4444'}}></div>
                    <span style={styles.statusText}>Не авторизован</span>
                </div>
                
                <div style={styles.buttonGroup}>
                    <button 
                        style={styles.loginButton}
                        onClick={() => loginWithCode()}
                    >
                        Войти через Google (Auth Code - Popup)
                    </button>
                    <button 
                        style={styles.loginButton}
                        onClick={() => loginWithToken()}
                    >
                        Войти через Google (Implicit - Popup)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.status}>
                <div style={{...styles.statusIndicator, backgroundColor: '#10b981'}}></div>
                <span style={styles.statusText}>Авторизован</span>
            </div>

            {userInfo.picture && (
                <img 
                    src={userInfo.picture} 
                    alt="User avatar" 
                    style={styles.avatar}
                    referrerPolicy="no-referrer"
                />
            )}

            <div style={styles.userInfo}>
                {userInfo.name && (
                    <div style={styles.infoRow}>
                        <strong>Имя:</strong> {userInfo.name}
                    </div>
                )}
                
                {userInfo.email && (
                    <div style={styles.infoRow}>
                        <strong>Email:</strong> {userInfo.email}
                    </div>
                )}

                {userInfo.grantedScopes && userInfo.grantedScopes.length > 0 && (
                    <div style={styles.infoRow}>
                        <strong>Разрешения:</strong>
                        <ul style={styles.scopeList}>
                            {userInfo.grantedScopes.map((scope, index) => (
                                <li key={index} style={styles.scopeItem}>
                                    {scope}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {userInfo.id_token && (
                    <div style={styles.infoRow}>
                        <strong>ID Token:</strong>
                        <div style={styles.token}>
                            {userInfo.id_token.substring(0, 20)}...
                        </div>
                    </div>
                )}

                {userInfo.access_token && (
                    <div style={styles.infoRow}>
                        <strong>Access Token:</strong>
                        <div style={styles.token}>
                            {userInfo.access_token.substring(0, 20)}...
                        </div>
                    </div>
                )}
            </div>

            <button 
                style={styles.logoutButton}
                onClick={handleLogout}
            >
                Выйти
            </button>
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        maxWidth: '500px',
        margin: '20px auto',
        fontFamily: 'Arial, sans-serif',
    },
    status: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
    },
    statusIndicator: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        marginRight: '8px',
    },
    statusText: {
        fontSize: '16px',
        fontWeight: 'bold',
    },
    avatar: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        marginBottom: '16px',
    },
    userInfo: {
        marginBottom: '16px',
    },
    infoRow: {
        marginBottom: '12px',
        fontSize: '14px',
    },
    scopeList: {
        margin: '8px 0 0 0',
        paddingLeft: '20px',
    },
    scopeItem: {
        fontSize: '12px',
        color: '#6b7280',
        marginBottom: '4px',
    },
    token: {
        fontSize: '11px',
        fontFamily: 'monospace',
        backgroundColor: '#e5e7eb',
        padding: '4px 8px',
        borderRadius: '4px',
        marginTop: '4px',
        wordBreak: 'break-all' as const,
    },
    buttonGroup: {
        display: 'flex',
        gap: '8px',
        flexDirection: 'column' as const,
    },
    loginButton: {
        padding: '10px 16px',
        backgroundColor: '#4285f4',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
    },
    logoutButton: {
        padding: '10px 16px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
    },
};

export default AuthStatus;