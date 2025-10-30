import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";

const SearchPage = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchTerm = queryParams.get("q") || "";

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productTypeFilter, setProductTypeFilter] = useState([]);
  const [allProductTypes, setAllProductTypes] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectAll, setSelectAll] = useState(false);
  const [sortOption, setSortOption] = useState("relevance");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef(null);
  const [session, setSession] = useState(null);
  const [productCategories, setProductCategories] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  // Hamburger menu state for mobile filter drawer
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const navigate = useNavigate();

  // Resolve the best route for a product using the product's `routes` or `route` column.
  // Supports several shapes: string (absolute path), array of strings, or object with a path property.
  const resolveProductRoute = (product) => {
    const candidate = product?.routes ?? product?.route ?? null;
    if (!candidate) return null;

    const normalize = (r) => {
      if (!r) return null;
      if (typeof r === 'string') return r.trim();
      if (Array.isArray(r)) {
        // return first absolute-looking entry
        for (const item of r) {
          if (typeof item === 'string' && (item.startsWith('/') || item.includes('/'))) return item.trim();
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

    // If raw already looks like an absolute or contains a category, return normalized
    if (raw.startsWith('/') || raw.includes('/')) {
      return raw.startsWith('/') ? raw : `/${raw}`;
    }

    // Otherwise treat raw as a relative slug (e.g. 'cap') and build /{categorySlug}/{raw}
    const slugify = (str = '') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const categoryId = product.product_types?.category_id || product.product_types?.product_categories?.id;
    const catFromTable = productCategories.find(c => c.id === categoryId)?.name;
    const categoryName = catFromTable || product.product_types?.product_categories?.name || product.product_types?.name || '';
    const categorySlug = slugify(categoryName || 'product');
    const productSlug = slugify(raw);
    return `/${categorySlug}/${productSlug}`;
  };

  useEffect(() => {
    fetchProducts();
  }, [searchTerm]);

  useEffect(() => {
    // fetch product categories for building category slugs
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('product_categories').select('*');
      if (error) {
        console.error('Error fetching product_categories:', error);
        return;
      }
      setProductCategories(data || []);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      fetchProductTypes();
    }
  }, [products]);

  useEffect(() => {
    filterByProductTypeOnly();
  }, [products, productTypeFilter, selectAll]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && session.user) {
        supabase
          .from('favorites')
          .select('product_id')
          .eq('user_id', session.user.id)
          .then(({ data }) => {
            setFavoriteIds(data ? data.map(fav => fav.product_id) : []);
          });
      } else {
        setFavoriteIds([]);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession && newSession.user) {
        supabase
          .from('favorites')
          .select('product_id')
          .eq('user_id', newSession.user.id)
          .then(({ data }) => {
            setFavoriteIds(data ? data.map(fav => fav.product_id) : []);
          });
      } else {
        setFavoriteIds([]);
      }
    });
    return () => {
      if (listener && typeof listener.subscription?.unsubscribe === 'function') {
        listener.subscription.unsubscribe();
      }
    };
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_types(id, name, category_id, product_categories(id, name))");

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      // Fuzzy search: match singular/plural and close spellings
      const term = searchTerm.toLowerCase();
      let altTerm = "";
      if (term.endsWith("s")) {
        altTerm = term.slice(0, -1);
      } else {
        altTerm = term + "s";
      }

      // Levenshtein distance function
      function levenshtein(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
          matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
          matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1,     // insertion
                matrix[i - 1][j] + 1      // deletion
              );
            }
          }
        }
        return matrix[b.length][a.length];
      }

      // Fuzzy match threshold (2 allows for minor typos)
      const threshold = 2;

      const searchResults = data.filter(product => {
        const name = product.name?.toLowerCase() || "";
        const desc = product.description?.toLowerCase() || "";
        // For short search terms (<=3 chars), only allow direct substring matches
        if (term.length <= 3) {
          return (
            name.includes(term) ||
            name.includes(altTerm) ||
            desc.includes(term) ||
            desc.includes(altTerm)
          );
        }
        // For longer terms, allow fuzzy matching
        if (
          name.includes(term) ||
          name.includes(altTerm) ||
          desc.includes(term) ||
          desc.includes(altTerm)
        ) return true;
        const words = (name + " " + desc).split(/\s+/);
        return words.some(word => {
          if (word.length <= 2) return false;
          return (levenshtein(word, term) <= threshold || levenshtein(word, altTerm) <= threshold);
        });
      });
      setProducts(searchResults);
      setFilteredProducts(searchResults);
    }
  };

  const fetchProductTypes = async () => {
    const typesInResults = new Set();
    products.forEach(product => {
      if (product.product_types?.id && product.product_types?.name) {
        typesInResults.add(JSON.stringify({ id: product.product_types.id, name: product.product_types.name }));
      }
    });
    const filteredTypes = Array.from(typesInResults).map(str => JSON.parse(str));
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
    setSortOption("relevance");
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
    setSortOption("relevance");
  };

  const handleSortChange = (e) => {
    // Redirect to unified applySort so dropdown and select behave the same
    const sortValue = e.target.value;
    applySort(sortValue);
  };

  const applySort = (sortValue) => {
    setSortOption(sortValue);

    // When user selects 'relevance' we want to restore the default ordering
    // (the original products order after applying active filters) instead
    // of sorting the already-sorted list. For other sort options, sort the
    // current filtered set as before.
    if (sortValue === 'relevance') {
      // Rebuild filteredProducts from the canonical `products` array using
      // current filter state so ordering returns to default relevance.
      let temp = [...products];
      if (!selectAll && productTypeFilter.length > 0) {
        temp = temp.filter(product => productTypeFilter.includes(product.product_types?.id));
      }
      if (priceRange.min) temp = temp.filter(product => product.starting_price >= parseFloat(priceRange.min));
      if (priceRange.max) temp = temp.filter(product => product.starting_price <= parseFloat(priceRange.max));
      setFilteredProducts(temp);
      return;
    }

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

  return (
    <div className="w-full bg-white pt-[250px] font-dm-sans">
      <div className="max-w-6xl mx-auto px-4 font-dm-sans">
        {/*Results confirmation*/}
        <div className="flex flex-col items-center justify-center laptop:mb-[80px] font-dm-sans">
          <h2 className="text-xl mb-2 text-black text-center font-dm-sans">Results for <span className="font-bold font-dm-sans">'{searchTerm}'</span></h2>
          <p className="text-gray-500 text-center font-dm-sans">Home / Search / "<span className="font-bold font-dm-sans">{searchTerm}</span>"</p>
        </div>
        {/* Divider line between results confirmation and products/filter */}
        <hr className="w-full border-t border-gray-300 mb-8 font-dm-sans" />
        {/*Logic if there is no product in that name*/}
        {filteredProducts.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-16 font-dm-sans">
            <h2 className="text-2xl font-bold text-[#181A2A] mb-4 font-dm-sans">We’re sorry! Your search did not match any products.</h2>
            <div className="text-lg text-[#181A2A] mb-2 font-dm-sans">Try:</div>
            <ul className="list-disc pl-6 text-[#181A2A] text-base font-dm-sans">
              <li className="font-dm-sans">Checking your spelling</li>
              <li className="font-dm-sans">Searching with different terms</li>
              <li className="font-dm-sans">Browsing the categories above</li>
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-8 phone:flex-col tablet:flex-row laptop:flex-row">
            {/* Hamburger menu for filters on mobile */}
            <div className="tablet:hidden laptop:hidden w-full flex justify-end mb-4 phone:mt-4">
              <button
                className="bg-white rounded-md p-2 flex items-center gap-2 mr-4"
                onClick={() => setFilterDrawerOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-black">Filters</span>
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
            <div className="hidden tablet:block laptop:block w-full tablet:w-[280px] tablet:min-w-[220px] tablet:max-w-[320px] border border-gray-300 rounded-md p-6 h-fit mb-8 tablet:mb-0 font-dm-sans">
              <h2 className="text-xl font-bold mb-4 text-black flex items-center justify-between font-dm-sans">Product Type
                <span className="text-lg font-dm-sans"></span>
              </h2>
              <div className="space-y-2 font-dm-sans">
                <div className="flex items-center space-x-2 font-dm-sans">
                  <input
                    type="checkbox"
                    id="type-all"
                    checked={selectAll}
                    onChange={handleSelectAllChange}
                    className="mr-2 font-dm-sans"
                  />
                  <label htmlFor="type-all" className="capitalize text-black font-dm-sans">All</label>
                </div>
                {allProductTypes.map(type => (
                  <div key={type.id} className="flex items-center space-x-2 font-dm-sans">
                    <input
                      type="checkbox"
                      id={`type-${type.id}`}
                      name={`type-${type.id}`}
                      checked={productTypeFilter.includes(type.id)}
                      onChange={(e) => handleProductTypeChange(e, type.id)}
                      className="mr-2 font-dm-sans"
                    />
                    <label htmlFor={`type-${type.id}`} className="capitalize text-black font-dm-sans">
                      {type.name || `Type ${type.id}`}
                    </label>
                  </div>
                ))}
              </div>
              <h2 className="text-xl font-bold mt-8 mb-4 text-black font-dm-sans">Starting Price</h2>
              <p className="text-black font-dm-sans">Price Range</p>
              <div className="flex items-center gap-2 mb-4 font-dm-sans">
                <input
                  type="number"
                  name="min"
                  value={priceRange.min}
                  onChange={handlePriceChange}
                  className="w-full border bg-white border-gray-400 rounded p-2 font-dm-sans"
                  style={{ backgroundColor: 'white', color: 'black' }}
                />
                <span className="text-black font-dm-sans">to</span>
                <input
                  type="number"
                  name="max"
                  value={priceRange.max}
                  onChange={handlePriceChange}
                  className="w-full border border-gray-400 bg-white rounded p-2 font-dm-sans"
                  style={{ backgroundColor: 'white', color: 'black' }}
                />
              </div>
              <button
                onClick={applyFilters}
                className="w-full hover:bg-[#FF8C69] bg-[#FFA07A] border border-black text-black rounded p-2 mt-2 font-dm-sans"
              >
                Apply
              </button>
            </div>
            {/* Products Grid */}
            <div className="flex-1 font-dm-sans">
              <div className="flex flex-col tablet:flex-row laptop:flex-row justify-between items-center mb-4 gap-4 tablet:gap-0 font-dm-sans">
                <p className="font-semibold font-dm-sans">{filteredProducts.length} Products Found</p>
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    className="relative border border-gray-800 w-[215px] bg-white text-black font-dm-sans rounded-md px-3 py-2 inline-flex items-center gap-2"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
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
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('lowToHigh'); setIsSortOpen(false); }}>Price: Low to High</button>
                        </li>
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('highToLow'); setIsSortOpen(false); }}>Price: High to Low</button>
                        </li>
                        
                        
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('nameAZ'); setIsSortOpen(false); }}>Name: A to Z </button>
                        </li>
                        <li>
                          <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { applySort('nameZA'); setIsSortOpen(false); }}>Name: Z to A</button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 phone:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 gap-8 font-dm-sans">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-0 text-center group relative font-dm-sans"
                  >
                    <div className="relative w-[230px] h-48 mb-4 mx-auto overflow-hidden flex items-center justify-center font-dm-sans group">
                      <img
                        src={(() => {
                          if (!product.image_url) return "/apparel-images/caps.png";
                          const categoryName = product.product_types?.product_categories?.name?.toLowerCase() || "";
                          if (categoryName.includes("apparel")) {
                            return supabase.storage.from('apparel-images').getPublicUrl(product.image_url).data.publicUrl;
                          } else if (categoryName.includes("accessories")) {
                            return supabase.storage.from('accessoriesdecorations-images').getPublicUrl(product.image_url).data.publicUrl;
                          } else if (categoryName.includes("signage") || categoryName.includes("poster")) {
                            return supabase.storage.from('signage-posters-images').getPublicUrl(product.image_url).data.publicUrl;
                          } else if (categoryName.includes("cards") || categoryName.includes("sticker")) {
                            return supabase.storage.from('cards-stickers-images').getPublicUrl(product.image_url).data.publicUrl;
                          } else if (categoryName.includes("packaging")) {
                            return supabase.storage.from('packaging-images').getPublicUrl(product.image_url).data.publicUrl;
                          } else if (categoryName.includes("3d print")) {
                            return supabase.storage.from('3d-prints-images').getPublicUrl(product.image_url).data.publicUrl;
                          } else {
                            return supabase.storage.from('apparel-images').getPublicUrl(product.image_url).data.publicUrl;
                          }
                        })()}
                        alt={product.name}
                       className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-125 cursor-pointer"
                        onError={e => { e.target.src = "/logo-icon/logo.png"; }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!session) { navigate('/signin'); return; }
                          const dbRoute = resolveProductRoute(product);
                          if (dbRoute) { navigate(dbRoute); return; }

                          const slugify = (str = '') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                          // Prefer category from product_categories table (fetched above)
                          const categoryId = product.product_types?.category_id || product.product_types?.product_categories?.id;
                          const catFromTable = productCategories.find(c => c.id === categoryId)?.name;
                          const categoryName = catFromTable || product.product_types?.product_categories?.name || product.product_types?.name || '';
                          const categorySlug = slugify(categoryName || 'product');
                          const productSlug = slugify(product.name || product.id);
                          navigate(`/${categorySlug}/${productSlug}`);
                        }}
                      />
                      <button
                        className="absolute bottom-3 right-5 bg-white p-1.5 rounded-full shadow-md font-dm-sans"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!session) {
                            navigate('/signin');
                            return;
                          }
                          const user = session.user;
                          if (!user) return;
                          if (favoriteIds.includes(product.id)) {
                            // Remove from favorites
                            await supabase
                              .from('favorites')
                              .delete()
                              .eq('user_id', user.id)
                              .eq('product_id', product.id);
                            setFavoriteIds(favoriteIds.filter(id => id !== product.id));
                          } else {
                            // Add to favorites
                            await supabase
                              .from('favorites')
                              .insert([
                                { user_id: user.id, product_id: product.id }
                              ]);
                            setFavoriteIds([...favoriteIds, product.id]);
                          }
                        }}
                        aria-label={favoriteIds.includes(product.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${favoriteIds.includes(product.id) ? 'text-red-600 fill-red-600' : 'text-gray-700'}`} fill={favoriteIds.includes(product.id) ? 'red' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                      </button>
                    </div>
                    <h3
                      className="font-semibold mt-2 text-black text-center font-dm-sans cursor-pointer "
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!session) { navigate('/signin'); return; }
                        const dbRoute = resolveProductRoute(product);
                        if (dbRoute) { navigate(dbRoute); return; }

                        const slugify = (str = '') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        const categoryId = product.product_types?.category_id || product.product_types?.product_categories?.id;
                        const catFromTable = productCategories.find(c => c.id === categoryId)?.name;
                        const categoryName = catFromTable || product.product_types?.product_categories?.name || product.product_types?.name || '';
                        const categorySlug = slugify(categoryName || 'product');
                        const productSlug = slugify(product.name || product.id);
                        navigate(`/${categorySlug}/${productSlug}`);
                      }}
                    >
                      {product.name}
                    </h3>
                    <p className="text-gray-500 font-dm-sans">from ₱{product.starting_price?.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Spacer before footer */}
      <div className="h-8 w-full font-dm-sans" />
    </div>
  );
};

export default SearchPage;
