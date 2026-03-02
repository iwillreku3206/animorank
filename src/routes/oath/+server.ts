import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { BASE_URL, SECRET_CLIENT_ID, SECRET_CLIENT_SECRET, APP_JWT_SECRET } from '$env/static/private';
import { supabase } from "$lib/supabaseClient";
import jwt from 'jsonwebtoken';
import type { RequestHandler } from './$types';


export const GET: RequestHandler = async ({ url }) => {
  const redirectURL = `${BASE_URL}/oath`;
  const code = url.searchParams.get('code');
  let role = null;
  let id_token = null;

  if (!code) {
    throw new Error('Authorization code not found');
  }

  try {
    const oAuth2Client = new OAuth2Client(
      SECRET_CLIENT_ID,
      SECRET_CLIENT_SECRET,
      redirectURL
    );

    // Exchange the authorization code for tokens
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Verify the id_token
    id_token = tokens.id_token;

    if (!id_token) {
      throw new Error('ID token not found in tokens');
    }

    const ticket = await oAuth2Client.verifyIdToken({
      idToken: id_token,
      audience: SECRET_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Payload not found in ticket');
    } else {
      const { data, error } = await supabase.from('Teacher_list').select("*").eq('email', payload.email)
      if (!data) {
        throw new Error('Error retrieving data from Teacher_list table')
      }
      else if (data?.length > 0) {
        const { data, error } = await supabase
          .from('Teacher').insert([
            { email: payload.email, profile_url: payload?.picture, name: payload?.name, given_name: payload?.given_name, family_name: payload?.family_name }
          ])
        role = 'teacher';
      } else {
        const { data, error } = await supabase
          .from('Student').insert([
            { email: payload.email, profile_url: payload?.picture, name: payload?.name, given_name: payload?.given_name, family_name: payload?.family_name }
          ])
        role = 'student';
      }

      const accessToken = jwt.sign({ ...payload, role }, APP_JWT_SECRET);
      const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toUTCString(); // 2 weeks

      return new Response(null, {
        status: 303, // 303 means "See Other", commonly used for redirects after form submission
        headers: {
          'Set-Cookie': `token=${accessToken}; Expires=${expires};`, // Change it to be more secure in production
          'Location': '/'  // Redirect to a new path
        }
      });
    }
  } catch (err) {
    console.log('Error logging in with OAuth2 user', err);
    throw redirect(500, '/');
  }
};
