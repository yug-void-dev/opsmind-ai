import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthPage from "./pages/AuthPage";
import AdminPage, {
  AdminOverview,
  AdminDocuments,
  AdminPipeline,
  AdminAnalytics,
  AdminUsers,
  AdminSettings,
  AdminUpload,
} from "./pages/AdminPage";
import { AdminProvider } from "./context/AdminContext";
import { NotificationProvider } from "./context/NotificationContext";
import ChatPage from "./pages/ChatPage";
import NotFoundPage from "./pages/NotFoundPage";
import useAuth from "./hooks/useAuth";

/* ── ProtectedRoute ──
   Checks if user is authenticated. If not, redirects to login.
   Also handles loading states to prevent flicker. */
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ff]">
        <div className="w-12 h-12 border-4 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/chat" replace />;
  }

  return children;
}

/* ── RootRedirect ──
   Redirects users based on their role. */
function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/chat" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<AuthPage />} />

        {/* Admin — nested layout with Outlet */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly={true}>
            <NotificationProvider>
              <AdminProvider>
                <AdminPage />
              </AdminProvider>
            </NotificationProvider>
          </ProtectedRoute>
        }>
          <Route index element={<AdminOverview />} />
          <Route path="upload" element={<AdminUpload />} />
          <Route path="documents" element={<AdminDocuments />} />
          <Route path="pipeline" element={<AdminPipeline />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Default */}
        <Route path="/" element={
          <ProtectedRoute>
            <RootRedirect />
          </ProtectedRoute>
        } />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
