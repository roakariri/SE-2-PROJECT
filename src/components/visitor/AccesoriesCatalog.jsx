import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

const AccessoriesCatalog = () => {
  const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [productTypeFilter, setProductTypeFilter] = useState([]);
    const [allProductTypes, setAllProductTypes] = useState([]);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectAll, setSelectAll] = useState(false);
    const [sortOption, setSortOption] = useState("relevance");
  
    useEffect(() => {
      fetchProducts();
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
  
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_types(id, name, category_id, product_categories(id, name))");
  
      if (error) {
        console.error("Error fetching products:", error);
      } else {
        // Only show products whose type's category is 'Accessories & Documentation'
        const accessoriesProducts = data.filter(product =>
          product.product_types?.product_categories?.name === 'Accessories & Documentation'
        );
        setProducts(accessoriesProducts);
        setFilteredProducts(accessoriesProducts);
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
  
    // Hamburger menu state for mobile filter drawer
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
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
                    style={{ backgroundColor: 'white' }}
                  />
                  <span className="text-black">to</span>
                  <input
                    type="number"
                    name="max"
                    value={priceRange.max}
                    onChange={handlePriceChange}
                    className="w-full border border-gray-400 rounded p-2 bg-white"
                    style={{ backgroundColor: 'white' }}
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
                  style={{ backgroundColor: 'white' }}
                />
                <span className="text-black">to</span>
                <input
                  type="number"
                  name="max"
                  value={priceRange.max}
                  onChange={handlePriceChange}
                  className="w-full border border-gray-400 rounded p-2 bg-white"
                  style={{ backgroundColor: 'white' }}
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
                <select
                  className="border border-gray-800 bg-white text-black rounded-md p-2"
                  value={sortOption}
                  onChange={handleSortChange}
                >
                  <option value="relevance">Sort by Relevance</option>
                  <option value="lowToHigh">Price: Low to High</option>
                  <option value="highToLow">Price: High to Low</option>
                  <option value="nameAZ">Name: A to Z</option>
                  <option value="nameZA">Name: Z to A</option>
                </select>
              </div>
  
              <div className="grid grid-cols-1 phone:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-0 text-center group relative"
                  >
                    <div className="relative w-full h-48 mb-4">
                      <img
                        src={
                          product.image_url
                            ? supabase.storage.from('accessoriesdecorations-images').getPublicUrl(product.image_url).data.publicUrl
                            : "/apparel-images/caps.png"
                        }
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onError={e => { e.target.src = "/apparel-images/caps.png"; }}
                      />
                      <button className="absolute bottom-3 laptop:right-[40px] phone:right-[150px] bg-white p-1.5 rounded-full shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="font-semibold mt-2 text-black text-center tablet:text-center semibig:text-center laptop:text-center">{product.name}</h3>
                    <p className="text-gray-500">from ₱{product.starting_price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default AccessoriesCatalog;
