# SOLI — 14-Day Development Plan
## מ-0 לאפליקציה חיה

**Domain**: heysoli.ai ✅ (purchased)
**Start Date**: ___________
**Target Launch**: Start Date + 14 days

---

## שלב 1: תשתית (ימים 1-2)

### אני (Claude) בונה:
- [ ] Supabase project — schema (10 tables), auth, RLS, triggers
- [ ] Vercel project — חיבור heysoli.ai, deploy pipeline
- [ ] מבנה תיקיות, vercel.json, package.json
- [ ] Google OAuth setup
- [ ] Environment variables config

### מה צריך ממך (תומר):
- [ ] ליצור Supabase project חדש ב-supabase.com (region: Frankfurt)
- [ ] לתת: Project URL + anon key + service key
- [ ] לחבר heysoli.ai ב-Vercel (DNS records ב-GoDaddy):
  - A record → 76.76.21.21
  - CNAME www → cname.vercel-dns.com
- [ ] Anthropic API key (מ-MIRA או חדש)

### Definition of Done:
✓ heysoli.ai מראה דף לבן עם "SOLI" — חי באוויר
✓ Supabase schema מותקן עם כל 10 הטבלאות
✓ git push = auto deploy

---

## שלב 2: Landing Page חי (יום 3)

### אני בונה:
- [ ] Landing page חי ב-heysoli.ai (כבר בנוי — polish + deploy)
- [ ] Waitlist עם Supabase (שמירת emails אמיתיים ב-DB)
- [ ] Favicon (לוגו SOLI), OG image, meta tags
- [ ] Google Analytics / Plausible basic tracking
- [ ] Mobile optimization pass

### מה צריך ממך:
- [ ] לאשר שהדומיין עובד ונראה טוב
- [ ] לבדוק על מובייל (iPhone + Android)
- [ ] לשלוח ל-3-5 חברים לבדיקה ראשונית

### Definition of Done:
✓ heysoli.ai חי עם landing page מלא
✓ Waitlist עובד — email נשמר ב-Supabase
✓ נראה מושלם על מובייל ודסקטופ

---

## שלב 3: Chat Engine — הלב (ימים 4-6)

### אני בונה:
- [ ] מסך שיחה — UI מלא (בועות הודעות, input, שליחה)
- [ ] חיבור ל-Claude API דרך chat.js
- [ ] Engine routing — Haiku/Sonnet/Opus לפי הקשר
- [ ] זיכרון מתמשך — שמירת כל שיחה ב-Supabase
- [ ] Context builder — טעינת פרופיל + היסטוריה לכל תגובה
- [ ] Onboarding flow:
  - שלב 1: SOLI מציגה את עצמה
  - שלב 2: בחירת אווטאר (נקבה/זכר)
  - שלב 3: שם + תאריך לידה → מזל אוטומטי
  - שלב 4: 5 שאלות אישיות קצרות
  - שלב 5: SOLI מציגה פרופיל ראשוני
- [ ] Orb mode — לוגו פועם במסך השיחה (בלי קול עדיין)

### מה צריך ממך:
- [ ] לדבר עם SOLI — לפחות 10 שיחות ניסיון
- [ ] פידבק על: טון, רלוונטיות, חוויה, מה חסר
- [ ] לעבור onboarding ולדווח על כל חיכוך

### Definition of Done:
✓ אפשר לדבר עם SOLI בטקסט ולקבל תגובות חכמות
✓ SOLI זוכרת מי אתה בין סשנים
✓ Onboarding עובד מ-0 ועד פרופיל
✓ Orb מוצג ונושם (animated)

---

## שלב 4: קול + מצלמה (ימים 7-9)

### אני בונה:
- [ ] ElevenLabs integration — SOLI מדברת בקול
- [ ] Lip sync על האווטאר (אם avatar mode)
- [ ] Orb pulse — פעימות לפי audio amplitude (אם orb mode)
- [ ] Hume AI integration — זיהוי רגש מקול המשתמש
- [ ] Smart camera:
  - Scan בתחילת שיחה
  - Trigger כש-Hume מזהה שינוי רגשי
  - On-demand ("תסתכלי עליי")
  - כל 3-5 דקות בשיחות ארוכות
- [ ] Claude Vision — ניתוח פנים + micro-expressions
- [ ] מיקרופון — speech-to-text למשתמש

### מה צריך ממך:
- [ ] ליצור חשבון ElevenLabs (elevenlabs.io) + API key
- [ ] ליצור חשבון Hume AI (hume.ai) + API key
- [ ] לבחור קול לאווטאר מ-ElevenLabs (נשמע ביחד)
- [ ] לבדוק: לדבר עם SOLI בקול, לפתוח מצלמה
- [ ] לדווח: האם הקול מרגיש טבעי? האם היא "רואה" נכון?

### Definition of Done:
✓ SOLI מדברת בקול חם ואנושי
✓ SOLI שומעת את הקול שלך ומזהה רגש
✓ SOLI רואה את הפנים שלך ומגיבה ("נראה שלא ישנת טוב")
✓ Orb פועם בזמן ש-SOLI מדברת
✓ אווטאר זז שפתיים (אם avatar mode)

---

## שלב 5: Payments + Polish (ימים 10-12)

### אני בונה:
- [ ] Stripe integration — checkout session
- [ ] 3 תוכניות: Basic $14.99, Pro $34.99, Premium $69.99
- [ ] Trial 7 ימים (בלי כרטיס אשראי)
- [ ] Usage tracking — דקות קול/מצלמה
- [ ] Paywall — כשנגמרות דקות → "Upgrade your plan"
- [ ] גרפולוגיה — צילום כתב יד + ניתוח (Opus)
- [ ] Privacy Policy page
- [ ] Terms of Service page
- [ ] "Delete all my data" button בהגדרות
- [ ] PWA manifest — install prompt על מובייל

### מה צריך ממך:
- [ ] ליצור Stripe account (stripe.com) + API key
- [ ] לאשר סופית את המחירים
- [ ] לעבור את כל flow התשלום (test mode)
- [ ] לכתוב Privacy Policy (אני אכין draft)
- [ ] להתקין את ה-PWA על הטלפון שלך ולבדוק

### Definition of Done:
✓ Trial עובד — 7 ימים חינם בלי כרטיס
✓ תשלום עובד ב-Stripe (test mode)
✓ דקות נספרות ומוצגות למשתמש
✓ גרפולוגיה עובדת — מצלם כתב יד, מקבל ניתוח
✓ PWA ניתנת להתקנה על מובייל
✓ Privacy Policy + Terms חיים

---

## שלב 6: Launch (ימים 13-14)

### אני בונה:
- [ ] Bug fixes מכל הבדיקות
- [ ] Performance optimization
- [ ] Error handling — הודעות ידידותיות כשמשהו נופל
- [ ] SEO — sitemap, robots.txt, structured data
- [ ] TikTok content script — "What Does SOLI See?"
- [ ] Email ל-waitlist: "SOLI is live!"

### מה צריך ממך:
- [ ] Beta test מלא — 30 דקות שיחה רציפה, לרשום כל בעיה
- [ ] לבקש מ-3 חברים לעשות beta test
- [ ] לצלם TikTok ראשון
- [ ] להעביר Stripe מ-test ל-live mode
- [ ] ללחוץ publish + לשלוח לעולם

### Definition of Done:
✓ SOLI חיה ב-heysoli.ai — אפשר להירשם, לדבר, לשלם
✓ PWA עובדת על מובייל כמו אפליקציה
✓ Waitlist קיבל email "We're live"
✓ TikTok ראשון באוויר
✓ 🚀

---

## סיכום Accounts & Keys נדרשים

| שירות | URL | מה צריך | סטטוס |
|--------|-----|---------|--------|
| heysoli.ai | godaddy.com | Domain | ✅ Done |
| Supabase | supabase.com | Project URL + keys | ⬜ |
| Vercel | vercel.com | Account + deploy | ⬜ |
| Anthropic | console.anthropic.com | API key | ⬜ |
| ElevenLabs | elevenlabs.io | API key | ⬜ |
| Hume AI | hume.ai | API key | ⬜ |
| Stripe | stripe.com | API key (test + live) | ⬜ |
| Google OAuth | console.cloud.google.com | Client ID + Secret | ⬜ |

---

## הערות

- כל שלב נבנה על הקודם — לא מדלגים
- כל "Definition of Done" חייב להתקיים לפני שעוברים הלאה
- אם שלב לוקח יותר זמן — זה בסדר, עדיף מושלם מאשר מהר
- System Prompt (המוח) כבר מוכן — 619 שורות
- Schema (הזיכרון) כבר מוכן — 10 טבלאות
- Chat Engine כבר מוכן — routing + context + memory
- Graphology API כבר מוכן — 12 פרמטרים
- Landing Page כבר בנוי — צריך רק deploy

---

*"Today: an app. Tomorrow: the Emotional OS for every robot in every home."*
*— SOLI, June 2026*
