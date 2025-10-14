import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { loadCatalogCache, saveCatalogCache, bucketForProduct } from "../../utils/catalogCache";

const AccessoriesCatalog = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);
  const CACHE_KEY = 'accessories';
  const __initialCache = loadCatalogCache(CACHE_KEY);
  const [products, setProducts] = useState(() => __initialCache?.products || []);
    const [filteredProducts, setFilteredProducts] = useState(() => __initialCache?.products || []);
    const [productTypeFilter, setProductTypeFilter] = useState([]);
    const [allProductTypes, setAllProductTypes] = useState([]);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectAll, setSelectAll] = useState(false);
  const [sortOption, setSortOption] = useState("relevance");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef(null);
    const [session, setSession] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => __initialCache?.favoriteIds || []);
    const navigate = useNavigate();

    useEffect(() => {
      // Get current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });
      // Listen for auth changes
      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });
      return () => {
        // Fix: listener is not an object with unsubscribe, it's a subscription object with .subscription
        if (listener && typeof listener.subscription?.unsubscribe === 'function') {
          listener.subscription.unsubscribe();
        }
      };
    }, []);

    useEffect(() => {
      let isMounted = true;
      const fetchFresh = async () => {
        const fresh = await fetchProducts();
        if (isMounted && fresh) {
          setProducts(fresh);
          setFilteredProducts(fresh);
          saveCatalogCache(CACHE_KEY, { products: fresh, favoriteIds });
        }
      };
      fetchFresh();
      return () => { isMounted = false; };
    }, []);
  
    useEffect(() => {
      // Only run fetchProductTypes after products are loaded
      if (products.length > 0) {
        fetchProductTypes();
      }
    }, [products]);
  
    useEffect(() => {
      filterByProductTypeOnly();
    }, [products, productTypeFilter, selectAll]);
  
    useEffect(() => {
      const fetchFavorites = async () => {
        if (!session) {
          setFavoriteIds([]);
          saveCatalogCache(CACHE_KEY, { products, favoriteIds: [] });
          return;
        }
        const { data: favs } = await supabase
          .from('favorites')
          .select('product_id')
          .eq('user_id', session.user.id);
        const ids = favs ? favs.map(fav => fav.product_id) : [];
        setFavoriteIds(ids);
        saveCatalogCache(CACHE_KEY, { products, favoriteIds: ids });
      };
      fetchFavorites();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, products.length]);
  
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, starting_price, image_url, route, product_types(id, name, category_id, product_categories(id, name))"
        );

      if (error) {
        console.error("Error fetching products:", error);
        return null;
      } else {
        // Only show products whose type's category is 'Accessories & Decorations'
        const accessoriesProducts = (data || []).filter(product =>
          product?.product_types?.product_categories?.name === 'Accessories & Decorations'
        );
        // Resolve a single public URL without per-render storage checks
        const resolved = accessoriesProducts.map(p => {
          const bucket = bucketForProduct(p);
          let publicUrl = "/apparel-images/caps.png";
          if (p.image_url) {
            const { data: pub } = supabase.storage.from(bucket).getPublicUrl(p.image_url);
            if (pub && pub.publicUrl && !pub.publicUrl.endsWith('/')) publicUrl = pub.publicUrl;
            else publicUrl = p.image_url;
          }
          return { ...p, resolved_image_url: publicUrl };
        });
        return resolved;
      }
    };
  
    const fetchProductTypes = async () => {
      // Only show product types present in Accessories products
      const typesInAccessories = new Set();
      products.forEach(product => {
        if (product.product_types?.id && product.product_types?.name) {
          typesInAccessories.add(JSON.stringify({ id: product.product_types.id, name: product.product_types.name }));
        }
      });
      const filteredTypes = Array.from(typesInAccessories).map(str => JSON.parse(str));
      setAllProductTypes(filteredTypes);
    };
  
    const handleProductTypeChange = (event, typeId) => {
      const { checked } = event.target;
      setSelectAll(false);
      setProductTypeFilter(prev =>
        checked ? [...prev, typeId] : prev.filter(id => id !== typeId)
      );
    };
  
    const handleSelectAllChange = () => {
      setSelectAll(prev => !prev);
      setProductTypeFilter([]);
    };
  
    const handlePriceChange = (event) => {
      const { name, value } = event.target;
      setPriceRange(prev => ({ ...prev, [name]: value }));
    };
  
    const filterByProductTypeOnly = () => {
      let temp = [...products];
      if (!selectAll && productTypeFilter.length > 0) {
        temp = temp.filter(product =>
          productTypeFilter.includes(product.product_types?.id)
        );
      }
      setFilteredProducts(temp);
      setSortOption("relevance"); // Reset sort on filter change
    };
  
    const applyFilters = () => {
      let temp = [...products];
  
      if (!selectAll && productTypeFilter.length > 0) {
        temp = temp.filter(product =>
          productTypeFilter.includes(product.product_types?.id)
        );
      }
  
      if (priceRange.min) {
        temp = temp.filter(product => product.starting_price >= parseFloat(priceRange.min));
      }
  
      if (priceRange.max) {
        temp = temp.filter(product => product.starting_price <= parseFloat(priceRange.max));
      }
  
      setFilteredProducts(temp);
      setSortOption("relevance"); // Reset sort when applying price filter
    };
  
    const applySort = (sortValue) => {
      setSortOption(sortValue);
      let sorted = [...filteredProducts];

      if (sortValue === "lowToHigh") {
        sorted.sort((a, b) => a.starting_price - b.starting_price);
      } else if (sortValue === "highToLow") {
        sorted.sort((a, b) => b.starting_price - a.starting_price);
      } else if (sortValue === "newest") {
        const dateOf = (p) => new Date(p.created_at || p.createdAt || 0).getTime();
        const idFallback = (p) => String(p.id || '').toString();
        sorted.sort((a, b) => (dateOf(b) - dateOf(a)) || idFallback(b).localeCompare(idFallback(a)));
      } else if (sortValue === "bestSelling") {
        const sold = (p) => Number(p.sold_count ?? p.sales ?? p.total_sold ?? 0);
        sorted.sort((a, b) => sold(b) - sold(a));
      } else if (sortValue === "nameAZ") {
        sorted.sort((a, b) => a.name?.toLowerCase().localeCompare(b.name?.toLowerCase()));
      } else if (sortValue === "nameZA") {
        sorted.sort((a, b) => b.name?.toLowerCase().localeCompare(a.name?.toLowerCase()));
      }

      setFilteredProducts(sorted);
    };

    // Keep backward compatibility if something calls the old handler
    const handleSortChange = (e) => {
      const sortValue = e.target.value;
      applySort(sortValue);
    };

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
  
    // Hamburger menu state for mobile 
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

    // Scroll to top when filter drawer closes (for mobile UX)
    useEffect(() => {
      if (!filterDrawerOpen) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }, [filterDrawerOpen]);
  
    return (
      <div className="w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[165px] landing-page-container z-0">
        {/* Hero Banner */}
        <div className="flex laptop:h-[425px] phone:h-[210px] flex-col items-center justify-center z-5 bg-[url('/images/accessories-banner.png')] bg-cover bg-center">
          <p className="text-white"><a className="hover:underline hover:text-white text-white" href="/Homepage">Home</a> /</p>
          <h1 className="text-white font-bold">Accessories & Decorations</h1>
        </div>
  
        {/* Main Content */}
        <div className="w-full bg-white laptop:p-[100px] laptop:pt-10">
          <div className="flex flex-col gap-8 phone:flex-col tablet:flex-row laptop:flex-row">
            
            {/* Hamburger menu for filters on mobile */}
          <div className="tablet:hidden laptop:hidden w-full flex justify-end mb-4 phone:mt-4">
            <button
              className="bg-white  rounded-md p-2 flex items-center gap-2 mr-4"
              onClick={() => setFilterDrawerOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-black ">Filters</span>
            </button>
          </div>
  
            {/* Filters Section - drawer on mobile only, not rendered unless open */}
            {filterDrawerOpen && (
              <div className="fixed top-0 pt-[250px] left-0 w-full h-full overflow-auto z-50 bg-white border border-gray-800 rounded-md p-6" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-black">Filters</h2>
                  <button
                    className="text-black text-2xl bg-white font-bold"
                    onClick={() => setFilterDrawerOpen(false)}
                    aria-label="Close filter drawer"
                  >
                    &times;
                  </button>
                </div>
                {/* ...existing filter controls... */}
                <h2 className="text-xl font-bold mb-4 text-black">Product Type</h2>
                <div className="space-y-2">
                  <div className="flex items-center bg-white space-x-2">
                    <input
                      type="checkbox"
                      id="type-all"
                      checked={selectAll}
                      onChange={handleSelectAllChange}
                      className="mr-2 bg-white"
                      style={{ backgroundColor: 'white' }}
                    />
                    <label htmlFor="type-all" className="capitalize text-black">All</label>
                  </div>
  
                  {allProductTypes.map(type => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`type-${type.id}`}
                        name={`type-${type.id}`}
                        checked={productTypeFilter.includes(type.id)}
                        onChange={(e) => handleProductTypeChange(e, type.id)}
                        className="mr-2 bg-white "
                        style={{ backgroundColor: 'white' }}
                      />
                    <label htmlFor={`type-${type.id}`} className="capitalize text-black">
                      {type.name || `Type ${type.id}`}
                    </label>
                    </div>
                  ))}
                </div>
  
                <h2 className="text-xl font-bold mt-8 mb-4 text-black">Starting Price</h2>
                <p className="text-black">Price Range</p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="number"
                    name="min"
                    value={priceRange.min}
                    onChange={handlePriceChange}
                    className="w-full border border-gray-400 rounded p-2 bg-white"
                    style={{ backgroundColor: 'white', color: 'black' }}
                  />
                  <span className="text-black">to</span>
                  <input
                    type="number"
                    name="max"
                    value={priceRange.max}
                    onChange={handlePriceChange}
                    className="w-full border border-gray-400 rounded p-2 bg-white"
                    style={{ backgroundColor: 'white', color: 'black' }}
                  />
                </div>
  
                <button
                  onClick={() => {
                    applyFilters();
                    setFilterDrawerOpen(false);
                  }}
                  className="w-full hover:bg-[#FF8C69] bg-[#FFA07A] border border-black text-black rounded p-2 mt-2"
                >
                  Apply
                </button>
  
  
                <button
                  type="button"
                  className="w-full border border-gray-400 rounded p-2 mt-2 bg-white text-black"
                  onClick={() => {
                    setProductTypeFilter([]);
                    setSelectAll(false);
                    setPriceRange({ min: '', max: '' });
                    setFilteredProducts(products);
                    setSortOption('relevance');
                  }}
                >
                  <span className="text-black">Clear</span>
                </button>
                
              </div>
            )}
  
            {/* Filters Section - visible on tablet/laptop only */}
            <div className="hidden tablet:block laptop:block w-full tablet:w-[280px] tablet:min-w-[220px] tablet:max-w-[320px] border border-gray-800 rounded-md p-6 h-fit mb-8 tablet:mb-0">
              <h2 className="text-xl font-bold mb-4 text-black">Product Type</h2>
              <div className="space-y-2">
                <div className="flex items-center bg-white space-x-2">
                  <input
                    type="checkbox"
                    id="type-all"
                    checked={selectAll}
                    onChange={handleSelectAllChange}
                    className="mr-2 bg-white"
                    style={{ accentColor: '#2B4269', backgroundColor: 'white', border: '1px solid black', width: '18px', height: '18px', borderRadius: '4px' }}
                  />
                  <label htmlFor="type-all" className="capitalize text-black">All</label>
                </div>
  
                {allProductTypes.map(type => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`type-${type.id}`}
                      name={`type-${type.id}`}
                      checked={productTypeFilter.includes(type.id)}
                      onChange={(e) => handleProductTypeChange(e, type.id)}
                      className="mr-2 bg-white "
                      style={{ accentColor: '#2B4269', backgroundColor: 'white', border: '1px solid black', width: '18px', height: '18px', borderRadius: '4px' }}
                    />
                  <label htmlFor={`type-${type.id}`} className="capitalize text-black">
                    {type.name || `Type ${type.id}`}
                  </label>
                  </div>
                ))}
              </div>
  
              <h2 className="text-xl font-bold mt-8 mb-4 text-black">Starting Price</h2>
              <p className="text-black">Price Range</p>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number"
                  name="min"
                  value={priceRange.min}
                  onChange={handlePriceChange}
                className="w-full border border-gray-400 rounded p-2 bg-white"
                style={{ backgroundColor: 'white', color: 'black' }}
                />
                <span className="text-black">to</span>
                <input
                  type="number"
                  name="max"
                  value={priceRange.max}
                  onChange={handlePriceChange}
                className="w-full border border-gray-400 rounded p-2 bg-white"
                style={{ backgroundColor: 'white', color: 'black' }}
                />
              </div>
  
              <button
                onClick={applyFilters}
                className="w-full hover:bg-[#FF8C69] bg-[#FFA07A] border border-black text-black rounded p-2 mt-2"
              >
                Apply
              </button>
            </div>
  
            {/* Products Grid */}
            <div className="flex-1">
              <div className="flex flex-col tablet:flex-row laptop:flex-row justify-between items-center mb-4 gap-4 tablet:gap-0">
                <p className="font-semibold">{filteredProducts.length} Products</p>
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    className="border border-gray-800 w-[215px] bg-white text-black font-dm-sans rounded-md px-3 py-2 inline-flex items-center gap-2"
                    onClick={() => setIsSortOpen(v => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={isSortOpen}
                  >
                    {({
                      relevance: 'Sort by Relevance',
                      newest: 'Newest First',
                      lowToHigh: 'Price: Low to High',
                      highToLow: 'Price: High to Low',
                      bestSelling: 'Best Selling',
                      nameAZ: 'Name: A to Z',
                      nameZA: 'Name: Z to A'
                    })[sortOption] || 'Sort by Relevance'}
                    <img
                      src={isSortOpen ? '/logo-icon/arrow-up.svg' : '/logo-icon/arrow-down.svg'}
                      alt=""
                      className="ml-[30px] w-4 h-4"
                      onError={(e) => {
                        try { e.currentTarget.replaceWith(document.createTextNode(isSortOpen ? '▲' : '▼')); } catch {}
                      }}
                    />
                  </button>
                  {isSortOpen && (
                    <div className="absolute right-0 mt-2 w-[215px] border border-gray-800 bg-white rounded-md shadow z-20">
                      <ul className="py-1 text-black" role="listbox">
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('relevance'); setIsSortOpen(false); }}>Sort by Relevance</button>
                        </li>
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('newest'); setIsSortOpen(false); }}>Newest First</button>
                        </li>
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('lowToHigh'); setIsSortOpen(false); }}>Price: Low to High</button>
                        </li>
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('highToLow'); setIsSortOpen(false); }}>Price: High to Low</button>
                        </li>
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('bestSelling'); setIsSortOpen(false); }}>Best Selling</button>
                        </li>
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('nameAZ'); setIsSortOpen(false); }}>Name: A to Z</button>
                        </li>
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('nameZA'); setIsSortOpen(false); }}>Name: Z to A</button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 phone:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 semi-bigscreen:grid-cols-4 biggest:grid-cols-5 gap-6 mb-10 mt-10">
                {filteredProducts.map((product) => {
                  const isFavorite = favoriteIds.includes(product.id);
                  const imageUrl = product.resolved_image_url || "/apparel-images/caps.png";
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
                          onError={e => { e.target.src = "/apparel-images/caps.png"; }}
                          onClick={() => {
                            // Allow unauthenticated users to view product pages.
                            const route = product.route || product.routes;
                            if (route) navigate(route);
                            else {
                              const slugify = (str='') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
                              const slug = slugify(product.name || product.id);
                              navigate(`/p/${slug}`);
                            }
                          }}
                        />
                        <button
                          className="absolute bottom-3 right-5 bg-white p-1.5 rounded-full shadow-md"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!session) {
                              navigate('/signin');
                              return;
                            }
                            if (isFavorite) {
                              // Remove from favorites
                              await supabase
                                .from('favorites')
                                .delete()
                                .eq('user_id', session.user.id)
                                .eq('product_id', product.id);
                              setFavoriteIds(ids => ids.filter(id => id !== product.id));
                              saveCatalogCache(CACHE_KEY, { products, favoriteIds: favoriteIds.filter(id => id !== product.id) });
                            } else {
                              // Add to favorites
                              await supabase
                                .from('favorites')
                                .insert({ user_id: session.user.id, product_id: product.id });
                              setFavoriteIds(ids => {
                                const next = [...ids, product.id];
                                saveCatalogCache(CACHE_KEY, { products, favoriteIds: next });
                                return next;
                              });
                            }
                          }}
                          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isFavorite ? 'text-red-600 fill-red-600' : 'text-gray-700'}`} fill={isFavorite ? 'red' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                      <h3
                        className="font-semibold mt-2 text-black text-center tablet:text-center semibig:text-center laptop:text-center cursor-pointer"
                        onClick={() => {
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
                      <p className="text-gray-500 font-dm-sans">from ₱{product.starting_price.toFixed(2)}</p>
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

export default AccessoriesCatalog;
