import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Upload file to Supabase Storage
export async function uploadFileToStorage(
  file: Buffer | Blob,
  filename: string,
  contentType: string,
  userId: string,
  projectId: string
) {
  const key = `${userId}/${projectId}/${Date.now()}-${filename}`
  
  const { data, error } = await supabase.storage
    .from('files')
    .upload(key, file, {
      contentType,
      upsert: false,
    })

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('files')
    .getPublicUrl(key)

  return { key, publicUrl }
}
