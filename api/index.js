export default async function handler(req, res) {
    // استخراج مسیر درخواست
    const urlPath = req.url.replace(/^\/api\/?/, '').replace(/^\//, '');
    
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
