import React, { useEffect, useState } from "react";
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
  const [session, setSession] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, [searchTerm]);

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
    const sortValue = e.target.value;
    setSortOption(sortValue);
    let sorted = [...filteredProducts];

    if (sortValue === "lowToHigh") {
      sorted.sort((a, b) => a.starting_price - b.starting_price);
    } else if (sortValue === "highToLow") {
      sorted.sort((a, b) => b.starting_price - a.starting_price);
    } else if (sortValue === "nameAZ") {
      sorted.sort((a, b) => a.name?.toLowerCase().localeCompare(b.name?.toLowerCase()));
    } else if (sortValue === "nameZA") {
      sorted.sort((a, b) => b.name?.toLowerCase().localeCompare(a.name?.toLowerCase()));
    }

    setFilteredProducts(sorted);
  };

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
          <div className="flex flex-col tablet:flex-row laptop:flex-row gap-8 font-dm-sans">
            {/* Filters Section */}
            <div className="w-full tablet:w-[280px] tablet:min-w-[220px] tablet:max-w-[320px] border border-gray-300 rounded-md p-6 h-fit mb-8 tablet:mb-0 font-dm-sans">
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
                />
                <span className="text-black font-dm-sans">to</span>
                <input
                  type="number"
                  name="max"
                  value={priceRange.max}
                  onChange={handlePriceChange}
                  className="w-full border border-gray-400 bg-white rounded p-2 font-dm-sans"
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
                <select
                  className="border border-gray-800 bg-white text-black rounded-md p-2 font-dm-sans"
                  value={sortOption}
                  onChange={handleSortChange}
                >
                  <option value="relevance" className="font-dm-sans">Sort by Relevance</option>
                  <option value="lowToHigh" className="font-dm-sans">Price: Low to High</option>
                  <option value="highToLow" className="font-dm-sans">Price: High to Low</option>
                  <option value="nameAZ" className="font-dm-sans">Name: A to Z</option>
                  <option value="nameZA" className="font-dm-sans">Name: Z to A</option>
                </select>
              </div>
              <div className="grid grid-cols-1 phone:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 gap-8 font-dm-sans">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-0 text-center group relative font-dm-sans"
                  >
                    <div className="relative w-full h-48 mb-4 flex items-center justify-center font-dm-sans ">
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
                        className="w-full h-full object-contain rounded-lg font-dm-sans"
                        onError={e => { e.target.src = "/logo-icon/logo.png"; }}
                      />
                      <button
                        className="absolute bottom-3 right-[30px] bg-white p-1.5 rounded-full shadow-md font-dm-sans"
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
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${favoriteIds.includes(product.id) ? 'text-red-600 fill-red-600' : 'text-white fill-white stroke-gray-700'}`} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="font-semibold mt-2 text-black text-center font-dm-sans">{product.name}</h3>
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
