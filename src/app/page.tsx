'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  filterStart: string;
  filterEnd: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: string;
  totalExecutions7Days: number;
  successRate7Days: string;
  totalExecutions30Days: number;
  successRate30Days: string;
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

function StatCard({
  title,
  value,
  subtitle,
  color,
  icon
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  icon: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    cyan: 'bg-cyan-500',
    pink: 'bg-pink-500',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && (
            <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`${colorClasses[color]} p-4 rounded-xl`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function UpcomingBookings({ bookings }: { bookings: Stats['recentUpcoming'] }) {
  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No hay citas programadas
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{booking.attendee}</p>
              <p className="text-sm text-gray-500">{booking.date} - {booking.time}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            booking.status === 'Reagendado'
              ? 'bg-orange-100 text-orange-600'
              : 'bg-green-100 text-green-600'
          }`}>
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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [n8nMetrics, setN8nMetrics] = useState<N8nMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('7days');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [n8nLoading, setN8nLoading] = useState(false);

  // Fetch n8n metrics with filters
  const fetchN8nMetrics = async (period: FilterPeriod, year?: string, month?: string) => {
    setN8nLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (year && (period === 'year' || period === 'month')) {
        params.set('year', year);
      }
      if (month && period === 'month') {
        params.set('month', month);
      }

      const res = await fetch(`/api/n8n-metrics?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setN8nMetrics(data);
      }
    } catch (err) {
      console.error('Error fetching n8n metrics:', err);
    } finally {
      setN8nLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (period: FilterPeriod) => {
    setFilterPeriod(period);
    fetchN8nMetrics(period, filterYear, filterMonth);
  };

  const handleYearChange = (year: string) => {
    setFilterYear(year);
    if (filterPeriod === 'year' || filterPeriod === 'month') {
      fetchN8nMetrics(filterPeriod, year, filterMonth);
    }
  };

  const handleMonthChange = (month: string) => {
    setFilterMonth(month);
    if (filterPeriod === 'month') {
      fetchN8nMetrics(filterPeriod, filterYear, month);
    }
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, n8nRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/n8n-metrics?period=7days')
        ]);

        if (!statsRes.ok) throw new Error('Error fetching stats');
        const statsData = await statsRes.json();
        setStats(statsData);

        if (n8nRes.ok) {
          const n8nData = await n8nRes.json();
          setN8nMetrics(n8nData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-50 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <p className="text-gray-800 font-semibold">Error al cargar datos</p>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Dashboard Dr. Arnaldo Lopez
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Agente de WhatsApp - Metricas en tiempo real
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/citas"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Gestionar Citas
              </Link>
              <div className="text-right">
                <p className="text-xs text-gray-400">Ultima actualizacion</p>
                <p className="text-sm text-gray-600">
                  {stats?.lastUpdated
                    ? new Date(stats.lastUpdated).toLocaleString('es-ES')
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Chats Respondidos"
            value={stats?.totalChats || 0}
            subtitle="Total de clientes atendidos"
            color="blue"
            icon="💬"
          />
          <StatCard
            title="Enlaces de Cita Enviados"
            value={stats?.linksSent || 0}
            subtitle="Cal.com links compartidos"
            color="purple"
            icon="🔗"
          />
          <StatCard
            title="Citas Confirmadas"
            value={stats?.confirmedBookings || 0}
            subtitle={`${stats?.upcomingBookings || 0} proximas, ${stats?.pastBookings || 0} completadas`}
            color="green"
            icon="✅"
          />
          <StatCard
            title="Tasa de Conversion"
            value={stats?.bookingRate || '0%'}
            subtitle="Enlaces -> Citas"
            color="cyan"
            icon="📈"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Citas Proximas"
            value={stats?.upcomingBookings || 0}
            subtitle="Programadas"
            color="blue"
            icon="📅"
          />
          <StatCard
            title="Citas Canceladas"
            value={stats?.cancelledBookings || 0}
            subtitle={`Tasa: ${stats?.cancelRate || '0%'}`}
            color="red"
            icon="❌"
          />
          <StatCard
            title="Citas Reagendadas"
            value={stats?.rescheduledBookings || 0}
            subtitle="Reprogramadas por el cliente"
            color="orange"
            icon="🔄"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Proximas Citas
          </h2>
          <UpcomingBookings bookings={stats?.recentUpcoming || []} />
        </div>

        {/* n8n Agent Metrics */}
        {n8nMetrics && (
          <div className="mt-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
              <h2 className="text-xl font-bold text-gray-800">
                Actividad del Agente de WhatsApp
              </h2>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Period buttons */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { value: '7days', label: '7 dias' },
                    { value: '30days', label: '30 dias' },
                    { value: '90days', label: '90 dias' },
                    { value: 'month', label: 'Mes' },
                    { value: 'year', label: 'Año' },
                    { value: 'all', label: 'Todo' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange(option.value as FilterPeriod)}
                      disabled={n8nLoading}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterPeriod === option.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      } ${n8nLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Year selector */}
                {(filterPeriod === 'year' || filterPeriod === 'month') && (
                  <select
                    value={filterYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    disabled={n8nLoading}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[2025, 2024, 2023].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}

                {/* Month selector */}
                {filterPeriod === 'month' && (
                  <select
                    value={filterMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    disabled={n8nLoading}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                )}

                {n8nLoading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-purple-500"></div>
                )}
              </div>
            </div>

            {/* Filtered period label */}
            <p className="text-sm text-gray-500 mb-4">
              Mostrando datos: {' '}
              {filterPeriod === '7days' && 'Ultimos 7 dias'}
              {filterPeriod === '30days' && 'Ultimos 30 dias'}
              {filterPeriod === '90days' && 'Ultimos 90 dias'}
              {filterPeriod === 'month' && `${MONTHS[parseInt(filterMonth) - 1]} ${filterYear}`}
              {filterPeriod === 'year' && `Año ${filterYear}`}
              {filterPeriod === 'all' && 'Todo el historial'}
              {' '}({n8nMetrics.totalExecutions} ejecuciones)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Total Procesados"
                value={n8nMetrics.totalExecutions}
                subtitle={`${n8nMetrics.successRate}% exitosos`}
                color="purple"
                icon="🤖"
              />
              <StatCard
                title="Exitosos"
                value={n8nMetrics.successfulExecutions}
                subtitle="Conversaciones completadas"
                color="green"
                icon="✓"
              />
              <StatCard
                title="Errores"
                value={n8nMetrics.failedExecutions}
                subtitle="Requieren atencion"
                color="red"
                icon="⚠"
              />
              <StatCard
                title="Total Historico"
                value={n8nMetrics.totalExecutionsAllTime}
                subtitle="Desde el inicio"
                color="cyan"
                icon="📊"
              />
            </div>

            {/* Chart - Executions by day/month */}
            {(n8nMetrics.executionsByDay.length > 0 || n8nMetrics.executionsByMonth.length > 0) && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Actividad {filterPeriod === 'year' || filterPeriod === 'all' ? 'por Mes' : 'por Dia'}
                </h3>
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-1 min-w-max h-32">
                    {(filterPeriod === 'year' || filterPeriod === 'all'
                      ? n8nMetrics.executionsByMonth
                      : n8nMetrics.executionsByDay
                    ).map((item, index) => {
                      const total = 'success' in item ? item.success + item.error : 0;
                      const maxHeight = 100;
                      const maxTotal = Math.max(
                        ...(filterPeriod === 'year' || filterPeriod === 'all'
                          ? n8nMetrics.executionsByMonth
                          : n8nMetrics.executionsByDay
                        ).map((d) => d.success + d.error)
                      );
                      const height = maxTotal > 0 ? (total / maxTotal) * maxHeight : 0;
                      const successHeight = maxTotal > 0 ? (item.success / maxTotal) * maxHeight : 0;

                      const label = 'date' in item
                        ? new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                        : MONTHS[parseInt(item.month.split('-')[1]) - 1]?.substring(0, 3);

                      return (
                        <div key={index} className="flex flex-col items-center">
                          <div className="relative" style={{ height: maxHeight }}>
                            <div
                              className="w-8 bg-red-200 rounded-t absolute bottom-0"
                              style={{ height: `${height}px` }}
                            />
                            <div
                              className="w-8 bg-green-400 rounded-t absolute bottom-0"
                              style={{ height: `${successHeight}px` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 mt-1 rotate-45 origin-left whitespace-nowrap">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded" />
                    <span className="text-gray-600">Exitosos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-200 rounded" />
                    <span className="text-gray-600">Errores</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Executions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Ultimas Ejecuciones del Agente
              </h3>
              {n8nMetrics.recentExecutions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay ejecuciones en este periodo</p>
              ) : (
                <div className="space-y-2">
                  {n8nMetrics.recentExecutions.slice(0, 5).map((exec) => (
                    <div
                      key={exec.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            exec.status === 'success'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                        />
                        <span className="text-sm text-gray-600">
                          {new Date(exec.startedAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {exec.duration !== null && (
                          <span className="text-xs text-gray-400">
                            {exec.duration}s
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            exec.status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {exec.status === 'success' ? 'Exitoso' : 'Error'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>Dashboard creado por Henoc Marketing</p>
          <p className="mt-1">
            Datos de Cal.com y Airtable actualizados automaticamente
          </p>
        </footer>
      </main>
    </div>
  );
}
