'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Phone,
  User,
  Link2,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Tag,
} from 'lucide-react';
import clsx from 'clsx';

interface Conversation {
  sessionId: string;
  phoneNumber: string;
  userName: string;
  messageCount: number;
  interactions: number; // Solo mensajes del usuario
  servicesConsulted: string[];
  calLinkSent: boolean;
  lastMessage: string;
}

interface ConversationsData {
  conversations: Conversation[];
  total: number;
  lastUpdated: string;
}

export default function ConversationsPage() {
  const [data, setData] = useState<ConversationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLinkSent, setFilterLinkSent] = useState<'all' | 'yes' | 'no'>('all');
  const [filterService, setFilterService] = useState<string>('all');

  const fetchConversations = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ['Telefono', 'Nombre', 'Interacciones', 'Servicios', 'Enlace Enviado'];
    const rows = filteredConversations.map(c => [
      c.phoneNumber,
      c.userName,
      c.interactions,
      c.servicesConsulted.join('; '),
      c.calLinkSent ? 'Si' : 'No'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversaciones-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Get unique services for filter
  const allServices = data?.conversations.flatMap(c => c.servicesConsulted) || [];
  const uniqueServices = [...new Set(allServices)].sort();

  // Filter conversations
  const filteredConversations = data?.conversations.filter(c => {
    const matchesSearch = searchTerm === '' ||
      c.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phoneNumber.includes(searchTerm);

    const matchesLinkFilter = filterLinkSent === 'all' ||
      (filterLinkSent === 'yes' && c.calLinkSent) ||
      (filterLinkSent === 'no' && !c.calLinkSent);

    const matchesServiceFilter = filterService === 'all' ||
      c.servicesConsulted.includes(filterService);

    return matchesSearch && matchesLinkFilter && matchesServiceFilter;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando conversaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Conversaciones
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {data?.total || 0} conversaciones registradas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={!data}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => fetchConversations(true)}
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
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o telefono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Link Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterLinkSent}
              onChange={(e) => setFilterLinkSent(e.target.value as 'all' | 'yes' | 'no')}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="yes">Con enlace enviado</option>
              <option value="no">Sin enlace enviado</option>
            </select>
          </div>

          {/* Service Filter */}
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los servicios</option>
            {uniqueServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Filtrado</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredConversations.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Con Enlace</p>
          <p className="text-2xl font-bold text-green-600">{filteredConversations.filter(c => c.calLinkSent).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Sin Enlace</p>
          <p className="text-2xl font-bold text-orange-600">{filteredConversations.filter(c => !c.calLinkSent).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Interacciones</p>
          <p className="text-2xl font-bold text-blue-600">{filteredConversations.reduce((sum, c) => sum + c.interactions, 0)}</p>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden sm:table-cell">Telefono</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden md:table-cell">Servicios</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Interacciones</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Enlace</th>
              </tr>
            </thead>
            <tbody>
              {filteredConversations.slice(0, 100).map((conv) => (
                <tr
                  key={conv.sessionId}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {conv.userName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Phone className="w-3 h-3" />
                      {conv.phoneNumber}
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {conv.servicesConsulted.length > 0 ? (
                        conv.servicesConsulted.slice(0, 2).map((service) => (
                          <span
                            key={service}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {service}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                      {conv.servicesConsulted.length > 2 && (
                        <span className="text-xs text-gray-400">+{conv.servicesConsulted.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {conv.interactions}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {conv.calLinkSent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Enviado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredConversations.length > 100 && (
          <div className="p-4 text-center text-sm text-gray-500 border-t border-gray-200 dark:border-gray-700">
            Mostrando 100 de {filteredConversations.length} conversaciones
          </div>
        )}
      </div>
    </div>
  );
}
