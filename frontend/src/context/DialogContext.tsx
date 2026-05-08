import { createContext, useCallback, useContext, useRef, useState } from 'react';

export type DialogType = 'danger' | 'warning' | 'info' | 'success';
export type DialogMode = 'confirm' | 'alert';

export interface DialogOptions {
  title?: string;
  body: string;
  type?: DialogType;
  mode?: DialogMode;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState extends DialogOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

interface DialogContextType {
  confirm: (options: DialogOptions) => Promise<boolean>;
  alert: (options: Omit<DialogOptions, 'mode' | 'cancelText'>) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | null>(null);

const INITIAL: DialogState = { open: false, resolve: null, body: '' };

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(INITIAL);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, mode: options.mode ?? 'confirm', open: true, resolve });
    });
  }, []);

  const alert = useCallback((options: Omit<DialogOptions, 'mode' | 'cancelText'>): Promise<void> => {
    return new Promise<void>((resolve) => {
      const boolResolve = () => resolve();
      resolveRef.current = (v) => { if (v) boolResolve(); else boolResolve(); };
      setState({ ...options, mode: 'alert', open: true, resolve: resolveRef.current });
    });
  }, []);

  const handleConfirm = () => {
    resolveRef.current?.(true);
    setState(INITIAL);
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setState(INITIAL);
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {state.open && (
        <DialogModal
          state={state}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
}

const TYPE_CONFIG: Record<DialogType, { icon: string; iconBg: string; iconColor: string; btnClass: string }> = {
  danger:  { icon: '🗑️', iconBg: 'bg-red-100',    iconColor: 'text-red-600',    btnClass: 'bg-red-600 hover:bg-red-700 text-white' },
  warning: { icon: '⚠️', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', btnClass: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  info:    { icon: 'ℹ️', iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   btnClass: 'bg-blue-600 hover:bg-blue-700 text-white' },
  success: { icon: '✅', iconBg: 'bg-green-100',  iconColor: 'text-green-600',  btnClass: 'bg-green-600 hover:bg-green-700 text-white' },
};

function DialogModal({
  state,
  onConfirm,
  onCancel,
}: {
  state: DialogState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const type = state.type ?? 'info';
  const cfg = TYPE_CONFIG[type];
  const isConfirm = state.mode !== 'alert';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ animation: 'dialogFadeIn 0.15s ease' }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isConfirm ? onCancel : onConfirm} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center"
        style={{ animation: 'dialogSlideUp 0.18s ease' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-14 h-14 rounded-full ${cfg.iconBg} flex items-center justify-center text-2xl mb-4`}>
          {cfg.icon}
        </div>

        {state.title && (
          <h2 className="text-lg font-bold text-gray-800 mb-1">{state.title}</h2>
        )}
        <p className="text-sm text-gray-500 leading-relaxed">{state.body}</p>

        <div className={`mt-6 flex gap-3 w-full ${isConfirm ? '' : 'justify-center'}`}>
          {isConfirm && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
            >
              {state.cancelText ?? 'Huỷ'}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition ${cfg.btnClass}`}
          >
            {state.confirmText ?? (isConfirm ? 'Xác nhận' : 'OK')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dialogFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dialogSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
