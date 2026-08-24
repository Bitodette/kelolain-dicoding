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

export default function useReceiptScanner({ products, onScanComplete }) {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

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
            const formData = new FormData();
            formData.append('receipt', file);
            const response = await axios.post(`${API_BASE}/api/ai/ocr/check-blur`, formData);
            const data = response.data;
            const prediction = data?.result || data?.prediction || JSON.stringify(data);
            const isBlurry = prediction.toLowerCase().includes('blur');
            setBlurStatus(isBlurry ? 'blurry' : prediction);
        } catch (err) {
            console.error('Gagal memeriksa ketajaman gambar:', err?.response?.data || err.message);
            setBlurStatus('unknown');
        }
    }, [selectedReceiptPreview]);

    const openCamera = useCallback(() => {
        cameraInputRef.current?.click();
    }, []);

    const closeCamera = useCallback(() => {}, []);

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
        cameraInputRef,
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
        handleExtractReceipt,
        closeScanPopup,
    };
}
