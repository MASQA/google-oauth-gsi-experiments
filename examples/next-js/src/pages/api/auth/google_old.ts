import { Credentials, OAuth2Client } from 'google-auth-library';
import type { NextApiRequest, NextApiResponse } from 'next';

// Константы для централизованного управления
const REDIRECT_URI = 'http://localhost:3000/api/auth/google';
const ERROR_MESSAGES = {
METHOD_NOT_ALLOWED: 'Method Not Allowed',
MISSING_CODE: 'No code provided',
REDIRECT_MISMATCH: 'redirect_uri_mismatch',
TOKEN_FAILURE: 'Failed to retrieve tokens from Google',
INTERNAL_ERROR: 'Internal server error'
};

const HTTP_STATUS = {
METHOD_NOT_ALLOWED: 405,
BAD_REQUEST: 400,
INTERNAL_ERROR: 500,
SUCCESS: 200
};



const oAuth2Client = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_SECRET,
    REDIRECT_URI
);

type ErrorResponse = {
    message: string;
    details?: string;
    error?: string;
};

type ResponseData = {
    message: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData | Credentials>,
) {
    if (req.method !== 'POST') {
        res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        if (!req.body.code) {
            res.status(400).json({ message: 'No code provided' });
        }

        // exchange code for tokens
        const { tokens } = await oAuth2Client.getToken(req.body.code);
        res.status(500).json(tokens);
    } catch (err) {
        res.status(500).json({ message: 'Internal error' });
    }
}
