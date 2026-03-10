import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iqaabbtaljuowjqzuyqq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wjssFF_l_jk2Uw_vKlcYCA_JjzeK6FY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
    console.log("Authenticating as a random user or using anon...");
    // Since RLS requires authenticated user, let's see if we can read members without auth
    const { data: members, error: readError } = await supabase.from('members').select('id').limit(1);
    
    if (readError) {
        console.error("Read Error (probably RLS):", readError);
        console.log("Cannot test insert without a valid user token... I need to bypass or see the error.");
    } else {
        console.log("Successfully read member:", members);
    }
}

testInsert();
