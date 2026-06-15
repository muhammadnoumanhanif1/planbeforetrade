const https = require('https');

const botToken = "8604463340:AAH3G0qnOdDQ52M4Xc_ewwmbsy1Hy_V7E7k";
const chatId = "@cryptonewsoftheday";
const message = "✅ *SYSTEM TEST*\n\nThis is an automated test message from the Plan Before Trade engine to confirm Telegram connectivity is working successfully!";

const data = JSON.stringify({
  chat_id: chatId,
  text: message,
  parse_mode: 'Markdown'
});

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${botToken}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  },
  timeout: 10000
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`PROBLEM WITH REQUEST: ${e.message}`);
});

req.on('timeout', () => {
  console.error('REQUEST TIMED OUT');
  req.destroy();
});

req.write(data);
req.end();
