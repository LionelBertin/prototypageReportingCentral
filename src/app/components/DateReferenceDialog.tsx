import { useState } from 'react';
import { X } from 'lucide-react';
import { DateReference, SelectedAttribute } from '../types/selection';

interface DateReferenceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  objectName: string;
  currentDateReference?: DateReference;
  availableDateAttributes: SelectedAttribute[];
  forceReportValueDateOnly?: boolean;
  onConfirm: (dateReference: DateReference) => void;
}

export function DateReferenceDialog({
  isOpen,
  onClose,
  objectName,
  currentDateReference,
  availableDateAttributes,
  forceReportValueDateOnly = false,
  onConfirm,
}: DateReferenceDialogProps) {
  const [referenceType, setReferenceType] = useState<DateReference['type']>(
    currentDateReference?.type || 'today'
  );
  const [customDate, setCustomDate] = useState<string>(
    currentDateReference?.customDate || ''
  );
  const [attributeId, setAttributeId] = useState<string>(
    currentDateReference?.attributeId || ''
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (forceReportValueDateOnly) {
      onConfirm({ type: 'today' });
      onClose();
      return;
    }

    let dateRef: DateReference;

    if (referenceType === 'today') {
      dateRef = { type: 'today' };
    } else if (referenceType === 'custom') {
      if (!customDate) {
        alert('Veuillez sélectionner une date');
        return;
      }
      dateRef = { type: 'custom', customDate };
    } else {
      if (!attributeId) {
        alert('Veuillez sélectionner un attribut de date');
        return;
      }
      dateRef = { type: 'attribute', attributeId };
    }

    onConfirm(dateRef);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Objet applicable : <span className="font-medium">{objectName}</span>
          </h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-4">
          <p className="mt-2 text-xs text-gray-500">
            La date de référence détermine quelle information afficher dans le rapport.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Date de référence
            </label>
            {forceReportValueDateOnly ? (
              <div className="rounded border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
                Cet objet applicable est basé sur une période. La seule référence autorisée est la Date de valeur du rapport.
              </div>
            ) : (
              <div className="space-y-2">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="referenceType"
                  value="today"
                  checked={referenceType === 'today'}
                  onChange={(e) => setReferenceType(e.target.value as DateReference['type'])}
                  className="mt-0.5 size-4"
                />
                <div>
                  <span className="text-sm text-gray-700">Date de valeur du rapport</span>
                </div>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="referenceType"
                  value="custom"
                  checked={referenceType === 'custom'}
                  onChange={(e) => setReferenceType(e.target.value as DateReference['type'])}
                  className="mt-0.5 size-4"
                />
                <div className="flex-1">
                  <span className="text-sm text-gray-700">Date personnalisée</span>
                  {referenceType === 'custom' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  )}
                </div>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="referenceType"
                  value="attribute"
                  checked={referenceType === 'attribute'}
                  onChange={(e) => setReferenceType(e.target.value as DateReference['type'])}
                  className="mt-0.5 size-4"
                  disabled={availableDateAttributes.length === 0}
                />
                <div className="flex-1">
                  <span className={availableDateAttributes.length === 0 ? 'text-sm text-gray-400' : 'text-sm text-gray-700'}>
                    Autre attribut de date
                  </span>
                  {availableDateAttributes.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Aucun attribut de date disponible
                    </p>
                  )}
                  {referenceType === 'attribute' && availableDateAttributes.length > 0 && (
                    <select
                      value={attributeId}
                      onChange={(e) => setAttributeId(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">Sélectionner un attribut</option>
                      {availableDateAttributes.map((attr) => (
                        <option key={attr.id} value={attr.id}>
                          {attr.attributeName} ({attr.objectName})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
