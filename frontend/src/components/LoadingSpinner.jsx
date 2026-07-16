export default function LoadingSpinner({ fullScreen = false, text = "Memuat...", className = "" }) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-[3px] border-[#E5E7EB] border-t-[#2936C4] rounded-full animate-spin" />
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white ${className}`}>
        {spinner}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {spinner}
    </div>
  );
}
