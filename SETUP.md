# הקמת recipe-book-app - מדריך מלא

כל הקוד מוכן ומחובר git מקומית. הפרקים הבאים הם השלבים שרק אתה יכול לבצע (יצירת חשבונות/משאבים חיצוניים).

## 1. יצירת פרויקט Supabase

1. היכנס ל-https://supabase.com/dashboard ולחץ "New project".
2. בחר Organization, תן שם (למשל `recipe-book`), קבע סיסמת DB (שמור אותה במקום בטוח), בחר region קרוב (למשל Frankfurt/eu-central).
3. המתן כ-2 דקות עד שהפרויקט מוכן.
4. לך ל-**Project Settings → API** ושמור:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public key**
   - **service_role key** (סודי! לא לחשוף ב-frontend)
5. לך ל-**Project Settings → General** ושמור את **Reference ID** (ה-`xxxx` מה-URL).

## 2. הרצת סכמת מסד הנתונים

1. בדשבורד: **SQL Editor → New query**.
2. פתח את הקובץ [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), העתק את כל התוכן, הדבק, ולחץ **Run**.
3. ודא שאין שגיאות (אמור ליצור את כל הטבלאות + RLS + realtime).

## 3. קוד עריכה זמני (bootstrap)

בחר קוד זמני (למשל `1234`) - תזדקק לו בשלב 5 כדי לקבוע `EDIT_CODE`, ותוכל לשנות אותו מתוך האפליקציה עצמה (הגדרות → קוד עריכה) לאחר הכניסה הראשונה.

## 4. חיבור Supabase CLI

בטרמינל, בתוך תיקיית הפרויקט:

```bash
cd "C:\Users\Public\מתכונים מחלבה\recipe-book-app"
npx supabase login
```

זה יפתח דפדפן לאימות מול חשבון ה-Supabase שלך. לאחר מכן:

```bash
npx supabase link --project-ref <PROJECT_REF>
```

(`<PROJECT_REF>` מסעיף 1.5)

## 5. פריסת Edge Functions + סודות

```bash
npx supabase functions deploy redeem-edit-code
npx supabase functions deploy update-edit-code
npx supabase functions deploy notify-overdue-timers
```

הגדרת הסודות (שנה את הערכים):

```bash
npx supabase secrets set EDIT_CODE=1234
```

## 6. מפתחות VAPID (ל-Push Notifications)

**אל תשתמש במפתחות של cheese-app - צור זוג חדש:**

```bash
npx web-push generate-vapid-keys
```

יודפסו Public Key ו-Private Key. שמור את שניהם, ואז:

```bash
npx supabase secrets set VAPID_PUBLIC_KEY=<הציבורי> VAPID_PRIVATE_KEY=<הפרטי> VAPID_SUBJECT=mailto:urke390@gmail.com
```

## 7. תזמון בדיקת טיימרים (pg_cron)

1. פתח את [`supabase/migrations/0002_cron_notify.sql`](supabase/migrations/0002_cron_notify.sql).
2. החלף בו:
   - `<PROJECT_REF>` → ה-Reference ID מסעיף 1.5
   - `<SUPABASE_SERVICE_ROLE_KEY>` → ה-service_role key מסעיף 1.4
3. הדבק את כל התוכן ב-SQL Editor והרץ.

## 8. משתני סביבה מקומיים

```bash
cd "C:\Users\Public\מתכונים מחלבה\recipe-book-app"
copy .env.example .env.local
```

ערוך את `.env.local` (**קובץ זה לא עולה ל-git**):

```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key מסעיף 1.4>
VITE_VAPID_PUBLIC_KEY=<Public Key מסעיף 6>
```

## 9. בדיקה מקומית

```bash
npm run dev
```

פתח http://localhost:5173, ובדוק:
- כניסה עם קוד העריכה הזמני (הגדרות → קוד עריכה, או כפתור "מצב עריכה" למעלה) - לאחריה תוכל לשנות לקוד קבוע.
- יצירת קטגוריה + רכיב (עמוד "כותרות ורכיבים").
- יצירת מתכון + שלבים + פרמטרים.
- גרירה לסידור מחדש ברשימת המתכונים.
- פתיחת מתכון (עמוד צפייה) → "התחל ייצור מודרך" → הרצת השלבים.
- הפעלת התראות (עמוד "צליל התראה" / prompt של הדפדפן) ובדיקה שמגיעה התראה כשטיימר המתנה מסתיים.

## 10. GitHub

1. היכנס ל-https://github.com/new וצור repo ריק (בלי README/gitignore - יש לנו כבר).
2. תן לי את כתובת ה-repo ואחבר ואדחוף (אבקש את אישורך לפני push בפועל), **או** תריץ בעצמך:

```bash
cd "C:\Users\Public\מתכונים מחלבה\recipe-book-app"
git remote add origin <REPO_URL>
git branch -M main
git push -u origin main
```

## 11. Vercel

1. היכנס ל-https://vercel.com/new וייבא את ה-repo מ-GitHub.
2. Framework Preset: **Vite** (אמור להיזהות אוטומטית).
3. תחת Environment Variables הוסף את 3 המשתנים (Production + Preview + Development):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
4. Deploy.
5. בטלפון: פתח את הכתובת שקיבלת, "הוסף למסך הבית" לבדיקת PWA + התראות.

---

**סדר מומלץ:** 1→2→3→4→5→6→7→8→9 (בדיקה מקומית מלאה) → 10→11 (פרסום).
