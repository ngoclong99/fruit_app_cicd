import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { statsApi, type DailyStatItem } from '../../../api/endpoints/stats';

type ChartType = 'bar' | 'line' | 'area';
type Range = 'day' | 'week' | 'month' | 'custom';

const TODAY = new Date().toISOString().slice(0, 10);

function addDays(date: string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtLabel(date: string) {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

const COLOR_DEFAULT = '#16a34a';
const COLOR_SELECTED = '#166534';

interface DayData { label: string; rawDate: string; orders: number; revenue: number }

interface Props {
  onDaySelect?: (rawDate: string) => void;
  selectedDate?: string;
}

export default function SalesChart({ onDaySelect, selectedDate }: Props) {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>('week');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [customFrom, setCustomFrom] = useState(addDays(TODAY, -13));
  const [customTo, setCustomTo] = useState(TODAY);
  const [apiData, setApiData] = useState<DailyStatItem[]>([]);

  const { from, to } = useMemo(() => {
    if (range === 'day') return { from: TODAY, to: TODAY };
    if (range === 'week') return { from: addDays(TODAY, -6), to: TODAY };
    if (range === 'month') return { from: addDays(TODAY, -29), to: TODAY };
    return { from: customFrom, to: customTo };
  }, [range, customFrom, customTo]);

  const fetchKey = `${from}|${to}`;
  const [completedKey, setCompletedKey] = useState(fetchKey);

  useEffect(() => {
    const key = `${from}|${to}`;
    statsApi.getDaily(from, to)
      .then((data) => { setApiData(data); setCompletedKey(key); })
      .catch(() => { setApiData([]); setCompletedKey(key); });
  }, [from, to]);

  const isLoading = completedKey !== fetchKey;

  const data = useMemo<DayData[]>(() => {
    const map: Record<string, DayData> = {};
    let cur = from;
    while (cur <= to) {
      map[cur] = { label: fmtLabel(cur), rawDate: cur, orders: 0, revenue: 0 };
      cur = addDays(cur, 1);
    }
    apiData.forEach((s) => {
      if (map[s.date]) { map[s.date].orders = s.orders; map[s.date].revenue = s.revenue; }
    });
    return Object.values(map);
  }, [from, to, apiData]);

  const totalOrders = useMemo(() => data.reduce((s, d) => s + d.orders, 0), [data]);
  const totalRevenue = useMemo(() => data.reduce((s, d) => s + d.revenue, 0), [data]);

  const handleClick = useCallback((point: DayData) => {
    onDaySelect?.(point.rawDate);
  }, [onDaySelect]);

  const fmtRevenue = (v: number) => v >= 1000000
    ? `${(v / 1000000).toFixed(1)}tr`
    : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  const commonProps = {
    data,
    margin: { top: 4, right: 8, left: 0, bottom: 0 },
    style: { cursor: 'pointer' },
  };

  const grid = <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />;
  const xAxis = <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />;
  const yAxis = <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} tickFormatter={fmtRevenue} />;
  const tooltip = (
    <Tooltip
      formatter={(v: number, name: string) =>
        name === 'revenue'
          ? [`${v.toLocaleString('vi-VN')}đ`, t('admin.statsRevenue')]
          : [v, t('admin.statsOrders')]
      }
    />
  );
  const legend = <Legend formatter={(name: string) => name === 'revenue' ? t('admin.statsRevenue') : t('admin.statsOrders')} />;

  const renderChart = () => {
    const barEl = (
      <Bar dataKey="revenue" radius={[4, 4, 0, 0]} onClick={(d: DayData) => handleClick(d)}>
        {data.map((d) => (
          <Cell key={d.rawDate} fill={d.rawDate === selectedDate ? COLOR_SELECTED : COLOR_DEFAULT} />
        ))}
      </Bar>
    );
    if (chartType === 'bar') return (
      <BarChart {...commonProps}>{grid}{xAxis}{yAxis}{tooltip}{legend}{barEl}</BarChart>
    );
    if (chartType === 'line') return (
      <LineChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tooltip}{legend}
        <Line type="monotone" dataKey="revenue" stroke={COLOR_DEFAULT} strokeWidth={2}
          activeDot={{ r: 6, fill: COLOR_SELECTED, stroke: 'white', strokeWidth: 2, onClick: (_: unknown, p: { payload: DayData }) => handleClick(p.payload) }}
          dot={({ cx, cy, payload }: { cx: number; cy: number; payload: DayData }) => (
            <circle key={payload.rawDate} cx={cx} cy={cy} r={payload.rawDate === selectedDate ? 5 : 3}
              fill={payload.rawDate === selectedDate ? COLOR_SELECTED : COLOR_DEFAULT}
              stroke="white" strokeWidth={2} onClick={() => handleClick(payload)} />
          )} />
      </LineChart>
    );
    return (
      <AreaChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tooltip}{legend}
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLOR_DEFAULT} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLOR_DEFAULT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="revenue" stroke={COLOR_DEFAULT} strokeWidth={2} fill="url(#salesGrad)"
          activeDot={{ r: 6, fill: COLOR_SELECTED, stroke: 'white', strokeWidth: 2, onClick: (_: unknown, p: { payload: DayData }) => handleClick(p.payload) }}
          dot={({ cx, cy, payload }: { cx: number; cy: number; payload: DayData }) => (
            <circle key={payload.rawDate} cx={cx} cy={cy} r={payload.rawDate === selectedDate ? 5 : 3}
              fill={payload.rawDate === selectedDate ? COLOR_SELECTED : COLOR_DEFAULT}
              stroke="white" strokeWidth={2} onClick={() => handleClick(payload)} />
          )} />
      </AreaChart>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold text-gray-800 text-base">{t('admin.salesStats')}</h2>
        <div className="flex gap-1">
          {(['bar', 'line', 'area'] as ChartType[]).map((ct) => (
            <button key={ct} type="button" onClick={() => setChartType(ct)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${chartType === ct ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-500 hover:border-green-400'}`}>
              {ct === 'bar' ? t('admin.chartBar') : ct === 'line' ? t('admin.chartLine') : t('admin.chartArea')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {(['day', 'week', 'month', 'custom'] as Range[]).map((r) => (
          <button key={r} type="button" onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition border ${range === r ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-500 hover:border-green-400'}`}>
            {r === 'day' ? t('admin.rangeDay') : r === 'week' ? t('admin.rangeWeek') : r === 'month' ? t('admin.rangeMonth') : t('admin.rangeCustom')}
          </button>
        ))}
        {range === 'custom' && (
          <div className="flex items-center gap-1 mt-1 w-full">
            <input type="date" value={customFrom} max={customTo} title={t('admin.dateFrom')} aria-label={t('admin.dateFrom')}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
            <span className="text-xs text-gray-400">→</span>
            <input type="date" value={customTo} min={customFrom} max={TODAY} title={t('admin.dateTo')} aria-label={t('admin.dateTo')}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <div className="bg-green-50 rounded-xl px-4 py-2.5 flex-1 text-center">
          <p className="text-xs text-gray-500">{t('admin.statsOrders')}</p>
          <p className="text-xl font-bold text-green-700">{totalOrders.toLocaleString()}</p>
          <p className="text-xs text-gray-400">{t('admin.ordersUnit')}</p>
        </div>
        <div className="bg-blue-50 rounded-xl px-4 py-2.5 flex-1 text-center">
          <p className="text-xs text-gray-500">{t('admin.statsRevenue')}</p>
          <p className="text-xl font-bold text-blue-700">{totalRevenue.toLocaleString('vi-VN')}đ</p>
          <p className="text-xs text-gray-400">{t('admin.totalLabel')}</p>
        </div>
      </div>

      <div className="flex-1 min-h-48 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl z-10">
            <div className="w-6 h-6 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
