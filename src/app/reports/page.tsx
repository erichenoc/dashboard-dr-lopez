'use client';

import { Download, FileText, Calendar, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reportes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Genera y descarga reportes del sistema
        </p>
      </div>

      {/* Quick Export */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Exportacion Rapida</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/api/service-metrics'}
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <Download className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Servicios</p>
              <p className="text-xs text-gray-500">JSON</p>
            </div>
          </button>
          <button
            onClick={() => window.location.href = '/api/conversations'}
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <Download className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Conversaciones</p>
              <p className="text-xs text-gray-500">JSON</p>
            </div>
          </button>
          <button
            onClick={() => window.location.href = '/api/stats'}
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <Download className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Estadisticas</p>
              <p className="text-xs text-gray-500">JSON</p>
            </div>
          </button>
          <button
            onClick={() => window.location.href = '/api/n8n-metrics?period=30days'}
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <Download className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Agente n8n</p>
              <p className="text-xs text-gray-500">JSON</p>
            </div>
          </button>
        </div>
      </div>

      {/* Report Types Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Reporte Mensual</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Resumen completo de conversaciones, citas y conversion del mes
          </p>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            Proximamente
          </span>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Analisis de Servicios</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Desglose detallado de servicios mas consultados y su conversion
          </p>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            Proximamente
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Exportacion CSV</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Puedes exportar datos en formato CSV desde las paginas de Dashboard, Conversaciones y Servicios usando el boton Exportar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
