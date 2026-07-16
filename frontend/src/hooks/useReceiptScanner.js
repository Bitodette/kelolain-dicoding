import { useState, useRef, useCallback } from "react";
import axios from "axios";
import { API_BASE } from '../utils/api';

function parseNumberFromText(text) {
    const normalized = String(text || '').trim();
    if (!normalized) return 0;

    const digits = normalized.replace(/[^0-9.,]/g, '');
    if (!digits) return 0;

    if (digits.includes(',') && digits.includes('.')) {
        const fixed = digits.replace(/\./g, '').replace(/,/g, '.');
        return Math.round(parseFloat(fixed) || 0);
    }

    if (digits.includes(',') && !digits.includes('.')) {
        return Math.round(parseFloat(digits.replace(/,/g, '.')) || 0);
    }

    if (digits.includes('.') && digits.split('.').pop().length === 3) {
        return parseInt(digits.replace(/\./g, ''), 10) || 0;
    }

    return Math.round(parseFloat(digits) || 0);
}

function normalizeOcrItems(responseData) {
    const rawItems = Array.isArray(responseData.items)
        ? responseData.items
        : Array.isArray(responseData.result)
            ? responseData.result
            : [];

    return rawItems.map((item) => {
        const name = item.name || item.item_name || item.product_name || item.description || '';
        const priceRaw = item.price || item.price_text || item.harga || item.harga_text || '';
        const quantityRaw = item.quantity || item.qty || item.quantity_text || item.qty_text || '';
        const parsedPrice = parseNumberFromText(priceRaw);
        const parsedQuantity = parseNumberFromText(quantityRaw);
        const unitPrice = parsedQuantity > 0 ? Math.round(parsedPrice / parsedQuantity) : parsedPrice;

        return {
            name,
            price: unitPrice,
            totalPrice: parsedPrice,
            rawPrice: priceRaw,
            quantity: parsedQuantity,
            rawQuantity: quantityRaw,
            raw: item,
        };
    });
}

function toGrayscale(pixels) {
    const gray = new Uint8ClampedArray(pixels.length / 4);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j += 1) {
        gray[j] = Math.round((pixels[i] * 0.299) + (pixels[i + 1] * 0.587) + (pixels[i + 2] * 0.114));
    }
    return gray;
}

function estimateSharpness(gray, width, height) {
    let sum = 0;
    let count = 0;
    const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];

    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const center = gray[y * width + x];
            let lap = 0;
            let k = 0;
            for (let ky = -1; ky <= 1; ky += 1) {
                for (let kx = -1; kx <= 1; kx += 1) {
                    const pixel = gray[(y + ky) * width + (x + kx)];
                    lap += pixel * kernel[k];
                    k += 1;
                }
            }
            sum += lap * lap;
            count += 1;
        }
    }

    return count > 0 ? sum / count : 0;
}

function checkImageSharpness(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const width = 240;
            const height = Math.round((img.height / img.width) * width);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error('Tidak dapat memproses gambar.'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const gray = toGrayscale(imageData.data);
            const sharpness = estimateSharpness(gray, width, height);
            URL.revokeObjectURL(url);
            resolve(sharpness);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Gagal memuat gambar.'));
        };
        img.src = url;
    });
}

export default function useReceiptScanner({ products, onScanComplete }) {
    const fileInputRef = useRef(null);
    const cameraVideoRef = useRef(null);

    const [cameraStream, setCameraStream] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isScanPopupOpen, setIsScanPopupOpen] = useState(false);
    const [selectedReceiptFile, setSelectedReceiptFile] = useState(null);
    const [selectedReceiptPreview, setSelectedReceiptPreview] = useState(null);
    const [blurStatus, setBlurStatus] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState(null);
    const [scannedItems, setScannedItems] = useState([]);
    const [isScanResultModalOpen, setIsScanResultModalOpen] = useState(false);

    const findMatchingProductId = useCallback((itemName) => {
        const normalizedItem = String(itemName || '').trim().toLowerCase();
        if (!normalizedItem) return null;

        const exact = products.find((product) => String(product.name || '').trim().toLowerCase() === normalizedItem);
        if (exact) return exact.id;

        return products.find((product) => {
            const normalizedProduct = String(product.name || '').trim().toLowerCase();
            return normalizedProduct.includes(normalizedItem) || normalizedItem.includes(normalizedProduct);
        })?.id || null;
    }, [products]);

    const uploadReceiptFile = useCallback(async (file) => {
        if (!file) return false;

        setIsScanning(true);
        setScanError(null);

        const formData = new FormData();
        formData.append('receipt', file);

        try {
            const response = await axios.post(`${API_BASE}/api/ai/ocr/scan`, formData);
            const items = normalizeOcrItems(response.data || {});

            if (items.length > 0) {
                setScannedItems(items.map(item => ({
                    ...item,
                    id: Math.random().toString(36).substr(2, 9),
                    linkedProductId: findMatchingProductId(item.name),
                    quantity: item.quantity || 0,
                })));
                setIsScanResultModalOpen(true);
                return true;
            }

            setScanError('Tidak ada item yang terdeteksi pada struk.');
            return false;
        } catch (err) {
            console.error("Gagal memindai struk:", err);
            setScanError(err.response?.data?.message || 'Gagal memindai struk. Coba lagi.');
            return false;
        } finally {
            setIsScanning(false);
        }
    }, [findMatchingProductId]);

    const handleReceiptFile = useCallback(async (file) => {
        if (selectedReceiptPreview) {
            URL.revokeObjectURL(selectedReceiptPreview);
        }
        setSelectedReceiptFile(file);
        setSelectedReceiptPreview(URL.createObjectURL(file));
        setBlurStatus('checking');
        setIsExtracting(false);
        setScanError(null);

        try {
            const sharpness = await checkImageSharpness(file);
            setBlurStatus(sharpness < 1000 ? 'blurry' : 'sharp');
        } catch (err) {
            console.error('Gagal memeriksa ketajaman gambar:', err);
            setBlurStatus('unknown');
        }
    }, [selectedReceiptPreview]);

    const openCamera = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setScanError('Browser Anda tidak mendukung akses kamera langsung. Silakan gunakan upload gambar.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (cameraVideoRef.current) {
                cameraVideoRef.current.srcObject = stream;
            }
            setCameraStream(stream);
            setIsCameraOpen(true);
        } catch (err) {
            console.error('Gagal membuka kamera:', err);
            setScanError('Tidak dapat mengakses kamera. Pastikan izin kamera diizinkan.');
        }
    }, []);

    const closeCamera = useCallback(() => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        setCameraStream(null);
        setIsCameraOpen(false);
    }, [cameraStream]);

    const captureCameraPhoto = useCallback(async () => {
        if (!cameraVideoRef.current) return;

        const video = cameraVideoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) {
            setScanError('Gagal mengambil gambar dari kamera.');
            return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (!blob) {
            setScanError('Gagal mengambil gambar dari kamera.');
            return;
        }

        const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
        closeCamera();
        await handleReceiptFile(file);
    }, [closeCamera, handleReceiptFile]);

    const handleScanClick = useCallback(() => {
        setIsScanPopupOpen(true);
        setScanError(null);
        setSelectedReceiptFile(null);
        setSelectedReceiptPreview(null);
        setBlurStatus(null);
        setIsExtracting(false);
    }, []);

    const handleFileSelect = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = null;
        await handleReceiptFile(file);
    }, [handleReceiptFile]);

    const triggerFileUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleExtractReceipt = useCallback(async () => {
        if (!selectedReceiptFile) return;
        setScanError(null);
        setIsExtracting(true);

        try {
            const success = await uploadReceiptFile(selectedReceiptFile);
            if (success) {
                setIsScanPopupOpen(false);
            }
        } catch (err) {
            console.error('Gagal mengekstrak struk:', err);
        } finally {
            setIsExtracting(false);
        }
    }, [selectedReceiptFile, uploadReceiptFile]);

    const closeScanPopup = useCallback(() => {
        if (selectedReceiptPreview) {
            URL.revokeObjectURL(selectedReceiptPreview);
        }
        setIsScanPopupOpen(false);
        setSelectedReceiptFile(null);
        setSelectedReceiptPreview(null);
        setBlurStatus(null);
        setIsExtracting(false);
        setScanError(null);
        closeCamera();
    }, [selectedReceiptPreview, closeCamera]);

    return {
        fileInputRef,
        cameraVideoRef,
        cameraStream,
        isCameraOpen,
        isScanPopupOpen,
        selectedReceiptFile,
        selectedReceiptPreview,
        blurStatus,
        isExtracting,
        isScanning,
        scanError,
        scannedItems,
        isScanResultModalOpen,
        setIsScanResultModalOpen,
        setScanError,
        handleScanClick,
        handleFileSelect,
        triggerFileUpload,
        openCamera,
        closeCamera,
        captureCameraPhoto,
        handleExtractReceipt,
        closeScanPopup,
    };
}
