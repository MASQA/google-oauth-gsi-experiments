import { Credentials, OAuth2Client } from 'google-auth-library';
import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

// Централизованное управление константами
const REDIRECT_URI = 'http://localhost:3000/api/auth/google-http-only';
const ERROR_MESSAGES = {
    METHOD_NOT_ALLOWED: 'Method Not Allowed',
    MISSING_CODE: 'No code provided',
    MISSING_CREDENTIAL: 'No credential provided',
    REDIRECT_MISMATCH: 'redirect_uri_mismatch',
    TOKEN_FAILURE: 'Failed to retrieve tokens from Google',
    TOKEN_VERIFICATION_FAILURE: 'Failed to verify Google token',
    INTERNAL_ERROR: 'Internal server error'
};

const HTTP_STATUS = {
    METHOD_NOT_ALLOWED: 405,
    BAD_REQUEST: 400,
    INTERNAL_ERROR: 500,
    SUCCESS: 200
};

// Инициализация OAuth клиента с правильным redirect_uri
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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Credentials | ErrorResponse | string>
) {
    // Разрешить и GET и POST
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({
            message: ERROR_MESSAGES.METHOD_NOT_ALLOWED
        });
    }

    try {
        // Для GET запроса код будет в query параметрах
        const code = req.method === 'GET' 
            ? req.query.code as string
            : req.body.code;
        
        const credential = req.body.credential;

        // Обработка code от традиционного OAuth flow
        if (code) {
            const tokens = await exchangeCodeForTokens(code);
            
            // Устанавливаем HttpOnly cookie
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Только HTTPS в production
                sameSite: 'lax' as const,
                maxAge: 60 * 60 * 24 * 7, // 7 дней
                path: '/',
            };

            // Сохраняем id_token в cookie
            res.setHeader('Set-Cookie', [
                serialize('google_token', tokens.id_token || '', cookieOptions),
                serialize('google_access_token', tokens.access_token || '', cookieOptions),
            ]);
            
            // Если это GET запрос от Google OAuth redirect, возвращаем HTML страницу
            if (req.method === 'GET') {
                const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Successful</title>
    <script>
        // Токен уже в HttpOnly cookie, просто перенаправляем
        window.location.href = '/dashboard-http-only';
    </script>
</head>
<body>
    <p>Authentication successful. Redirecting...</p>
</body>
</html>
                `;
                res.setHeader('Content-Type', 'text/html');
                return res.status(HTTP_STATUS.SUCCESS).send(html);
            }
            
            // Для POST запросов возвращаем JSON
            return res.status(HTTP_STATUS.SUCCESS).json(tokens);
        }

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            message: ERROR_MESSAGES.MISSING_CODE + ' or ' + ERROR_MESSAGES.MISSING_CREDENTIAL
        });

    } catch (error) {
        console.error('Google Auth Error:', error);

        // Специальная обработка ошибки redirect_uri_mismatch
        if (error instanceof Error && error.message.includes('redirect_uri_mismatch')) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: ERROR_MESSAGES.REDIRECT_MISMATCH,
                details: `Требуемый redirect_uri: ${REDIRECT_URI}`
            });
        }

        // Общая обработка ошибок
        const errorMessage = error instanceof Error
            ? error.message
            : ERROR_MESSAGES.INTERNAL_ERROR;

        return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            message: ERROR_MESSAGES.INTERNAL_ERROR,
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });

    }
}

async function exchangeCodeForTokens(code: string): Promise<Credentials> {
    const { tokens } = await oAuth2Client.getToken({
        code,
        redirect_uri: REDIRECT_URI  // Явное указание для предотвращения mismatch
    });

    if (!tokens) {
        throw new Error(ERROR_MESSAGES.TOKEN_FAILURE);
    }

    return tokens;
}