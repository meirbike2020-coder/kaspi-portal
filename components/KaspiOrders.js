'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/calc';

const STATE_LABELS = {
  NEW: 'Новый',
  SIGN_REQUIRED: 'Нужна подпись',
  PICKUP: 'Самовывоз',
  DELIVERY: 'Доставка',
  KASPI_DELIVERY: 'Kaspi Доставка',
  ARCHIVE: 'Архив',
};
const STATUS_LABELS = {
  APPROVED_BY_BANK: 'Одобрен банком',
  ACCEPTED_BY_MERCHANT: 'Принят',
  COMPLETED: 'Выдан',
  CANCELLED: 'Отменён',
  CANCELLING: 'Отменяется',
  KASPI_DELIVERY_RETURN_REQUESTED: 'Запрошен возврат',
  RETURNED: 'Возвращён',
};
const LOST = new Set(['CANCELLED', 'CANCELLING', 'RETURNED', 'KASPI_DELIVERY_RETURN_REQUESTED']);

export default function KaspiOrders() {
  const [state, setState] = useState({ loading: true });

  const load = useCallback(async () => {
    setState({ loading: true });
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    try {
      const res = await fetch('/api/kaspi/orders?days=14', { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) setState({ error: body.error || `Ошибка ${res.status}` });
      else setState({ orders: body.orders, days: body.days });
    } catch {
      setState({ error: 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state.loading) return <p className="panel muted">Загружаем заказы из Kaspi…</p>;
  if (state.error) {
    return (
      <div className="panel">
        <p className="error">{state.error}</p>
        <button type="button" onClick={load}>Попробовать снова</button>
      </div>
    );
  }

  const orders = state.orders;
  const ok = orders.filter((o) => !LOST.has(o.status));
  const completed = orders.filter((o) => o.status === 'COMPLETED');
  const sum = ok.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);
  const cancelled = orders.length - ok.length;

  return (
    <>
      <section className="panel summary" aria-label={`Заказы за ${state.days} дней`}>
        <div><div className="k">Заказов за {state.days} дн.</div><div className="v num">{orders.length}</div></div>
        <div><div className="k">Сумма без отмен</div><div className="v num">{money(sum)}</div></div>
        <div><div className="k">Выдано</div><div className="v num pos">{completed.length}</div></div>
        <div><div className="k">Отмены и возвраты</div><div className={`v num ${cancelled ? 'neg' : ''}`}>{cancelled}</div></div>
      </section>
      <div className="topbar">
        <span className="muted">Kaspi отдаёт заказы максимум за последние 14 дней.</span>
        <button type="button" onClick={load}>Обновить</button>
      </div>
      {orders.length === 0 ? (
        <p className="panel muted">За последние {state.days} дней заказов нет. Как только появится первый, он будет здесь.</p>
      ) : (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="orders">
            <thead><tr><th>Дата</th><th>Номер</th><th>Сумма</th><th>Этап</th><th>Статус</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="num">{new Date(o.creationDate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="num">{o.code}{o.preOrder ? ' · предзаказ' : ''}</td>
                  <td className="num">{money(Number(o.totalPrice))}</td>
                  <td>{STATE_LABELS[o.state] ?? o.state}</td>
                  <td className={LOST.has(o.status) ? 'neg' : o.status === 'COMPLETED' ? 'pos' : ''}>{STATUS_LABELS[o.status] ?? o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
