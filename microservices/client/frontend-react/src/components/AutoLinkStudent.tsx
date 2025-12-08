import React, { useState, useEffect } from 'react';
import { User, Link, CheckCircle, AlertCircle } from 'lucide-react';
import { StudentLinkingApi } from '../services/studentLinking';
import { Student } from '../types';

interface AutoLinkStudentProps {
  userEmail: string;
  userId: string;
  onLinkSuccess?: (student: Student) => void;
}

export default function AutoLinkStudent({ userEmail, userId, onLinkSuccess }: AutoLinkStudentProps) {
  const [linkableStudents, setLinkableStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    checkForLinkableStudents();
  }, [userEmail]);

  const checkForLinkableStudents = async () => {
    setLoading(true);
    try {
      const result = await StudentLinkingApi.checkLinkableStudents(userEmail);
      setLinkableStudents(result.students);
      
      if (result.hasLinkableStudents) {
        setShowDialog(true);
        setMessage(`${result.students.length} profil(s) élève(s) trouvé(s) pour ${userEmail}`);
      }
    } catch (error) {
      console.error('Erreur vérification liaison:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkStudent = async (studentId: string) => {
    setLinking(true);
    try {
      const result = await StudentLinkingApi.linkByParentEmail(userEmail, userId);
      
      setMessage(`✅ Profil lié avec succès: ${result.student.firstName} ${result.student.lastName}`);
      
      if (onLinkSuccess) {
        onLinkSuccess(result.student);
      }
      
      // Fermer le dialog après 2 secondes
      setTimeout(() => {
        setShowDialog(false);
      }, 2000);
      
    } catch (error) {
      setMessage(`❌ Erreur de liaison: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLinking(false);
    }
  };

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Link className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Liaison de Profil</h3>
        </div>

        <p className="text-gray-600 mb-4">{message}</p>

        {linkableStudents.length > 0 && (
          <div className="space-y-3">
            {linkableStudents.map((student) => (
              <div
                key={student.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {student.program} - {student.session}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleLinkStudent(student.id)}
                    disabled={linking}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {linking ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Lier ce profil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={() => setShowDialog(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
