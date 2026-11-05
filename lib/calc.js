const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

// Чистая прибыль с одной продажи и с партии.
export function calcProduct(p, settings) {
  const price = n(p.sell_price);
  const tax = n(settings?.tax_percent) / 100;
  const unitCost = n(p.buy_price) + n(p.ship_cost);
  const fee = (price * n(p.fee_percent)) / 100;
  const taxAmount = price * tax;
  const profit = price - unitCost - fee - n(p.delivery_cost) - taxAmount - n(p.ads_cost);
  const qty = n(p.qty);
  return {
    unitCost,
    fee,
    taxAmount,
    profit,
    margin: price > 0 ? (profit / price) * 100 : NaN,
    roi: unitCost > 0 ? (profit / unitCost) * 100 : NaN,
    batchCost: unitCost * qty,
    batchProfit: profit * qty,
    salesForGoal: profit > 0 ? Math.ceil(n(settings?.goal_month) / profit) : NaN,
  };
}

// Оценка ниши по отзывам у лидера и числу продавцов.
export function nicheVerdict(p) {
  const r = p.leader_reviews;
  const s = p.sellers;
  if (r == null || s == null) return { level: 'none', text: 'Внесите отзывы и продавцов' };
  if (s >= 30) return { level: 'bad', text: 'Тесно: много продавцов' };
  if (r >= 100 && s < 10) return { level: 'good', text: 'Хорошая ниша' };
  if (r < 30) return { level: 'warn', text: 'Слабый спрос' };
  return { level: 'warn', text: 'Средне: нужна цена ниже лидера' };
}

export const money = (v) => (Number.isFinite(v) ? `${Math.round(v).toLocaleString('ru-RU')} ₸` : '—');
export const percent = (v) => (Number.isFinite(v) ? `${v.toFixed(0)}%` : '—');

export const STATUSES = [
  { id: 'idea', label: 'Идея' },
  { id: 'buying', label: 'Закупаем' },
  { id: 'selling', label: 'В продаже' },
  { id: 'rejected', label: 'Отказались' },
];
