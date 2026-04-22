import { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import showToast from '../components/ui/Toast';

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (signal) => {
    try {
      const res = await axios.get('/api/admin/stats', { signal });
      setStats(res.data.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Failed to fetch admin stats:', err);
      // Don't show toast here as it might be a background refresh failure
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

  const fetchActivities = useCallback(async (signal) => {
    try {
      const res = await axios.get('/api/admin/activities', { signal });
      setActivities(res.data.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Failed to fetch admin activities:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchMetrics(), fetchActivities()]);
    setLoading(false);
  }, [fetchStats, fetchMetrics, fetchActivities]);

  useEffect(() => {
    const controller = new AbortController();
    
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(controller.signal),
        fetchMetrics(30, controller.signal),
        fetchActivities(controller.signal)
      ]);
      setLoading(false);
    };

    init();

    // Auto-refresh stats every 2 minutes
    const interval = setInterval(() => {
      fetchStats(controller.signal);
    }, 120000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchStats, fetchMetrics]);

  return (
    <AdminContext.Provider value={{
      stats,
      metrics,
      activities,
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
