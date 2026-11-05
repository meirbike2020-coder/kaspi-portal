'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { calcProduct, money, STATUSES } from '@/lib/calc';

function Portal({ session }) {
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
    ]);
    if (s.error || p.error) {
      setError('Не удалось загрузить данные. Проверьте, что SQL из supabase/schema.sql выполнен. ' + (s.error?.message || p.error?.message));
    } else {
      setError('');
      setSettings(s.data ?? { id: 1, budget: 100000, tax_percent: 4, goal_month: 1000000 });
      setProducts(p.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSetting = async (k, v) => {
    const { error: err } = await supabase.from('settings').update({ [k]: Number(v) || 0 }).eq('id', 1);
    if (err) setError('Настройки не сохранились: ' + err.message);
  };

  const addProduct = async () => {
    const { data, error: err } = await supabase.from('products').insert({ status: filter === 'all' ? 'idea' : filter }).select().single();
    if (err) setError('Не удалось добавить товар: ' + err.message);
    else setProducts((list) => [data, ...list]);
  };

  const deleteProduct = async (id) => {
    const { error: err } = await supabase.from('products').delete().eq('id', id);
    if (err) setError('Не удалось удалить: ' + err.message);
    else setProducts((list) => list.filter((x) => x.id !== id));
  };

  const updateLocal = (next) => setProducts((list) => list.map((x) => (x.id === next.id ? next : x)));

  const shown = filter === 'all' ? products : products.filter((p) => p.status === filter);

  const totals = useMemo(() => {
    const active = products.filter((p) => p.status === 'buying' || p.status === 'selling');
    let cost = 0, profit = 0;
    for (const p of active) {
      const r = calcProduct(p, settings);
      cost += r.batchCost;
      profit += r.batchProfit;
    }
    return { cost, profit, left: (Number(settings?.budget) || 0) - cost };
  }, [products, settings]);

  return (
    <main className="wrap">
      <div className="topbar">
        <h1>Kaspi <span>портал</span></h1>
        <div className="row">
          <span className="muted">{session.user.email}</span>
          <button type="button" onClick={() => supabase.auth.signOut()}>Выйти</button>
        </div>
      </div>

      {error && <p className="error panel">{error}</p>}

      {settings && (
        <>
          <section className="panel summary" aria-label="Итог по закупке">
            <div><div className="k">Бюджет</div><div className="v num">{money(Number(settings.budget))}</div></div>
            <div><div className="k">Закупка (Закупаем + В продаже)</div><div className="v num">{money(totals.cost)}</div></div>
            <div><div className="k">Остаток бюджета</div><div className={`v num ${totals.left >= 0 ? 'pos' : 'neg'}`}>{money(totals.left)}</div></div>
            <div><div className="k">Прибыль, если всё продать</div><div className={`v num ${totals.profit >= 0 ? 'pos' : 'neg'}`}>{money(totals.profit)}</div></div>
          </section>

          <section className="panel grid" aria-label="Общие настройки">
            {[['budget', 'Бюджет на закупку, ₸'], ['tax_percent', 'Налог с оборота, %'], ['goal_month', 'Цель прибыли в месяц, ₸']].map(([k, l]) => (
              <label key={k} htmlFor={`set-${k}`}>{l}
                <input id={`set-${k}`} type="number" min="0" value={settings[k] ?? ''}
                  onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
                  onBlur={(e) => saveSetting(k, e.target.value)} />
              </label>
            ))}
          </section>
        </>
      )}

      <div className="topbar">
        <div className="tabs" role="group" aria-label="Фильтр по статусу">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Все ({products.length})</button>
          {STATUSES.map((s) => (
            <button key={s.id} type="button" aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>
              {s.label} ({products.filter((p) => p.status === s.id).length})
            </button>
          ))}
        </div>
        <button className="primary" type="button" onClick={addProduct} disabled={!settings}>+ Добавить товар</button>
      </div>

      {loading && <p className="muted">Загрузка…</p>}
      {!loading && settings && shown.length === 0 && (
        <p className="panel muted">Здесь пока пусто. Нажмите «Добавить товар», внесите закупку и цену, и портал посчитает прибыль. Отзывы у лидера и число продавцов помогут оценить нишу.</p>
      )}
      {settings && shown.map((p) => (
        <ProductCard key={p.id} product={p} settings={settings} onChange={updateLocal} onDelete={deleteProduct} />
      ))}

      <p className="muted">Комиссия Kaspi зависит от категории, доставка зависит от цены и веса. Точные тарифы смотрите в кабинете продавца.</p>
    </main>
  );
}

export default function Page() {
  return <AuthGate>{(session) => <Portal session={session} />}</AuthGate>;
}
