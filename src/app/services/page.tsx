'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Stethoscope, TrendingUp, Users, Link2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

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
  };
}

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

export default function ServicesPage() {
  const [data, setData] = useState<ServiceMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/service-metrics');
      if (response.ok) {
        setData(await response.json());
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

  const chartData = data?.services.slice(0, 10).map(s => ({
    name: s.service.length > 25 ? s.service.substring(0, 25) + '...' : s.service,
    fullName: s.service,
    consultas: s.consultations,
    enlaces: s.linksSent,
    citas: s.bookingsConfirmed,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Servicios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analisis de servicios consultados
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            refreshing ? 'bg-gray-100 text-gray-400' : 'bg-blue-500 text-white hover:bg-blue-600'
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
              <Stethoscope className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Servicios Unicos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.totals.uniqueServices || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Consultas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.totals.totalConsultations || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Link2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Enlaces Enviados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.totals.totalLinksSent || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Citas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.totals.totalBookings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top 10 Servicios</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Consultas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-600 dark:text-gray-400">Enlaces</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-600 dark:text-gray-400">Citas</span>
            </div>
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="space-y-3">
            {chartData.map((item, index) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200 truncate" style={{ maxWidth: '180px' }} title={item.fullName}>
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {item.consultas.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-1 h-8">
                  <div
                    className="bg-blue-500 rounded-r-md transition-all duration-300"
                    style={{ width: `${Math.max((item.consultas / Math.max(...chartData.map(d => d.consultas))) * 100, 2)}%` }}
                    title={`Consultas: ${item.consultas}`}
                  />
                  <div
                    className="bg-purple-500 rounded-r-md transition-all duration-300"
                    style={{ width: `${Math.max((item.enlaces / Math.max(...chartData.map(d => d.consultas))) * 100, 1)}%` }}
                    title={`Enlaces: ${item.enlaces}`}
                  />
                  <div
                    className="bg-emerald-500 rounded-r-md transition-all duration-300"
                    style={{ width: `${Math.max((item.citas / Math.max(...chartData.map(d => d.consultas))) * 100, 0.5)}%` }}
                    title={`Citas: ${item.citas}`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[500px] flex items-center justify-center text-gray-400">
            No hay datos disponibles
          </div>
        )}
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Servicio</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Consultas</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Enlaces</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Citas</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {data?.services.map((service, index) => (
              <tr key={service.service} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{service.service}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">{service.consultations}</td>
                <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">{service.linksSent}</td>
                <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">{service.bookingsConfirmed}</td>
                <td className="py-3 px-4 text-center">
                  <span className={clsx(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    service.conversionRate > 50 ? 'bg-green-100 text-green-700' :
                    service.conversionRate > 20 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {service.conversionRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
