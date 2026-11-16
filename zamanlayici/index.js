// Mersin Anlık zamanlayıcısı (Cloudflare Worker, ücretsiz cron).
// Her 30 dakikada bir GitHub'daki "Haberleri güncelle ve yayınla" iş akışını başlatır.
// GitHub'ın kendi zamanlayıcısı güvenilmez/gecikmeli çalıştığı için bu yol kullanılıyor.

const URL_DISPATCH = 'https://api.github.com/repos/yakuptulan/mersinanlik/actions/workflows/guncelle.yml/dispatches';

async function tetikle(env) {
  const res = await fetch(URL_DISPATCH, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'mersinanlik-zamanlayici',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tetikle(env));
  },
};
