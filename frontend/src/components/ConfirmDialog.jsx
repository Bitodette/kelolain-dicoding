import { createContext, useContext, useState, useCallback } from "react";

const ConfirmContext = createContext(null);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((message, title = "Konfirmasi", confirmText = "Hapus") => {
    return new Promise((resolve) => {
      setState({ message, title, confirmText, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={handleCancel}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E6E8EC]">
              <h3 className="text-lg font-bold text-[#23262F]">{state.title}</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#6B7280] leading-relaxed">{state.message}</p>
            </div>
            <div className="px-5 py-4 border-t border-[#E6E8EC] flex items-center justify-end gap-3 bg-gray-50">
              <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-[#6B7280] hover:text-[#23262F] transition-colors rounded-lg hover:bg-gray-100">
                Batal
              </button>
              <button onClick={handleConfirm} className="px-4 py-2 text-sm font-semibold text-white bg-[#E02D3C] hover:bg-red-700 transition-colors rounded-lg">
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
