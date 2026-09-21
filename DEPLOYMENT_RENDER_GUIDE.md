# دليل رفع ونشر مشروع CivicFlow على Render (خطوة بخطوة)

تم إعداد المشروع بالكامل ليكون جاهزاً للرفع على **Render.com** (بما في ذلك قاعدة بيانات PostgreSQL، السيرفر الخلفي Backend، والواجهة الأمامية Frontend).

---

## 🚀 الطريقة الأولى: النشر التلقائي عبر Blueprint (الأسهل والأسرع)

تم تجهيز ملف `render.yaml` في المشروع، يمكنك إنشاء كافة الخدمات بضغطة زر واحدة:

1. ارفع المشروع إلى حسابك على **GitHub** (تأكد أن المستودع يحتوي على كافة الملفات).
2. ادخل على حسابك في [Render Dashboard](https://dashboard.render.com/).
3. اضغط على زر **New +** ثم اختر **Blueprint**.
4. اربط مستودع الـ GitHub الخاص بالمشروع (`civicflow`).
5. سيكتشف Render ملف `render.yaml` تلقائياً وسيقوم بإنشاء:
   - **قاعدة بيانات PostgreSQL مجانية** (`civicflow-db`).
   - **خدمة السيرفر Backend** (`civicflow-backend`).
   - **موقع الواجهة الأمامية Frontend** (`civicflow-frontend`).
6. اضغط **Apply** وانتظر بضع دقائق حتى يكتمل النشر التلقائي!

---

## 🛠️ الطريقة الثانية: النشر اليدوي (Manual Step-by-Step)

إذا أردت إنشاء كل خدمة بشكل يدوي خطوة بخطوة:

### الخطوة 1: إنشاء قاعدة بيانات PostgreSQL
1. في لوحة Render، اضغط **New +** واختر **PostgreSQL**.
2. اكتب الاسم: `civicflow-db`.
3. اختر الخطة المجانية (**Free**).
4. بعد الإنشاء، انسخ رابط الاتصال الخارجي أو الداخلي **Internal Database URL**.

---

### الخطوة 2: رفع السيرفر الخلفي (Backend Web Service)
1. اضغط **New +** واختر **Web Service**.
2. اربط مستودع المشروع واختر الإعدادات التالية:
   - **Name**: `civicflow-backend`
   - **Root Directory**: `backend`
   - **Environment / Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx prisma db push && npm run start`
   - **Plan**: `Free`
3. في قسم **Environment Variables** (المتغيرات البيئية)، أضف:
   - `DATABASE_URL`: *(الصق رابط قاعدة البيانات من الخطوة 1)*
   - `NODE_ENV`: `production`
   - `JWT_ACCESS_SECRET`: `civicflow_jwt_access_secret_key_prod_2026_secure`
   - `JWT_REFRESH_SECRET`: `civicflow_jwt_refresh_secret_key_prod_2026_secure`
   - `FRONTEND_URL`: `https://civicflow-frontend-1-hoy9.onrender.com` *(أو رابط الواجهة الخاص بك على Render)*
   - `WHATSAPP_PROVIDER`: `wpsender`
   - `WHATSAPP_API_URL`: `https://backendapi.wpsenderx.com/api/messages/send`
   - `WHATSAPP_API_KEY`: `wps_7b5db2a829ff4377ad0c6c42ea7fe4af991c191992305e70eab136c8bb89f7d2`
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: `your_email@gmail.com` *(بريد Gmail لإرسال كود OTP)*
   - `SMTP_PASS`: `your_16_char_app_password` *(كلمة مرور التطبيقات App Password من Google)*
   - `SMTP_FROM`: `"منظومة CivicFlow" <your_email@gmail.com>`
4. اضغط **Create Web Service**.

---

### الخطوة 3: زرع البيانات الأولية وحسابات المدراء (Database Seeding)
بعد أن يعمل الـ Backend ويتصل بقاعدة البيانات:
1. داخل صفحة خدمة الـ Backend في Render، اذهب إلى تبويب **Shell**.
2. اكتب الأمر التالي لملء قاعدة البيانات بالبيانات والحسابات الافتراضية:
   ```bash
   npm run prisma:seed
   ```
3. ستظهر رسالة تأكيد: `✅ Seeding completed successfully`.

---

### الخطوة 4: رفع الواجهة الأمامية (Frontend Static Site)
1. اضغط **New +** واختر **Static Site**.
2. اختر نفس مستودع الـ GitHub.
3. اضبط الإعدادات التالية:
   - **Name**: `civicflow-frontend`
   - **Root Directory**: `.` *(أو اتركه فارغاً)*
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. في قسم **Environment Variables**، أضف:
   - `VITE_API_URL`: `https://civicflow-backend.onrender.com/api` *(استبدل برابط الباك اند الفعلي الخاص بك)*
5. في قسم **Redirects / Rewrites** (لضمان عمل الـ Routing عند تحديث الصفحة):
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
6. اضغط **Create Static Site**.

---

## 🔑 الحسابات الافتراضية بعد الرفع (Login Credentials)

بعد تشغيل الـ Seed، يمكنك تسجيل الدخول بالحسابات التالية:

* **مدير النظام (Admin)**:
  * **البريد**: `admin@civicflow.gov.sa`
  * **كلمة المرور**: `Admin@123456`
* **المشرف العام (Supervisor)**:
  * **البريد**: `supervisor@civicflow.gov.sa`
  * **كلمة المرور**: `Supervisor@123456`
* **موظف المعالجة (Employee)**:
  * **البريد**: `employee@civicflow.gov.sa`
  * **كلمة المرور**: `Employee@123456`
