import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let url = '';
let key = '';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (urlMatch && keyMatch) {
    url = urlMatch[1].trim();
    key = keyMatch[1].trim();

    const supabase = createClient(url, key);
    
    async function test() {
        const query = supabase.from('transactions').select('*').order('timestamp', { ascending: false });
        
        const { data: d1 } = await query.range(0, 4);
        console.log("D1 size:", d1.length);
        if (d1.length > 0) console.log("D1 first:", d1[0].id);

        const { data: d2 } = await query.range(5, 9);
        console.log("D2 size:", d2.length);
        if (d2.length > 0) console.log("D2 first:", d2[0].id);
    }
    test();
} 
