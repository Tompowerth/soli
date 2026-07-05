var webpush = require('web-push');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  var testUserId = '2076e751-fbb2-49e4-9029-65c6b7cf668b';
  var sbUrl = process.env.SUPABASE_URL;
  var sbKey = process.env.SUPABASE_SERVICE_KEY;
  var vapidPublic = process.env.VAPID_PUBLIC_KEY;
  var vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  var h = { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey };

  // Step 1: Check subscription
  var subRes = await fetch(sbUrl + '/rest/v1/push_subscriptions?user_id=eq.' + testUserId + '&select=*', { headers: h });
  var subs = await subRes.json();

  if (!subs || !subs.length) {
    return res.status(200).json({
      status: 'NO_SUBSCRIPTION',
      message: 'No push subscription found for test user. Open SOLI on iPhone first to register.'
    });
  }

  // Step 2: Try sending
  webpush.setVapidDetails('mailto:hello@heysoli.ai', vapidPublic, vapidPrivate);
  var sub = typeof subs[0].subscription === 'string' ? JSON.parse(subs[0].subscription) : subs[0].subscription;

  try {
    var result = await webpush.sendNotification(sub, JSON.stringify({
      title: 'SOLI',
      body: 'בדיקה! אם אתה רואה את זה — push עובד 💜',
      data: { url: 'https://heysoli.ai/app.html' }
    }), { TTL: 86400 });
    return res.status(200).json({ status: 'SENT', statusCode: result.statusCode, subscription_created: subs[0].created_at });
  } catch(e) {
    return res.status(200).json({ status: 'FAILED', error: e.message, statusCode: e.statusCode, subscription_created: subs[0].created_at });
  }
};
