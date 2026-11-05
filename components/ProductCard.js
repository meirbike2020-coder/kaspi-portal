'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calcProduct, nicheVerdict, money, percent, STATUSES } from '@/lib/calc';

const NUM_FIELDS = [
  ['buy_price', 'Закупка за 1 шт, ₸'],
  ['ship_cost', 'Доставка до вас за 1 шт, ₸'],
  ['sell_price', 'Цена продажи, ₸'],
  ['fee_percent', 'Комиссия Kaspi, %'],
  ['delivery_cost', 'Доставка Kaspi за заказ, ₸'],
  ['ads_cost', 'Реклама на 1 продажу, ₸'],
  ['qty', 'Сколько закупить, шт'],
];
const NULLABLE = new Set(['leader_reviews', 'sellers']);

export default function ProductCard({ product, settings, onChange, onDelete }) {
  const [p, setP] = useState(product);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const r = calcProduct(p, settings);
  const niche = nicheVerdict(p);

  const setField = (k, raw, isNum) => {
    let v = raw;
    if (isNum) v = raw === '' ? (NULLABLE.has(k) ? null : 0) : Number(raw);
    const next = { ...p, [k]: v };
    setP(next);
    return next;
  };

  const save = async (k, value) => {
    const { error: err } = await supabase.from('products').update({ [k]: value }).eq('id', p.id);
    if (err) setError('Не сохранилось: ' + err.message);
    else {
      setError('');
      onChange({ ...p, [k]: value });
    }
  };

  const numInput = (k, label) => (
    <label key={k} htmlFor={`${k}-${p.id}`}>
      {label}
      <input
        id={`${k}-${p.id}`}
        type="number"
        inputMode="decimal"
        min="0"
        value={p[k] ?? ''}
        onChange={(e) => setField(k, e.target.value, true)}
        onBlur={() => save(k, p[k])}
      />
    </label>
  );

  return (
    <article className="panel card">
      <div className="card-head">
        <label htmlFor={`name-${p.id}`}>
          Товар
          <input id={`name-${p.id}`} type="text" value={p.name} placeholder="Например, термокружка 500 мл"
            onChange={(e) => setField('name', e.target.value)} onBlur={() => save('name', p.name)} />
        </label>
        <label htmlFor={`status-${p.id}`}>
          Статус
          <select id={`status-${p.id}`} value={p.status}
            onChange={(e) => { setField('status', e.target.value); save('status', e.target.value); }}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        {confirmDelete ? (
          <div className="row">
            <button type="button" className="primary" onClick={() => onDelete(p.id)}>Да, удалить</button>
            <button type="button" onClick={() => setConfirmDelete(false)}>Отмена</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)}>Удалить</button>
        )}
      </div>

      <div className="grid">{NUM_FIELDS.map(([k, l]) => numInput(k, l))}</div>

      <div className="results">
        <div><div className="k">Прибыль с 1 шт</div><div className={`v num ${r.profit >= 0 ? 'pos' : 'neg'}`}>{money(r.profit)}</div></div>
        <div><div className="k">Маржа</div><div className="v num">{percent(r.margin)}</div></div>
        <div><div className="k">Возврат вложений</div><div className="v num">{percent(r.roi)}</div></div>
        <div><div className="k">Закупка партии</div><div className="v num">{money(r.batchCost)}</div></div>
        <div><div className="k">Прибыль с партии</div><div className={`v num ${r.batchProfit >= 0 ? 'pos' : 'neg'}`}>{money(r.batchProfit)}</div></div>
        <div><div className="k">Продаж в месяц до цели</div><div className="v num">{Number.isFinite(r.salesForGoal) ? `${r.salesForGoal.toLocaleString('ru-RU')} шт` : 'нет прибыли'}</div></div>
      </div>

      <div className="grid">
        {numInput('leader_reviews', 'Отзывов у лидера')}
        {numInput('sellers', 'Продавцов у товара')}
        <label htmlFor={`url-${p.id}`}>
          Ссылка на Kaspi
          <input id={`url-${p.id}`} type="url" value={p.kaspi_url ?? ''} placeholder="https://kaspi.kz/shop/p/…"
            onChange={(e) => setField('kaspi_url', e.target.value)} onBlur={() => save('kaspi_url', p.kaspi_url || null)} />
        </label>
      </div>
      <div className="row">
        <span className={`pill ${niche.level}`}>{niche.text}</span>
        {p.kaspi_url && /^https:\/\/kaspi\.kz\//.test(p.kaspi_url) && (
          <a href={p.kaspi_url} target="_blank" rel="noopener noreferrer">Открыть на Kaspi</a>
        )}
      </div>
      <label htmlFor={`note-${p.id}`}>
        Заметка
        <textarea id={`note-${p.id}`} rows={2} value={p.note ?? ''} placeholder="Поставщик, сроки, идеи…"
          onChange={(e) => setField('note', e.target.value)} onBlur={() => save('note', p.note || null)} />
      </label>
      {error && <p className="error">{error}</p>}
    </article>
  );
}
