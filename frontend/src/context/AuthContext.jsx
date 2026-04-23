import { createContext, useState, useEffect } from "react"
import axios from "axios"

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
      // Set axios default header
      axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`
    }
    setLoading(false)
  }, [])

  const login = async ({ email, password }) => {
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      // The backend uses success(res, {token, user}) which wraps result in 'data'
      const { token, user } = response.data.data;
      setToken(token);
      setUser(user);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return { success: true, user };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Login failed"
      };
    }
  }

  const register = async (formData, autoLogin = true) => {
    try {
      const response = await axios.post("/api/auth/register", formData);
      const { token, user } = response.data.data;

      if (autoLogin) {
        setToken(token);
        setUser(user);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
      return { success: true, user };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed"
      };
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    delete axios.defaults.headers.common["Authorization"];
  }

  const forgotPassword = async (email) => {
    try {
      const response = await axios.post("/api/auth/forgot-password", { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error("Forgot password error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Something went wrong"
      };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await axios.post("/api/auth/verify-otp", { email, otp });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error("OTP verification error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Invalid or expired OTP"
      };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const response = await axios.post("/api/auth/reset-password", { email, otp, newPassword });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Reset failed"
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
