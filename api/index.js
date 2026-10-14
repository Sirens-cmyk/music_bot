export default async function handler(req, res) {
    const urlPath = req.url.replace(/^\/api\/?/, '').replace(/^\//, '');
    
    // اگر درخواست جستجو بود
    if (urlPath.startsWith('search')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const query = urlParams.get('q') || '';
        if (!query) return res.status(400).json({ error: 'Query is required' });
        
        try {
            const searchRes = await fetch(`https://nex1music.ir/?s=${encodeURIComponent(query)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const html = await searchRes.text();
            
            // پیدا کردن لینک صفحه اول آهنگ
            const matchLink = html.match(/href="(https:\/\/nex1music\.ir\/[^\/]+\/)"/);
            if (!matchLink) return res.status(404).json({ error: 'Song not found' });
            
            const songPageUrl = matchLink[1];
            const songRes = await fetch(songPageUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const songHtml = await songRes.text();
            
            // استخراج نام آهنگ
            const titleMatch = songHtml.match(/<h1>(.*?)<\/h1>/);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>?/gm, '').trim() : 'موزیک درخواستی';
            
            // استخراج لینک مستقیم mp3
            const mp3Match = songHtml.match(/href="(https:\/\/[^"]+\.mp3)"/);
            if (!mp3Match) return res.status(404).json({ error: 'MP3 link not found' });
            
            const mp3Url = mp3Match[1];
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
