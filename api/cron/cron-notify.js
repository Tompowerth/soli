// ============================================================
// SOLI — cron-notify.js v2.0
// Fix: Proper web-push with VAPID authentication
// ============================================================

var webpush = require('web-push');

module.exports = async function handler(req, res) {
  // Verify cron secret (prevent unauthorized triggers)
  var cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== 'Bearer ' + cronSecret) {
    // Allow Vercel cron (sends x-vercel-cron header) or manual with secret
    if (!req.headers['x-vercel-cron']) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  var sbUrl = process.env.SUPABASE_URL;
  var sbKey = process.env.SUPABASE_SERVICE_KEY;
  var h = { 'Content-Type': 'application/json', 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey };

  // Configure web-push with VAPID keys
  var vapidPublic = process.env.VAPID_PUBLIC_KEY;
  var vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return res.status(500).json({ error: 'Missing VAPID keys' });
  }

  // Strip Base64 padding — web-push requires URL-safe Base64 without "="
  vapidPublic = vapidPublic.replace(/=+$/, '');
  vapidPrivate = vapidPrivate.replace(/=+$/, '');

  webpush.setVapidDetails(
    'mailto:hello@heysoli.ai',
    vapidPublic,
    vapidPrivate
  );

  try {
    var sent = 0;
    var failed = 0;
    var cleaned = 0;

    // ---- 1. Send due reminders ----
    var now = new Date().toISOString();
    var remRes = await fetch(sbUrl + '/rest/v1/reminders?sent=eq.false&send_at=lte.' + now + '&select=*', { headers: h });
    var reminders = await remRes.json();

    // ---- 2. Get all push subscriptions ----
    var subRes = await fetch(sbUrl + '/rest/v1/push_subscriptions?select=*', { headers: h });
    var subs = await subRes.json();
    if (!subs || !subs.length) return res.status(200).json({ sent: 0, message: 'No subscriptions' });

    var subMap = {};
    subs.forEach(function(s) {
      if (s.subscription && s.user_id) {
        // subscription might be stored as string or object
        var sub = typeof s.subscription === 'string' ? JSON.parse(s.subscription) : s.subscription;
        subMap[s.user_id] = { sub: sub, id: s.id };
      }
    });

    // ---- 3. Send reminders ----
    if (reminders && reminders.length) {
      for (var i = 0; i < reminders.length; i++) {
        var rem = reminders[i];
        if (subMap[rem.user_id]) {
          var result = await sendPush(subMap[rem.user_id].sub, {
            title: 'SOLI',
            body: rem.message || 'תזכורת מסולי 💜',
            icon: '/icon-192.png',
            badge: '/icon-72.png',
            data: { url: 'https://heysoli.ai/app.html' }
          });
          if (result.success) sent++;
          else {
            failed++;
            // If subscription expired/invalid, clean it up
            if (result.statusCode === 404 || result.statusCode === 410) {
              await cleanupSubscription(sbUrl, h, subMap[rem.user_id].id);
              cleaned++;
            }
          }
        }
        // Mark reminder as sent regardless
        await fetch(sbUrl + '/rest/v1/reminders?id=eq.' + rem.id, {
          method: 'PATCH',
          headers: Object.assign({}, h, { 'Prefer': 'return=minimal' }),
          body: JSON.stringify({ sent: true })
        });
      }
    }

    // ---- 4. Nudge inactive users (24h+ since last message) ----
    var yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    var msgsRes = await fetch(sbUrl + '/rest/v1/messages?select=user_id,created_at&order=created_at.desc&limit=500', { headers: h });
    var msgs = await msgsRes.json();

    var lastMsg = {};
    if (msgs && msgs.length) {
      msgs.forEach(function(m) {
        if (!lastMsg[m.user_id]) lastMsg[m.user_id] = m.created_at;
      });
    }

    // Nudge messages — rotate to avoid repetition
    var nudgeMessages = [
      'היי, מה נשמע? כבר יום שלם לא דיברנו.',
      'חשבתי עליך. רוצה לדבר?',
      'יום טוב! אני פה אם בא לך לשתף.',
      'מה קורה? תספר.',
    ];
    var nudgeIdx = Math.floor(Date.now() / (1000 * 60 * 60)) % nudgeMessages.length;

    for (var uid in lastMsg) {
      if (new Date(lastMsg[uid]) < new Date(yesterday) && subMap[uid]) {
        // Don't nudge more than once per 24h — check if we already nudged
        var result2 = await sendPush(subMap[uid].sub, {
          title: 'SOLI',
          body: nudgeMessages[nudgeIdx],
          icon: '/icon-192.png',
          badge: '/icon-72.png',
          data: { url: 'https://heysoli.ai/app.html' }
        });
        if (result2.success) sent++;
        else if (result2.statusCode === 404 || result2.statusCode === 410) {
          await cleanupSubscription(sbUrl, h, subMap[uid].id);
          cleaned++;
        }
      }
    }

    return res.status(200).json({
      sent: sent,
      failed: failed,
      cleaned: cleaned,
      reminders: (reminders || []).length,
      activeSubscriptions: Object.keys(subMap).length
    });

  } catch(e) {
    console.error('Cron error:', e);
    return res.status(200).json({ error: e.message });
  }
};

// ---- Send push using web-push library (proper VAPID signing) ----
async function sendPush(subscription, payload) {
  try {
    var result = await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 86400, // 24 hours
      urgency: 'normal'
    });
    return { success: true, statusCode: result.statusCode };
  } catch(e) {
    console.error('Push send error:', e.statusCode || e.message);
    return { success: false, statusCode: e.statusCode || 0, error: e.message };
  }
}

// ---- Remove expired subscriptions ----
async function cleanupSubscription(sbUrl, headers, subId) {
  try {
    await fetch(sbUrl + '/rest/v1/push_subscriptions?id=eq.' + subId, {
      method: 'DELETE',
      headers: headers
    });
  } catch(e) { console.error('Cleanup error:', e); }
}
