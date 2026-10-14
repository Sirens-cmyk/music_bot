import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const urlPath = req.url.replace(/^\/api\/?/, '').replace(/^\//, '');
    
    if (urlPath.startsWith('search')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const query = urlParams.get('q') || '';
        if (!query) return res.status(400).json({ error: 'Query is required' });
        
        try {
            const targetUrl = `https://upmusics.com/?s=${encodeURIComponent(query)}`;
            const searchRes = await fetch(targetUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            });
            
            if (!searchRes.ok) {
                return res.status(502).json({ error: `خطا در ارتباط با سایت (کد: ${searchRes.status})` });
            }
            
            const html = await searchRes.text();
            const $ = cheerio.load(html);
            
            let songPageUrl = null;
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('upmusics.com/') && !href.includes('tag') && !href.includes('category') && !href.includes('page') && !href.includes('author') && !href.includes('s=')) {
                    songPageUrl = href;
                    return false;
                }
            });
            
            if (!songPageUrl) {
                return res.status(404).json({ error: 'آهنگی با این مشخصات پیدا نشد' });
            }
            
            const songRes = await fetch(songPageUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://upmusics.com/'
                }
            });
            
            if (!songRes.ok) {
                return res.status(502).json({ error: `خطا در باز کردن صفحه آهنگ` });
            }
            
            const songHtml = await songRes.text();
            const $song = cheerio.load(songHtml);
            
            const title = $song('h1').first().text().trim() \vert{}\vert{}$song('title').text().trim() || 'موزیک درخواستی';
            
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
