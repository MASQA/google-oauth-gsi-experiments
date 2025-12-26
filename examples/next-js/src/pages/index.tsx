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
    </main>
  );
}

