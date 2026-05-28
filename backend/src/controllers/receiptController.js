const supabase = require('../config/supabase');
const { randomUUID } = require('crypto');

exports.uploadReceipt = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No receipt image uploaded.' });
    }

    try {
        const fileName = `${Date.now()}_${randomUUID()}_${req.file.originalname}`;
        const storagePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('receipts').upload(storagePath, req.file.buffer, {
            contentType: req.file.mimetype,
            cacheControl: '3600',
            upsert: false,
        });

        if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            return res.status(500).json({ message: 'Gagal mengunggah foto struk ke Supabase storage.', error: uploadError.message });
        }

        const { data: publicUrlData, error: urlError } = supabase.storage.from('receipts').getPublicUrl(storagePath);
        if (urlError) {
            console.error('Supabase get public URL error:', urlError);
        }

        const publicUrl = publicUrlData?.publicUrl || null;

        const receiptRecord = {
            user_id: req.user?.id ? String(req.user.id) : null,
            organization_id: req.user?.organizationId ? String(req.user.organizationId) : null,
            file_name: req.file.originalname,
            storage_path: storagePath,
            public_url: publicUrl,
            size: req.file.size,
            content_type: req.file.mimetype,
        };

        const { error: insertError } = await supabase.from('receipts').insert([receiptRecord]);
        if (insertError) {
            console.error('Supabase receipts table insert error:', insertError);
            if (insertError.code !== 'PGRST205') {
                return res.status(500).json({
                    message: 'Gagal menyimpan metadata struk di Supabase.',
                    error: insertError.message,
                });
            }

            console.warn('Supabase receipts table tidak ditemukan. Upload storage berhasil tetapi metadata tidak disimpan.');
        }

        res.json({
            message: 'Foto struk berhasil diunggah.',
            receipt: {
                ...receiptRecord,
                public_url: publicUrl,
            },
        });
    } catch (err) {
        console.error('Error uploading receipt to Supabase:', err);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengunggah foto struk.' });
    }
};

exports.getReceipts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .eq('organization_id', String(req.user?.organizationId || ''))
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase get receipts error:', error);
            return res.status(500).json({ message: 'Gagal mengambil data struk.' });
        }

        res.json(data || []);
    } catch (err) {
        console.error('Error fetching receipts from Supabase:', err);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data struk.' });
    }
};
