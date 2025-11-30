'use client';

import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const AppToaster = () => (
  <Toaster
    position="top-right"
    toastOptions={{
      duration: 5000,
      success: {
        icon: <CheckCircle className="text-green-500" />,
      },
      error: {
        icon: <XCircle className="text-red-500" />,
      },
    }}
  >
    {(t) => (
      <ToastBar toast={t}>
        {({ icon, message }) => (
          <>
            {icon}
            {message}
            {t.type !== 'loading' && (
              <button onClick={() => toast.dismiss(t.id)} className="ml-4">
                <X size={16} />
              </button>
            )}
          </>
        )}
      </ToastBar>
    )}
  </Toaster>
);

const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast(message, { icon: <AlertTriangle className="text-yellow-500" /> }),
  info: (message: string) => toast(message, { icon: <Info className="text-blue-500" /> }),
};

export { AppToaster as ToastProvider, showToast };
