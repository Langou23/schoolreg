/**
 * ============================================
 * COMPOSANT DE LISTE DES NOTIFICATIONS
 * ============================================
 * 
 * Affiche les notifications de l'utilisateur connect:
 * - Liste des notifications récentes
 * - Badge de compteur non lues
 * - Marquage comme lu au clic
 * - Types: paiements, inscriptions, changements de profil, notes
 * 
 * Usage:
 *   <NotificationsList />  // Dans StudentDashboard ou ParentDashboard
 */

import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, DollarSign, BookOpen, User } from 'lucide-react';
import { notificationsClient } from '../lib/apiClient';
import { useAuth } from '../auth/AuthProvider';

// ============================================
// TYPES
// ============================================

interface Notification {
  id: string;
  userId: string;
  type: 'application_status' | 'payment_reminder' | 'enrollment_update' | 'general' | 'urgent';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function NotificationsList() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // ============================================
  // CHARGEMENT DES NOTIFICATIONS
  // ============================================

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Récupérer les notifications de l'utilisateur
      const { data } = await notificationsClient.get('/', {
        params: { userId: user.id }
      });
      
      setNotifications(data);
      
      // Calculer le nombre de non lues
      const unread = data.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et toutes les 30 secondes
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, [user?.id]);

  // ============================================
  // MARQUER COMME LUE
  // ============================================

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsClient.patch(`/${notificationId}/read`);
      
      // Mettre à jour localement
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Erreur marquage comme lu:', error);
    }
  };

  // ============================================
  // MARQUER TOUTES COMME LUES
  // ============================================

  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await notificationsClient.patch('/mark-all-read', {
        userId: user.id
      });
      
      // Mettre à jour localement
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
      
    } catch (error) {
      console.error('Erreur marquage tout comme lu:', error);
    }
  };

  // ============================================
  // SUPPRIMER UNE NOTIFICATION
  // ============================================

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationsClient.delete(`/${notificationId}`);
      
      // Retirer localement
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  };

  // ============================================
  // ICÔNE SELON LE TYPE
  // ============================================

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment_reminder':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'enrollment_update':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'application_status':
        return <User className="w-5 h-5 text-purple-600" />;
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  // ============================================
  // FORMATAGE DE LA DATE
  // ============================================

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-CA');
  };

  // ============================================
  // RENDU
  // ============================================

  return (
    <div className="relative">
      {/* Bouton Notifications */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        
        {/* Badge compteur */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel des notifications */}
      {isOpen && (
        <>
          {/* Overlay pour fermer */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Notifications</h3>
                <p className="text-sm text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Toutes lues'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    title="Marquer toutes comme lues"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Liste des notifications */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Chargement...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        {/* Icône */}
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notification.type)}
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDate(notification.createdAt)}
                            </span>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 text-center">
                <button
                  onClick={() => {
                    // TODO: Implémenter une page dédiée aux notifications
                    setIsOpen(false);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Voir toutes les notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
