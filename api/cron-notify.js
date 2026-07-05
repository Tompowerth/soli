var crypto = require('crypto');

module.exports = async function handler(req, res) {
  var sbUrl = process.env.SUPABASE_URL;
  var sbKey = process.env.SUPABASE_SERVICE_KEY;
  var h = {"Content-Type":"application/json","apikey":sbKey,"Authorization":"Bearer "+sbKey};

  try {
    // Get reminders
    var now = new Date().toISOString();
    var remRes = await fetch(sbUrl+"/rest/v1/reminders?sent=eq.false&send_at=lte."+now+"&select=*",{headers:h});
    var reminders = await remRes.json();

    // Get subscriptions
    var subRes = await fetch(sbUrl+"/rest/v1/push_subscriptions?select=*",{headers:h});
    var subs = await subRes.json();
    if (!subs || !subs.length) return res.status(200).json({ sent: 0 });

    var subMap = {};
    subs.forEach(function(s) { subMap[s.user_id] = s.subscription; });
    var sent = 0;

    // Send reminders
    if (reminders && reminders.length) {
      for (var i = 0; i < reminders.length; i++) {
        var rem = reminders[i];
        if (subMap[rem.user_id]) {
          var ok = await sendPush(subMap[rem.user_id], rem.message || 'תזכורת מסולי');
          if (ok) sent++;
        }
        await fetch(sbUrl+"/rest/v1/reminders?id=eq."+rem.id,{method:"PATCH",headers:Object.assign({},h,{"Prefer":"return=minimal"}),body:JSON.stringify({sent:true})});
      }
    }

    // Check inactive users
    var yesterday = new Date(Date.now()-24*60*60*1000).toISOString();
    var msgsRes = await fetch(sbUrl+"/rest/v1/messages?select=user_id,created_at&order=created_at.desc&limit=500",{headers:h});
    var msgs = await msgsRes.json();
    var lastMsg = {};
    if (msgs && msgs.length) msgs.forEach(function(m){ if(!lastMsg[m.user_id]) lastMsg[m.user_id]=m.created_at; });
    for (var uid in lastMsg) {
      if (new Date(lastMsg[uid]) < new Date(yesterday) && subMap[uid]) {
        var ok2 = await sendPush(subMap[uid], 'היי, מה נשמע? כבר יום שלם לא דיברנו.');
        if (ok2) sent++;
      }
    }

    return res.status(200).json({ sent: sent });
  } catch(e) { return res.status(200).json({ error: e.message }); }
};

async function sendPush(subscription, message) {
  try {
    var endpoint = subscription.endpoint;
    var payload = JSON.stringify({ title: 'SOLI', body: message });
    var r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'TTL': '86400' },
      body: payload
    });
    return r.ok;
  } catch(e) { return false; }
}
