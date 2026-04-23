# OpsMind AI - Frontend

OpsMind AI is an advanced, high-performance corporate intelligence platform designed to revolutionize how organizations interact with their internal knowledge base. The frontend provides a premium, interactive interface featuring glassmorphic design, real-time AI chat, and robust administrative tools.

## ✨ Key Features

- **Smart AI Chat**: Real-time interaction with corporate documents using RAG (Retrieval-Augmented Generation) for zero-hallucination answers.
- **Secure Authentication**: Multi-layered auth system featuring Firebase Google Login and traditional JWT-based email/password login.
- **Admin Dashboard**: Comprehensive document management pipeline including automated PDF parsing, embedding, and vector index management.
- **Interactive 3D UI**: Immersive 3D robot scene and dynamic particle backgrounds built with React Three Fiber.
- **Premium Aesthetics**: Fully responsive glassmorphic UI with smooth staggered animations and persistent dark/light mode.
- **Real-time Notifications**: Instant feedback on document processing status and system alerts via Socket.io.

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **3D Graphics**: [Three.js](https://threejs.org/) & [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- **State Management**: React Context API (Auth, Theme, Admin)
- **Communication**: [Axios](https://axios-http.com/) & [Socket.io-client](https://socket.io/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📁 Project Structure

```text
frontend/
├── src/                         # Main application source code
│   ├── components/              # Modular UI components
│   │   ├── admin/               # Admin Dashboard specific modules
│   │   │   ├── DeleteConfirmModal.jsx   # Document deletion confirmation
│   │   │   ├── DocumentList.jsx         # Administrative document view
│   │   │   ├── EmbeddingProgress.jsx    # Real-time processing status
│   │   │   ├── PaginatedList.jsx        # Reusable paginated table
│   │   │   ├── Pagination.jsx           # Pagination controls
│   │   │   ├── UploadDropzone.jsx       # Advanced file upload zone
│   │   │   └── UserCard.jsx             # User management card
│   │   ├── auth/                # Authentication components
│   │   │   └── FloatInput.jsx           # Animated floating label input
│   │   ├── chat/                # AI Chat interface components
│   │   │   ├── ChatInput.jsx            # Multi-line chat input with stop button
│   │   │   ├── ChatMessage.jsx          # Message bubble with citation support
│   │   │   ├── ChatSidebar.jsx          # Session history and management
│   │   │   └── SourcesPanel.jsx         # Side panel for RAG source display
│   │   ├── three/               # 3D interactive elements
│   │   │   ├── BackgroundParticles.jsx  # Interactive 3D particles
│   │   │   └── RobotScene.jsx           # Chibi Robot 3D interaction
│   │   └── ui/                  # Global reusable atomic UI
│   │       ├── Badge.jsx                # Multi-color status indicators
│   │       └── Toast.jsx                # Custom notification system
│   ├── context/                 # Global state providers (Context API)
│   │   ├── AdminContext.jsx             # State for document/user management
│   │   ├── AuthContext.jsx              # Session and Google Login state
│   │   ├── NotificationContext.jsx      # Real-time system notifications
│   │   └── ThemeContext.jsx             # Dark/Light mode state management
│   ├── hooks/                   # Custom reusable React hooks
│   │   ├── useAdmin.js                  # Document & User management actions
│   │   ├── useAuth.js                   # Unified auth access hook
│   │   ├── useChat.js                   # Chat session and streaming logic
│   │   ├── useDebounce.js               # Performance optimization hook
│   │   └── useDocuments.js              # Document fetching and search
│   ├── pages/                   # Top-level page views
│   │   ├── AdminPage.jsx                # Master Admin Dashboard
│   │   ├── AuthPage.jsx                 # Login, Register & Reset Password
│   │   ├── ChatPage.jsx                 # AI Chat interface
│   │   ├── DashboardPage.jsx            # User-level landing view
│   │   └── NotFoundPage.jsx             # 404 Error page
│   ├── styles/                  # Styling and CSS
│   │   ├── chat.css                     # Chat-specific layout fixes
│   │   └── index.css                    # Global Tailwind & Design System
│   ├── utils/                   # Helper functions and configurations
│   │   ├── api.js                       # Axios instance with interceptors
│   │   ├── firebase.js                  # Firebase Client initialization
│   │   └── streamParser.js              # SSE streaming chunk processor
│   ├── App.jsx                  # Main routing and provider wrapping
│   └── main.jsx                 # React entry point
├── .env                         # Local environment secrets (Firebase keys)
├── .env.example                 # Public template for environment variables
├── .gitignore                   # Files and folders ignored by Git
├── eslint.config.js             # Linting rules and configuration
├── index.html                   # HTML template and font loading
├── package.json                 # Metadata, scripts, and dependencies
└── vite.config.js               # Vite build and proxy configuration
```

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **npm** or **yarn**

### 2. Setup Environment Variables
Create a `.env` file in the `frontend` root directory. Use `.env.example` as a template:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Installation
```bash
# Navigate to the frontend folder
cd frontend

# Install dependencies
npm install
```

### 4. Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

> [!IMPORTANT]
> Ensure the backend server is running (typically on port 3000) for authentication and data processing to work. The frontend uses Vite's proxy to forward `/api` requests to the backend.

## 🔒 Security & Architecture
- **JWT Persistence**: Authentication tokens are stored securely in `localStorage` and automatically attached to all API requests.
- **Firebase Auth**: Integrated with the backend to verify Google ID tokens, ensuring server-side security for social logins.
- **Protected Routes**: Navigation is guarded to prevent unauthorized access to Admin and Chat modules.

---
*Built with precision for the next generation of corporate intelligence.*
