import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from './useDatabase';
import { useStore } from '@/store/useStore';
import { toast } from './use-toast';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: 'low_stock' | 'goal_achieved' | 'new_sale' | 'system';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { products, sales, ingredients } = useDatabase();
  const { orders } = useStore();

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Manter apenas 50 notificações

    // Mostrar toast para notificações importantes
    if (notification.type === 'warning' || notification.type === 'error') {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    }

    return newNotification.id;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Monitorar stock baixo
  useEffect(() => {
    const criticalProducts = products.filter(p => p.stock <= 5);
    const criticalIngredients = ingredients.filter(i => i.stock <= i.minStock);

    if (criticalProducts.length > 0) {
      const lastCheck = localStorage.getItem('lastStockCheck');
      const now = new Date().toDateString();
      
      if (lastCheck !== now) {
        addNotification({
          title: '⚠️ Stock Crítico',
          message: `${criticalProducts.length} produto(s) com stock baixo`,
          type: 'warning',
          action: {
            label: 'Ver Produtos',
            onClick: () => window.location.href = '/inventory'
          }
        });
        localStorage.setItem('lastStockCheck', now);
      }
    }

    if (criticalIngredients.length > 0) {
      const lastCheck = localStorage.getItem('lastIngredientCheck');
      const now = new Date().toDateString();
      
      if (lastCheck !== now) {
        addNotification({
          title: '📦 Ingredientes em Falta',
          message: `${criticalIngredients.length} ingrediente(s) abaixo do mínimo`,
          type: 'warning'
        });
        localStorage.setItem('lastIngredientCheck', now);
      }
    }
  }, [products, ingredients, addNotification]);

  // Monitorar vendas importantes
  useEffect(() => {
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today);
    const totalToday = todaySales.reduce((sum, s) => sum + s.total, 0);

    // Notificar quando atingir metas diárias
    const dailyGoal = 50000; // 50k AOA
    if (totalToday >= dailyGoal) {
      const goalReached = localStorage.getItem(`goalReached-${today}`);
      if (!goalReached) {
        addNotification({
          title: '🎉 Meta Diária Atingida!',
          message: `Parabéns! Você atingiu a meta de ${dailyGoal.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}`,
          type: 'success'
        });
        localStorage.setItem(`goalReached-${today}`, 'true');
      }
    }

    // Notificar vendas grandes (acima de 10k)
    const largeSales = todaySales.filter(s => s.total > 10000);
    largeSales.forEach(sale => {
      const notified = localStorage.getItem(`largeSale-${sale.id}`);
      if (!notified) {
        addNotification({
          title: '💰 Venda Importante',
          message: `Venda de ${sale.total.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })} registrada`,
          type: 'success'
        });
        localStorage.setItem(`largeSale-${sale.id}`, 'true');
      }
    });
  }, [sales, addNotification]);

  // Monitorar pedidos pendentes
  useEffect(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const oldOrders = pendingOrders.filter(o => {
      const orderTime = new Date(o.createdAt).getTime();
      const now = new Date().getTime();
      return (now - orderTime) > 30 * 60 * 1000; // 30 minutos
    });

    oldOrders.forEach(order => {
      const notified = localStorage.getItem(`oldOrder-${order.id}`);
      if (!notified) {
        addNotification({
          title: '⏰ Pedido Pendente',
          message: `Mesa ${order.tableId} tem pedido há mais de 30 minutos`,
          type: 'warning',
          action: {
            label: 'Ver Pedido',
            onClick: () => window.location.href = '/tables'
          }
        });
        localStorage.setItem(`oldOrder-${order.id}`, 'true');
      }
    });
  }, [orders, addNotification]);

  // Estatísticas das notificações
  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => !n.read && (n.type === 'error' || n.type === 'warning')).length;

  return {
    notifications,
    unreadCount,
    criticalCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  };
}