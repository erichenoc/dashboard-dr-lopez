'use client';

import { Settings, Database, Bot, Calendar, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuracion</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ajustes del dashboard y conexiones
        </p>
      </div>

      {/* Connections Status */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Estado de Conexiones</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Supabase</p>
                <p className="text-xs text-gray-500">Base de datos de conversaciones</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              Conectado
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">n8n</p>
                <p className="text-xs text-gray-500">Automatizacion del agente</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              Conectado
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Cal.com</p>
                <p className="text-xs text-gray-500">Sistema de citas</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
              Verificar API Key
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Database className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Airtable</p>
                <p className="text-xs text-gray-500">CRM de clientes</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              Conectado
            </span>
          </div>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Configura alertas para errores del agente y nuevas citas
          </p>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            Proximamente
          </span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Seguridad</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Gestion de accesos y autenticacion
          </p>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            Proximamente
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Variables de Entorno</h4>
            <p className="text-sm text-gray-500 mt-1">
              Las credenciales de API se configuran mediante variables de entorno en Vercel para mayor seguridad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
