import { createContext, useState, useEffect } from "react"
import api from "../utils/api"

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  //* auto-restore session on refresh
  useEffect(() => {
    const savedToken = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      // api.js interceptor picks up token from localStorage automatically
    }
    setLoading(false)
  }, [])

  const login = async ({ email, password }) => {
    try {
      // api interceptor unwraps { success, data, message } → response.data = inner data
      const response = await api.post("/api/auth/login", { email, password });
      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      return { success: true, user };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.message || "Login failed"
      };
    }
  }

  const register = async (formData) => {
    try {
      const response = await api.post("/api/auth/register", formData);
      const { token, user } = response.data;

      setToken(token);
      setUser(user);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      return { success: true, user };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.message || "Registration failed"
      };
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  }

  const forgotPassword = async (email) => {
    try {
      const response = await api.post("/api/auth/forgot-password", { email });
      return { success: true, message: response.data?._message || "OTP sent" };
    } catch (error) {
      console.error("Forgot password error:", error);
      return {
        success: false,
        message: error.message || "Something went wrong"
      };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await api.post("/api/auth/verify-otp", { email, otp });
      return { success: true, message: response.data?._message || "OTP verified" };
    } catch (error) {
      console.error("OTP verification error:", error);
      return {
        success: false,
        message: error.message || "Invalid or expired OTP"
      };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const response = await api.post("/api/auth/reset-password", { email, otp, newPassword });
      return { success: true, message: response.data?._message || "Password reset" };
    } catch (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        message: error.message || "Reset failed"
      };
    }
  };

  const value = { user, token, loading, login, register, logout, forgotPassword, verifyOTP, resetPassword }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
