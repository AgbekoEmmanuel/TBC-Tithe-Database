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
        const fetchAll = async (queryBuilder: any) => {
            let allData: any[] = [];
            let from = 0;
            const limit = 1000;
            let keepFetching = true;

            while (keepFetching) {
                const { data, error } = await queryBuilder.range(from, from + limit - 1);
                if (error) throw error;
                
                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    if (data.length < limit) {
                        keepFetching = false;
                    } else {
                        from += limit;
                    }
                } else {
                    keepFetching = false;
                }
            }
            return allData;
        };

        const query = supabase.from('transactions').select('*').order('timestamp', { ascending: true });
        const allTxns = await fetchAll(query);
        
        console.log("Total txns in DB:", allTxns.length);
        
        // Let's filter for January 2026.
        const janTxns = allTxns.filter(t => t.timestamp.startsWith('2026-01-'));
        console.log("Total Jan 2026 txns:", janTxns.length);
        
        // Group by Date to see the distribution
        const dateDistribution: Record<string, number> = {};
        janTxns.forEach(t => {
            const d = t.timestamp.split('T')[0];
            dateDistribution[d] = (dateDistribution[d] || 0) + 1;
        });
        console.log("Date distribution for Jan 2026:", dateDistribution);

        // Show a few samples from the *very first* days of Jan
        const firstWeek = janTxns.filter(t => {
            const d = parseInt(t.timestamp.split('T')[0].split('-')[2]);
            return d >= 1 && d <= 7;
        });
        
        console.log("Total txns in first week (Jan 1 - 7):", firstWeek.length);
        if (firstWeek.length > 0) {
            console.log("Sample from first week:");
            console.dir(firstWeek.slice(0, 5).map(t => ({ id: t.id, member: t.member_name, date: t.timestamp, amount: t.amount })));
        } else {
            console.log("No transactions found for Jan 1 - Jan 7. Printing the earliest existing Jan transaction:");
            console.dir(janTxns.slice(0, 1).map(t => ({ id: t.id, member: t.member_name, date: t.timestamp, amount: t.amount })));
        }
    }
    test();
} 
