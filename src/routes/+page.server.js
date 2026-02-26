import { redirect } from '@sveltejs/kit';
import { auth, OAuth2Client } from 'google-auth-library';
import { BASE_URL, SECRET_CLIENT_ID, SECRET_CLIENT_SECRET } from '$env/static/private';
import { supabase } from "$lib/supabaseClient";

export const load = async ({ locals }) => {
    if (locals.user.role === 'teacher') {
    const { data, error } = await supabase
        .from('Problem_set')
        .select('*')
        .eq('owner_email', locals.user.email);

    return {
        psets: data,
    };
    } else if (locals.user.role === 'student') {    
    const { data, error } = await supabase
        .from('Problem_set')    
        .select('title, description, Problem (id, problem_name, visible), Teacher (name, profile_url)')
        .eq('is_global', true)
        .eq('Problem.visible', true);
    
    
    return {
        psets: data,
    };
    }
    else {
    return {
        psets: [],
    };
    }

}

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
    },

    createPset: async ({ request, locals }) => {
        if (locals.user) {
            if (locals.user.role !== 'teacher') {
                return {
                    data: null,
                    error: 'You are not authorized to create a problem.'
                };
            } 
            else {
                const formData = await request.formData();
                const input = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    owner_email: formData.get('owner_email'),
                    auto_accept: formData.get('auto_accept') === 'on' ? true : false,
                    is_global: formData.get('is_private') === 'on' ? false : true,
                };  

                // Check if input is valid
                if (!input.title || !input.description || !input.owner_email) {
                    return {
                        error: 'All fields are required'
                    }
                } else {
                    // Insert into database
                    const { data, error } = await supabase
                        .from('Problem_set')
                        .insert([
                            input
                        ]);

                    return {
                        data: data,
                        error: error
                    }
                }
            }

        }
    },
};
