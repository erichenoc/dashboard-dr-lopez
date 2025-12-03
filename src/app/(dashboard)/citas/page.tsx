'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import RescheduleModal from '@/components/RescheduleModal';
import CreateBookingModal from '@/components/CreateBookingModal';

interface Booking {
  id: number;
  uid: string;
  status: string;
  bookingStatus: string;
  rescheduled: boolean;
  startTime: string;
  endTime: string;
  title: string;
  attendees: { name: string; email: string; timeZone: string }[];
}

function BookingCard({
  booking,
  onCancel,
  onReschedule,
}: {
  booking: Booking;
  onCancel: (id: number) => void;
  onReschedule: (booking: Booking) => void;
}) {
  const startDate = new Date(booking.startTime);
  const isUpcoming = booking.bookingStatus === 'upcoming';

  const statusColors = {
    upcoming: 'bg-green-100 text-green-700',
    past: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    upcoming: booking.rescheduled ? 'Reagendada' : 'Confirmada',
    past: 'Completada',
    cancelled: booking.rescheduled ? 'Reagendada' : 'Cancelada',
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                statusColors[booking.bookingStatus as keyof typeof statusColors]
              }`}
            >
              {statusLabels[booking.bookingStatus as keyof typeof statusLabels]}
            </span>
            {booking.rescheduled && booking.bookingStatus === 'upcoming' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                Reagendada
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-800 text-lg">
            {booking.attendees?.[0]?.name || 'Sin nombre'}
          </h3>
          <p className="text-gray-500 text-sm">
            {booking.attendees?.[0]?.email || ''}
          </p>
          <div className="mt-3 flex items-center gap-2 text-gray-600">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">
              {startDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'America/New_York',
              })}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-gray-600">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">
              {startDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/New_York',
              })}
            </span>
          </div>
        </div>
        {isUpcoming && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onReschedule(booking)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-center"
            >
              Reagendar
            </button>
            <button
              onClick={() => onCancel(booking.id)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CitasPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>(
    'all'
  );
  const [cancelling, setCancelling] = useState<number | null>(null);

  // Modal states
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      setLoading(true);
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Error fetching bookings');
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm('¿Estas seguro de que deseas cancelar esta cita?')) return;

    setCancelling(id);
    try {
      const response = await fetch(`/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado desde el dashboard' }),
      });

      if (!response.ok) throw new Error('Error al cancelar');

      alert('Cita cancelada correctamente');
      fetchBookings(); // Refresh list
    } catch (err) {
      alert('Error al cancelar la cita');
    } finally {
      setCancelling(null);
    }
  }

  function handleReschedule(booking: Booking) {
    setSelectedBooking(booking);
    setRescheduleModalOpen(true);
  }

  function handleRescheduleSuccess() {
    alert('Cita reagendada correctamente');
    fetchBookings();
  }

  function handleCreateSuccess() {
    alert('Cita creada correctamente');
    fetchBookings();
  }

  const filteredBookings =
    filter === 'all'
      ? bookings
      : bookings.filter((b) => b.bookingStatus === filter);

  const counts = {
    all: bookings.length,
    upcoming: bookings.filter((b) => b.bookingStatus === 'upcoming').length,
    past: bookings.filter((b) => b.bookingStatus === 'past').length,
    cancelled: bookings.filter((b) => b.bookingStatus === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-50 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando citas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <p className="text-gray-800 font-semibold">Error al cargar citas</p>
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
                Gestion de Citas
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Dr. Arnaldo Lopez - Administrar todas las citas
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">Acciones Rapidas</h3>
              <p className="text-gray-500 text-sm mt-1">
                Crea, reagenda o cancela citas directamente desde aqui
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nueva Cita
              </button>
              <button
                onClick={fetchBookings}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Actualizar
              </button>
              <a
                href="https://cal.com/arnaldo-lopez/dr-arnaldo-lopez"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Abrir Cal.com
              </a>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Sincronizacion automatica:</strong> Todas las citas creadas, reagendadas o canceladas desde aqui se sincronizan automaticamente con Cal.com en tiempo real.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(['all', 'upcoming', 'past', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status === 'all' && `Todas (${counts.all})`}
              {status === 'upcoming' && `Proximas (${counts.upcoming})`}
              {status === 'past' && `Pasadas (${counts.past})`}
              {status === 'cancelled' && `Canceladas (${counts.cancelled})`}
            </button>
          ))}
        </div>

        {/* Bookings Grid */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-500">No hay citas en esta categoria</p>
            {filter === 'upcoming' && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                Crear primera cita
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                onReschedule={handleReschedule}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedBooking && (
        <RescheduleModal
          booking={selectedBooking}
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedBooking(null);
          }}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      <CreateBookingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
