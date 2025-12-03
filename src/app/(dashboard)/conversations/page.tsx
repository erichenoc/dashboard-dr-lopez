'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Phone,
  User,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Clock,
  Flame,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  StickyNote,
  Bell,
  Send,
} from 'lucide-react';
import clsx from 'clsx';

interface Conversation {
  sessionId: string;
  phoneNumber: string;
  userName: string;
  messageCount: number;
  interactions: number;
  servicesConsulted: string[];
  calLinkSent: boolean;
  lastMessage: string;
  lastMessageId: number;
  status?: 'new' | 'in_progress' | 'appointment_sent' | 'completed' | 'follow_up';
  notes?: string;
}

interface ConversationsData {
  conversations: Conversation[];
  total: number;
  lastUpdated: string;
}

interface Message {
  id: number;
  type: 'human' | 'ai';
  content: string;
}

interface ConversationDetail {
  sessionId: string;
  messages: Message[];
  totalMessages: number;
}

type SortField = 'userName' | 'interactions' | 'lastMessageId' | 'servicesConsulted';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

// Function to clean message content - extract only the actual user/AI message
const cleanMessageContent = (content: string, type: 'human' | 'ai'): string => {
  if (type === 'ai') {
    // AI messages are usually clean, just return as is
    return content.trim();
  }

  // For human messages, extract the actual message content
  // Pattern 1: "Estos son todos los mensajes que el usuario ha enviado a través de WhatsApp: [MESSAGE]"
  const whatsappPrefix = "Estos son todos los mensajes que el usuario ha enviado a través de WhatsApp:";

  if (content.includes(whatsappPrefix)) {
    // Get content after the prefix
    let messageStart = content.indexOf(whatsappPrefix) + whatsappPrefix.length;
    let messageContent = content.substring(messageStart);

    // Remove everything after "Fecha:" or "---" (system instructions)
    const cutoffPatterns = [
      /\s*Fecha:\s*\d+\s+\w+\.\s*\d+/i,
      /\s*---\s*##/,
      /\s*---\s*$/m,
    ];

    for (const pattern of cutoffPatterns) {
      const match = messageContent.match(pattern);
      if (match && match.index !== undefined) {
        messageContent = messageContent.substring(0, match.index);
        break;
      }
    }

    return messageContent.trim();
  }

  // If no WhatsApp prefix found, return the original content trimmed
  return content.trim();
};

// Status configuration
const STATUS_CONFIG = {
  new: { label: 'Nuevo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'En Progreso', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  appointment_sent: { label: 'Cita Enviada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Completado', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  follow_up: { label: 'Seguimiento', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

export default function ConversationsPage() {
  const [data, setData] = useState<ConversationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLinkSent, setFilterLinkSent] = useState<'all' | 'yes' | 'no'>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('lastMessageId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal states
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Notes modal
  const [notesModal, setNotesModal] = useState<Conversation | null>(null);
  const [noteText, setNoteText] = useState('');

  // Local storage for status and notes
  const [conversationMeta, setConversationMeta] = useState<Record<string, { status?: string; notes?: string }>>({});

  // Load saved metadata from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('conversationMeta');
    if (saved) {
      setConversationMeta(JSON.parse(saved));
    }
  }, []);

  // Save metadata to localStorage
  const saveMetadata = (sessionId: string, meta: { status?: string; notes?: string }) => {
    const updated = { ...conversationMeta, [sessionId]: { ...conversationMeta[sessionId], ...meta } };
    setConversationMeta(updated);
    localStorage.setItem('conversationMeta', JSON.stringify(updated));
  };

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

  const fetchConversationDetail = async (sessionId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(sessionId)}`);
      if (response.ok) {
        const result = await response.json();
        setConversationDetail(result);
      }
    } catch (error) {
      console.error('Error fetching conversation detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Open conversation modal
  const openConversationModal = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchConversationDetail(conv.sessionId);
  };

  // Close conversation modal
  const closeConversationModal = () => {
    setSelectedConversation(null);
    setConversationDetail(null);
  };

  // Open notes modal
  const openNotesModal = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotesModal(conv);
    setNoteText(conversationMeta[conv.sessionId]?.notes || '');
  };

  // Save notes
  const saveNotes = () => {
    if (notesModal) {
      saveMetadata(notesModal.sessionId, { notes: noteText });
      setNotesModal(null);
    }
  };

  // Update status
  const updateStatus = (sessionId: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveMetadata(sessionId, { status });
  };

  // Open WhatsApp
  const openWhatsApp = (phoneNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Format phone number for WhatsApp
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ['Telefono', 'Nombre', 'Interacciones', 'Servicios', 'Enlace Enviado', 'Estado', 'Notas'];
    const rows = filteredConversations.map(c => [
      c.phoneNumber,
      c.userName,
      c.interactions,
      c.servicesConsulted.join('; '),
      c.calLinkSent ? 'Si' : 'No',
      conversationMeta[c.sessionId]?.status || 'new',
      conversationMeta[c.sessionId]?.notes || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversaciones-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get unique services for filter
  const allServices = data?.conversations.flatMap(c => c.servicesConsulted) || [];
  const uniqueServices = [...new Set(allServices)].sort();

  // Check if conversation is "hot" (many recent interactions)
  const isHotConversation = (conv: Conversation) => {
    return conv.interactions >= 10;
  };

  // Get relative time indicator based on position
  const getActivityIndicator = (index: number) => {
    if (index < 5) return { label: 'Muy reciente', color: 'text-green-600' };
    if (index < 20) return { label: 'Reciente', color: 'text-blue-600' };
    if (index < 50) return { label: 'Esta semana', color: 'text-gray-600' };
    return { label: 'Anterior', color: 'text-gray-400' };
  };

  // Filter and sort conversations
  const filteredConversations = data?.conversations
    .filter(c => {
      const matchesSearch = searchTerm === '' ||
        c.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.includes(searchTerm);

      const matchesLinkFilter = filterLinkSent === 'all' ||
        (filterLinkSent === 'yes' && c.calLinkSent) ||
        (filterLinkSent === 'no' && !c.calLinkSent);

      const matchesServiceFilter = filterService === 'all' ||
        c.servicesConsulted.includes(filterService);

      const status = conversationMeta[c.sessionId]?.status || 'new';
      const matchesStatusFilter = filterStatus === 'all' || status === filterStatus;

      return matchesSearch && matchesLinkFilter && matchesServiceFilter && matchesStatusFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'userName':
          comparison = a.userName.localeCompare(b.userName);
          break;
        case 'interactions':
          comparison = a.interactions - b.interactions;
          break;
        case 'lastMessageId':
          comparison = a.lastMessageId - b.lastMessageId;
          break;
        case 'servicesConsulted':
          comparison = a.servicesConsulted.length - b.servicesConsulted.length;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    }) || [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredConversations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedConversations = filteredConversations.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

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
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o telefono..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); handleFilterChange(); }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); handleFilterChange(); }}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Link Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterLinkSent}
                onChange={(e) => { setFilterLinkSent(e.target.value as 'all' | 'yes' | 'no'); handleFilterChange(); }}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="yes">Con enlace</option>
                <option value="no">Sin enlace</option>
              </select>
            </div>

            {/* Service Filter */}
            <select
              value={filterService}
              onChange={(e) => { setFilterService(e.target.value); handleFilterChange(); }}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los servicios</option>
              {uniqueServices.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Necesitan Seguimiento</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredConversations.filter(c => conversationMeta[c.sessionId]?.status === 'follow_up').length}
          </p>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  <button onClick={() => handleSort('userName')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-white">
                    Cliente <SortIcon field="userName" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden sm:table-cell">
                  Telefono
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden lg:table-cell">
                  Ultimo Mensaje
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden md:table-cell">
                  <button onClick={() => handleSort('servicesConsulted')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-white">
                    Servicios <SortIcon field="servicesConsulted" />
                  </button>
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  <button onClick={() => handleSort('interactions')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-white mx-auto">
                    Msgs <SortIcon field="interactions" />
                  </button>
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase hidden sm:table-cell">
                  <button onClick={() => handleSort('lastMessageId')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-white mx-auto">
                    Actividad <SortIcon field="lastMessageId" />
                  </button>
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Estado
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedConversations.map((conv, index) => {
                const globalIndex = startIndex + index;
                const activity = getActivityIndicator(globalIndex);
                const status = conversationMeta[conv.sessionId]?.status || (conv.calLinkSent ? 'appointment_sent' : 'new');
                const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.new;
                const hasNotes = !!conversationMeta[conv.sessionId]?.notes;
                const isHot = isHotConversation(conv);

                return (
                  <tr
                    key={conv.sessionId}
                    onClick={() => openConversationModal(conv)}
                    className={clsx(
                      'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer',
                      isHot && 'bg-orange-50/50 dark:bg-orange-900/10'
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          isHot ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                        )}>
                          {isHot ? (
                            <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white text-sm block">
                            {conv.userName}
                          </span>
                          {hasNotes && (
                            <span className="text-xs text-yellow-600 flex items-center gap-1">
                              <StickyNote className="w-3 h-3" /> Con notas
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="w-3 h-3" />
                        {conv.phoneNumber.length > 12 ? conv.phoneNumber.slice(0, 12) + '...' : conv.phoneNumber}
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={conv.lastMessage}>
                        {conv.lastMessage ? conv.lastMessage.slice(0, 60) + (conv.lastMessage.length > 60 ? '...' : '') : '-'}
                      </p>
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
                        <span className={clsx(
                          'text-sm font-medium',
                          isHot ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
                        )}>
                          {conv.interactions}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className={clsx('text-xs flex items-center justify-center gap-1', activity.color)}>
                        <Clock className="w-3 h-3" />
                        {activity.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={status}
                        onChange={(e) => updateStatus(conv.sessionId, e.target.value, e as unknown as React.MouseEvent)}
                        onClick={(e) => e.stopPropagation()}
                        className={clsx(
                          'text-xs px-2 py-1 rounded-full border-0 cursor-pointer',
                          statusConfig.color
                        )}
                      >
                        {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => openWhatsApp(conv.phoneNumber, e)}
                          className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                          title="Abrir WhatsApp"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => openNotesModal(conv, e)}
                          className={clsx(
                            'p-1.5 rounded-lg transition-colors',
                            hasNotes
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'
                          )}
                          title="Notas"
                        >
                          <StickyNote className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openConversationModal(conv); }}
                          className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors"
                          title="Ver conversacion"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredConversations.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredConversations.length)} de {filteredConversations.length}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={clsx(
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      currentPage === 1
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={clsx(
                            'w-10 h-10 rounded-lg text-sm font-medium transition-colors',
                            currentPage === pageNum
                              ? 'bg-blue-500 text-white'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={clsx(
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      currentPage === totalPages
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                    )}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeConversationModal}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{selectedConversation.userName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedConversation.phoneNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => openWhatsApp(selectedConversation.phoneNumber, e)}
                  className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={closeConversationModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : conversationDetail?.messages.length ? (
                conversationDetail.messages.map((msg) => {
                  const cleanedContent = cleanMessageContent(msg.content, msg.type);
                  // Skip empty messages after cleaning
                  if (!cleanedContent) return null;

                  return (
                    <div
                      key={msg.id}
                      className={clsx(
                        'max-w-[85%] p-3 rounded-2xl',
                        msg.type === 'human'
                          ? 'bg-blue-500 text-white ml-auto rounded-br-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{cleanedContent}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 py-8">No hay mensajes</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{conversationDetail?.totalMessages || 0} mensajes en total</span>
                <div className="flex items-center gap-2">
                  {selectedConversation.servicesConsulted.map(service => (
                    <span key={service} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setNotesModal(null)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notas - {notesModal.userName}</h3>
              <button onClick={() => setNotesModal(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escribe tus notas aqui..."
                className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setNotesModal(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={saveNotes}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
