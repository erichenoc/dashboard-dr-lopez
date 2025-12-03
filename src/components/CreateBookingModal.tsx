'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, FileText, Loader2, MapPin, Heart, Stethoscope } from 'lucide-react';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TimeSlot {
  time: string;
}

// Opciones de servicios basadas en Cal.com
const SERVICES = {
  aesthetic: {
    label: 'Servicios Estéticos',
    options: [
      'MORPHEUS 8 FACIAL',
      'IPL – INMODE',
      'ENDO-LISFTING',
      'LASER HAIR REMOVAL',
      'FORMA FACIAL TREATMENT',
      'URINARY INCONTINENCE TREATMENT',
      'BOTOX',
      'PRP/PRF',
      'KYBELLA',
      'MORPHEUS 8 VAGINAL',
    ],
  },
  gynecology: {
    label: 'Servicios de Ginecología',
    options: [
      'Pap Smears',
      'Pregnancy Planning',
      'IUD Insertion and Removal',
      'Nexplanon Insertion/Removal',
      'Colposcopy Biopsy',
      'Cryosurgeries',
      'Hormone Replacement Therapy',
      'Biote for Women and Men',
    ],
  },
  obstetrics: {
    label: 'Servicio de Obstetricia',
    options: [
      'Ultrasounds',
      'Pregnancy Follow-Ups',
      'Non-Stress Test',
      'Safe IV for Pregnancy Symptoms and Vitamins',
    ],
  },
  vitaminIV: {
    label: 'Terapias con Vitaminas IV',
    options: [
      'IV NAD+ Combined With Glutathione',
      'Reboot IV Therapy',
      'Quench IV Therapy',
      'Recovery and Performance IV Therapy',
      'B-Lean IV Therapy',
      'Immunity IV Therapy',
      'Get Up and Go IV Therapy',
      'Inner Beauty IV Therapy',
      "Myers' Cocktail",
      'Alleviate IV Therapy',
      'Allergy Testing',
    ],
  },
  weightLoss: {
    label: 'Pérdida de Peso',
    options: ['Semaglutide Weight Loss', 'Tirzepatide Weight Loss'],
  },
};

export default function CreateBookingModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateBookingModalProps) {
  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    hasInsurance: '',
    address: '',
    notes: '',
  });

  // Selected services state
  const [selectedServices, setSelectedServices] = useState<{
    aesthetic: string[];
    gynecology: string[];
    obstetrics: string[];
    vitaminIV: string[];
    weightLoss: string[];
  }>({
    aesthetic: [],
    gynecology: [],
    obstetrics: [],
    vitaminIV: [],
    weightLoss: [],
  });

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Record<string, TimeSlot[]>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Patient info, Step 2: Services, Step 3: Date/Time

  // Open service dropdowns state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Get next 30 days for date selection
  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        hasInsurance: '',
        address: '',
        notes: '',
      });
      setSelectedServices({
        aesthetic: [],
        gynecology: [],
        obstetrics: [],
        vitaminIV: [],
        weightLoss: [],
      });
      setSelectedDate('');
      setSelectedTime('');
      setStep(1);
      setError(null);
      setOpenDropdown(null);
    }
  }, [isOpen]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchSlots();
    }
  }, [selectedDate]);

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    setSelectedTime('');

    try {
      const startTime = `${selectedDate}T00:00:00.000Z`;
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);
      const endTime = `${endDate.toISOString().split('T')[0]}T23:59:59.999Z`;

      const response = await fetch(
        `/api/bookings/slots?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
      );

      if (!response.ok) {
        throw new Error('Error al obtener horarios');
      }

      const data = await response.json();
      setAvailableSlots(data.slots || {});
    } catch (err) {
      setError('Error al cargar horarios disponibles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleService = (category: keyof typeof selectedServices, service: string) => {
    setSelectedServices((prev) => {
      const current = prev[category];
      if (current.includes(service)) {
        return { ...prev, [category]: current.filter((s) => s !== service) };
      } else {
        return { ...prev, [category]: [...current, service] };
      }
    });
  };

  const handleNextStep1 = () => {
    // Validate required fields
    if (!formData.name || !formData.lastName || !formData.email || !formData.phone || !formData.dateOfBirth || !formData.hasInsurance || !formData.address) {
      setError('Todos los campos marcados con * son requeridos');
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Email no válido');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    setError(null);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedTime) return;

    setSubmitting(true);
    setError(null);

    try {
      // Combine all services into a single string
      const allServices = [
        ...selectedServices.aesthetic.map(s => `Estéticos: ${s}`),
        ...selectedServices.gynecology.map(s => `Ginecología: ${s}`),
        ...selectedServices.obstetrics.map(s => `Obstetricia: ${s}`),
        ...selectedServices.vitaminIV.map(s => `Vitaminas IV: ${s}`),
        ...selectedServices.weightLoss.map(s => `Pérdida de Peso: ${s}`),
      ].join(', ');

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          hasInsurance: formData.hasInsurance,
          address: formData.address,
          services: allServices,
          notes: formData.notes,
          startTime: selectedTime,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear la cita');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cita');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  // Get slots for selected date
  const slotsForDate = selectedDate ? availableSlots[selectedDate] || [] : [];

  // Count total selected services
  const totalSelectedServices = Object.values(selectedServices).reduce((acc, arr) => acc + arr.length, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Nueva Cita - {step === 1 ? 'Datos del Paciente' : step === 2 ? 'Servicios' : 'Fecha y Hora'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex px-4 pt-4 gap-1">
          <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`} />
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {step === 1 ? (
            // Step 1: Patient Information
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nombre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Apellido"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Teléfono * (formato internacional)
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Heart className="w-4 h-4 inline mr-1" />
                  ¿Tienes Seguro Médico? *
                </label>
                <select
                  name="hasInsurance"
                  value={formData.hasInsurance}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="Si">Sí</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Dirección *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Tu dirección completa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </>
          ) : step === 2 ? (
            // Step 2: Services Selection
            <>
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <Stethoscope className="w-4 h-4 inline mr-1" />
                  Selecciona los servicios que necesitas (opcional)
                </p>
              </div>

              {Object.entries(SERVICES).map(([key, category]) => (
                <div key={key} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
                    className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{category.label}</span>
                    <div className="flex items-center gap-2">
                      {selectedServices[key as keyof typeof selectedServices].length > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {selectedServices[key as keyof typeof selectedServices].length}
                        </span>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${openDropdown === key ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {openDropdown === key && (
                    <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                      {category.options.map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedServices[key as keyof typeof selectedServices].includes(option)}
                            onChange={() => toggleService(key as keyof typeof selectedServices, option)}
                            className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Notas adicionales
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Información adicional para la cita..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                />
              </div>
            </>
          ) : (
            // Step 3: Date and Time Selection
            <>
              {/* Patient summary */}
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">{formData.name} {formData.lastName}</p>
                <p className="text-sm text-green-600">{formData.email}</p>
                {totalSelectedServices > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {totalSelectedServices} servicio{totalSelectedServices > 1 ? 's' : ''} seleccionado{totalSelectedServices > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Date selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Selecciona fecha
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecciona una fecha</option>
                  {getDateOptions().map((date) => (
                    <option key={date} value={date}>
                      {formatDateLabel(date)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Horarios disponibles
                  </label>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="ml-2 text-gray-500">Cargando horarios...</span>
                    </div>
                  ) : slotsForDate.length === 0 ? (
                    <p className="text-center py-4 text-gray-500">
                      No hay horarios disponibles para esta fecha
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slotsForDate.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            selectedTime === slot.time
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          {formatTime(slot.time)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleNextStep1}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Siguiente
              </button>
            </>
          ) : step === 2 ? (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={handleNextStep2}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Siguiente
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedTime || submitting}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  'Crear Cita'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
