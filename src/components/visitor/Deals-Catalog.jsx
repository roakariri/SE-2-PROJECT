import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import '../../checkboxes.css';
import { loadCatalogCache, saveCatalogCache, bucketForProduct } from '../../utils/catalogCache';

const DealsCatalog = () => {
    // Scroll top on mount
    useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, []);
    const navigate = useNavigate();

    // State: products to show (from deals), filters UI state reused from apparel
    const DEALS_KEY = 'deals:popular_pick';
    const __initialCache = loadCatalogCache(DEALS_KEY);
    const [dealsProducts, setDealsProducts] = useState(() => __initialCache?.products || []);
    const [allProductTypes, setAllProductTypes] = useState([]);
    const [productTypeFilter, setProductTypeFilter] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [sortOption, setSortOption] = useState('relevance');
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [session, setSession] = useState(null);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef(null);

    // Auth session + favorites
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
        return () => listener?.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const fetchFavs = async () => {
            if (!session) { setFavoriteIds([]); return; }
            const { data } = await supabase.from('favorites').select('product_id').eq('user_id', session.user.id);
            const ids = (data || []).map(r => r.product_id);
            setFavoriteIds(ids);
            // Keep cache in sync with latest favorites list for UX
            const cache = loadCatalogCache(DEALS_KEY) || { products: dealsProducts, favoriteIds: [] };
            saveCatalogCache(DEALS_KEY, { products: cache.products || dealsProducts, favoriteIds: ids });
        };
        fetchFavs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, dealsProducts.length, favoriteIds]);

    // Load deals rows and fetch their corresponding products (keep order by order_count desc)
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                // Background refresh: fetch deals rows for popular picks
                const { data: dealsRows, error: dealsErr } = await supabase
                    .from('deals')
                    .select('product_id, order_count, deal_type, created_at')
                    .eq('deal_type', 'popular_pick')
                    .order('order_count', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(3);
                if (dealsErr) {
                    console.warn('deals fetch failed', dealsErr);
                    if (!cancelled) setDealsProducts([]);
                    return;
                }

                const ids = (dealsRows || []).map(r => r.product_id).filter(Boolean);
                if (ids.length === 0) { if (!cancelled) { setDealsProducts([]); saveCatalogCache(DEALS_KEY, { products: [], favoriteIds }); } return; }

                // Fetch minimal product info
                const { data: prods, error: prodErr } = await supabase
                    .from('products')
                    .select("id, name, starting_price, image_url, route, product_types(id, name, category_id, product_categories(id, name))")
                    .in('id', ids);
                if (prodErr) {
                    console.warn('products fetch failed', prodErr);
                    if (!cancelled) setDealsProducts([]);
                    return;
                }

                // Preserve order as in dealsRows
                const orderMap = new Map((dealsRows || []).map((r, i) => [r.product_id, i]));
                const ordered = (prods || [])
                    .map(p => {
                        const bucket = bucketForProduct(p);
                        let publicUrl = '/logo-icon/logo.png';
                        if (p.image_url) {
                            const { data: pub } = supabase.storage.from(bucket).getPublicUrl(p.image_url);
                            if (pub && pub.publicUrl && !pub.publicUrl.endsWith('/')) publicUrl = pub.publicUrl; else publicUrl = p.image_url;
                        }
                        return { ...p, resolved_image_url: publicUrl };
                    })
                    .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

                if (!cancelled) {
                    setDealsProducts(ordered);
                    // Update filters list
                    const types = new Set();
                    (ordered || []).forEach(p => { if (p?.product_types?.id && p?.product_types?.name) { types.add(JSON.stringify({ id: p.product_types.id, name: p.product_types.name })); } });
                    setAllProductTypes(Array.from(types).map(s => JSON.parse(s)));
                    // Save to cache with current favorites
                    saveCatalogCache(DEALS_KEY, { products: ordered, favoriteIds });
                }
            } catch (e) {
                console.warn('Deals load failed', e);
            }
        };

        // On mount, if we had cache, we already initialized state from it.
        // Always refresh in background.
        run();
        return () => { cancelled = true; };
    }, []);

    // Filters behavior (reused from apparel), applied on top of dealsProducts
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    useEffect(() => { if (!filterDrawerOpen) window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [filterDrawerOpen]);

    const handleProductTypeChange = (event, typeId) => {
        const { checked } = event.target;
        setSelectAll(false);
        setProductTypeFilter(prev => checked ? [...prev, typeId] : prev.filter(id => id !== typeId));
    };
    const handleSelectAllChange = () => { setSelectAll(prev => !prev); setProductTypeFilter([]); };
    const handlePriceChange = (e) => { const { name, value } = e.target; setPriceRange(prev => ({ ...prev, [name]: value })); };

    const filteredProducts = useMemo(() => {
        let temp = [...dealsProducts];
        if (!selectAll && productTypeFilter.length > 0) {
            temp = temp.filter(p => productTypeFilter.includes(p.product_types?.id));
        }
        if (priceRange.min) temp = temp.filter(p => Number(p.starting_price || 0) >= parseFloat(priceRange.min));
        if (priceRange.max) temp = temp.filter(p => Number(p.starting_price || 0) <= parseFloat(priceRange.max));

        // Sort options
        const copy = [...temp];
        if (sortOption === 'lowToHigh') copy.sort((a,b) => (a.starting_price||0) - (b.starting_price||0));
        else if (sortOption === 'highToLow') copy.sort((a,b) => (b.starting_price||0) - (a.starting_price||0));
        else if (sortOption === 'nameAZ') copy.sort((a,b) => (a.name||'').localeCompare(b.name||''));
        else if (sortOption === 'nameZA') copy.sort((a,b) => (b.name||'').localeCompare(a.name||''));
    else if (sortOption === 'newest') copy.sort((a,b) => (b.created_at ? new Date(b.created_at) : b.id) - (a.created_at ? new Date(a.created_at) : a.id));
        // default relevance: keep rank order from deals
        return copy;
    }, [dealsProducts, productTypeFilter, selectAll, priceRange, sortOption]);

    const applyFilters = () => { /* no-op since useMemo responds to state */ setSortOption('relevance'); };
    const applySort = (value) => { setSortOption(value); };

    // Close custom sort dropdown on outside click
    useEffect(() => {
        const onDocClick = (e) => {
            if (isSortOpen && sortRef.current && !sortRef.current.contains(e.target)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [isSortOpen]);

    const publicImageUrl = (product) => product?.resolved_image_url || '/logo-icon/logo.png';

    // Navigate to product page similar to other catalogs: use route if present else slug fallback
    const goToProduct = (product) => {
        const route = product?.route || product?.routes;
        if (route) { navigate(route, { state: { productId: product?.id, product } }); return; }
        const slugify = (str = '') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const slug = slugify(product?.name || product?.id);
        navigate(`/p/${slug}`, { state: { productId: product?.id, product } });
    };

    return (
        <div className="w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[165px] landing-page-container z-0">
            {/* Hero Banner */}
            <div className="flex laptop:h-[425px] phone:h-[210px] flex-col items-center justify-center z-5 bg-[url('/images/deals-banner.png')] bg-cover bg-center">
                <p className="text-white"><a className="hover:underline hover:text-white text-white" href="/Homepage">Home</a> /</p>
                <h1 className="text-white font-bold">Deals</h1>
            </div>

            <div className="items-center justify-center max-w-[1200px] mx-auto w-full mt-10">
                <img src="/images/popular-picks-banner.png" alt="Deals Banner" className="w-[1198px] mt-10" />
            </div>

            {/* Main Content */}
            <div className="w-full bg-white laptop:p-[100px] laptop:pt-10">
                <div className="flex flex-col gap-8 phone:flex-col tablet:flex-row laptop:flex-row">
                    {/* Mobile filters trigger */}
                    <div className="tablet:hidden laptop:hidden w-full flex justify-end mb-4 phone:mt-4">
                        <button className="bg-white rounded-md p-2 flex items-center gap-2 mr-4" onClick={() => setFilterDrawerOpen(true)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <span className="text-black ">Filters</span>
                        </button>
                    </div>

                    {/* Drawer filters (mobile) */}
                    {filterDrawerOpen && (
                        <div className="fixed top-0 pt-[250px] left-0 w-full h-full overflow-auto z-50 bg-white border border-gray-800 rounded-md p-6" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-black">Filters</h2>
                                <button className="text-black text-2xl bg-white font-bold" onClick={() => setFilterDrawerOpen(false)} aria-label="Close filter drawer">&times;</button>
                            </div>

                            <h2 className="text-xl font-bold mb-4 text-black">Product Type</h2>
                            <div className="space-y-2">
                                <div className="flex items-center bg-white space-x-2">
                                    <input type="checkbox" id="type-all" checked={selectAll} onChange={handleSelectAllChange} className="mr-2 bg-white" style={{ backgroundColor: 'white', color: 'black' }} />
                                    <label htmlFor="type-all" className="capitalize text-black">All</label>
                                </div>
                                {allProductTypes.map(type => (
                                    <div key={type.id} className="flex items-center space-x-2">
                                        <input type="checkbox" id={`type-${type.id}`} checked={productTypeFilter.includes(type.id)} onChange={(e) => handleProductTypeChange(e, type.id)} className="mr-2 bg-white" style={{ backgroundColor: 'white', color: 'black' }} />
                                        <label htmlFor={`type-${type.id}`} className="capitalize text-black">{type.name || `Type ${type.id}`}</label>
                                    </div>
                                ))}
                            </div>

                            <h2 className="text-xl font-bold mt-8 mb-4 text-black">Starting Price</h2>
                            <p className="text-black">Price Range</p>
                            <div className="flex items-center gap-2 mb-4">
                                <input type="number" name="min" value={priceRange.min} onChange={handlePriceChange} className="w-full border text-black border-gray-400 rounded p-2 bg-white" style={{ backgroundColor: 'white', color: 'black' }} />
                                <span className="text-black">to</span>
                                <input type="number" name="max" value={priceRange.max} onChange={handlePriceChange} className="w-full border border-gray-400 text-black rounded p-2 bg-white" style={{ backgroundColor: 'white', color: 'black' }} />
                            </div>

                            <button onClick={() => { applyFilters(); setFilterDrawerOpen(false); }} className="w-full hover:bg-[#FF8C69] bg-[#FFA07A] border border-black text-black rounded p-2 mt-2">Apply</button>
                            <button type="button" className="w-full border border-gray-400 rounded p-2 mt-2 bg-white text-black" onClick={() => { setProductTypeFilter([]); setSelectAll(false); setPriceRange({ min: '', max: '' }); setSortOption('relevance'); }}>
                                <span className="text-black">Clear</span>
                            </button>
                        </div>
                    )}

                    {/* Desktop filters */}
                    <div className="hidden tablet:block laptop:block w-full tablet:w-[280px] tablet:min-w-[220px] tablet:max-w-[320px] border border-gray-800 rounded-md p-6 h-fit mb-8 tablet:mb-0">
                        <h2 className="text-xl font-bold mb-4 text-black">Product Type</h2>
                        <div className="space-y-2">
                            <div className="flex items-center bg-white space-x-2">
                                <input type="checkbox" id="type-all" checked={selectAll} onChange={handleSelectAllChange} className="mr-2 check-boxes" style={{ accentColor: '#2B4269', backgroundColor: 'white', border: '1px solid black', width: '18px', height: '18px', borderRadius: '4px' }} />
                                <label htmlFor="type-all" className="capitalize text-black">All</label>
                            </div>
                            {allProductTypes.map(type => (
                                <div key={type.id} className="flex items-center space-x-2">
                                    <input type="checkbox" id={`type-${type.id}`} checked={productTypeFilter.includes(type.id)} onChange={(e) => handleProductTypeChange(e, type.id)} className="mr-2 bg-blue" style={{ accentColor: '#2B4269', backgroundColor: 'white', border: '1px solid black', width: '18px', height: '18px', borderRadius: '4px' }} />
                                    <label htmlFor={`type-${type.id}`} className="capitalize text-black">{type.name || `Type ${type.id}`}</label>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-xl font-bold mt-8 mb-4 text-black">Starting Price</h2>
                        <p className="text-black">Price Range</p>
                        <div className="flex items-center gap-2 mb-4">
                            <input type="number" name="min" value={priceRange.min} onChange={handlePriceChange} className="w-full border border-gray-400 rounded p-2 bg-white" style={{ backgroundColor: 'white', color: 'black' }} />
                            <span className="text-black">to</span>
                            <input type="number" name="max" value={priceRange.max} onChange={handlePriceChange} className="w-full border border-gray-400 rounded p-2 bg-white" style={{ backgroundColor: 'white', color: 'black' }} />
                        </div>
                        <button onClick={applyFilters} className="w-full hover:bg-[#FF8C69] bg-[#FFA07A] border border-black text-black rounded p-2 mt-2">Apply</button>
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1">
                        <div className="flex flex-col tablet:flex-row laptop:flex-row justify-between items-center mb-4 gap-4 tablet:gap-0">
                            <p className="font-semibold">{filteredProducts.length} Products</p>
                            <div className="relative" ref={sortRef}>
                                <button type="button" className="border border-gray-800 w-[215px] bg-white text-black font-dm-sans rounded-md px-3 py-2 inline-flex items-center gap-2" onClick={() => setIsSortOpen(v => !v)} aria-haspopup="listbox" aria-expanded={isSortOpen}>
                                    {{ relevance: 'Sort by Relevance', newest: 'Newest First', lowToHigh: 'Price: Low to High', highToLow: 'Price: High to Low', bestSelling: 'Best Selling', nameAZ: 'Name: A to Z', nameZA: 'Name: Z to A' }[sortOption] || 'Sort by Relevance'}
                                    <img src={isSortOpen ? '/logo-icon/arrow-up.svg' : '/logo-icon/arrow-down.svg'} alt="" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" onError={(e) => { try { e.currentTarget.replaceWith(document.createTextNode(isSortOpen ? '▲' : '▼')); } catch (err) { void err; } }} />
                                </button>
                                {isSortOpen && (
                                    <div className="absolute right-0 mt-2 w-[215px] border border-gray-800 bg-white rounded-md shadow z-20">
                                        <ul className="py-1 text-black" role="listbox">
                                            <li><button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('relevance'); setIsSortOpen(false); }}>Sort by Relevance</button></li>
                                            
                                            <li><button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('lowToHigh'); setIsSortOpen(false); }}>Price: Low to High</button></li>
                                            <li><button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('highToLow'); setIsSortOpen(false); }}>Price: High to Low</button></li>
                                            
                                            <li><button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('nameAZ'); setIsSortOpen(false); }}>Name: A to Z</button></li>
                                            <li><button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('nameZA'); setIsSortOpen(false); }}>Name: Z to A</button></li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 phone:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 semi-bigscreen:grid-cols-4 biggest:grid-cols-5 gap-6 mb-10 mt-10">
                            {filteredProducts.map(product => {
                                const img = publicImageUrl(product);
                                return (
                                    <div key={product.id} className="p-0 text-center group relative w-[230px] mx-auto cursor-pointer" onClick={() => goToProduct(product)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') goToProduct(product); }}>
                                        <div className="relative w-[230px] h-48 mb-4 mx-auto overflow-hidden">
                                            <img src={img} alt={product.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-125" onError={(e) => { e.currentTarget.src = '/logo-icon/logo.png'; }} />
                                        </div>
                                        <h3 className="font-semibold mt-2 text-black text-center">{product.name}</h3>
                                        <p className="text-gray-500 font-dm-sans">from ₱{Number(product.starting_price || 0).toFixed(2)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DealsCatalog;