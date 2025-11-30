'use client';

import { Users, UserCheck, Clock, ExternalLink } from 'lucide-react';

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Base de datos de clientes en Airtable
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Proximamente
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
          La integracion completa con Airtable para gestionar clientes estara disponible pronto. Por ahora, puedes acceder directamente a Airtable.
        </p>
        <a
          href="https://airtable.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir Airtable
        </a>
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <UserCheck className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Perfil de Cliente</h3>
          <p className="text-sm text-gray-500">Ver historial completo de conversaciones y citas</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <Clock className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Timeline</h3>
          <p className="text-sm text-gray-500">Seguimiento de todas las interacciones del cliente</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <Users className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Segmentacion</h3>
          <p className="text-sm text-gray-500">Agrupar clientes por servicio de interes</p>
        </div>
      </div>
    </div>
  );
}
