'use client'

import { useEffect } from 'react';
import LoginButtons from "../components/login-buttons";

export default function Home() {
  useEffect(() => {
    // Check if user is already logged in (localStorage version)
    const token = localStorage.getItem('google_token');
    if (token) {
      window.location.href = '/dashboard';
    }
    
    // Для HttpOnly cookie версии проверка не нужна,
    // так как dashboard сам проверит аутентификацию
  }, []);

  return (
    <main style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Google OAuth GSI Experiments</h1>
      <p>Please sign in to continue</p>
      <LoginButtons />
      
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        border: '1px solid #dee2e6'
      }}>
        <h2>🚀 HTTP-only Token Demo</h2>
        <p style={{ margin: '10px 0' }}>
          <strong>New:</strong> Complete example with token lifetime management and user privileges
        </p>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Token expires after 7 days</li>
          <li>10 free service calls per user</li>
          <li>Server-side privilege tracking</li>
          <li>Secure HttpOnly cookie storage</li>
        </ul>
        <a
          href="/service-demo"
          style={{
            display: 'inline-block',
            marginTop: '10px',
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px'
          }}
        >
          View Demo
        </a>
      </div>
    </main>
  );
}

