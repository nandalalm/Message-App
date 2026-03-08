import React from "react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = true,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
          {description && (
            <p className="mt-2 sm:mt-3 text-[13px] sm:text-sm text-gray-500 leading-relaxed font-medium">{description}</p>
          )}
          <div className="mt-6 sm:mt-8 flex justify-end gap-2 sm:gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all text-[10px] sm:text-sm font-semibold"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl text-white text-[10px] sm:text-sm font-bold transition-all shadow-lg shadow-opacity-20 uppercase tracking-wide ${
                isDestructive 
                  ? "bg-red-600 hover:bg-red-700 shadow-red-200" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
