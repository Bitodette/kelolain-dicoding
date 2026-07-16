import { XMarkIcon, ArrowUpOnSquareIcon, CameraIcon } from "@heroicons/react/24/outline";

export default function ScanPopup({
    isScanPopupOpen, selectedReceiptPreview, blurStatus, isExtracting, scanError,
    isCameraOpen, cameraVideoRef,
    onClose, onOpenCamera, onTriggerFileUpload, onCapturePhoto, onCloseCamera, onExtract, onRetry
}) {
    if (!isScanPopupOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-[#23262F]">Scan & Ekstrak Struk</h3>
                        <p className="text-sm text-[#6B7280] mt-1">Pilih foto atau ambil langsung, lalu cek ketajaman sebelum ekstraksi.</p>
                    </div>
                    <button onClick={onClose} className="text-[#8B95A7] hover:text-[#E02D3C] transition-colors">
                        <XMarkIcon className="w-6 h-6 stroke-[2]" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {!selectedReceiptPreview ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <button onClick={onOpenCamera} className="btn btn-secondary px-4 py-3 text-sm flex items-center justify-center gap-2">
                                <CameraIcon className="w-4 h-4" />
                                Ambil Foto
                            </button>
                            <button onClick={onTriggerFileUpload} className="btn btn-primary px-4 py-3 text-sm flex items-center justify-center gap-2">
                                <ArrowUpOnSquareIcon className="w-4 h-4" />
                                Upload Foto
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative rounded-2xl border border-[#E6E8EC] bg-slate-50 max-h-[55vh] overflow-y-auto">
                                <img src={selectedReceiptPreview} alt="Preview Struk" className="w-full h-auto" />
                                <div className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${blurStatus === 'sharp' ? 'bg-emerald-100 text-emerald-700' : blurStatus === 'blurry' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {blurStatus === 'checking' ? 'Memeriksa...' : blurStatus === 'sharp' ? 'Tajam' : blurStatus === 'blurry' ? 'Buram' : 'Tidak diketahui'}
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button onClick={onRetry} className="btn btn-secondary px-4 py-3 text-sm">
                                    Coba Lagi
                                </button>
                                <button
                                    onClick={onExtract}
                                    disabled={!selectedReceiptPreview || blurStatus === 'blurry' || blurStatus === 'checking' || isExtracting}
                                    className="btn btn-primary px-4 py-3 text-sm flex items-center justify-center gap-2"
                                >
                                    {isExtracting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Ekstrak...
                                        </>
                                    ) : (
                                        'Ekstrak Struk'
                                    )}
                                </button>
                            </div>

                            {blurStatus === 'blurry' && (
                                <p className="text-sm text-amber-700">Foto struk tampak buram. Silakan ambil ulang atau upload ulang dengan pencahayaan lebih baik.</p>
                            )}
                        </div>
                    )}

                    {scanError && (
                        <p className="text-sm text-red-600">{scanError}</p>
                    )}

                    {isCameraOpen && (
                        <div className="space-y-3">
                            <video ref={cameraVideoRef} className="w-full h-72 rounded-2xl bg-black object-cover" autoPlay playsInline muted />
                            <div className="flex gap-3">
                                <button onClick={onCapturePhoto} className="btn btn-primary px-4 py-3 text-sm flex-1">Ambil Foto</button>
                                <button onClick={onCloseCamera} className="btn btn-secondary px-4 py-3 text-sm flex-1">Batal</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
