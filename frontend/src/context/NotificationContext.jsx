import { createContext, useState, useEffect, useContext, useCallback } from "react";
import { io } from "socket.io-client";
import api from "../utils/api";
import { AuthContext } from "./AuthContext";
import showToast from "../components/ui/Toast";

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!token || user?.role !== 'admin') return;
    
    setLoading(true);
    try {
      // api interceptor unwraps envelope → response.data = { notifications, unreadCount }
      const response = await api.get("/api/notifications");
      setNotifications(response.data.notifications ?? []);
      setUnreadCount(response.data.unreadCount ?? 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket.io integration
  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io("/", {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on("connect", () => {
      console.log("Connected to notification socket");
    });

    newSocket.on("notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Real-time toast for immediate feedback
      showToast.info(notification.title);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteAll = async () => {
    try {
      await axios.delete("/api/notifications/all");
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error deleting all notifications:", error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    socket,
    markAsRead,
    markAllAsRead,
    deleteAll,
    fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
