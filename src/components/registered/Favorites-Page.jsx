import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { loadCatalogCache, saveCatalogCache, bucketForProduct } from "../../utils/catalogCache";

const FavoritesPage = () => {
    const [favorites, setFavorites] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [session, setSession] = React.useState(null);
    const [productCategories, setProductCategories] = React.useState([]);
    const navigate = useNavigate();

    React.useEffect(() => {
        let isMounted = true;
        const run = async () => {
            setLoading(true);
            // Get current session and user
            const { data: { session } } = await supabase.auth.getSession();
            if (!isMounted) return;
            setSession(session);
            const user = session?.user;
            if (!user) {
                setFavorites([]);
                setLoading(false);
                return;
            }

            // 1) Show cached favorites instantly (if any)
            const key = `favorites:${user.id}`;
            const cached = loadCatalogCache(key);
            if (cached && cached.favorites && Array.isArray(cached.favorites)) {
                setFavorites(cached.favorites);
                setLoading(false);
            }

            // 2) Fetch fresh in background
            const { data: favs, error } = await supabase
                .from("favorites")
                .select("product_id")
                .eq("user_id", user.id);

            if (error || !favs || favs.length === 0) {
                if (!cached) setFavorites([]);
                setLoading(false);
                saveCatalogCache(key, { favorites: [] });
                return;
            }

            const productIds = favs.map(fav => fav.product_id);
            if (productIds.length === 0) {
                if (!cached) setFavorites([]);
                setLoading(false);
                saveCatalogCache(key, { favorites: [] });
                return;
            }

            const { data: products } = await supabase
                .from("products")
                .select("id, name, starting_price, image_url, route, product_types(id, name, category_id, product_categories(id, name))")
                .in("id", productIds);

            const withResolved = (products || []).map(p => {
                const bucket = bucketForProduct(p);
                let publicUrl = "/logo-icon/logo.png";
                if (p.image_url) {
                    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(p.image_url);
                    if (pub && pub.publicUrl && !pub.publicUrl.endsWith('/')) publicUrl = pub.publicUrl; else publicUrl = p.image_url;
                }
                return { ...p, resolved_image_url: publicUrl };
            });

            // Keep original order of favorites
            const orderMap = new Map(productIds.map((id, i) => [id, i]));
            withResolved.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

            setFavorites(withResolved);
            setLoading(false);
            saveCatalogCache(key, { favorites: withResolved });
        };

        run();
        // fetch categories for building routes
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('product_categories').select('*');
            if (error) {
                console.error('Error fetching product_categories:', error);
                return;
            }
            setProductCategories(data || []);
        };
        fetchCategories();
        return () => { isMounted = false; };
    }, []);

    const resolveProductRoute = (product) => {
        const candidate = product?.routes ?? product?.route ?? null;
        if (!candidate) {
            // build fallback from category and product name
            const slugify = (str = '') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const categoryId = product.product_types?.category_id || product.product_types?.product_categories?.id;
            const catFromTable = productCategories.find(c => c.id === categoryId)?.name;
            const categoryName = catFromTable || product.product_types?.product_categories?.name || product.product_types?.name || '';
            const categorySlug = slugify(categoryName || 'product');
            const productSlug = slugify(product.name || product.id);
            return `/${categorySlug}/${productSlug}`;
        }

        const normalize = (r) => {
            if (!r) return null;
            if (typeof r === 'string') return r.trim();
            if (Array.isArray(r)) {
                for (const item of r) {
                    if (typeof item === 'string') {
                        return item.trim();
                    }
                }
                return null;
            }
            if (typeof r === 'object') {
                if (typeof r.path === 'string') return r.path.trim();
                if (typeof r.url === 'string') return r.url.trim();
            }
            return null;
        };

        const raw = normalize(candidate);
        if (!raw) return null;
        if (raw.startsWith('/') || raw.includes('/')) return raw.startsWith('/') ? raw : `/${raw}`;

        // treat relative slug as routes column => build /{category}/{raw}
        const slugify = (str = '') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const categoryId = product.product_types?.category_id || product.product_types?.product_categories?.id;
        const catFromTable = productCategories.find(c => c.id === categoryId)?.name;
        const categoryName = catFromTable || product.product_types?.product_categories?.name || product.product_types?.name || '';
        const categorySlug = slugify(categoryName || 'product');
        const productSlug = slugify(raw);
        return `/${categorySlug}/${productSlug}`;
    };

    return (
        <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <div className="mt-10">
                <p className="text-[36px] font-bold text-black font-dm-sans">Favorites</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center font-dm-sans justify-center mt-[100px]">
                    <p className="text-gray-600 font-dm-sans font-semibold text-[20px]">Your Favorites is here...</p>
                </div>
            ) : favorites.length === 0 ? (
                <div className="flex flex-col items-center font-dm-sans justify-center mt-[100px]">
                    <p className="text-[20px] font-bold text-black">No favorites yet.</p>
                    <p className="text-black font-dm-sans">Click the heart icon on any product to save it to your favorites.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 phone:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 semi-bigscreen:grid-cols-4 biggest:grid-cols-5 gap-6 mb-10 mt-10">
                    {favorites.map(product => {
                        const imageUrl = product.resolved_image_url || "/logo-icon/logo.png";
                        return (
                            <div
                                key={product.id}
                                className="p-0 text-center group relative w-[230px] mx-auto"
                            >
                                <div className="relative w-[230px] h-48 mb-4 mx-auto overflow-hidden">
                                    <img
                                        src={imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-125 cursor-pointer"
                                        onError={e => { e.target.src = "/logo-icon/logo.png"; }}
                                                                                onClick={() => {
                                                                                    if (!session) {
                                                                                        navigate('/signin');
                                                                                        return;
                                                                                    }
                                                                                    const route = product.route || product.routes;
                                                                                    if (route) navigate(route);
                                                                                    else {
                                                                                        const slugify = (str='') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
                                                                                        const slug = slugify(product.name || product.id);
                                                                                        navigate(`/p/${slug}`);
                                                                                    }
                                                                                }}
                                    />
                                    {/* Heart icon: red by default, click to remove from favorites */}
                                    <button
                                        className="absolute bottom-3 right-5 bg-white p-1.5 rounded-full shadow-md"
                                        aria-label="Remove from favorites"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            // Instantly update UI (remove from local state)
                                            setFavorites(prev => {
                                                const next = prev.filter(fav => fav.id !== product.id);
                                                if (session?.user?.id) {
                                                    const key = `favorites:${session.user.id}`;
                                                    saveCatalogCache(key, { favorites: next });
                                                }
                                                return next;
                                            });
                                            // Remove from favorites in Supabase (background)
                                            const { data: { session } } = await supabase.auth.getSession();
                                            const user = session?.user;
                                            if (!user) return;
                                            await supabase
                                                .from('favorites')
                                                .delete()
                                                .eq('user_id', user.id)
                                                .eq('product_id', product.id);
                                            // No loading state, no refetch needed
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 fill-red-600" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </button>
                                </div>
                                <h3
                                    className="font-semibold mt-2 text-black text-center tablet:text-center semibig:text-center laptop:text-center cursor-pointer hover:underline"
                                                                        onClick={() => {
                                                                            if (!session) {
                                                                                navigate('/signin');
                                                                                return;
                                                                            }
                                                                            const route = product.route || product.routes;
                                                                            if (route) navigate(route);
                                                                            else {
                                                                                const slugify = (str='') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
                                                                                const slug = slugify(product.name || product.id);
                                                                                navigate(`/p/${slug}`);
                                                                            }
                                                                        }}
                                >
                                    {product.name}
                                </h3>
                                <p className="text-gray-500">from ₱{product.starting_price?.toFixed(2)}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default FavoritesPage;                                                                                                                                           