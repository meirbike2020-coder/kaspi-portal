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

const DEFAULT_TEMPLATE = 'Здравствуйте, {имя}! Спасибо за ваш заказ №{номер} на Kaspi. Если будут вопросы по товару, пишите сюда, мы всегда на связи. Будем рады вашему отзыву на Kaspi!';
const TEMPLATE_KEY = 'kaspi-thanks-template';
const SENT_KEY = 'kaspi-thanks-sent';

const readLS = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
};
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Kaspi gives a 10-digit number like 7071234567; WhatsApp needs 77071234567.
function waPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10) d = '7' + d;
  else if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
  return d.length === 11 ? d : '';
}
const fillTemplate = (t, o) => t.replaceAll('{имя}', o.customerName || '').replaceAll('{номер}', o.code || '').replace(/\s+!/g, '!').replace(/Здравствуйте,\s*!/, 'Здравствуйте!');

export default function KaspiOrders() {
  const [state, setState] = useState({ loading: true });
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [sent, setSent] = useState({});
  const [showTemplate, setShowTemplate] = useState(false);

  useEffect(() => {
    setTemplate(readLS(TEMPLATE_KEY, DEFAULT_TEMPLATE));
    setSent(readLS(SENT_KEY, {}));
  }, []);

  const markSent = (id) => {
    const next = { ...sent, [id]: Date.now() };
    setSent(next);
    writeLS(SENT_KEY, next);
  };

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
        <div className="row">
          <button type="button" onClick={() => setShowTemplate((v) => !v)}>{showTemplate ? 'Скрыть текст' : 'Текст благодарности'}</button>
          <button type="button" onClick={load}>Обновить</button>
        </div>
      </div>
      {showTemplate && (
        <div className="panel card">
          <label htmlFor="thanks-template">
            Текст сообщения. Вместо {'{имя}'} и {'{номер}'} подставятся имя покупателя и номер заказа.
            <textarea id="thanks-template" rows={4} value={template}
              onChange={(e) => { setTemplate(e.target.value); writeLS(TEMPLATE_KEY, e.target.value); }} />
          </label>
          <div className="row">
            <button type="button" onClick={() => { setTemplate(DEFAULT_TEMPLATE); writeLS(TEMPLATE_KEY, DEFAULT_TEMPLATE); }}>Вернуть стандартный текст</button>
            <span className="muted">Текст сохраняется в этом браузере.</span>
          </div>
        </div>
      )}
      {orders.length === 0 ? (
        <p className="panel muted">За последние {state.days} дней заказов нет. Как только появится первый, он будет здесь.</p>
      ) : (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="orders">
            <thead><tr><th>Дата</th><th>Номер</th><th>Сумма</th><th>Покупатель</th><th>Этап</th><th>Статус</th><th>Благодарность</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="num">{new Date(o.creationDate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="num">{o.code}{o.preOrder ? ' · предзаказ' : ''}</td>
                  <td className="num">{money(Number(o.totalPrice))}</td>
                  <td>{o.customerName || '—'}</td>
                  <td>{STATE_LABELS[o.state] ?? o.state}</td>
                  <td className={LOST.has(o.status) ? 'neg' : o.status === 'COMPLETED' ? 'pos' : ''}>{STATUS_LABELS[o.status] ?? o.status}</td>
                  <td>
                    {LOST.has(o.status) ? <span className="muted">Отменён</span> : waPhone(o.customerPhone) ? (
                      <a className={`wa ${sent[o.id] ? 'sent' : ''}`} href={`https://wa.me/${waPhone(o.customerPhone)}?text=${encodeURIComponent(fillTemplate(template, o))}`}
                        target="_blank" rel="noopener noreferrer" onClick={() => markSent(o.id)}>
                        {sent[o.id] ? '✓ Отправлено' : 'Написать в WhatsApp'}
                      </a>
                    ) : <span className="muted">Нет телефона</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
