import { createClient } from '@supabase/supabase-js'

// Diisi dari Environment Variables di Vercel (lihat README.md)
// Anon key ini AMAN buat ditaruh di frontend — dia cuma bisa baca
// data publik dan tidak bisa nulis apa-apa tanpa login (lihat RLS
// policy di supabase/schema.sql).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase env vars belum di-set. Cek VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env / Vercel project settings.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
