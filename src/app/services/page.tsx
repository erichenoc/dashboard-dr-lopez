'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Stethoscope,
  TrendingUp,
  TrendingDown,
  Users,
  Link2,
  RefreshCw,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Phone,
  CheckCircle2,
  XCircle,
  Percent,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import clsx from 'clsx';

interface ClientInfo {
  name: string;
  phone: string;
  sessionId: string;
  calLinkSent: boolean;
  hasBooking: boolean;
}

interface ServiceMetric {
  service: string;
  consultations: number;
  linksSent: number;
  bookingsConfirmed: number;
  conversionRate: number;
  clients: ClientInfo[];
}

interface ServiceMetricsData {
  services: ServiceMetric[];
  totals: {
    totalConsultations: number;
    totalLinksSent: number;
    totalBookings: number;
    uniqueServices: number;
    totalConversations: number;
    conversationsWithCalLink: number;
    totalCalcomBookings: number;
  };
  calcomStats: {
    totalBookings: number;
    matchedBookings: number;
    overallConversionRate: number;
  };
}

type SortField = 'service' | 'consultations' | 'linksSent' | 'bookingsConfirmed' | 'conversionRate';
type SortDirection = 'asc' | 'desc';

interface TrendData {
  date: string;
  consultas: number;
}

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#6366F1', '#14B8A6'];

export default function ServicesPage() {
  const [data, setData] = useState<ServiceMetricsData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('consultations');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedService, setSelectedService] = useState<ServiceMetric | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [serviceRes, n8nRes] = await Promise.all([
        fetch('/api/service-metrics'),
        fetch('/api/n8n-metrics?period=30days')
      ]);

      if (serviceRes.ok) {
        setData(await serviceRes.json());
      }

      if (n8nRes.ok) {
        const n8nData = await n8nRes.json();
        // Transform n8n data to trend format
        const trend = n8nData.executionsByDay?.map((d: { date: string; success: number; error: number }) => ({
          date: new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'America/New_York' }),
          consultas: d.success + d.error
        })) || [];
        setTrendData(trend);
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

    // Auto-refresh every 60 seconds for real-time updates
    const interval = setInterval(() => {
      fetchData(false); // Silent refresh without showing spinner
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Filter and sort services
  const filteredServices = data?.services
    .filter(s => s.service.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }) || [];

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get trend indicator based on position in ranking
  const getTrendIndicator = (index: number, total: number) => {
    const percentile = index / total;
    if (percentile <= 0.2) {
      return { icon: ArrowUpRight, color: 'text-green-500', label: 'Alto' };
    } else if (percentile <= 0.5) {
      return { icon: Minus, color: 'text-yellow-500', label: 'Medio' };
    } else {
      return { icon: ArrowDownRight, color: 'text-red-500', label: 'Bajo' };
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!data) return;

    const headers = ['Servicio', 'Consultas', 'Enlaces Enviados', 'Citas Confirmadas', 'Tasa de Conversión'];
    const rows = filteredServices.map(s => [
      s.service,
      s.consultations,
      s.linksSent,
      s.bookingsConfirmed,
      `${s.conversionRate}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `servicios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Open service detail modal
  const openServiceDetail = (service: ServiceMetric) => {
    setSelectedService(service);
    setModalOpen(true);
  };

  // Prepare pie chart data
  const pieChartData = data?.services.slice(0, 8).map((s, index) => ({
    name: s.service,
    value: s.consultations,
    color: CHART_COLORS[index % CHART_COLORS.length],
  })) || [];

  // Add "Others" if there are more services
  if (data && data.services.length > 8) {
    const othersValue = data.services.slice(8).reduce((sum, s) => sum + s.consultations, 0);
    pieChartData.push({
      name: 'Otros',
      value: othersValue,
      color: '#9CA3AF',
    });
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-30" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-4 h-4 text-blue-500" />
      : <ChevronDown className="w-4 h-4 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Servicios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Análisis de servicios consultados por clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className={clsx(
              'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              refreshing ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' : 'bg-blue-500 text-white hover:bg-blue-600'
            )}
          >
            <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Stethoscope className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-300">Servicios</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{data?.totals.uniqueServices || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Users className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-300">Consultas</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{data?.totals.totalConsultations || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Link2 className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-300">Enlaces</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{data?.totals.totalLinksSent || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-300">Citas Cal.com</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                {data?.totals.totalBookings || <span className="text-gray-400 text-sm">Pendiente</span>}
              </p>
            </div>
          </div>
        </div>
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 bg-white/20 rounded-lg">
              <Percent className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-blue-100">Conversión Enlaces</p>
              <p className="text-xl lg:text-2xl font-bold text-white">
                {data?.totals?.totalConsultations
                  ? Math.round((data.totals.totalLinksSent / data.totals.totalConsultations) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Servicios</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">Consultas</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-gray-600 dark:text-gray-400">Enlaces</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-400">Citas</span>
              </div>
            </div>
          </div>
          {data?.services && data.services.length > 0 ? (
            <div className="space-y-3">
              {data.services.slice(0, 8).map((item, index) => {
                const maxConsultas = Math.max(...data.services.map(d => d.consultations));
                return (
                  <div key={item.service} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-100 truncate max-w-[140px]" title={item.service}>
                        {item.service}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-300 ml-2">
                        {item.consultations}
                      </span>
                    </div>
                    <div className="flex gap-1 h-6">
                      <div
                        className="bg-blue-500 rounded-r-md transition-all duration-300"
                        style={{ width: `${Math.max((item.consultations / maxConsultas) * 100, 2)}%` }}
                        title={`Consultas: ${item.consultations}`}
                      />
                      <div
                        className="bg-purple-500 rounded-r-md transition-all duration-300"
                        style={{ width: `${Math.max((item.linksSent / maxConsultas) * 100, 1)}%` }}
                        title={`Enlaces: ${item.linksSent}`}
                      />
                      <div
                        className="bg-emerald-500 rounded-r-md transition-all duration-300"
                        style={{ width: `${Math.max((item.bookingsConfirmed / maxConsultas) * 100, 0.5)}%` }}
                        title={`Citas: ${item.bookingsConfirmed}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No hay datos disponibles
            </div>
          )}
        </div>

        {/* Trend Chart - Actividad de Consultas */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tendencia de Actividad (30 días)</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  stroke="#9CA3AF"
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip
                  formatter={(value: number) => [`${value} consultas`, 'Total']}
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="consultas"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorConsultas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No hay datos disponibles
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('service')}
                >
                  <div className="flex items-center gap-1">
                    Servicio
                    <SortIcon field="service" />
                  </div>
                </th>
                <th
                  className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('consultations')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Consultas
                    <SortIcon field="consultations" />
                  </div>
                </th>
                <th
                  className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hidden md:table-cell"
                  onClick={() => handleSort('linksSent')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Enlaces
                    <SortIcon field="linksSent" />
                  </div>
                </th>
                <th
                  className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hidden sm:table-cell"
                  onClick={() => handleSort('bookingsConfirmed')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Citas
                    <SortIcon field="bookingsConfirmed" />
                  </div>
                </th>
                <th
                  className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('conversionRate')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Conversión
                    <SortIcon field="conversionRate" />
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden lg:table-cell">
                  Tendencia
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service, index) => {
                const trend = getTrendIndicator(index, filteredServices.length);
                const TrendIcon = trend.icon;
                return (
                  <tr key={service.service} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{service.service}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-300">{service.consultations}</td>
                    <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-300 hidden md:table-cell">{service.linksSent}</td>
                    <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-300 hidden sm:table-cell">{service.bookingsConfirmed}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        service.conversionRate > 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        service.conversionRate > 20 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      )}>
                        {service.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <TrendIcon className={clsx('w-4 h-4', trend.color)} />
                        <span className={clsx('text-xs font-medium', trend.color)}>{trend.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openServiceDetail(service)}
                        className="p-2 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Ver clientes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron servicios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Detail Modal */}
      {modalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedService.service}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedService.clients.length} clientes interesados
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Stats */}
            <div className="grid grid-cols-4 gap-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedService.consultations}</p>
                <p className="text-xs text-gray-500">Consultas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedService.linksSent}</p>
                <p className="text-xs text-gray-500">Enlaces</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedService.bookingsConfirmed}</p>
                <p className="text-xs text-gray-500">Citas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{selectedService.conversionRate}%</p>
                <p className="text-xs text-gray-500">Conversión</p>
              </div>
            </div>

            {/* Client List */}
            <div className="overflow-y-auto max-h-[50vh] p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Clientes Interesados
              </h3>
              <div className="space-y-2">
                {selectedService.clients.map((client, index) => (
                  <div
                    key={`${client.sessionId}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {client.name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {client.calLinkSent && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs">
                          <Link2 className="w-3 h-3" />
                          Enlace
                        </span>
                      )}
                      {client.hasBooking ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Cita
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                          <XCircle className="w-3 h-3" />
                          Sin cita
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setModalOpen(false)}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
