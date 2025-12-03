'use client';

import { Calendar, Clock, User, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface Stats {
  upcomingBookings: number;
  pastBookings: number;
  cancelledBookings: number;
  rescheduledBookings: number;
  recentUpcoming: {
    date: string;
    time: string;
    attendee: string;
    status: string;
  }[];
}

export default function AppointmentsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Citas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestion de citas de Cal.com
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className={clsx(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto',
            refreshing ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' : 'bg-blue-500 text-white hover:bg-blue-600'
          )}
        >
          <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-300">Proximas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.upcomingBookings || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-300">Completadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.pastBookings || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-300">Canceladas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.cancelledBookings || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <RefreshCw className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-300">Reagendadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.rescheduledBookings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Proximas Citas</h3>
        {stats?.recentUpcoming && stats.recentUpcoming.length > 0 ? (
          <div className="space-y-3">
            {stats.recentUpcoming.map((booking, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg gap-3"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-lg flex-shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{booking.attendee}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {booking.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {booking.time}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium self-start sm:self-center flex-shrink-0',
                  booking.status === 'Reagendado'
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                )}>
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay citas programadas</p>
        )}
      </div>

      {/* Cal.com Link */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <h3 className="font-semibold text-lg mb-2">Gestionar en Cal.com</h3>
        <p className="text-blue-100 text-sm mb-4">
          Para gestionar, crear o modificar citas, accede directamente a Cal.com
        </p>
        <a
          href="https://cal.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Abrir Cal.com
        </a>
      </div>
    </div>
  );
}
