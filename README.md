# Kaspi портал

Сайт для команды продавца на Kaspi. На нём можно вести товары и идеи, считать чистую прибыль после комиссии, доставки и налога, оценивать нишу по отзывам и числу продавцов и следить за бюджетом закупки.

Стек: Next.js (хостинг на Vercel) и Supabase (база данных и вход).

## Запуск за 15 минут

### 1. База Supabase
1. Создайте проект на [supabase.com](https://supabase.com).
2. Откройте **SQL Editor → New query**, вставьте весь файл [`supabase/schema.sql`](supabase/schema.sql) и нажмите **Run**.
3. Откройте **Authentication → Sign In / Providers** и выключите **Allow new users to sign up**, чтобы посторонние не могли зарегистрироваться.
4. Откройте **Authentication → Users → Add user → Create new user** и создайте вход для каждого из команды (почта и пароль, галочка Auto Confirm).
5. Откройте **Project Settings → API** (или **Data API**). Там нужны два значения: **Project URL** и ключ **anon public**.

### 2. Хостинг Vercel
1. Войдите на [vercel.com](https://vercel.com) через GitHub.
2. Нажмите **Add New → Project**, выберите репозиторий `kaspi-portal` и нажмите **Import**.
3. Перед нажатием Deploy откройте **Environment Variables** и добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL из Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: ключ anon public из Supabase
4. Нажмите **Deploy**. Через минуту сайт откроется по адресу вида `kaspi-portal.vercel.app`.

Ключ **service_role** из Supabase и ключ Kaspi API в эти переменные **не вставляйте** и никому не пересылайте.

## Локальный запуск
```bash
cp .env.example .env.local   # и впишите свои значения
npm install
npm run dev
```

## Что дальше
- Подключение Kaspi API (заказы и остатки). Ключ будет храниться только на сервере Vercel.
