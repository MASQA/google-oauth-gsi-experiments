import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { OAuth2Client } from 'google-auth-library';

type UserInfo = {
    name?: string;
    email?: string;
    picture?: string;
    email_verified?: boolean;
    sub?: string;
};

type ErrorResponse = {
    message: string;
    error?: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<UserInfo | ErrorResponse>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // Парсим cookies из запроса
        const cookies = parse(req.headers.cookie || '');
        const idToken = cookies.google_token;

        if (!idToken) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Верифицируем токен
        const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Возвращаем информацию о пользователе
        const userInfo: UserInfo = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            email_verified: payload.email_verified,
            sub: payload.sub
        };

        return res.status(200).json(userInfo);

    } catch (error) {
        console.error('User info error:', error);
        
        const errorMessage = error instanceof Error
            ? error.message
            : 'Internal server error';

        return res.status(500).json({
            message: 'Failed to get user info',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}