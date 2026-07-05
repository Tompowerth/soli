module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ vapidKey: process.env.VAPID_PUBLIC_KEY });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  var userId = req.body.userId;
  var subscription = req.body.subscription;
  if (!userId || !subscription) return res.status(400).json({ error: "Missing data" });
  var sbUrl = process.env.SUPABASE_URL;
  var sbKey = process.env.SUPABASE_SERVICE_KEY;
  var h = {"Content-Type":"application/json","apikey":sbKey,"Authorization":"Bearer "+sbKey,"Prefer":"return=minimal"};
  await fetch(sbUrl+"/rest/v1/push_subscriptions?user_id=eq."+userId,{method:"DELETE",headers:h});
  await fetch(sbUrl+"/rest/v1/push_subscriptions",{method:"POST",headers:h,body:JSON.stringify({user_id:userId,subscription:subscription})});
  return res.status(200).json({ subscribed: true });
};
