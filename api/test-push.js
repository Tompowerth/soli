module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  var result = { steps: [] };

  try {
    result.steps.push('checking env vars');
    var sbUrl = process.env.SUPABASE_URL;
    var sbKey = process.env.SUPABASE_SERVICE_KEY;
    var vapidPublic = process.env.VAPID_PUBLIC_KEY;
    var vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    result.env = {
      SUPABASE_URL: sbUrl ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_KEY: sbKey ? 'SET' : 'MISSING',
      VAPID_PUBLIC_KEY: vapidPublic ? 'SET' : 'MISSING',
      VAPID_PRIVATE_KEY: vapidPrivate ? 'SET' : 'MISSING'
    };
    if (!sbUrl || !sbKey) return res.status(200).json(result);

    result.steps.push('checking subscription');
    var testUserId = '2076e751-fbb2-49e4-9029-65c6b7cf668b';
    var h = { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey };
    var subRes = await fetch(sbUrl + '/rest/v1/push_subscriptions?user_id=eq.' + testUserId + '&select=*', { headers: h });
    var subs = await subRes.json();
    result.subscriptions = subs ? subs.length : 0;

    if (!subs || !subs.length) {
      result.status = 'NO_SUBSCRIPTION';
      return res.status(200).json(result);
    }

    result.subscription_created = subs[0].created_at;
    result.steps.push('subscription found');

    result.steps.push('loading web-push');
    var webpush;
    try {
      webpush = require('web-push');
      result.steps.push('web-push loaded OK');
    } catch(e) {
      result.status = 'WEB_PUSH_LOAD_FAILED';
      result.error = e.message;
      return res.status(200).json(result);
    }

    result.steps.push('fixing vapid keys');
    // Convert standard Base64 to URL-safe Base64
    vapidPublic = vapidPublic.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    vapidPrivate = vapidPrivate.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    result.vapidPublicLength = vapidPublic.length;
    result.vapidPublicPreview = vapidPublic.substring(0, 10) + '...';

    result.steps.push('sending push');
    webpush.setVapidDetails('mailto:hello@heysoli.ai', vapidPublic, vapidPrivate);
    var sub = typeof subs[0].subscription === 'string' ? JSON.parse(subs[0].subscription) : subs[0].subscription;
    result.endpoint = sub.endpoint ? sub.endpoint.substring(0, 60) + '...' : 'MISSING';

    var pushResult = await webpush.sendNotification(sub, JSON.stringify({
      title: 'SOLI',
      body: 'בדיקה! push עובד 💜',
      data: { url: 'https://heysoli.ai/app.html' }
    }), { TTL: 86400 });

    result.status = 'SENT';
    result.pushStatusCode = pushResult.statusCode;

  } catch(e) {
    result.status = 'ERROR';
    result.error = e.message;
    result.errorCode = e.statusCode || null;
    result.stack = (e.stack || '').split('\n').slice(0, 3);
  }

  return res.status(200).json(result);
};
