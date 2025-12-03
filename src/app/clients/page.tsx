'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Link2,
  TrendingUp,
  Search,
  RefreshCw,
  Phone,
  Calendar,
  Filter,
  ChevronUp,
  ChevronDown,
  Stethoscope,
} from 'lucide-react';
import clsx from 'clsx';

interface Client {
  id: string;
  name: string;
  phone: string;
  services: string[];
  firstContact: string | null;
  lastUpdate: string | null;
  linkSent: boolean;
}

interface ClientsData {
  clients: Client[];
  stats: {
    total: number;
    newThisWeek: number;
    newToday: number;
    withLinkSent: number;
    linkSentPercentage: number;
    topServices: { service: string; count: number }[];
  };
  lastUpdated: string;
}

type SortField = 'name' | 'phone' | 'services' | 'firstContact' | 'lastUpdate';
type SortDirection = 'asc' | 'desc';

export default function ClientsPage() {
  const [data, setData] = useState<ClientsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('lastUpdate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const syncData = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync-supabase-airtable', {
        method: 'POST',
      });
      if (response.ok) {
        // Refresh client data after sync
        await fetchData(true);
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      fetchData(false);
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  // Get unique services for filter
  const allServices = data?.clients
    .flatMap(c => c.services)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort() || [];

  // Filter and sort clients
  const filteredClients = data?.clients
    .filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        client.services.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesService =
        serviceFilter === 'all' || client.services.includes(serviceFilter);

      return matchesSearch && matchesService;
    })
    .sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        case 'services':
          aValue = a.services.length;
          bValue = b.services.length;
          break;
        case 'firstContact':
          aValue = a.firstContact || '';
          bValue = b.firstContact || '';
          break;
        case 'lastUpdate':
          aValue = a.lastUpdate || a.firstContact || '';
          bValue = b.lastUpdate || b.firstContact || '';
          break;
      }

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

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-flex flex-col">
      <ChevronUp
        className={clsx(
          'w-3 h-3 -mb-1',
          sortField === field && sortDirection === 'asc'
            ? 'text-blue-500'
            : 'text-gray-300'
        )}
      />
      <ChevronDown
        className={clsx(
          'w-3 h-3',
          sortField === field && sortDirection === 'desc'
            ? 'text-blue-500'
            : 'text-gray-300'
        )}
      />
    </span>
  );

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'America/New_York',
      });
    } catch {
      return dateStr;
    }
  };

  // Format phone for display
  const formatPhone = (phone: string) => {
    if (phone.length === 11 && phone.startsWith('1')) {
      return `+1 (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Base de datos de {data?.stats.total || 0} clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncData}
            disabled={syncing}
            className={clsx(
              'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              syncing
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                : 'bg-green-500 text-white hover:bg-green-600'
            )}
          >
            <RefreshCw className={clsx('w-4 h-4', syncing && 'animate-spin')} />
            <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className={clsx(
              'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              refreshing
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            )}
          >
            <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Total Clientes</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                {data?.stats.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <UserPlus className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Nuevos (7 días)</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                {data?.stats.newThisWeek || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Link2 className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Con Enlace</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                {data?.stats.linkSentPercentage || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Top Servicio</p>
              <p className="text-sm lg:text-base font-bold text-gray-900 dark:text-white truncate">
                {data?.stats.topServices[0]?.service || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Services */}
      {data?.stats.topServices && data.stats.topServices.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Servicios más consultados
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.stats.topServices.map(({ service, count }) => (
              <span
                key={service}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm"
              >
                <Stethoscope className="w-3 h-3" />
                {service}
                <span className="bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded-full text-xs font-medium">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="all">Todos los servicios</option>
            {allServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Mostrando {filteredClients.length} de {data?.stats.total || 0} clientes
      </p>

      {/* Clients Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Nombre
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center">
                    Teléfono
                    <SortIcon field="phone" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('services')}
                >
                  <div className="flex items-center">
                    Servicios
                    <SortIcon field="services" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('firstContact')}
                >
                  <div className="flex items-center">
                    Primer Contacto
                    <SortIcon field="firstContact" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('lastUpdate')}
                >
                  <div className="flex items-center">
                    Última Actividad
                    <SortIcon field="lastUpdate" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {client.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        <Phone className="w-3 h-3" />
                        <span className="text-sm">{formatPhone(client.phone)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {client.services.length > 0 ? (
                          client.services.slice(0, 2).map((service) => (
                            <span
                              key={service}
                              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                            >
                              {service}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                        {client.services.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-xs">
                            +{client.services.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(client.firstContact)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(client.lastUpdate || client.firstContact)}
                    </td>
                    <td className="px-4 py-3">
                      {client.linkSent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                          <Link2 className="w-3 h-3" />
                          Enlace enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs">
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
