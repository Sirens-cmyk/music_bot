import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const urlPath = req.url.replace(/^\/api\/?/, '').replace(/^\//, '');
    
    if (urlPath.startsWith('search')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const query = urlParams.get('q') || '';
        if (!query) return res.status(400).json({ error: 'Query is required' });
        
        try {
            // استفاده از داک‌داک‌گو برای جستجو در سایت هدف بدون بلاک شدن
            const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' site:nex1music.ir')}`;
            const searchRes = await fetch(ddgUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            });
            
            const html = await searchRes.text();
            const $ = cheerio.load(html);
            
            let songPageUrl = null;
            $('a').each((i, el) => {
                let href = $(el).attr('href');
                if (href) {
                    if (href.includes('uddg=')) {
                        try {
                            const parsed = new URL(href, 'https://html.duckduckgo.com');
                            href = decodeURIComponent(parsed.searchParams.get('uddg') || '');
                        } catch (e) {}
                    }
                    if (href && href.includes('nex1music.ir/') && !href.includes('tag') && !href.includes('category') && !href.includes('s=')) {
                        songPageUrl = href;
                        return false;
                    }
                }
            });
            
            if (!songPageUrl) {
                return res.status(404).json({ error: 'آهنگی از طریق موتور جستجو پیدا نشد' });
            }
            
            const songRes = await fetch(songPageUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://nex1music.ir/'
                }
            });
            
            if (!songRes.ok) {
                return res.status(502).json({ error: 'خطا در باز کردن صفحه آهنگ' });
            }
            
            const songHtml = await songRes.text();
            const $song = cheerio.load(songHtml);
            
            const title = $song('h1').first().text().trim() || 'موزیک درخواستی';
            
            let mp3Url = null;
            $song('a').each((i, el) => {
                const href = $song(el).attr('href');
                if (href && href.endsWith('.mp3')) {
                    mp3Url = href;
                    return false;
                }
            });
            
            if (!mp3Url) {
                return res.status(404).json({ error: 'لینک دانلود مستقیم MP3 پیدا نشد' });
            }
            
            return res.status(200).json({ title, url: mp3Url });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    
    if (!urlPath || urlPath === 'api' || urlPath === '') {
        return res.status(200).json({ status: "Telegram Proxy is active!" });
    }

    const telegramUrl = `https://api.telegram.org/${urlPath}`;
    try {
        const options = {
            method: req.method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            options.body = JSON.stringify(req.body);
        }
        const apiRes = await fetch(telegramUrl, options);
        const data = await apiRes.json();
        return res.status(apiRes.status).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
