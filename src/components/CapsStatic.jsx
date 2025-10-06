import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import Header from "./visitor/Header";
import Navigation from "./registered/Navigation";
import Footer from "./visitor/Footer";
import { supabase } from "../supabaseClient";

// caps static page with dynamic content fetched from Supabase
export default function CapsStatic() {
  const { session } = UserAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchCaps = async () => {
      setLoading(true);
      try {
        // simple name search for "cap" (case-insensitive)
        const { data, error } = await supabase
          .from('products')
          .select('id, name, route, starting_price, image_url')
          .ilike('name', '%cap%')
          .order('name', { ascending: true })
          .limit(48);

        if (error) {
          console.warn('Caps fetch warning:', error.message || error);
        }

        if (!mounted) return;
        setProducts(data || []);
      } catch (err) {
        console.error('Unexpected error fetching caps:', err);
        if (mounted) setProducts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCaps();
    return () => { mounted = false; };
  }, []);

  const resolveImage = (imageKey) => {
    if (!imageKey) return '/apparel-images/caps.png';
    try {
      if (/^https?:\/\//i.test(imageKey) || imageKey.startsWith('/')) return imageKey;
      const clean = String(imageKey).replace(/^\/+/, '');
      const { data } = supabase.storage.from('apparel-images').getPublicUrl(clean);
      return data?.publicUrl || '/apparel-images/caps.png';
    } catch (e) {
      return '/apparel-images/caps.png';
    }
  };

  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}

      <main className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-black">Caps</h1>
          <p className="text-gray-600 mt-2">Static layout, dynamic content — browse cap products below.</p>
        </header>

        {loading ? (
          <div className="text-center py-20">Loading caps…</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">No caps found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => (
              <Link
                key={p.id}
                to={p.route ? `/product/${p.route}` : `/product/${p.id}`}
                className="block border rounded-md overflow-hidden bg-white hover:shadow-lg"
                aria-label={`View ${p.name}`}
              >
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <img
                    src={resolveImage(p.image_url)}
                    alt={p.name}
                    className="max-h-full object-contain"
                  />
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-black text-lg truncate">{p.name}</h2>
                  <div className="mt-2 text-gray-700">{p.starting_price ? `₱ ${p.starting_price}` : 'Price on product page'}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
