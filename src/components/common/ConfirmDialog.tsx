import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  // rétrocompatibilité avec useConfirmDialog existant
  onProceed?: () => void;
  onConfirm?: () => void;
  onCancel: () => void;
  // ignorés (anciens props de l'étape 2, gardés pour ne pas casser les imports)
  step?: 1 | 2;
  dangerMessage?: string;
}

const ConfirmDialog: React.FC<Props> = ({
                                          isOpen,
                                          title,
                                          message,
                                          confirmLabel = 'Confirmer',
                                          danger = true,
                                          onProceed,
                                          onConfirm,
                                          onCancel,
                                        }) => {
  if (!isOpen) return null;

  // supporte onConfirm (nouveau) et onProceed (useConfirmDialog existant)
  const handleConfirm = () => {
    onConfirm?.();
    onProceed?.();
    onCancel(); // ferme automatiquement le popup après confirmation
  };

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in slide-in-from-bottom-4">

          <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} className="text-gray-500" />
          </button>

          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-xl ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              <AlertTriangle
                  size={24}
                  className={danger ? 'text-red-600' : 'text-amber-600'}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                {title || 'Confirmation'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {message}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors"
            >
              Annuler
            </button>
            <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2 rounded-xl font-medium text-sm text-white transition-colors ${
                    danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
  );
};

export default ConfirmDialog;