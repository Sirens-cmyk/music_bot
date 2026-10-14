export default async function handler(req, res) {
    const { path } = req.query;
    if (!path) {
        return res.status(200).json({ status: "Telegram Proxy is active!" });
    }

    // بازسازی آدرس اصلی تلگرام
    const telegramUrl = `https://api.telegram.org/${path.join('/')}`;
    
    const url = new URL(telegramUrl);
    for (const [key, val] of Object.entries(req.query)) {
        if (key !== 'path') {
            url.searchParams.append(key, val);
        }
    }

    try {
        const options = {
            method: req.method,
            headers: { 'Content-Type': 'application/json' },
        };

        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            options.body = JSON.stringify(req.body);
        }

        const apiRes = await fetch(url.toString(), options);
        const data = await apiRes.json();
        
        return res.status(apiRes.status).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
