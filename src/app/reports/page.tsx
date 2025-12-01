'use client';

import { useState } from 'react';
import { Download, FileText, Calendar, BarChart3, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ServiceMetric {
  service: string;
  consultations: number;
  linksSent: number;
  bookingsConfirmed: number;
  conversionRate: number;
}

interface ConversationData {
  userName: string;
  phone: string;
  services: string[];
  messageCount: number;
  linkSent: boolean;
}

interface StatsData {
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

interface N8nData {
  summary: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: string;
  };
}

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const formatDate = () => {
    return new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const addHeader = (doc: jsPDF, title: string) => {
    // Header background
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 35, 'F');

    // Logo text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Dr. Arnaldo Lopez', 14, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('AI Agent Dashboard', 14, 22);

    // Report title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 30);

    // Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${formatDate()}`, 140, 30);

    // Reset text color
    doc.setTextColor(0, 0, 0);
  };

  const addFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Pagina ${i} de ${pageCount} | Dr. Arnaldo Lopez AI Agent Dashboard`,
        105,
        290,
        { align: 'center' }
      );
    }
  };

  const generateServicesPDF = async () => {
    setLoading('services');
    try {
      const response = await fetch('/api/service-metrics');
      const data: { services: ServiceMetric[]; totals: { totalConsultations: number; totalLinksSent: number; totalBookings: number; uniqueServices: number } } = await response.json();

      const doc = new jsPDF();
      addHeader(doc, 'Reporte de Servicios');

      // Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen General', 14, 45);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Servicios: ${data.totals.uniqueServices}`, 14, 55);
      doc.text(`Total de Consultas: ${data.totals.totalConsultations}`, 14, 62);
      doc.text(`Enlaces Enviados: ${data.totals.totalLinksSent}`, 14, 69);
      doc.text(`Citas Confirmadas: ${data.totals.totalBookings}`, 14, 76);

      // Table
      autoTable(doc, {
        startY: 85,
        head: [['Servicio', 'Consultas', 'Enlaces', 'Citas', 'Conversion']],
        body: data.services.map(s => [
          s.service,
          s.consultations.toString(),
          s.linksSent.toString(),
          s.bookingsConfirmed.toString(),
          `${s.conversionRate}%`
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 9 }
      });

      addFooter(doc);
      doc.save(`servicios_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(null);
    }
  };

  const generateConversationsPDF = async () => {
    setLoading('conversations');
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();

      // Calculate stats from the data - API returns { conversations: [], total: number }
      const total = data.total || data.conversations?.length || 0;
      const withLink = data.conversations?.filter((c: { calLinkSent?: boolean }) => c.calLinkSent).length || 0;
      const withoutLink = total - withLink;

      const doc = new jsPDF();
      addHeader(doc, 'Reporte de Conversaciones');

      // Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen General', 14, 45);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Conversaciones: ${total}`, 14, 55);
      doc.text(`Con Enlace Enviado: ${withLink}`, 14, 62);
      doc.text(`Sin Enlace Enviado: ${withoutLink}`, 14, 69);
      doc.text(`Tasa de Envio: ${total > 0 ? ((withLink / total) * 100).toFixed(1) : '0.0'}%`, 14, 76);

      // Table (top 50) - API returns phoneNumber, servicesConsulted, calLinkSent
      const conversations = data.conversations || [];
      autoTable(doc, {
        startY: 85,
        head: [['Cliente', 'Telefono', 'Servicios', 'Mensajes', 'Enlace']],
        body: conversations.slice(0, 50).map((c: { userName?: string; phoneNumber?: string; servicesConsulted?: string[]; messageCount?: number; calLinkSent?: boolean }) => {
          const services = c.servicesConsulted || [];
          return [
            c.userName || 'Desconocido',
            c.phoneNumber || '',
            services.slice(0, 2).join(', ') + (services.length > 2 ? '...' : ''),
            (c.messageCount || 0).toString(),
            c.calLinkSent ? 'Si' : 'No'
          ];
        }),
        headStyles: { fillColor: [139, 92, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { cellWidth: 50 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20 }
        }
      });

      // Add note
      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('* Mostrando las 50 conversaciones con mas mensajes', 14, finalY + 10);

      addFooter(doc);
      doc.save(`conversaciones_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(null);
    }
  };

  const generateStatsPDF = async () => {
    setLoading('stats');
    try {
      const response = await fetch('/api/stats');
      const data: StatsData = await response.json();

      const doc = new jsPDF();
      addHeader(doc, 'Reporte de Estadisticas y Citas');

      // Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen de Citas', 14, 45);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Citas Proximas: ${data.upcomingBookings}`, 14, 55);
      doc.text(`Citas Completadas: ${data.pastBookings}`, 14, 62);
      doc.text(`Citas Canceladas: ${data.cancelledBookings}`, 14, 69);
      doc.text(`Citas Reagendadas: ${data.rescheduledBookings}`, 14, 76);

      // Upcoming appointments table
      if (data.recentUpcoming && data.recentUpcoming.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Proximas Citas Programadas', 14, 90);

        autoTable(doc, {
          startY: 95,
          head: [['Paciente', 'Fecha', 'Hora', 'Estado']],
          body: data.recentUpcoming.map(b => [
            b.attendee,
            b.date,
            b.time,
            b.status
          ]),
          headStyles: { fillColor: [16, 185, 129] },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          styles: { fontSize: 9 }
        });
      }

      addFooter(doc);
      doc.save(`estadisticas_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(null);
    }
  };

  const generateN8nPDF = async () => {
    setLoading('n8n');
    try {
      const response = await fetch('/api/n8n-metrics?period=30days');
      const data = await response.json();

      // API returns data at root level, not in summary object
      const totalExecutions = data.totalExecutions || data.summary?.totalExecutions || 0;
      const successfulExecutions = data.successfulExecutions || data.summary?.successfulExecutions || 0;
      const failedExecutions = data.failedExecutions || data.summary?.failedExecutions || 0;
      const successRateStr = data.successRate || data.summary?.successRate || '0%';

      const doc = new jsPDF();
      addHeader(doc, 'Reporte del Agente n8n');

      // Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Rendimiento del Agente (Ultimos 30 dias)', 14, 45);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Ejecuciones: ${totalExecutions}`, 14, 55);
      doc.text(`Ejecuciones Exitosas: ${successfulExecutions}`, 14, 62);
      doc.text(`Ejecuciones Fallidas: ${failedExecutions}`, 14, 69);
      doc.text(`Tasa de Exito: ${successRateStr}`, 14, 76);

      // Performance bar visualization
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Indicador de Rendimiento', 14, 95);

      // Background bar
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(14, 100, 180, 15, 3, 3, 'F');

      // Success bar
      const successRate = parseFloat(String(successRateStr).replace('%', '')) || 0;
      const barWidth = (successRate / 100) * 180;
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(14, 100, barWidth, 15, 3, 3, 'F');

      // Percentage text
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`${successRateStr} Tasa de Exito`, 90, 110);
      doc.setTextColor(0, 0, 0);

      // Status interpretation
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const statusMessage = successRate >= 90
        ? 'Excelente: El agente esta funcionando correctamente'
        : successRate >= 70
        ? 'Bueno: El agente funciona bien pero puede mejorar'
        : 'Atencion: Revisar configuracion del agente';

      doc.text(`Estado: ${statusMessage}`, 14, 130);

      addFooter(doc);
      doc.save(`agente_n8n_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(null);
    }
  };

  const generateMonthlyPDF = async () => {
    setLoading('monthly');
    try {
      // Fetch all data
      const [servicesRes, conversationsRes, statsRes, n8nRes] = await Promise.all([
        fetch('/api/service-metrics'),
        fetch('/api/conversations'),
        fetch('/api/stats'),
        fetch('/api/n8n-metrics?period=30days')
      ]);

      const servicesData = await servicesRes.json();
      const conversationsData = await conversationsRes.json();
      const statsData = await statsRes.json();
      const n8nData = await n8nRes.json();

      // Calculate stats from conversations
      const totalConversations = conversationsData.total || conversationsData.conversations?.length || 0;
      const withLink = conversationsData.conversations?.filter((c: { calLinkSent?: boolean }) => c.calLinkSent).length || 0;

      const doc = new jsPDF();
      const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

      // Cover Page
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 297, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE MENSUAL', 105, 100, { align: 'center' });

      doc.setFontSize(24);
      doc.text(currentMonth.toUpperCase(), 105, 120, { align: 'center' });

      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Dr. Arnaldo Lopez', 105, 160, { align: 'center' });
      doc.text('AI Agent Dashboard', 105, 175, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Generado: ${formatDate()}`, 105, 250, { align: 'center' });

      // Page 2: Executive Summary
      doc.addPage();
      addHeader(doc, 'Resumen Ejecutivo');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Metricas Principales del Mes', 14, 50);

      // KPI boxes - n8n data is at root level
      const agentSuccessRate = n8nData.successRate || n8nData.summary?.successRate || '0%';
      const kpis = [
        { label: 'Conversaciones', value: totalConversations, color: [59, 130, 246] },
        { label: 'Enlaces Enviados', value: servicesData.totals?.totalLinksSent || withLink, color: [139, 92, 246] },
        { label: 'Citas Confirmadas', value: servicesData.totals?.totalBookings || 0, color: [16, 185, 129] },
        { label: 'Tasa de Exito Agente', value: agentSuccessRate, color: [245, 158, 11] }
      ];

      kpis.forEach((kpi, i) => {
        const x = 14 + (i * 47);
        doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.roundedRect(x, 60, 44, 35, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(String(kpi.value), x + 22, 77, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(kpi.label, x + 22, 88, { align: 'center' });
      });

      doc.setTextColor(0, 0, 0);

      // Conversion funnel
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Embudo de Conversion', 14, 115);

      const totalBookings = servicesData.totals?.totalBookings || 0;
      const totalLinksSent = servicesData.totals?.totalLinksSent || withLink;
      const conversionRate = totalConversations > 0 ? ((totalBookings / totalConversations) * 100).toFixed(2) : '0.00';
      const linkRate = totalConversations > 0 ? ((totalLinksSent / totalConversations) * 100).toFixed(1) : '0.0';
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Conversaciones totales: ${totalConversations}`, 14, 125);
      doc.text(`Enlaces enviados: ${totalLinksSent} (${linkRate}%)`, 14, 132);
      doc.text(`Citas confirmadas: ${totalBookings} (${conversionRate}%)`, 14, 139);

      // Page 3: Services Performance
      doc.addPage();
      addHeader(doc, 'Rendimiento de Servicios');

      autoTable(doc, {
        startY: 45,
        head: [['Servicio', 'Consultas', 'Enlaces', 'Citas', 'Conversion']],
        body: servicesData.services.slice(0, 10).map((s: ServiceMetric) => [
          s.service,
          s.consultations.toString(),
          s.linksSent.toString(),
          s.bookingsConfirmed.toString(),
          `${s.conversionRate}%`
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 9 }
      });

      // Page 4: Appointments
      doc.addPage();
      addHeader(doc, 'Resumen de Citas');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Citas Proximas: ${statsData.upcomingBookings}`, 14, 50);
      doc.text(`Citas Completadas: ${statsData.pastBookings}`, 14, 57);
      doc.text(`Citas Canceladas: ${statsData.cancelledBookings}`, 14, 64);
      doc.text(`Citas Reagendadas: ${statsData.rescheduledBookings}`, 14, 71);

      if (statsData.recentUpcoming && statsData.recentUpcoming.length > 0) {
        autoTable(doc, {
          startY: 85,
          head: [['Paciente', 'Fecha', 'Hora', 'Estado']],
          body: statsData.recentUpcoming.map((b: { attendee: string; date: string; time: string; status: string }) => [
            b.attendee,
            b.date,
            b.time,
            b.status
          ]),
          headStyles: { fillColor: [16, 185, 129] },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          styles: { fontSize: 9 }
        });
      }

      // Page 5: Agent Performance
      doc.addPage();
      addHeader(doc, 'Rendimiento del Agente');

      // n8n data is at root level, not in summary
      const n8nTotalExec = n8nData.totalExecutions || n8nData.summary?.totalExecutions || 0;
      const n8nSuccessExec = n8nData.successfulExecutions || n8nData.summary?.successfulExecutions || 0;
      const n8nFailedExec = n8nData.failedExecutions || n8nData.summary?.failedExecutions || 0;
      const n8nSuccessRate = n8nData.successRate || n8nData.summary?.successRate || '0%';

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Ejecuciones: ${n8nTotalExec}`, 14, 50);
      doc.text(`Ejecuciones Exitosas: ${n8nSuccessExec}`, 14, 57);
      doc.text(`Ejecuciones Fallidas: ${n8nFailedExec}`, 14, 64);

      // Performance bar
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(14, 75, 180, 15, 3, 3, 'F');
      const successRateNum = parseFloat(String(n8nSuccessRate).replace('%', '')) || 0;
      const barWidth = (successRateNum / 100) * 180;
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(14, 75, barWidth, 15, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`${n8nSuccessRate} Tasa de Exito`, 90, 85);
      doc.setTextColor(0, 0, 0);

      addFooter(doc);
      doc.save(`reporte_mensual_${currentMonth.replace(' ', '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(null);
    }
  };

  const generateServiceAnalysisPDF = async () => {
    setLoading('serviceAnalysis');
    try {
      const [servicesRes, conversationsRes] = await Promise.all([
        fetch('/api/service-metrics'),
        fetch('/api/conversations')
      ]);

      const servicesData = await servicesRes.json();
      const conversationsData = await conversationsRes.json();

      // Safe access to totals with defaults
      const totals = servicesData.totals || {};
      const uniqueServices = totals.uniqueServices || servicesData.services?.length || 0;
      const totalConsultations = totals.totalConsultations || 0;
      const totalLinksSent = totals.totalLinksSent || 0;
      const totalBookings = totals.totalBookings || 0;

      const doc = new jsPDF();
      addHeader(doc, 'Analisis Detallado de Servicios');

      // Overview
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Vision General', 14, 50);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Servicios Unicos: ${uniqueServices}`, 14, 60);
      doc.text(`Total de Consultas: ${totalConsultations}`, 14, 67);
      doc.text(`Total de Enlaces Enviados: ${totalLinksSent}`, 14, 74);
      doc.text(`Total de Citas Confirmadas: ${totalBookings}`, 14, 81);

      const overallConversion = totalConsultations > 0 ? ((totalBookings / totalConsultations) * 100).toFixed(2) : '0.00';
      doc.text(`Tasa de Conversion Global: ${overallConversion}%`, 14, 88);

      // Top performing services
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Servicios Mas Consultados', 14, 105);

      autoTable(doc, {
        startY: 110,
        head: [['Posicion', 'Servicio', 'Consultas', 'Enlaces', 'Citas', 'Conversion']],
        body: servicesData.services.slice(0, 10).map((s: ServiceMetric, i: number) => [
          `#${i + 1}`,
          s.service,
          s.consultations.toString(),
          s.linksSent.toString(),
          s.bookingsConfirmed.toString(),
          `${s.conversionRate}%`
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center' },
          1: { cellWidth: 50 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' }
        }
      });

      // Page 2: Service Details
      doc.addPage();
      addHeader(doc, 'Detalle por Servicio');

      // Best conversion rate services
      const sortedByConversion = [...servicesData.services]
        .filter((s: ServiceMetric) => s.consultations >= 5)
        .sort((a: ServiceMetric, b: ServiceMetric) => b.conversionRate - a.conversionRate)
        .slice(0, 5);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Servicios con Mayor Tasa de Conversion', 14, 50);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      doc.text('(minimo 5 consultas)', 14, 56);
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 60,
        head: [['Servicio', 'Consultas', 'Citas', 'Conversion']],
        body: sortedByConversion.map((s: ServiceMetric) => [
          s.service,
          s.consultations.toString(),
          s.bookingsConfirmed.toString(),
          `${s.conversionRate}%`
        ]),
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 9 }
      });

      // Services needing attention
      const needsAttention = servicesData.services
        .filter((s: ServiceMetric) => s.consultations >= 10 && s.conversionRate < 10)
        .slice(0, 5);

      if (needsAttention.length > 0) {
        const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Servicios que Requieren Atencion', 14, finalY + 20);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(128, 128, 128);
        doc.text('(alta demanda pero baja conversion)', 14, finalY + 26);
        doc.setTextColor(0, 0, 0);

        autoTable(doc, {
          startY: finalY + 30,
          head: [['Servicio', 'Consultas', 'Citas', 'Conversion']],
          body: needsAttention.map((s: ServiceMetric) => [
            s.service,
            s.consultations.toString(),
            s.bookingsConfirmed.toString(),
            `${s.conversionRate}%`
          ]),
          headStyles: { fillColor: [239, 68, 68] },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          styles: { fontSize: 9 }
        });
      }

      // Page 3: All services
      doc.addPage();
      addHeader(doc, 'Listado Completo de Servicios');

      autoTable(doc, {
        startY: 45,
        head: [['Servicio', 'Consultas', 'Enlaces', 'Citas', 'Conv.']],
        body: servicesData.services.map((s: ServiceMetric) => [
          s.service,
          s.consultations.toString(),
          s.linksSent.toString(),
          s.bookingsConfirmed.toString(),
          `${s.conversionRate}%`
        ]),
        headStyles: { fillColor: [139, 92, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 8 }
      });

      addFooter(doc);
      doc.save(`analisis_servicios_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(null);
    }
  };

  const generateCompletePDF = async () => {
    setLoading('complete');
    try {
      // Fetch all data
      const [servicesRes, conversationsRes, statsRes, n8nRes] = await Promise.all([
        fetch('/api/service-metrics'),
        fetch('/api/conversations'),
        fetch('/api/stats'),
        fetch('/api/n8n-metrics?period=30days')
      ]);

      const servicesData = await servicesRes.json();
      const conversationsData = await conversationsRes.json();
      const statsData = await statsRes.json();
      const n8nData = await n8nRes.json();

      // Calculate stats from conversations - API returns { conversations: [], total: number }
      const totalConversations = conversationsData.total || conversationsData.conversations?.length || 0;
      const withLink = conversationsData.conversations?.filter((c: { calLinkSent?: boolean }) => c.calLinkSent).length || 0;

      // n8n data is at root level
      const n8nSuccessRate = n8nData.successRate || n8nData.summary?.successRate || '0%';

      // Services data safe access
      const uniqueServices = servicesData.totals?.uniqueServices || servicesData.services?.length || 0;
      const totalBookings = servicesData.totals?.totalBookings || 0;

      const doc = new jsPDF();

      // Page 1: Cover and Summary
      addHeader(doc, 'Reporte Completo del Sistema');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen Ejecutivo', 14, 50);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Conversaciones: ${totalConversations}`, 14, 65);
      doc.text(`Enlaces Enviados: ${withLink}`, 14, 72);
      doc.text(`Servicios Consultados: ${uniqueServices}`, 14, 79);
      doc.text(`Citas Confirmadas: ${totalBookings}`, 14, 86);
      doc.text(`Tasa de Exito del Agente: ${n8nSuccessRate}`, 14, 93);

      // Page 2: Services
      doc.addPage();
      addHeader(doc, 'Detalle de Servicios');

      autoTable(doc, {
        startY: 45,
        head: [['Servicio', 'Consultas', 'Enlaces', 'Citas', 'Conversion']],
        body: servicesData.services.map((s: ServiceMetric) => [
          s.service,
          s.consultations.toString(),
          s.linksSent.toString(),
          s.bookingsConfirmed.toString(),
          `${s.conversionRate}%`
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 9 }
      });

      // Page 3: Conversations - API returns phoneNumber, servicesConsulted, calLinkSent
      doc.addPage();
      addHeader(doc, 'Top Conversaciones');

      const completeConversations = conversationsData.conversations || [];
      autoTable(doc, {
        startY: 45,
        head: [['Cliente', 'Telefono', 'Servicios', 'Msgs', 'Link']],
        body: completeConversations.slice(0, 30).map((c: { userName?: string; phoneNumber?: string; servicesConsulted?: string[]; messageCount?: number; calLinkSent?: boolean }) => {
          const services = c.servicesConsulted || [];
          return [
            (c.userName || 'Desconocido').substring(0, 20),
            c.phoneNumber || '',
            services.slice(0, 2).join(', ').substring(0, 25),
            (c.messageCount || 0).toString(),
            c.calLinkSent ? 'Si' : 'No'
          ];
        }),
        headStyles: { fillColor: [139, 92, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 8 }
      });

      // Page 4: Appointments
      doc.addPage();
      addHeader(doc, 'Citas y Estadisticas');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Citas Proximas: ${statsData.upcomingBookings}`, 14, 50);
      doc.text(`Citas Completadas: ${statsData.pastBookings}`, 14, 57);
      doc.text(`Citas Canceladas: ${statsData.cancelledBookings}`, 14, 64);

      if (statsData.recentUpcoming && statsData.recentUpcoming.length > 0) {
        autoTable(doc, {
          startY: 75,
          head: [['Paciente', 'Fecha', 'Hora', 'Estado']],
          body: statsData.recentUpcoming.map((b: { attendee: string; date: string; time: string; status: string }) => [
            b.attendee,
            b.date,
            b.time,
            b.status
          ]),
          headStyles: { fillColor: [16, 185, 129] },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          styles: { fontSize: 9 }
        });
      }

      addFooter(doc);
      doc.save(`reporte_completo_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reportes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Genera y descarga reportes en PDF del sistema
        </p>
      </div>

      {/* Complete Report */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Reporte Completo</h3>
            <p className="text-blue-100 text-sm">
              Genera un PDF con todos los datos: servicios, conversaciones, citas y rendimiento del agente
            </p>
          </div>
          <button
            onClick={generateCompletePDF}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 w-full sm:w-auto flex-shrink-0"
          >
            {loading === 'complete' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Quick Export */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Reportes Individuales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={generateServicesPDF}
            disabled={loading !== null}
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
          >
            {loading === 'services' ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-blue-600" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Servicios</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PDF</p>
            </div>
          </button>
          <button
            onClick={generateConversationsPDF}
            disabled={loading !== null}
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
          >
            {loading === 'conversations' ? (
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-purple-600" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Conversaciones</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PDF</p>
            </div>
          </button>
          <button
            onClick={generateStatsPDF}
            disabled={loading !== null}
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
          >
            {loading === 'stats' ? (
              <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-green-600" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Estadisticas</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PDF</p>
            </div>
          </button>
          <button
            onClick={generateN8nPDF}
            disabled={loading !== null}
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
          >
            {loading === 'n8n' ? (
              <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-orange-600" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Agente n8n</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PDF</p>
            </div>
          </button>
        </div>
      </div>

      {/* Special Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Reporte Mensual</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Resumen completo de conversaciones, citas y conversion del mes con portada profesional
          </p>
          <button
            onClick={generateMonthlyPDF}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading === 'monthly' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Descargar PDF
          </button>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Analisis de Servicios</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Desglose detallado de servicios, mejores conversiones y areas de mejora
          </p>
          <button
            onClick={generateServiceAnalysisPDF}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {loading === 'serviceAnalysis' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Sobre los Reportes PDF</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Los reportes se generan en formato PDF con tablas profesionales, listos para imprimir o compartir.
              Incluyen encabezado con logo, fecha de generacion y numeracion de paginas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
