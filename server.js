const express = require('express');
const multer = require('multer');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;


const TELEGRAM_BOT_TOKEN = '7401591897:AAEHUkYJtjPW5P1E2V18SFcgxMhf-99JMgM';
const TELEGRAM_CHAT_ID = '6325987875';
const isRender = process.env.RENDER === 'true' || fs.existsSync('/tmp');
const uploadPath = isRender ? '/tmp' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const upload = multer({ dest: uploadPath });
const cache = {}; 

app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 10 })); 
app.post('/jassolvix-send', upload.single('idImage'), async (req, res) => {
  const { cfln, cflink, cilink, tmn, bot_trap } = req.body;
  const file = req.file;

  if (bot_trap) {
    return res.status(400).json({ success: false, error: 'Bot detected.' });
  }

  if (![cfln, cflink, cilink, tmn].every(Boolean) || !file) {
    return res.status(400).json({ success: false, error: 'Missing required fields or image.' });
  }

  const cacheKey = `${cfln}_${cflink}_${cilink}_${tmn}`;
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey] < 60000) {
    return res.status(429).json({ success: false, error: 'Duplicate submission. Try again later.' });
  }
  cache[cacheKey] = now;
  const caption = `*📩 New Client Submission:*\n\n` +
    `*👤 Client Full Name:* ${cfln}\n` +
    `*🔗 Client Profile Link:* ${cflink}\n` +
    `*🚨 Target Link:* ${cilink}\n` +
    `*🛡️ Team:* ${tmn}`;

  try {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', fs.createReadStream(file.path));
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.unlinkSync(file.path);
    res.status(200).json({ success: true, message: 'Your data and image were sent successfully.' });

  } catch (error) {
    console.error('❌ Telegram send error:', error.message);

    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.status(500).json({ success: false, error: 'Data and image not sent. Try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}/jassolvix-send`);
});
