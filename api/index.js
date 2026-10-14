import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const urlPath = req.url.replace(/^\/api\/?/, '').replace(/^\//, '');
    
    // اگر درخواست جستجو بود
    if (urlPath.startsWith('search')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const query = urlParams.get('q') || '';
        if (!query) return res.status(400).json({ error: 'Query is required' });
        
        try {
            const searchRes = await fetch(`https://nex1music.ir/?s=${encodeURIComponent(query)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const html = await searchRes.text();
            const $ = cheerio.load(html);
            
            let songPageUrl = null;
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('nex1music.ir/') && !href.includes('tag') && !href.includes('category') && !href.includes('page') && href !== 'https://nex1music.ir/') {
                    songPageUrl = href;
                    return false; // توقف در اولین نتیجه
                }
            });
            
            if (!songPageUrl) return res.status(404).json({ error: 'Song not found' });
            
            const songRes = await fetch(songPageUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const songHtml = await songRes.text();
            const $song = cheerio.load(songHtml);
            
            // استخراج نام آهنگ
            const title = $song('h1').first().text().trim() || 'موزیک درخواستی';
            
            // استخراج لینک مستقیم فایل mp3
            let mp3Url = null;
            $song('a').each((i, el) => {
                const href = $song(el).attr('href');
                if (href && href.endsWith('.mp3')) {
                    mp3Url = href;
                    return false;
                }
            });
            
            if (!mp3Url) return res.status(404).json({ error: 'MP3 link not found' });
            
            return res.status(200).json({ title, url: mp3Url });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    
    // پروکسی تلگرام
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
