import { supabase } from "$lib/supabaseClient";
import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { BASE_URL, SECRET_CLIENT_ID, SECRET_CLIENT_SECRET } from '$env/static/private';
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const { slug } = params;

  const { data, error } = await supabase
    .from('Problem_set')
    .select('*, Problem (id, problem_name, visible, lang), Teacher (name, profile_url)')
    .eq('id', slug)
    .eq('is_global', true)
    .eq('Problem.visible', true);

  if (data) {
    if (data.length > 0) {
      return {
        pset: data,
        user: locals.user,
        problems: data[0].Problem,
      };
    }
    else {
      return {
        pset: [],
        user: locals.user,
        problems: [],
      };
    }
  } else {
    return {
      pset: [],
      user: locals.user,
      problems: [],
    };
  }
};

export const actions: Actions = {
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
