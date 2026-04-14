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
        const { data, error } = await supabase.from('transactions').select('*').order('timestamp', { ascending: true }).limit(5000);
        if (error) {
            console.error(error);
        } else {
            console.log("Total txns:", data.length);
            const janTxns = data.filter(t => t.timestamp.includes('-01-'));
            console.log("Total January txns:", janTxns.length);
            console.log("First Jan txns:", janTxns.slice(0, 5).map(t => t.timestamp));
        }
    }
    test();
} else {
    console.log("Could not find supabase credentials in .env");
}
