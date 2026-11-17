// Workers AI kullanımını modele göre gösterir (son 48 saat, saatlik)
const hesap = process.env.CLOUDFLARE_ACCOUNT_ID;
const q = `query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){aiInferenceAdaptiveGroups(limit:500,filter:{datetime_geq:$s,datetime_leq:$e},orderBy:[datetimeHour_ASC]){count sum{totalNeurons} dimensions{modelId datetimeHour}}}}}`;
const e = new Date(), s = new Date(Date.now() - 48 * 36e5);
const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: { a: hesap, s: s.toISOString(), e: e.toISOString() } }) });
const j = await r.json();
console.log("YANIT", JSON.stringify(j).slice(0, 1500));
for (const g of j.data?.viewer?.accounts?.[0]?.aiInferenceAdaptiveGroups || []) console.log(g.dimensions.datetimeHour, g.dimensions.modelId, g.count, Math.round(g.sum?.totalNeurons || 0));
