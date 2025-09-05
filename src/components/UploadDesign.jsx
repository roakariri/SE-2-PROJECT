import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function UploadDesign({ productId, session }) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadedFileMetas, setUploadedFileMetas] = useState([]);
    const [uploadedFilePaths, setUploadedFilePaths] = useState([]);
    const [uploadedPreviewUrls, setUploadedPreviewUrls] = useState([]);
    const [uploadError, setUploadError] = useState(null);

    const getCurrentUserId = async () => {
        if (session?.user?.id) return session.user.id;
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data?.user) return null;
            return data.user.id;
        } catch (err) {
            console.error('Error getting current user:', err);
            return null;
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploadError(null);

    const MAX_BYTES = 10 * 1024 * 1024;
    // only allow PNG, JPG/JPEG, SVG (include common svg mime fallbacks)
    const allowedMime = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/svg', 'text/xml'];

        const toUpload = [];
        for (const file of files) {
            if (file.size > MAX_BYTES) {
                setUploadError('File is too large');
                try { if (fileInputRef.current) fileInputRef.current.value = null; } catch (e) {}
                return;
            }
                // Some browsers may not provide a MIME type for certain files; check extension as fallback
                const ext = (file.name || '').toLowerCase().split('.').pop();
                const fileType = (file.type || '').toLowerCase();
                // treat as svg if the extension is svg or the reported type contains 'svg'
                const isSvg = ext === 'svg' || fileType.includes('svg');
                const isAllowed = allowedMime.includes(fileType) || ['png', 'jpg', 'jpeg'].includes(ext) || isSvg;
            if (!isAllowed) {
                setUploadError('File format not supported.');
                try { if (fileInputRef.current) fileInputRef.current.value = null; } catch (e) {}
                return;
            }
            toUpload.push(file);
        }

        setUploading(true);
        const uploadedFilesLocal = [];
        const uploadedMetasLocal = [];
        const uploadedPathsLocal = [];

        try {
            const userId = session?.user?.id ?? await getCurrentUserId();
            if (!userId) throw new Error('Not signed in');

            for (const file of toUpload) {
                const filePath = `${userId}/${Date.now()}_${file.name}`;
                const ext = (file.name || '').toLowerCase().split('.').pop();
                // Ensure we pass a proper contentType for SVGs and fallback to the file.type when available
                const contentType = file.type || (ext === 'svg' ? 'image/svg+xml' : undefined);
                const { data, error } = await supabase.storage.from('product-files').upload(filePath, file, { cacheControl: '3600', upsert: false, contentType });
                if (error) throw error;

                const { data: urlData } = supabase.storage.from('product-files').getPublicUrl(filePath);
                const publicUrl = urlData?.publicUrl;
                if (!publicUrl) throw new Error('Failed to get public URL');

                const { data: insertData, error: insertError } = await supabase
                    .from('uploaded_files')
                    .insert([{
                        user_id: userId,
                        product_id: productId ?? null,
                        file_name: file.name,
                        image_url: publicUrl,
                        file_type: file.type,
                        file_size: file.size,
                    }])
                    .select()
                    .single();
                if (insertError) {
                    await supabase.storage.from('product-files').remove([filePath]);
                    throw insertError;
                }
                // Normalize meta so downstream code can reference either meta.file_id or meta.id
                const normalized = { ...insertData, id: insertData.file_id ?? insertData.id };
                uploadedFilesLocal.push(file);
                uploadedMetasLocal.push(normalized);
                uploadedPathsLocal.push(filePath);
            }

            setUploadedFiles(prev => [...prev, ...uploadedFilesLocal]);
            setUploadedFileMetas(prev => [...prev, ...uploadedMetasLocal]);
            setUploadedFilePaths(prev => [...prev, ...uploadedPathsLocal]);
            setUploadError(null);
        } catch (err) {
            console.error('Upload error:', err);
            const raw = err?.message || String(err);
            // Map common storage/validation errors to user-friendly messages
            if (/mime type/i.test(raw) || /not supported/i.test(raw)) {
                setUploadError('File format not supported.');
            } else if (/size/i.test(raw) || /exceed/i.test(raw) || /too large/i.test(raw)) {
                setUploadError('File is too large');
            } else {
                setUploadError('Upload failed: ' + raw);
            }
        } finally {
            setUploading(false);
            try { if (fileInputRef.current) fileInputRef.current.value = null; } catch (e) {}
        }
    };

    const removeUploadedFileAt = async (index) => {
        const meta = uploadedFileMetas[index];
        const path = uploadedFilePaths[index];
        try {
            const userId = session?.user?.id ?? await getCurrentUserId();
            if (path) await supabase.storage.from('product-files').remove([path]);
            if (meta) {
                if (meta?.file_id || meta?.id) {
                    const fid = meta.file_id ?? meta.id;
                    await supabase.from('uploaded_files').delete().eq('file_id', fid);
                }
                else await supabase.from('uploaded_files').delete().match({ user_id: userId, file_name: meta.file_name });
            }
        } catch (err) {
            console.warn('Failed to fully remove uploaded file:', err);
        } finally {
            setUploadedFiles(prev => prev.filter((_, i) => i !== index));
            setUploadedFileMetas(prev => prev.filter((_, i) => i !== index));
            setUploadedFilePaths(prev => prev.filter((_, i) => i !== index));
            setUploadedPreviewUrls(prev => prev.filter((_, i) => i !== index));
        }
    };

    useEffect(() => {
        const urls = [];
        const objectUrls = [];
        uploadedFileMetas.forEach((m, i) => {
            if (m && m.image_url && typeof m.file_type === 'string' && m.file_type.startsWith('image/')) urls[i] = m.image_url;
            else if (uploadedFiles[i] && uploadedFiles[i].type && uploadedFiles[i].type.startsWith('image/')) {
                const o = URL.createObjectURL(uploadedFiles[i]); objectUrls.push(o); urls[i] = o;
            } else urls[i] = null;
        });
        for (let i = uploadedFileMetas.length; i < uploadedFiles.length; i++) {
            if (uploadedFiles[i] && uploadedFiles[i].type && uploadedFiles[i].type.startsWith('image/')) {
                const o = URL.createObjectURL(uploadedFiles[i]); objectUrls.push(o); urls[i] = o;
            } else urls[i] = null;
        }
        setUploadedPreviewUrls(urls);
        return () => { for (const o of objectUrls) if (o) URL.revokeObjectURL(o); };
    }, [uploadedFileMetas, uploadedFiles]);

    useEffect(() => {
        let isMounted = true;
        const fetchUploadedFiles = async () => {
            try {
                const userId = session?.user?.id ?? await getCurrentUserId();
                if (!userId) return;

                const { data, error } = await supabase
                    .from('uploaded_files')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('product_id', productId)
                    .order('uploaded_at', { ascending: false })
                    .limit(5);

                if (error) {
                    const fallback = await supabase.from('uploaded_files').select('*').eq('user_id', userId).eq('product_id', productId).limit(5);
                    if (fallback.error) return;
                    if (!isMounted) return;
                    if (Array.isArray(fallback.data) && fallback.data.length > 0) {
                        setUploadedFileMetas(fallback.data);
                        setUploadedFilePaths([]);
                    }
                    return;
                }

                if (!isMounted) return;
                if (Array.isArray(data) && data.length > 0) {
                    const normalizedData = data.map(r => ({ ...r, id: r.file_id ?? r.id }));
                    setUploadedFileMetas(normalizedData);
                    setUploadedFilePaths([]);
                }
            } catch (err) {
                console.warn('[UploadDesign] error fetching uploaded files:', err);
            }
        };
        fetchUploadedFiles();
        return () => { isMounted = false; };
    }, [session, productId]);

    return (
        <div className="flex items-center gap-4">
            {/* accept only PNG, JPG/JPEG, SVG (include .svg extension for better platform support) */}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,.svg" className="hidden" onChange={handleFileChange} multiple />
            <div className="flex items-center gap-4">
                <button type="button" className="bg-[#27496d] text-white px-4 py-2 rounded flex items-center gap-2 focus:outline-none focus:ring-0" onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={uploading} aria-busy={uploading}>
                    <img src="/logo-icon/upload.svg" alt="upload" className="h-4 w-4" />
                    <span>{uploading ? 'UPLOADING...' : 'UPLOAD FILE'}</span>
                </button>

                {uploadedPreviewUrls && uploadedPreviewUrls.length > 0 && (
                    <div className="flex gap-2">
                        {uploadedPreviewUrls.map((url, i) => (
                            <div key={i} className="relative">
                                <div className="border border-dashed rounded flex flex-row items-center justify-center gap-2 px-3 h-10" style={{ borderColor: '#d1d5db', minWidth: '160px' }}>
                                    <div className="w-6 h-6 flex items-center justify-center rounded bg-[#f7f7f7] overflow-hidden">
                                        {url ? <img src={url} alt={`uploaded preview ${i + 1}`} className="w-full h-full object-cover" /> : <img src="/logo-icon/image.svg" alt="file" className="w-4 h-4" />}
                                    </div>
                                    <div className="text-sm text-gray-600 italic text-center truncate" style={{ maxWidth: 120 }}>{(uploadedFileMetas[i] && uploadedFileMetas[i].file_name) || (uploadedFiles[i] && uploadedFiles[i].name) || 'file'}</div>
                                </div>
                                <button type="button" className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 border focus:outline-none focus:ring-0" onClick={() => removeUploadedFileAt(i)} aria-label="Remove uploaded file">
                                    <img src="/logo-icon/close.svg" alt="remove" className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {uploadError && <div className="text-sm text-red-600 italic ml-2">{uploadError}</div>}
            </div>
        </div>
    );
}
