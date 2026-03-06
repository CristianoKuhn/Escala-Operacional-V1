
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vgpqmjeluliozxhvogeg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IfeK4gi0-Bd-She8xLAK7A_DINzXUPo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
