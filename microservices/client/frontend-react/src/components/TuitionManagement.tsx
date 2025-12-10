import { useState } from 'react';
import { DollarSign, Save, X, AlertCircle } from 'lucide-react';
import { StudentsApi } from '../lib/api';

interface TuitionManagementProps {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    tuitionAmount: number;
    tuitionPaid: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function TuitionManagement({ student, onClose, onSuccess }: TuitionManagementProps) {
  const [newAmount, setNewAmount] = useState(student.tuitionAmount.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentBalance = student.tuitionAmount - student.tuitionPaid;
  const newBalance = parseFloat(newAmount) - student.tuitionPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Montant invalide');
      return;
    }

    if (amount < student.tuitionPaid) {
      setError(`Le montant ne peut pas être inférieur au montant déjà payé (${student.tuitionPaid.toFixed(2)} $)`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await StudentsApi.update(student.id, {
        tuitionAmount: amount
      });

      alert(` Frais de scolarité mis à jour avec succès!\n\nAncien montant: ${student.tuitionAmount.toFixed(2)} $ CAD\nNouveau montant: ${amount.toFixed(2)} $ CAD\n\n${newBalance > 0 ? `Une notification a été envoyée au parent pour le solde de ${newBalance.toFixed(2)} $ CAD.` : 'Aucun solde restant.'}`);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestion des frais</h2>
              <p className="text-sm text-gray-600">
                {student.firstName} {student.lastName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations actuelles */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Montant actuel:</span>
              <span className="font-semibold text-gray-900">
                {student.tuitionAmount.toFixed(2)} $ CAD
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Montant payé:</span>
              <span className="font-semibold text-green-600">
                {student.tuitionPaid.toFixed(2)} $ CAD
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-600">Solde actuel:</span>
              <span className={`font-bold ${currentBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {currentBalance.toFixed(2)} $ CAD
              </span>
            </div>
          </div>

          {/* Nouveau montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau montant total
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $ CAD
              </div>
            </div>
          </div>

          {/* Aperçu du nouveau solde */}
          {newAmount && !isNaN(parseFloat(newAmount)) && (
            <div className={`rounded-lg p-4 ${newBalance > currentBalance ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-start gap-2">
                {newBalance > currentBalance && (
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Nouveau solde à payer
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {newBalance.toFixed(2)} $ CAD
                  </p>
                  {newBalance > currentBalance && (
                    <p className="text-sm text-amber-700 mt-2">
                       Le parent recevra une notification pour payer le nouveau solde de {newBalance.toFixed(2)} $ CAD.
                    </p>
                  )}
                  {newBalance < currentBalance && newBalance >= 0 && (
                    <p className="text-sm text-blue-700 mt-2">
                       Le solde diminue de {currentBalance.toFixed(2)} $ à {newBalance.toFixed(2)} $.
                    </p>
                  )}
                  {newBalance === 0 && (
                    <p className="text-sm text-green-700 mt-2">
                       Les frais seront entièrement payés.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !newAmount || parseFloat(newAmount) === student.tuitionAmount}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Mise à jour...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Note informative */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong> Note:</strong> Si le nouveau montant est supérieur à l'ancien, un paiement en attente sera automatiquement créé et une notification sera envoyée au parent pour effectuer le paiement du solde.
          </p>
        </div>
      </div>
    </div>
  );
}
