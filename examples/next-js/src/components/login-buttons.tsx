'use client'

import React from 'react';
import { provider } from "../services";
import { Credentials } from 'google-auth-library';
import {
    googleLogout,
    hasGrantedAnyScopeGoogle,
    hasGrantedAllScopesGoogle,
} from "google-oauth-gsi";

const LoginButtons = () => {
    // Функция не нужна для auth-code flow с redirect
    // Google сам перенаправит на API endpoint, который вернет HTML страницу
    // с JavaScript для сохранения токена и перенаправления

    const loginWithCodeLocalStorage = provider.useGoogleLogin({
        flow: 'auth-code',
        ux_mode: 'redirect',
        select_account: true,
        redirect_uri: 'http://localhost:3000/api/auth/google',
        onError: (res) => console.error('Failed to login with google', res),
    })

    const loginWithCodeHttpOnly = provider.useGoogleLogin({
        flow: 'auth-code',
        ux_mode: 'redirect',
        select_account: true,
        redirect_uri: 'http://localhost:3000/api/auth/google-http-only',
        onError: (res) => console.error('Failed to login with google', res),
    })
    const loginWithToken = provider.useGoogleLogin({
        flow: 'implicit',
        prompt: 'select_account', 
        onSuccess: (tokenResponse) => {
            console.log("(implicit) tokenResponse: ", tokenResponse)
            const hasGrantedAnyScope = hasGrantedAnyScopeGoogle(
                tokenResponse,
                'email'
            )
            const hasGrantedAllScopes = hasGrantedAllScopesGoogle(
                tokenResponse,
                'profile'
            )
            console.log("hasGrantedAnyScope: ", hasGrantedAnyScope)
            console.log("hasGrantedAllScopes: ", hasGrantedAllScopes)
        }
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
            <h3>Auth-Code Flow (LocalStorage)</h3>
            <button onClick={() => loginWithCodeLocalStorage()}>
                Sign in with google (auth-code + localStorage)
            </button>
            
            <h3>Auth-Code Flow (HttpOnly Cookie)</h3>
            <button onClick={() => loginWithCodeHttpOnly()}>
                Sign in with google (auth-code + http-only)
            </button>
            
            <h3>Implicit Flow</h3>
            <button onClick={() => loginWithToken()}>
                Sign in with google (implicit)
            </button>
            
            <button onClick={googleLogout}>
                Logout
            </button>
        </div>
    );
}

export default LoginButtons;