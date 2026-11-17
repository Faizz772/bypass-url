# bypass-url

Web app kecil untuk membuka link shortlink bertipe safelink tanpa harus melewati halaman gate-nya.
Dua engine yang didukung:

| Engine | Domain contoh | File |
| --- | --- | --- |
| `mgvt` (safelinku) | `https://sfl.gl/gOfplaB` | `api/mgvt.js` |
| `umpc` (bicolink) | `https://bicolink.com/wFFcZL` | `api/umpc.js` |

Semua proses berjalan di server. User cukup menempel link, menekan **Buka link**, lalu menyalin URL hasilnya.

## Cara menjalankan lokal

```bash
git clone https://github.com/<user>/bypass-url.git
cd bypass-url
node server.js            # tanpa dependency, Node 18+
# buka http://localhost:3000
```

`python3` hanya dipakai kalau kamu menjalankan engine bicolink dengan opsi `--python` atau proxy. Fitur utama jalan tanpa python3.

## API

```http
GET /api/mgvt?url=https://sfl.gl/gOfplaB
GET /api/umpc?url=https://bicolink.com/wFFcZL
GET /api?url=<link>              (engine ditebak dari hostname)
```

Contoh balasan sukses:

```json
{
  "status": true,
  "source": "safelinku",
  "data": {
    "source_url": "https://sfl.gl/gOfplaB",
    "bypassed_url": "https://www.mediafire.com/file/.../file",
    "host": "www.mediafire.com"
  },
  "execution_time_ms": 19785
}
```

Balasan gagal selalu `status: false` plus `error`, jadi pemanggil tidak akan menerima URL palsu.

```bash
curl "http://localhost:3000/api?url=https%3A%2F%2Fsfl.gl%2FgOfplaB"
```

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Buka [vercel.com/new](https://vercel.com/new), import repo.
3. Framework preset: **Other**. Build command kosong, output directory kosong.
4. Deploy. Halaman utama otomatis tersaji dari folder `public/`, API dari `api/`.

`vercel.json` menyetel `maxDuration` 60 detik karena safelink butuh sekitar 20 detik (ada jeda verifikasi).

Safelink cocok untuk deployment serverless. Bicolink lebih berat dan bergantung Cloudflare: di lingkungan
Vercel yang IP-nya dinilai rendah request bisa ditolak (403) atau melewati 60 detik. Untuk hasil paling stabil,
jalankan engine bicolink di VPS/server sendiri lewat `node server.js`.

Alternatif cepat:

```bash
npm i -g vercel
vercel --prod
```

## Struktur

```
api/
  index.js     router otomatis untuk /api?url=
  mgvt.js      engine safelinku (sfl.gl), handler /api/mgvt
  umpc.js      engine bicolink, handler /api/umpc
public/
  index.html   UI
  styles.css   tema terang/gelap, mobile first
  app.js       state empty / loading / error / done
  theme.js     hindari kedip tema saat load
server.js      server statis + API untuk lokal
```

## Batasan

- Link dengan captcha atau passcode tidak bisa diproses otomatis. Server akan menjawab dengan pesan error yang jelas.
- Bicolink dilindungi Cloudflare. Kalau IP server yang dipakai sedang dinilai rendah, engine menolak lebih awal dengan pesan "sedang menantang request" (bukan menggantung sampai timeout). Solusinya pindah server atau tunggu beberapa menit.
- Struktur halaman safelink bisa berubah kapan saja. Kalau gate tidak ditemukan, hasilnya error, bukan URL palsu.
- Tidak ada database, tidak ada logging link.

## Credit

Engine di port dari skrip milik **JH a.k.a Dhika** (safelinku, `mgvt`) dan **JAMVANHAX0R** (bicolink, `umpc`).
Credit di dalam file engine tidak dihapus. Kalau kamu memodifikasi engine, pertahankan bagian credit-nya.

## Lisensi

MIT, lihat [LICENSE](LICENSE).
