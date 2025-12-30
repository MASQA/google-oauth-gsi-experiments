'use client'

import React, { useEffect, useState } from 'react';
import { googleLogout } from 'google-oauth-gsi';

interface UserInfo {
  name?: string;
  email?: string;
  picture?: string;
}

const PaymentPage = () => {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<'premium' | 'enterprise'>('premium');

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

    const handlePayment = async () => {
        // В реальном приложении здесь была бы интеграция с платежной системой
        alert(`Payment integration would be here for ${selectedPlan} plan`);
        
        // После успешной оплаты можно перенаправить на dashboard
        // window.location.href = '/dashboard-secure';
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
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Upgrade Your Plan</h1>
                <div>
                    <button 
                        onClick={() => window.location.href = '/dashboard-secure'}
                        style={{ 
                            padding: '10px 20px', 
                            backgroundColor: '#6c757d', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        Back to Dashboard
                    </button>
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
            </div>

            <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '10px',
                marginBottom: '30px'
            }}>
                <h2>User Information</h2>
                
                {userInfo.picture && (
                    <img 
                        src={userInfo.picture} 
                        alt="Profile" 
                        style={{ 
                            width: '80px', 
                            height: '80px', 
                            borderRadius: '50%',
                            marginBottom: '15px'
                        }}
                    />
                )}
                <p><strong>Name:</strong> {userInfo.name || 'N/A'}</p>
                <p><strong>Email:</strong> {userInfo.email || 'N/A'}</p>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h2>Choose Your Plan</h2>
                
                <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                    {/* Premium Plan */}
                    <div 
                        style={{ 
                            flex: 1,
                            padding: '25px',
                            borderRadius: '10px',
                            border: selectedPlan === 'premium' ? '3px solid #007bff' : '1px solid #dee2e6',
                            backgroundColor: selectedPlan === 'premium' ? '#f8f9ff' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                        onClick={() => setSelectedPlan('premium')}
                    >
                        <h3 style={{ color: '#007bff', margin: '0 0 15px 0' }}>Premium</h3>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
                            $9.99<span style={{ fontSize: '14px', color: '#6c757d' }}>/month</span>
                        </div>
                        <ul style={{ paddingLeft: '20px', margin: '0 0 20px 0' }}>
                            <li>100 service calls</li>
                            <li>Priority support</li>
                            <li>Advanced features</li>
                            <li>Email notifications</li>
                        </ul>
                        <div style={{ 
                            padding: '10px', 
                            backgroundColor: '#e8f5e8', 
                            borderRadius: '5px',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            Most Popular
                        </div>
                    </div>

                    {/* Enterprise Plan */}
                    <div 
                        style={{ 
                            flex: 1,
                            padding: '25px',
                            borderRadius: '10px',
                            border: selectedPlan === 'enterprise' ? '3px solid #28a745' : '1px solid #dee2e6',
                            backgroundColor: selectedPlan === 'enterprise' ? '#f0fff4' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                        onClick={() => setSelectedPlan('enterprise')}
                    >
                        <h3 style={{ color: '#28a745', margin: '0 0 15px 0' }}>Enterprise</h3>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
                            $29.99<span style={{ fontSize: '14px', color: '#6c757d' }}>/month</span>
                        </div>
                        <ul style={{ paddingLeft: '20px', margin: '0 0 20px 0' }}>
                            <li>Unlimited service calls</li>
                            <li>24/7 dedicated support</li>
                            <li>All premium features</li>
                            <li>Custom integrations</li>
                            <li>API access</li>
                        </ul>
                        <div style={{ 
                            padding: '10px', 
                            backgroundColor: '#fff3cd', 
                            borderRadius: '5px',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            Best Value
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ 
                backgroundColor: '#e3f2fd', 
                padding: '20px', 
                borderRadius: '10px',
                marginBottom: '30px'
            }}>
                <h3>Payment Information</h3>
                <p style={{ fontSize: '14px', color: '#6c757d' }}>
                    This is a demo payment page. In a real application, you would integrate with:
                </p>
                <ul style={{ fontSize: '14px', color: '#6c757d' }}>
                    <li>Stripe</li>
                    <li>PayPal</li>
                    <li>Square</li>
                    <li>Or any other payment processor</li>
                </ul>
            </div>

            <div style={{ textAlign: 'center' }}>
                <button 
                    onClick={handlePayment}
                    style={{ 
                        padding: '15px 40px', 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontWeight: 'bold'
                    }}
                >
                    💳 Proceed to Payment
                </button>
                
                <p style={{ marginTop: '20px', fontSize: '14px', color: '#6c757d' }}>
                    Need help? <a href="https://t.me/your_telegram" target="_blank" style={{ color: '#007bff' }}>Contact our support team</a>
                </p>
            </div>

            <div style={{ 
                marginTop: '30px', 
                padding: '15px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '5px',
                fontSize: '12px',
                color: '#6c757d'
            }}>
                <p><strong>Demo Note:</strong> This is a demonstration page. In production, you would:</p>
                <ul>
                    <li>Integrate with a real payment processor</li>
                    <li>Store payment information securely</li>
                    <li>Implement subscription management</li>
                    <li>Add user billing history</li>
                    <li>Handle payment failures and refunds</li>
                </ul>
            </div>
        </div>
    );
};

export default PaymentPage;