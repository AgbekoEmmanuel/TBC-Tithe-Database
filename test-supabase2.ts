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
        const { count, error } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
        if (error) {
            console.error(error);
        } else {
            console.log("Total exact txns count:", count);
            
            // Check fetching more than 1000
            const { data } = await supabase.from('transactions').select('*').order('timestamp', { ascending: false }).limit(2000);
            console.log("Returned size with limit 2000:", data.length);
            
            // check the oldest returning in the 1000 limit
            const { data: d1000 } = await supabase.from('transactions').select('*').order('timestamp', { ascending: false }).limit(1000);
            console.log("Oldest in 1000 limit:", d1000[d1000.length - 1].timestamp);
        }
    }
    test();
}
