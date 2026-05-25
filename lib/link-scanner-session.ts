import { createClient } from '@supabase/supabase-js';

export async function linkScannerSessionToUser(sessionId: string, userId: string): Promise<void> {
  if (!sessionId || !userId) return;
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  await supabase
    .from('scan_history')
    .update({ user_id: userId })
    .eq('session_id', sessionId)
    .is('user_id', null);

  await supabase
    .from('scanner_clickouts')
    .update({ user_id: userId })
    .eq('session_id', sessionId)
    .is('user_id', null);
}
