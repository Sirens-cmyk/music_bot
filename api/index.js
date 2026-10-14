import * as cheerio from 'cheerio';

const BOT_TOKEN = '8270767649:AAH_Mh-QQJ2acDfWZWDlaefIK3dCJ2gyk9E'; // توکن رباتت رو اینجا وارد کن

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).json({ status: "Music Bot Webhook is active!" });
    }

    try {
        const update = req.body;
        if (!update || !update.message || !update.message.text) {
            return res.status(200).json({ ok: true });
        }

        const chatId = update.message.chat.id;
        const text = update.message.text.trim();
        const firstName = update.message.from.first_name || 'دوست';

        const sendMessage = async (msg) => {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg })
            });
        };

        if (text === '/start') {
            await sendMessage(`سلام ${firstName} جان! 🎵\nاسم آهنگ یا خواننده رو بفرست تا از سرور ابری برات پیدا کنم و بفرستم:`);
            return res.status(200).json({ ok: true });
        }

        await sendMessage("🔍 در حال جستجوی ابری موزیک...");

        const targetUrl = `https://upmusics.com/?s=${encodeURIComponent(text)}`;
        const searchRes = await fetch(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'fa-IR,fa;q=0.9'
            }
        });

        if (!searchRes.ok) {
            await sendMessage("❌ خطا در ارتباط با سایت موزیک.");
            return res.status(200).json({ ok: true });
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
            await sendMessage("❌ متأسفانه آهنگی با این مشخصات پیدا نشد.");
            return res.status(200).json({ ok: true });
        }

        const songRes = await fetch(songPageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
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
            await sendMessage("❌ لینک دانلود مستقیم MP3 پیدا نشد.");
            return res.status(200).json({ ok: true });
        }

        // ارسال فایل صوتی به کاربر
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                audio: mp3Url,
                caption: `🎧 ${title}`
            })
        });

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(200).json({ ok: true });
    }
}
