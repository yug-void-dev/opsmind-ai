import { toast } from "react-toastify";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

/**
 * Custom Toast configuration to match the OpsMind AI premium aesthetic.
 * Uses Lucide icons and consistent styling.
 */

const toastConfig = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "light", // We can also use "dark" or dynamic theme
};

export const showToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      ...toastConfig,
      ...options,
      icon: <CheckCircle2 className="text-emerald-500" size={20} />,
      className: "glass-toast success",
    });
  },
  error: (message, options = {}) => {
    toast.error(message, {
      ...toastConfig,
      ...options,
      icon: <XCircle className="text-rose-500" size={20} />,
      className: "glass-toast error",
    });
  },
  info: (message, options = {}) => {
    toast.info(message, {
      ...toastConfig,
      ...options,
      icon: <Info className="text-sky-500" size={20} />,
      className: "glass-toast info",
    });
  },
  warning: (message, options = {}) => {
    toast.warning(message, {
      ...toastConfig,
      ...options,
      icon: <AlertCircle className="text-amber-500" size={20} />,
      className: "glass-toast warning",
    });
  },
};

export default showToast;
