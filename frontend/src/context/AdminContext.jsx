import { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import axios from 'axios';
import showToast from '../components/ui/Toast';
import { NotificationContext } from './NotificationContext';

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const { socket } = useContext(NotificationContext);
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityPagination, setActivityPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use refs to avoid stale closures in socket events
  const activityPaginationRef = useRef({ page: 1, limit: 10 });
  useEffect(() => { activityPaginationRef.current = activityPagination; }, [activityPagination]);

  const fetchStats = useCallback(async (signal) => {
    try {
      const res = await axios.get('/api/admin/stats', { signal });
      setStats(res.data.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Failed to fetch admin stats:', err);
    }
  }, []);

  const fetchMetrics = useCallback(async (days = 30, signal) => {
    try {
      const res = await axios.get(`/api/admin/analytics?days=${days}`, { signal });
      setMetrics(res.data.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Failed to fetch admin analytics:', err);
    }
  }, []);

  const fetchActivities = useCallback(async (page = 1, limit = 10, signal) => {
    try {
      const res = await axios.get(`/api/admin/activities?page=${page}&limit=${limit}`, { signal });
      setActivities(res.data.data.activities || []);
      setActivityPagination(res.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Failed to fetch admin activities:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchMetrics(), fetchActivities(1, 10)]);
    setLoading(false);
  }, [fetchStats, fetchMetrics, fetchActivities]);

  useEffect(() => {
    const controller = new AbortController();

    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(controller.signal),
        fetchMetrics(30, controller.signal),
        fetchActivities(1, 10, controller.signal)
      ]);
      setLoading(false);
    };

    init();

    // Auto-refresh stats every 2 minutes for slow-moving metrics
    const interval = setInterval(() => {
      fetchStats(controller.signal);
    }, 120000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchStats, fetchMetrics, fetchActivities]);

  // Real-time Activity Listener
  useEffect(() => {
    if (!socket) return;

    const handleNewActivity = () => {
      // Fetch the current page of activities to ensure sync
      const current = activityPaginationRef.current;
      fetchActivities(current.page, current.limit);
      fetchStats();
    };

    socket.on('new_activity', handleNewActivity);

    return () => {
      socket.off('new_activity', handleNewActivity);
    };
  }, [socket, fetchStats]);

  return (
    <AdminContext.Provider value={{
      stats,
      metrics,
      activities,
      activityPagination,
      loading,
      error,
      refreshAll,
      fetchStats,
      fetchMetrics,
      fetchActivities
    }}>
      {children}
    </AdminContext.Provider>
  );
};
