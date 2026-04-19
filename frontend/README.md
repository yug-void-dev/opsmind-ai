# OpsMind AI - Frontend

OpsMind AI is a modern, high-performance corporate intelligence platform. This frontend is built with React and Vite, featuring a premium glassmorphic UI, smooth animations, and interactive 3D elements.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173` (by default).

### Environment & Proxy
The development server is configured to proxy API requests to `http://localhost:3000` via `vite.config.js`. Ensure the backend server is running to enable authentication and data fetch functionality.

---

## ✨ Features Implemented So Far

### 1. Robust Authentication System
We have implemented a secure and persistent authentication flow:
- **Login & Register**: Completely integrated with the backend API.
- **Session Persistence**: User sessions and JWT tokens are stored in `localStorage`, so users remain logged in even after a page refresh.
- **Automatic Authorization**: All outgoing API requests automatically include the `Authorization: Bearer <token>` header once a user is authenticated.
- **Modern UI Feedback**: Real-time error/success alerts and loading states (spinners) for a professional feel.
- **Client-side Validation**: Includes password strength indicators and password confirmation checks.

### 2. Smart Theme Management
- **Persistence**: Remembers user choice ('Light' or 'Dark' mode) across sessions.
- **System Synchronization**: Automatically detects and adapts to the user's OS theme preference on first load.
- **Global Context**: Theme state is managed globally and can be accessed anywhere using the `useTheme` hook.

### 3. Premium UI/UX
- **Glassmorphism**: Advanced backdrop blurs and semi-transparent layers for a cutting-edge aesthetic.
- **Animations**: Snappy, staggered transitions powered by `Framer Motion`.
- **Interactive 3D**: Features a Chibi Robot scene built with `React Three Fiber` that reacts to cursor movements.

---

## 🛠 Tech Stack
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **3D Engine**: [Three.js](https://threejs.org/) & [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **API Client**: [Axios](https://axios-http.com/)

---

## 📁 Repository Structure (Core)
- `src/context/`: Contains `AuthContext` and `ThemeContext` for global state.
- `src/hooks/`: Custom hooks like `useAuth` and `useTheme`.
- `src/pages/`: Main application pages (e.g., `AuthPage.jsx`).
- `src/components/`: Reusable UI elements, including 3D scenes and specialized inputs.

---

## 🔐 Security Note
All data transmitted between the frontend and backend is intended to be encrypted via HTTPS in production. JWT tokens are handled securely and wiped upon logout.
