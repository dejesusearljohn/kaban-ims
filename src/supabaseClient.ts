import { createClient } from '@supabase/supabase-js'
import type { Database } from '../supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars are not set. Auth calls will fail.')
}

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '')
