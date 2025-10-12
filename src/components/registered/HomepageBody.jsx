import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  // Recently viewed state
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // Fetch recently viewed for current user
  useEffect(() => {
    let cancelled = false;
    // Build a product route like "/apparel/cap" using product.route when available
    // or falling back to a slugified category + product name combination.
    const resolveProductRoute = (product) => {
      const candidate = product?.route ?? null;
      const normalize = (r) => {
        if (!r) return null;
        if (typeof r === 'string') return r.trim();
        return null;
      };
      const raw = normalize(candidate);
      const slugify = (str = '') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // If route already contains a slash or starts with one, treat as full path
      if (raw) {
        if (raw.startsWith('/') || raw.includes('/')) return raw.startsWith('/') ? raw : `/${raw}`;
        // raw is a simple slug (e.g., "cap") -> prepend category
        const categoryName = product?.product_types?.product_categories?.name
          || product?.product_types?.name
          || '';
        const categorySlug = slugify(categoryName || 'product');
        const productSlug = slugify(raw);
        return `/${categorySlug}/${productSlug}`;
      }

      // No route provided -> build from category + product name
      const categoryName = product?.product_types?.product_categories?.name
        || product?.product_types?.name
        || '';
      const categorySlug = slugify(categoryName || 'product');
      const productSlug = slugify(product?.name || product?.id);
      // Prefer the new fallback detail route so it always resolves
      return `/p/${productSlug}`;
    };
    const headExists = async (url) => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        return !!res?.ok;
      } catch {
        return false;
      }
    };

    const resolveImage = async (product, fallbacks = []) => {
      try {
        const image_key = product?.image_url;
        if (!image_key) {
          for (const f of fallbacks) { if (await headExists(f)) return f; }
          return fallbacks[0] || "/logo-icon/logo.png";
        }
        if (/^https?:\/\//.test(image_key) || image_key.startsWith('/')) {
          return image_key;
        }

        const key = String(image_key).replace(/^\/+/, '');
        const categoryName = (product?.product_types?.product_categories?.name || product?.product_types?.name || '').toLowerCase();
        let primaryBucket = null;
        if (categoryName.includes('apparel')) primaryBucket = 'apparel-images';
        else if (categoryName.includes('accessories')) primaryBucket = 'accessoriesdecorations-images';
        else if (categoryName.includes('signage') || categoryName.includes('poster')) primaryBucket = 'signage-posters-images';
        else if (categoryName.includes('cards') || categoryName.includes('sticker')) primaryBucket = 'cards-stickers-images';
        else if (categoryName.includes('packaging')) primaryBucket = 'packaging-images';
        else if (categoryName.includes('3d print')) primaryBucket = '3d-prints-images';

        const allBuckets = [
          primaryBucket,
          'apparel-images',
          'accessoriesdecorations-images',
          'signage-posters-images',
          'cards-stickers-images',
          'packaging-images',
          '3d-prints-images',
          'product-images',
          'images',
          'public'
        ].filter(Boolean);

        const seen = new Set();
        for (const b of allBuckets) {
          if (seen.has(b)) continue; seen.add(b);
          try {
            const { data } = supabase.storage.from(b).getPublicUrl(key);
            const url = data?.publicUrl;
            if (url && !url.endsWith('/')) {
              if (await headExists(url)) return url;
            }
          } catch { /* continue */ }
        }

        for (const f of fallbacks) { if (await headExists(f)) return f; }
        return "/logo-icon/logo.png";
      } catch (_e) {
        return "/logo-icon/logo.png";
      }
    };

    const load = async () => {
      setRecentLoading(true);
      try {
        let { data: sessionData } = await supabase.auth.getSession();
        let userId = sessionData?.session?.user?.id;
        if (!userId) {
          const { data: userData } = await supabase.auth.getUser();
          userId = userData?.user?.id || null;
        }
        if (!userId) { if (!cancelled) setRecent([]); return; }
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Homepage] recently viewed: userId', userId);
        }

        // Single query with join to products; requires FK recently_viewed.product_id -> products.id
        const { data: rows, error } = await supabase
          .from('recently_viewed')
          .select(`product_id, viewed_at, products ( id, name, image_url, route, product_types ( id, name, category_id, product_categories ( id, name ) ) )`)
          .eq('user_id', userId)
          .not('product_id', 'is', null)
          .order('viewed_at', { ascending: false })
          .limit(25);
        if (error) throw error;
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Homepage] recently viewed rows:', rows?.length || 0);
        }

        const items = [];
        for (const r of (rows || [])) {
          const p = r?.products;
          if (!p) continue;
          const img = await resolveImage(p, ['/logo-icon/logo.png']);
          const href = resolveProductRoute(p) || '/';
          items.push({ id: p.id, name: p.name, img, href });
        }
        // Dedup while preserving order
  const seen = new Set();
  const dedup = items.filter(it => (seen.has(it.id) ? false : (seen.add(it.id), true)));
  const top5 = dedup.slice(0, 5);
  if (!cancelled) setRecent(top5);
      } catch (err) {
        console.warn('[Homepage] recently viewed load error:', err);
        if (!cancelled) setRecent([]);
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      if (!cancelled) load();
    });
    const onFocus = () => { if (!cancelled) load(); };
    window.addEventListener('focus', onFocus);
    return () => { cancelled = true; sub?.subscription?.unsubscribe?.(); window.removeEventListener('focus', onFocus); };
  }, []);


  return (
    
    <div className="min-h-screen w-full bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">

     {/* Hero Banner */}
      <div className="flex flex-col items-center justify-center z-5">
        <img src="/images/hero-banner.jpeg" className="w-full object-cover cursor-pointer" onClick={() => navigate('/3d-prints-services')}/>

      </div>

      {/* New Arrivals */}
      <div className="flex flex-col items-center justify-center mt-10 text-[#171738] font-bold font-dm-sans phone:text-[10px] tablet:text-[14px] laptop:text-[16px] laptop:items-center laptop:mx-auto laptop:max-w-[1200px]">
        <h1 className="phone:text-[24px] tablet:text-[28px] laptop:text-[32px] mb-6">New Arrivals</h1>
        {/* Textured mugs */}
        <div className="flex flex-col laptop:flex-row w-full items-center laptop:items-start laptop:justify-center">
          <div className=" mt-10 rounded-[4px] border border-black">
            <img src="/images/textured-mugs.png" className="phone:w-[220px] tablet:w-[300px] laptop:w-[clamp(250px,26vw,400px)] phone:h-[180px] tablet:h-[220px] laptop:h-[clamp(200px,24vw,305px)] rounded-[4px]" />
          </div>
          <div className="border border-black mt-10 laptop:ml-5 rounded-[4px] phone:w-full tablet:w-[90vw] laptop:w-[799px] phone:h-auto laptop:h-[305px] p-[5vw] pt-[6vw] bg-gradient-to-r from-[#E7E8E9] to-white flex flex-col justify-center">
            <h2 className="phone:text-[22px] tablet:text-[28px] laptop:text-[36px] font-bold">Textured Glaze Mugs</h2>
            <p className="phone:text-[16px] tablet:text-[20px] laptop:text-[24px] italic text-[#171738]">Subtle, artisan feel. Your design printed on slightly rustic ceramic textures</p>
            <p className="text-right mt-9">
                <a
                    href="/signin"
                    onClick={e => {
                        e.preventDefault();
                        navigate("/accessories-decorations/mug");
                    }}
                    className="underline text-black not-italic phone:text-base tablet:text-lg laptop:text-lg hover:text-black"
                >
                    View more
                </a>
            </p>
          </div>
        </div>
        {/* Embroidered caps */}
        <div className="flex flex-col  laptop:flex-row w-full items-center laptop:items-start laptop:justify-center">
          <div className="border border-black mt-5 laptop:w-[833px] phone:w-full tablet:w-[90vw] laptop:h-[305px] p-[5vw] pt-[6vw] bg-gradient-to-r from-[#E7E8E9] to-white rounded-[4px] flex flex-col justify-center">
            <h2 className="phone:text-[22px] tablet:text-[28px] laptop:text-[36px] font-bold">Embroidered Slogan Caps</h2>
            <p className="phone:text-[16px] tablet:text-[20px] laptop:text-[24px] italic text-[#171738]">Subtle, artisan feel. Your design printed on slightly rustic ceramic textures</p>
            <p className="text-left mt-9">
                <a
                    href="/signin"
                    onClick={e => {
                        e.preventDefault();
                        navigate("/apparel/cap");
                    }}
                    className="underline text-black not-italic phone:text-base tablet:text-lg laptop:text-lg hover:text-black"
                >
                    View more
                </a>
            </p>
          </div>
          <div className="border border-black mt-5 laptop:ml-5 rounded-[4px]">
            <img src="/images/caps.png" className="phone:w-[220px] tablet:w-[300px] laptop:w-[clamp(250px,24vw,400px)] phone:h-[180px] tablet:h-[220px] laptop:h-[clamp(200px,24vw,305px)] rounded-[4px]" />
          </div>
        </div>
      </div>

      {/* Recently Viewed */}
      <div className="flex flex-col  items-center justify-center mt-10 text-[#171738] font-bold font-dm-sans phone:text-[10px] tablet:text-[14px] laptop:text-[16px] laptop:items-center laptop:mx-auto laptop:max-w-[1200px] w-full">
        <div className="w-full px-4 laptop:px-0">
          <h2 className="phone:text-[20px] tablet:text-[24px] laptop:text-[26px] mb-4 border-t border-black pt-6">Recently Viewed</h2>
        </div>
        <div className="w-full overflow-x-auto border-b border-black py-5">
          <div className="flex gap-4 px-4 laptop:px-0">
            {(recentLoading ? Array.from({ length: 5 }) : recent).map((item, idx) => (
              <div key={item?.id || idx} className="flex-shrink-0 w-[180px]">
                <div className="border rounded-[4px] bg-white w-[180px] h-[180px] overflow-hidden">
                  {recentLoading ? (
                    <div className="animate-pulse bg-gray-200 w-full h-full" />
                  ) : (
                    <a
                      href={item.href}
                      onClick={e => { e.preventDefault(); navigate(item.href); }}
                      className="block w-full h-full"
                      title={item.name}
                    >
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover cursor-pointer" />
                    </a>
                  )}
                </div>
                <div className="text-center text-black font-dm-sans text-[14px] mt-2 truncate">
                  {recentLoading ? <span className="inline-block w-24 h-4 bg-gray-200 animate-pulse rounded" /> : (
                    <a href={item.href} onClick={e => { e.preventDefault(); navigate(item.href); }} className="text-black hover:text-black">
                      {item.name}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {!recentLoading && recent.length === 0 && (
              <div className="text-[#171738] font-normal py-4">No recently viewed products yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Popular Picks */}
      <div className="flex flex-col items-center justify-center mt-10 text-[#171738] font-bold font-dm-sans phone:text-[10px] tablet:text-[14px] laptop:text-[16px]">
        <h1 className="phone:text-[24px] tablet:text-[28px] laptop:text-[32px] mb-6">Popular Picks</h1>
        {/* Carousel for phone */}
        <div className="tablet:block phone:block laptop:hidden w-full">
          <div className="relative w-full overflow-x-auto items-center flex justify-center">
            <div className="flex flex-row gap-5 w-max px-4">
              {/* Business Cards */}
              <a
                href="/cards-stickers/postcards"
                onClick={e => { e.preventDefault(); navigate('/cards-stickers/postcards'); }}
                className="flex flex-col border border-[#171738] rounded-[4px] w-[220px] h-[300px] flex-shrink-0"
              >
                <img src="/images/business-cards.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
                <div className="text-center text-[#171738] font-dm-sans text-[18px] p-5">Custom Postcards</div>
              </a>
              {/* Posters */}
              <a
                href="/signage-posters/poster"
                onClick={e => { e.preventDefault(); navigate('/signage-posters/poster'); }}
                className="flex flex-col border border-[#171738] rounded-[4px] w-[220px] h-[300px] flex-shrink-0"
              >
                <img src="/images/posters.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
                <div className="text-center text-[#171738] font-dm-sans text-[18px] p-5">Custom Posters</div>
              </a>
              {/* Stickers */}
              <a
                href="/cards-stickers/die-cut-stickers"
                onClick={e => { e.preventDefault(); navigate('/cards-stickers/die-cut-stickers'); }}
                className="flex flex-col border border-[#171738] rounded-[4px] w-[220px] h-[300px] flex-shrink-0"
              >
                <img src="/images/stickers.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
                <div className="text-center text-[#171738] font-dm-sans text-[18px] p-2 leading-[1.4]">Custom Die Cut Stickers</div>
              </a>
            </div>
          </div>
        </div>
        {/* Grid for tablet/laptop */}
          <div className="hidden tablet:hidden laptop:flex flex-col tablet:flex-row laptop:flex-row mt-10 gap-[5vw] w-full items-center justify-center">
              {/* Post Cards */}
              <a
                  className="flex flex-col border border-[#171738] rounded-[4px] tablet:w-[300px] laptop:w-[350px] tablet:h-[350px] laptop:h-[425px]"
                  href="/cards-stickers"
                  onClick={e => {
                      e.preventDefault();
                      navigate("/cards-stickers/postcards");
                  }}
              >
                  <img src="/images/business-cards.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
                  <div className="text-center font-semibold text-[#171738] font-dm-sans tablet:text-[24px] laptop:text-[30px] p-5 laptop:h-[30px] ">Custom Postcards</div>
              </a>
              {/* Posters */}
              <a className="flex flex-col border border-[#171738] rounded-[4px] tablet:w-[300px] laptop:w-[350px] tablet:h-[350px] laptop:h-[425px]"
                 href="/signage-posters"
                 onClick={e => {
                     e.preventDefault();
                     navigate("/signage-posters/poster");
                 }}
              >
                  <img src="/images/posters.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
                  <div className="text-center font-semibold text-[#171738] font-dm-sans tablet:text-[24px] laptop:text-[30px] p-5">Custom Posters</div>
              </a>
              {/* Stickers */}
              <a className="flex flex-col border border-[#171738] rounded-[4px] tablet:w-[300px] laptop:w-[350px] tablet:h-[350px] laptop:h-[425px]"
                 href="/cards-stickers"
                 onClick={e => {
                     e.preventDefault();
                     navigate("/cards-stickers/die-cut-stickers");
                 }}
              >
                  <img src="/images/stickers.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
                  <div className="text-center font-semibold text-[#171738] font-dm-sans tablet:text-[24px] laptop:text-[30px] p-2 leading-[1.2]">Custom Die Cut Stickers</div>
              </a>
          </div>
      </div>

      {/* Suggested for you */}
      <div className="flex flex-col items-center justify-center mt-10 text-[#171738] font-bold font-dm-sans phone:text-[10px] tablet:text-[14px] laptop:text-[16px]">
        <h1 className="phone:text-[24px] tablet:text-[28px] laptop:text-[32px] mb-6">Suggested for you</h1>
        {/* Carousel for phone and tablet */}
        <div className="w-full phone:block tablet:block bigscreen:hidden laptop:block">
          <div className="relative w-full overflow-x-auto">
            <div className="flex flex-row gap-5 w-max px-4">
              {/* ID Cards */}
              <div className="flex flex-col relative border rounded-[4px] bg-cover bg-center text-center items-center justify-center text-white border-white w-[220px] h-[220px] tablet:w-[260px] tablet:h-[300px] flex-shrink-0" style={{ backgroundImage: 'url("/images/id-cards.png")' }}>
                <div className="absolute mt-[12vw] w-[80vw] tablet:w-[15vw] tablet:mt-[2vw] left-1/2 transform -translate-x-1/2 z-10 p-0">
                  <p className="text-[28px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-8 tablet:mb-10 phone:mb-8 tablet:text-center tablet:w-full">ID CARDS</p>
                </div>
                <div className="flex justify-center items-center mt-[28vw] tablet:mt-[18vw] w-full tablet:w-[210px] z-10">
                  <button type="button" className="flex p-1 h-[50px] tablet:h-[50px] w-[120px] tablet:w-[140px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold text-[15px] tablet:text-[17px] font-dm-sans tablet:mx-auto" onClick={() => navigate('/customize')}>
                    Customize Yours!
                  </button>
                </div>
              </div>
              {/* Banners */}
              <div className="flex flex-col relative border rounded-[4px] bg-cover bg-center text-center items-center justify-center text-white border-white w-[220px] h-[220px] tablet:w-[260px] tablet:h-[300px] flex-shrink-0" style={{ backgroundImage: 'url("/images/banners1.png")' }}>
                <div className="absolute mt-[12vw] w-[80vw] tablet:mt-[2vw] tablet:w-[20vw] left-1/2 transform -translate-x-1/2 z-10 p-0">
                  <p className="text-[28px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-8 tablet:mb-10 phone:mb-8 tablet:text-center tablet:w-full">BANNERS</p>
                </div>
                <div className="flex justify-center items-center mt-[28vw] tablet:mt-[18vw] w-full tablet:w-[210px] z-10">
                  <button type="button" className="flex p-1 h-[50px] tablet:h-[50px] w-[120px] tablet:w-[140px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold text-[15px] tablet:text-[17px] font-dm-sans tablet:mx-auto">
                    Customize Yours!
                  </button>
                </div>
              </div>
              {/* Pins */}
              <div className="flex flex-col relative border rounded-[4px] bg-cover bg-center text-center items-center justify-center text-white border-white w-[220px] h-[220px] tablet:w-[260px] tablet:h-[300px] flex-shrink-0" style={{ backgroundImage: 'url("/images/pins.png")' }}>
                <div className="absolute mt-[12vw] w-[80vw] tablet:w-[15vw] tablet:mt-[2vw] left-1/2 transform -translate-x-1/2 z-10 p-0">
                  <p className="text-[28px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-8 tablet:mb-10 phone:mb-8 tablet:text-center tablet:w-full">PINS</p>
                </div>
                <div className="flex justify-center items-center mt-[28vw] tablet:mt-[18vw] w-full tablet:w-[210px] z-10">
                  <button type="button" className="flex p-1 h-[50px] tablet:h-[50px] w-[120px] tablet:w-[140px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold text-[15px] tablet:text-[17px] font-dm-sans tablet:mx-auto">
                    Customize Yours!
                  </button>
                </div>
              </div>
              {/* Acrylic Standees */}
              <div className="flex flex-col relative border rounded-[4px] bg-cover bg-center text-center items-center justify-center text-white border-white mb-[3vw] w-[220px] h-[220px] tablet:w-[260px] tablet:h-[300px] flex-shrink-0" style={{ backgroundImage: 'url("/images/acrylic-standees.png")' }}>
                <div className="absolute mt-[2vw] tablet:mt-[5vw] tablet:mt-[1vw] w-[80vw] tablet:w-[25vw] left-1/2 transform -translate-x-1/2 z-10 p-0 leading-none">
                  <p className="text-[28px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-4 tablet:mb-6 phone:mb-4 tablet:text-center tablet:w-full">ACRYLIC</p>
                  <p className="text-[28px] phone:mt-[-20px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-4 tablet:mb-6 phone:mb-4 tablet:text-center tablet:w-full">STANDEES</p>
                </div>
                <div className="flex justify-center items-center mt-[28vw] tablet:mt-[18vw] w-full tablet:w-[210px] z-10">
                  <button type="button" className="flex p-1 h-[50px] tablet:h-[50px] w-[120px] tablet:w-[140px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold text-[15px] tablet:text-[17px] font-dm-sans tablet:mx-auto">
                    Customize Yours!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Grid for bigscreen */}
        <div className="hidden bigscreen:flex flex-row mt-10 gap-[3vw] w-full items-center justify-center mb-10">
          {/* ID Cards */}
          <div className="flex flex-col justify-between items-center border rounded-[4px] bg-cover bg-center text-center text-white border-white laptop:w-[290px] laptop:h-[360px] bigscreen:w-[290px] bigscreen:h-[360px] relative" style={{ backgroundImage: 'url("/images/id-cards.png")' }}>
            <div className="flex flex-1 items-center justify-center w-full h-full">
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">ID <br></br>CARDS</p>
            </div>
            <div className="flex justify-center items-end w-full pb-6">
              <button type="button" className="flex p-1 laptop:h-[36px] laptop:w-[190px] bigscreen:h-[36px] bigscreen:w-[190px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold laptop:text-[17px] bigscreen:text-[17px] font-dm-sans" onClick={() => navigate('/cards-stickers/id-cards')}>
                Customize Yours!
              </button>
            </div>
          </div>
          {/* Clothing Banners */}
          <div className="flex flex-col justify-between items-center border rounded-[4px] bg-cover bg-center text-center text-white border-white laptop:w-[290px] laptop:h-[360px] bigscreen:w-[290px] bigscreen:h-[360px] relative" style={{ backgroundImage: 'url("/images/clothing-banner.png")' }}>
            <div className="flex flex-1 items-center justify-center w-full h-full">
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">CLOTHING BANNERS</p>
            </div>
            <div className="flex justify-center items-end w-full pb-6">
              <button type="button" className="flex p-1 laptop:h-[36px] laptop:w-[190px] bigscreen:h-[36px] bigscreen:w-[190px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold laptop:text-[17px] bigscreen:text-[17px] font-dm-sans " onClick={() => navigate('/signage-posters/clothing-banner')}>
                Customize Yours!
              </button>
            </div>
          </div>
          {/* Pins */}
          <div className="flex flex-col justify-between items-center border rounded-[4px] bg-cover bg-center text-center text-white border-white laptop:w-[290px] laptop:h-[360px] bigscreen:w-[290px] bigscreen:h-[360px] relative" style={{ backgroundImage: 'url("/images/pins.png")' }}>
            <div className="flex flex-1 items-center justify-center w-full h-full">
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">BUTTON <br></br>PINS</p>
            </div>
            <div className="flex justify-center items-end w-full pb-6">
              <button type="button" className="flex p-1 laptop:h-[36px] laptop:w-[190px] bigscreen:h-[36px] bigscreen:w-[190px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold laptop:text-[17px] bigscreen:text-[17px] font-dm-sans" onClick={() => navigate('/accessories-decorations/button-pins')}>
                Customize Yours!
              </button>
            </div>
          </div>
          {/* Acrylic Standees */}
          <div className="flex flex-col justify-between items-center border rounded-[4px] bg-cover bg-center text-center text-white border-white laptop:w-[290px] laptop:h-[360px] bigscreen:w-[290px] bigscreen:h-[360px] relative" style={{ backgroundImage: 'url("/images/acrylic-standees.png")' }}>
            <div className="flex flex-1 flex-col items-center justify-center w-full h-full">
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">ACRYLIC</p>
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">STANDEES</p>
            </div>
            <div className="flex justify-center items-end w-full pb-6">
              <button type="button" className="flex p-1 laptop:h-[36px] laptop:w-[190px] bigscreen:h-[36px] bigscreen:w-[190px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold laptop:text-[17px] bigscreen:text-[17px] font-dm-sans" onClick={() => navigate('/accessories-decorations/acrylic-stand')}>
                Customize Yours!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
