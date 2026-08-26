import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  onRetry?: () => void;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div
      id="toast-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto rounded-xl p-4 shadow-2xl border flex items-start gap-3 text-sm ${
              toast.type === 'error'
                ? 'bg-[#181114] border-rose-900/60 text-rose-200 shadow-rose-950/20'
                : toast.type === 'success'
                ? 'bg-[#101915] border-emerald-900/60 text-emerald-200 shadow-emerald-950/20'
                : 'bg-[#0F1115] border-[#23262B] text-[#F3F4F6]'
            }`}
          >
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-[#C8AA6E] shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs sm:text-sm">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-xs text-[#8E9AAF] leading-relaxed">
                  {toast.message}
                </p>
              )}
              {toast.onRetry && (
                <button
                  type="button"
                  id={`toast-retry-${toast.id}`}
                  onClick={() => {
                    toast.onRetry?.();
                    onDismiss(toast.id);
                  }}
                  className="mt-2 text-xs font-medium text-[#C8AA6E] underline hover:text-white transition cursor-pointer"
                >
                  Retry Action
                </button>
              )}
            </div>

            <button
              type="button"
              id={`toast-dismiss-${toast.id}`}
              onClick={() => onDismiss(toast.id)}
              className="text-[#8E9AAF] hover:text-[#F3F4F6] transition p-1 cursor-pointer shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
