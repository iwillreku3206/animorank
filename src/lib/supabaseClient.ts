import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SERVICE_KEY } from '$env/static/private'

// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
