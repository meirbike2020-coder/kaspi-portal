import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const KASPI_URL = 'https://kaspi.kz/shop/api/v2/orders';
const STATES = ['NEW', 'SIGN_REQUIRED', 'PICKUP', 'DELIVERY', 'KASPI_DELIVERY', 'ARCHIVE'];
const MAX_DAYS = 14;
const MAX_PAGES = 10;

const json = (body, status = 200) => Response.json(body, { status });

async function currentUser(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

async function fetchState(state, from, to, kaspiToken) {
  const orders = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({
      'page[number]': String(page),
      'page[size]': '100',
      'filter[orders][state]': state,
      'filter[orders][creationDate][$ge]': String(from),
      'filter[orders][creationDate][$le]': String(to),
    });
    const res = await fetch(`${KASPI_URL}?${qs}`, {
      headers: { 'Content-Type': 'application/vnd.api+json', 'X-Auth-Token': kaspiToken },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      throw new Error(`Kaspi ответил ${res.status} для ${state}: ${text}`);
    }
    const body = await res.json();
    for (const o of body.data ?? []) {
      const a = o.attributes ?? {};
      orders.push({
        id: o.id,
        code: a.code,
        state: a.state,
        status: a.status,
        totalPrice: a.totalPrice,
        deliveryCostForSeller: a.deliveryCostForSeller ?? null,
        creationDate: a.creationDate,
        preOrder: a.preOrder ?? false,
        customerName: a.customer?.firstName || a.customer?.name || '',
        customerPhone: a.customer?.cellPhone || '',
      });
    }
    const pageCount = body.meta?.pageCount ?? 1;
    if (page + 1 >= pageCount) break;
  }
  return orders;
}

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return json({ error: 'Войдите в портал заново.' }, 401);

  const kaspiToken = process.env.KASPI_API_TOKEN;
  if (!kaspiToken) {
    return json({ error: 'Ключ Kaspi не добавлен. Добавьте переменную KASPI_API_TOKEN в Vercel и сделайте Redeploy.' }, 503);
  }

  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get('days')) || MAX_DAYS, 1), MAX_DAYS);
  const to = Date.now();
  const from = to - days * 24 * 60 * 60 * 1000;

  try {
    const results = await Promise.all(STATES.map((s) => fetchState(s, from, to, kaspiToken)));
    // Kaspi may return orders slightly outside the range, so filter by creation date ourselves.
    const orders = results.flat().filter((o) => o.creationDate >= from).sort((a, b) => b.creationDate - a.creationDate);
    return json({ days, orders });
  } catch (e) {
    return json({ error: e.name === 'TimeoutError' ? 'Kaspi не ответил за 15 секунд. Попробуйте ещё раз.' : e.message }, 502);
  }
}
