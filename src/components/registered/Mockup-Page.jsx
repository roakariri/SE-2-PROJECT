import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { saveCatalogCache, loadCatalogCache, bucketForProduct } from "../../utils/catalogCache";

const MockupPage = () => {
    const [products, setProducts] = React.useState([]);
    const [favoriteIds, setFavoriteIds] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [session, setSession] = React.useState(null);
    const navigate = useNavigate();

        const CACHE_KEY = 'mockup-products';

        React.useEffect(() => {
                const run = async (opts = { silent: false }) => {
                if (!opts.silent) setLoading(true);
            // Session
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

                    // Fetch favorites and mockup product IDs in parallel
                            const [favsRes, mockRowsRes] = await Promise.all([
                        session?.user
                            ? supabase.from('favorites').select('product_id').eq('user_id', session.user.id)
                            : Promise.resolve({ data: [], error: null }),
                        supabase.from('mockup_products').select('product_id')
                    ]);

                    const favIds = (favsRes.data || []).map(f => f.product_id);
                    setFavoriteIds(favIds);

                    const rows = mockRowsRes.data || [];
                    if (!rows.length) { setProducts([]); if (!opts.silent) setLoading(false); return; }
                    const ids = Array.from(new Set(rows.map(r => r.product_id).filter(Boolean)));
                    if (!ids.length) { setProducts([]); if (!opts.silent) setLoading(false); return; }

                    // Fetch minimal product details with category join for fast bucket resolution
                            const { data: prods, error: prodErr } = await supabase
                        .from('products')
                        .select('id, name, starting_price, image_url, route, product_types(id, name, category_id, product_categories(id, name))')
                        .in('id', ids);
                    if (prodErr) { console.warn('products fetch failed', prodErr); setProducts([]); if (!opts.silent) setLoading(false); return; }

                    const withImages = (prods || []).map((p) => {
                        if (p?.image_url) {
                                    const bucket = bucketForProduct(p);
                            const { data } = supabase.storage.from(bucket).getPublicUrl(p.image_url);
                            return { ...p, resolved_image_url: data?.publicUrl || '/logo-icon/logo.png' };
                        }
                        return { ...p, resolved_image_url: '/logo-icon/logo.png' };
                    });

                    setProducts(withImages);
                            saveCatalogCache(CACHE_KEY, { products: withImages, favoriteIds: favIds });
                    if (!opts.silent) setLoading(false);
        };

                // Try cache first to avoid flicker on back navigation
                    const cached = loadCatalogCache(CACHE_KEY);
                if (cached && Array.isArray(cached.products)) {
                    setProducts(cached.products);
                    if (Array.isArray(cached.favoriteIds)) setFavoriteIds(cached.favoriteIds);
                    setLoading(false);
                    // Refresh in background
                    run({ silent: true });
                } else {
                    run();
                }
    }, []);

    const toggleFavorite = async (product) => {
        if (!session) { navigate('/signin'); return; }
        const isFav = favoriteIds.includes(product.id);
        if (isFav) {
            await supabase
                .from('favorites')
                .delete()
                .eq('user_id', session.user.id)
                .eq('product_id', product.id);
                        setFavoriteIds(ids => {
                            const next = ids.filter(id => id !== product.id);
                            saveCatalogCache(CACHE_KEY, { products, favoriteIds: next });
                            return next;
                        });
        } else {
            await supabase
                .from('favorites')
                .insert({ user_id: session.user.id, product_id: product.id });
                        setFavoriteIds(ids => {
                            const next = [...ids, product.id];
                            saveCatalogCache(CACHE_KEY, { products, favoriteIds: next });
                            return next;
                        });
        }
    };

    const goToProduct = (product) => {
        const route = product?.route || product?.routes;
        if (route) { navigate(route); return; }
        const slugify = (str='') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
        const slug = slugify(product?.name || product?.id);
        navigate(`/p/${slug}`);
    };

    return (
        <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <div className="mt-10">
                <p className="text-black font-bold text-[36px] font-dm-sans">Mockup Tool</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center font-dm-sans justify-center mt-[100px]">
                    <p className="text-gray-600 font-dm-sans font-semibold text-[20px]">Loading mockup-enabled products…</p>
                </div>
            ) : products.length === 0 ? (
                <div className="flex flex-col items-center font-dm-sans justify-center mt-[100px]">
                    <p className="text-[20px] font-bold text-black">No products available.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 phone:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 semi-bigscreen:grid-cols-4 biggest:grid-cols-5 gap-6 mb-10 mt-10">
                    {products.map(product => {
                        const imageUrl = product.resolved_image_url || '/logo-icon/logo.png';
                        const isFavorite = favoriteIds.includes(product.id);
                        return (
                            <div key={product.id} className="p-0 text-center group relative w-[230px] mx-auto">
                                <div className="relative w-[230px] h-48 mb-4 mx-auto overflow-hidden">
                                    <img
                                        src={imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-125 cursor-pointer"
                                        onError={e => { e.currentTarget.src = '/logo-icon/logo.png'; }}
                                        onClick={() => goToProduct(product)}
                                    />
                                    <button
                                        className="absolute bottom-3 right-5 bg-white p-1.5 rounded-full shadow-md"
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}
                                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isFavorite ? 'text-red-600 fill-red-600' : 'text-gray-700'}`} fill={isFavorite ? 'red' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </button>
                                </div>
                                <h3
                                    className="font-semibold mt-2 text-black text-center cursor-pointer hover:underline"
                                    onClick={() => goToProduct(product)}
                                >
                                    {product.name}
                                </h3>
                                <p className="text-gray-500">from ₱{Number(product.starting_price || 0).toFixed(2)}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MockupPage;