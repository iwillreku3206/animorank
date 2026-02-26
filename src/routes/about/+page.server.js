import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { BASE_URL, SECRET_CLIENT_ID, SECRET_CLIENT_SECRET } from '$env/static/private';

export const actions = {
    login: async ({ request }) => {
         const redirectURL = `${BASE_URL}/oath`;

        const oAuth2Client = new OAuth2Client(
            SECRET_CLIENT_ID,
            SECRET_CLIENT_SECRET,
            redirectURL
        );


        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid'],
            prompt: 'consent'
        });

        return redirect(302, authUrl);
    }
};
