'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  MessageSquare,
  Link2,
  CalendarCheck,
  TrendingUp,
  Calendar,
  XCircle,
  RefreshCw,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Bot,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import clsx from 'clsx';

interface Stats {
  totalChats: number;
  linksSent: number;
  confirmedBookings: number;
  upcomingBookings: number;
  pastBookings: number;
  cancelledBookings: number;
  rescheduledBookings: number;
  bookingRate: string;
  cancelRate: string;
  recentUpcoming: {
    date: string;
    time: string;
    attendee: string;
    status: string;
  }[];
  lastUpdated: string;
}

interface N8nMetrics {
  period: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: string;
  executionsByDay: { date: string; success: number; error: number }[];
  executionsByMonth: { month: string; success: number; error: number }[];
  recentExecutions: {
    id: number;
    status: string;
    startedAt: string;
    duration: number | null;
  }[];
  totalExecutionsAllTime: number;
}

interface ServiceMetric {
  service: string;
  consultations: number;
  linksSent: number;
  bookingsConfirmed: number;
  conversionRate: number;
}

interface ServiceMetricsData {
  services: ServiceMetric[];
  totals: {
    totalConsultations: number;
    totalLinksSent: number;
    totalBookings: number;
    uniqueServices: number;
    totalConversations?: number;
    conversationsWithCalLink?: number;
    totalCalcomBookings?: number;
  };
  calcomStats?: {
    totalBookings: number;
    matchedBookings: number;
    overallConversionRate: number;
  };
  source?: string;
  lastUpdated: string;
}

// KPI Card Component
function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan';
}) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={clsx(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
            )}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', colorStyles[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// Upcoming Bookings Component
function UpcomingBookings({ bookings }: { bookings: Stats['recentUpcoming'] }) {
  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
        No hay citas programadas
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2.5 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{booking.attendee}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{booking.date} - {booking.time}</p>
            </div>
          </div>
          <span className={clsx(
            'px-2.5 py-1 rounded-full text-xs font-medium',
            booking.status === 'Reagendado'
              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
              : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          )}>
            {booking.status}
          </span>
        </div>
      ))}
    </div>
  );
}

type FilterPeriod = '7days' | '30days' | '90days' | 'month' | 'year' | 'all';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [n8nMetrics, setN8nMetrics] = useState<N8nMetrics | null>(null);
  const [serviceMetrics, setServiceMetrics] = useState<ServiceMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nextRefresh, setNextRefresh] = useState<number>(REFRESH_INTERVAL_MS / 1000);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('7days');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [n8nLoading, setN8nLoading] = useState(false);

  const fetchFilteredData = async (period: FilterPeriod, year?: string, month?: string) => {
    setN8nLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (year && (period === 'year' || period === 'month')) params.set('year', year);
      if (month && period === 'month') params.set('month', month);

      const [n8nRes, statsRes] = await Promise.all([
        fetch(`/api/n8n-metrics?${params.toString()}`),
        fetch(`/api/stats?${params.toString()}`)
      ]);

      if (n8nRes.ok) setN8nMetrics(await n8nRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Error fetching filtered data:', err);
    } finally {
      setN8nLoading(false);
    }
  };

  const handleFilterChange = (period: FilterPeriod) => {
    setFilterPeriod(period);
    fetchFilteredData(period, filterYear, filterMonth);
  };

  const handleYearChange = (year: string) => {
    setFilterYear(year);
    if (filterPeriod === 'year' || filterPeriod === 'month') {
      fetchFilteredData(filterPeriod, year, filterMonth);
    }
  };

  const handleMonthChange = (month: string) => {
    setFilterMonth(month);
    if (filterPeriod === 'month') {
      fetchFilteredData(filterPeriod, filterYear, month);
    }
  };

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsRes, n8nRes, serviceRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/n8n-metrics?period=7days'),
        fetch('/api/service-metrics')
      ]);

      if (!statsRes.ok) throw new Error('Error fetching stats');
      setStats(await statsRes.json());
      if (n8nRes.ok) setN8nMetrics(await n8nRes.json());
      if (serviceRes.ok) setServiceMetrics(await serviceRes.json());
      setNextRefresh(REFRESH_INTERVAL_MS / 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    if (!serviceMetrics) return;
    const headers = ['Servicio', 'Consultas', 'Enlaces Enviados', 'Citas Confirmadas', 'Tasa de Conversion'];
    const rows = serviceMetrics.services.map(s => [
      s.service, s.consultations, s.linksSent, s.bookingsConfirmed, `${s.conversionRate}%`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servicios-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  useEffect(() => {
    fetchStats();
    const dataInterval = setInterval(() => fetchStats(), REFRESH_INTERVAL_MS);
    const countdownInterval = setInterval(() => {
      setNextRefresh(prev => (prev > 0 ? prev - 1 : REFRESH_INTERVAL_MS / 1000));
    }, 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-white font-semibold">Error al cargar datos</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{error}</p>
          <button
            onClick={() => fetchStats(true)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = n8nMetrics?.executionsByDay.map(d => ({
    date: new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    exitosos: d.success,
    errores: d.error,
    total: d.success + d.error,
  })) || [];

  const funnelData = serviceMetrics ? [
    { name: 'Conversaciones', value: serviceMetrics.totals.totalConversations || 0 },
    { name: 'Enlaces Enviados', value: serviceMetrics.totals.conversationsWithCalLink || 0 },
    { name: 'Citas Confirmadas', value: serviceMetrics.calcomStats?.totalBookings || 0 },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vista General
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Metricas del agente de WhatsApp en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={!serviceMetrics}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              refreshing
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            )}
          >
            <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Proxima actualizacion</p>
            <p className="text-sm font-mono text-gray-600 dark:text-gray-300">
              {Math.floor(nextRefresh / 60)}:{(nextRefresh % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Chats Respondidos"
          value={stats?.totalChats || 0}
          subtitle="Clientes atendidos"
          icon={MessageSquare}
          color="blue"
        />
        <KPICard
          title="Enlaces Enviados"
          value={stats?.linksSent || 0}
          subtitle="Cal.com links"
          icon={Link2}
          color="purple"
        />
        <KPICard
          title="Citas Confirmadas"
          value={stats?.confirmedBookings || 0}
          subtitle={`${stats?.upcomingBookings || 0} proximas`}
          icon={CalendarCheck}
          color="green"
        />
        <KPICard
          title="Tasa de Conversion"
          value={stats?.bookingRate || '0%'}
          subtitle="Enlaces a citas"
          icon={TrendingUp}
          color="cyan"
        />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Citas Proximas"
          value={stats?.upcomingBookings || 0}
          subtitle="Programadas"
          icon={Calendar}
          color="blue"
        />
        <KPICard
          title="Cancelaciones"
          value={stats?.cancelledBookings || 0}
          subtitle={`Tasa: ${stats?.cancelRate || '0%'}`}
          icon={XCircle}
          color="red"
        />
        <KPICard
          title="Reagendadas"
          value={stats?.rescheduledBookings || 0}
          subtitle="Reprogramadas"
          icon={RefreshCw}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Actividad del Agente</h3>
            <div className="flex items-center gap-1">
              {['7days', '30days'].map((p) => (
                <button
                  key={p}
                  onClick={() => handleFilterChange(p as FilterPeriod)}
                  disabled={n8nLoading}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                    filterPeriod === p
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {p === '7days' ? '7 dias' : '30 dias'}
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="exitosos"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorSuccess)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="errores"
                  stroke="#EF4444"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No hay datos disponibles
            </div>
          )}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="w-3 h-3 bg-green-500 rounded" />
              Exitosos
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="w-3 h-3 border-2 border-red-500 border-dashed rounded" />
              Errores
            </div>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Embudo de Conversion</h3>
          <div className="space-y-3">
            {funnelData.map((item, index) => {
              const maxValue = funnelData[0]?.value || 1;
              const percentage = maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                  <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: CHART_COLORS[index],
                      }}
                    />
                  </div>
                  {index < funnelData.length - 1 && funnelData[index + 1] && (
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {funnelData[index + 1].value > 0 && item.value > 0
                        ? `${Math.round((funnelData[index + 1].value / item.value) * 100)}% conversion`
                        : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {serviceMetrics?.calcomStats && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Conversion Total</span>
                <span className="text-lg font-bold text-green-600">
                  {serviceMetrics.calcomStats.overallConversionRate}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Services & Upcoming Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        {serviceMetrics && serviceMetrics.services.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Servicios Mas Consultados</h3>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                Top 5
              </span>
            </div>
            <div className="space-y-4">
              {serviceMetrics.services.slice(0, 5).map((service, index) => {
                const maxConsultations = serviceMetrics.services[0]?.consultations || 1;
                const width = (service.consultations / maxConsultations) * 100;
                return (
                  <div key={service.service}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{service.service}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">{service.consultations} consultas</span>
                        {service.conversionRate > 0 && (
                          <span className="text-green-600 font-semibold">{service.conversionRate}%</span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${width}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Bookings */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Proximas Citas</h3>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <UpcomingBookings bookings={stats?.recentUpcoming || []} />
        </div>
      </div>

      {/* Agent Activity */}
      {n8nMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Procesados"
            value={n8nMetrics.totalExecutions}
            subtitle={`${n8nMetrics.successRate}% exitosos`}
            icon={Bot}
            color="purple"
          />
          <KPICard
            title="Exitosos"
            value={n8nMetrics.successfulExecutions}
            subtitle="Completados"
            icon={CheckCircle2}
            color="green"
          />
          <KPICard
            title="Errores"
            value={n8nMetrics.failedExecutions}
            subtitle="Requieren atencion"
            icon={AlertCircle}
            color="red"
          />
          <KPICard
            title="Total Historico"
            value={n8nMetrics.totalExecutionsAllTime}
            subtitle="Desde el inicio"
            icon={Activity}
            color="cyan"
          />
        </div>
      )}

      {/* Recent Executions */}
      {n8nMetrics && n8nMetrics.recentExecutions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ultimas Ejecuciones</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Duracion</th>
                </tr>
              </thead>
              <tbody>
                {n8nMetrics.recentExecutions.slice(0, 5).map((exec) => (
                  <tr key={exec.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-3">
                      <span className={clsx(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                        exec.status === 'success'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        <span className={clsx(
                          'w-1.5 h-1.5 rounded-full',
                          exec.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        )} />
                        {exec.status === 'success' ? 'Exitoso' : 'Error'}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(exec.startedAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 text-sm text-gray-500 dark:text-gray-500">
                      {exec.duration !== null ? `${exec.duration}s` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
