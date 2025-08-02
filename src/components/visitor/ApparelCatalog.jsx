import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

const ApparelCatalog = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productTypes, setProductTypes] = useState({
    Caps: false,
    'Hoodies/Sweatshirts': false,
    'T-shirts': false,
    'Tote Bags': false,
  });
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, productTypes, priceRange]);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("apparel").select("*");
    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data);
      setFilteredProducts(data);
    }
  };

  const handleProductTypeChange = (event) => {
    const { name, checked } = event.target;
    if (name === 'All') {
        setProductTypes({
            Caps: false,
            'Hoodies/Sweatshirts': false,
            'T-shirts': false,
            'Tote Bags': false,
        });
    } else {
        setProductTypes(prev => ({ ...prev, [name]: checked }));
    }
  };

  const handlePriceChange = (event) => {
    const { name, value } = event.target;
    setPriceRange(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    let tempProducts = [...products];
    const activeProductTypes = Object.keys(productTypes).filter(key => productTypes[key]);

    if (activeProductTypes.length > 0) {
      tempProducts = tempProducts.filter(product => activeProductTypes.includes(product.product_type));
    }

    if (priceRange.min) {
      tempProducts = tempProducts.filter(product => product.price >= parseFloat(priceRange.min));
    }

    if (priceRange.max) {
      tempProducts = tempProducts.filter(product => product.price <= parseFloat(priceRange.max));
    }

    setFilteredProducts(tempProducts);
  };
  
  const productImages = {
    'Custom Cap': '/images/caps.png',
    'Custom Rounded T-shirt': '/images/banners.png',
    'Custom Sweatshirt': '/images/business-cards.png',
    'Custom Basic Tote Bag': '/images/stickers.png',
    'Custom Hoodie': '/images/posters.png'
  };


  return (
    <div className="w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[165px] landing-page-container z-0">
      {/*Hero Banner removed*/}

      <div className="w-full bg-white px-4 sm:px-8 lg:px-16 py-8 pt-28 md:pt-32 lg:pt-48">
        <div className="flex flex-row gap-8">
          {/* Filters Section (Left) */}
          <div className="w-[280px] min-w-[220px] max-w-[320px] border border-gray-800 rounded-md p-6 h-fit">
            <h2 className="text-xl font-bold mb-4">Product Type</h2>
            <div className="space-y-2">
              <div>
                <input type="checkbox" id="all" name="All" onChange={handleProductTypeChange} className="mr-2" />
                <label htmlFor="all">All</label>
              </div>
              {Object.keys(productTypes).map(type => (
                <div key={type}>
                  <input type="checkbox" id={type} name={type} checked={productTypes[type]} onChange={handleProductTypeChange} className="mr-2" />
                  <label htmlFor={type}>{type}</label>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold mt-8 mb-4">Starting Price</h2>
            <p>Price Range</p>
            <div className="flex items-center gap-2">
              <input type="number" name="min" value={priceRange.min} onChange={handlePriceChange} placeholder="from" className="w-full border border-gray-400 rounded p-2" />
              <span>to</span>
              <input type="number" name="max" value={priceRange.max} onChange={handlePriceChange} placeholder="to" className="w-full border border-gray-400 rounded p-2" />
            </div>
            <button onClick={applyFilters} className="w-full bg-[#FF8A00] text-white rounded py-2 mt-4 hover:bg-orange-600">
              Apply
            </button>
          </div>

          {/* Products Grid (Right) */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <p className="font-semibold">{filteredProducts.length} Products</p>
              <select className="border border-gray-800 rounded-md p-2">
                <option>Sort by Relevance</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 text-center group relative hover:border-blue-500 hover:shadow-lg transition-all">
                  <img
                    src={product.image_url || '/apparel-images/caps.png' || '/apparel-images/hoodie.png'}
                    alt={product.name}
                    className="w-full h-48 object-contain mb-4 rounded"
                  />
                  <button className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <h3 className="font-semibold mt-2">{product.name}</h3>
                  <p className="text-gray-500">from ₱{product.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApparelCatalog;