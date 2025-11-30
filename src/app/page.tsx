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
  totalExecutions7Days: number;
  successfulExecutions7Days: number;
  failedExecutions7Days: number;
  successRate7Days: string;
  totalExecutions30Days: number;
  successRate30Days: string;
  recentExecutions: {
    id: number;
    status: string;
    startedAt: string;
    duration: number | null;
  }[];
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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [n8nMetrics, setN8nMetrics] = useState<N8nMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, n8nRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/n8n-metrics')
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Actividad del Agente de WhatsApp
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Mensajes Procesados (7 dias)"
                value={n8nMetrics.totalExecutions7Days}
                subtitle={`${n8nMetrics.successRate7Days}% exitosos`}
                color="purple"
                icon="🤖"
              />
              <StatCard
                title="Exitosos (7 dias)"
                value={n8nMetrics.successfulExecutions7Days}
                subtitle="Conversaciones completadas"
                color="green"
                icon="✓"
              />
              <StatCard
                title="Errores (7 dias)"
                value={n8nMetrics.failedExecutions7Days}
                subtitle="Requieren atencion"
                color="red"
                icon="⚠"
              />
              <StatCard
                title="Total (30 dias)"
                value={n8nMetrics.totalExecutions30Days}
                subtitle={`${n8nMetrics.successRate30Days}% exito`}
                color="cyan"
                icon="📊"
              />
            </div>

            {/* Recent Executions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Ultimas Ejecuciones del Agente
              </h3>
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
