'use client'

import React from 'react';
import Link from 'next/link';

const ServiceDemo = () => {
    return (
        <div style={{ 
            padding: '40px', 
            fontFamily: 'Arial, sans-serif',
            maxWidth: '800px',
            margin: '0 auto'
        }}>
            <h1>Service Demo - HTTP-only Token with Privileges</h1>
            
            <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '30px', 
                borderRadius: '10px',
                margin: '20px 0'
            }}>
                <h2>📚 Complete Guide</h2>
                
                <div style={{ margin: '20px 0' }}>
                    <h3>1️⃣ Token Lifetime</h3>
                    <p><strong>Current setting:</strong> 7 days (configurable)</p>
                    <ul>
                        <li>Stored in <code>HttpOnly</code> cookie</li>
                        <li>Automatically expires after <code>maxAge</code></li>
                        <li>Inaccessible to JavaScript (XSS protection)</li>
                        <li>Sent only over HTTPS in production</li>
                    </ul>
                </div>

                <div style={{ margin: '20px 0' }}>
                    <h3>2️⃣ User Privileges Storage</h3>
                    <p><strong>Implementation:</strong> Server-side storage</p>
                    <ul>
                        <li>User ID from Google OAuth (<code>payload.sub</code>)</li>
                        <li>Service call counter (starts at 10)</li>
                        <li>Subscription tier tracking</li>
                        <li>Usage timestamps</li>
                    </ul>
                    <p style={{ 
                        padding: '10px', 
                        backgroundColor: '#fff3cd', 
                        borderRadius: '5px',
                        fontSize: '14px'
                    }}>
                        <strong>Note:</strong> Demo uses in-memory storage. Production should use database (PostgreSQL, MongoDB, Redis)
                    </p>
                </div>

                <div style={{ margin: '20px 0' }}>
                    <h3>3️⃣ Dynamic Privilege Management</h3>
                    <p><strong>Service limit:</strong> 10 calls per user</p>
                    <ul>
                        <li>Counter decreases with each API call</li>
                        <li>API blocks requests when limit reached (HTTP 429)</li>
                        <li>Real-time privilege checking</li>
                        <li>Server-side enforcement (secure)</li>
                    </ul>
                </div>
            </div>

            <div style={{ 
                backgroundColor: '#e8f5e8', 
                padding: '20px', 
                borderRadius: '10px',
                margin: '20px 0'
            }}>
                <h2>🚀 Try It Out</h2>
                <ol>
                    <li>Sign in with Google (HttpOnly cookie will be set)</li>
                    <li>Navigate to Dashboard with Privileges</li>
                    <li>Use the service (consumes 1 call each time)</li>
                    <li>Watch your remaining calls decrease</li>
                    <li>See what happens when you reach 0 calls</li>
                </ol>
                
                <div style={{ marginTop: '20px' }}>
                    <Link href="/dashboard-privileges" style={{ 
                        display: 'inline-block',
                        padding: '12px 24px', 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        textDecoration: 'none', 
                        borderRadius: '5px',
                        marginRight: '10px'
                    }}>
                        Go to Privileges Dashboard
                    </Link>
                    
                    <Link href="/" style={{ 
                        display: 'inline-block',
                        padding: '12px 24px', 
                        backgroundColor: '#6c757d', 
                        color: 'white', 
                        textDecoration: 'none', 
                        borderRadius: '5px'
                    }}>
                        Back to Home
                    </Link>
                </div>
            </div>

            <div style={{ 
                backgroundColor: '#f0f4ff', 
                padding: '20px', 
                borderRadius: '10px',
                margin: '20px 0'
            }}>
                <h2>🔐 Security Benefits</h2>
                <ul>
                    <li><strong>HttpOnly:</strong> Tokens safe from XSS attacks</li>
                    <li><strong>Secure flag:</strong> Only transmitted over HTTPS</li>
                    <li><strong>SameSite:</strong> Prevents CSRF attacks</li>
                    <li><strong>Server-side validation:</strong> All checks happen on server</li>
                    <li><strong>Token verification:</strong> Google OAuth token verified on each request</li>
                </ul>
            </div>

            <div style={{ 
                backgroundColor: '#fff5f5', 
                padding: '20px', 
                borderRadius: '10px',
                margin: '20px 0'
            }}>
                <h2>⚙️ Key Configuration</h2>
                <pre style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '5px',
                    fontSize: '14px',
                    overflowX: 'auto'
                }}>
{`// Cookie configuration (google-http-only.ts)
const cookieOptions = {
    httpOnly: true,           // No JS access
    secure: process.env.NODE_ENV === 'production',  // HTTPS only
    sameSite: 'lax',          // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',                // Available site-wide
};

// Service usage check (usage.ts)
if (userUsage.serviceCalls <= 0) {
    return res.status(429).json({
        success: false,
        message: 'Service usage limit exceeded'
    });
}`}
                </pre>
            </div>
        </div>
    );
};

export default ServiceDemo;