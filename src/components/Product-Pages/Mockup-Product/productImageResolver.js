export async function resolveProductImageUrl(supabase, slugBase) {
  // Try to find the product by several strategies
  const selectCols = 'id, name, image_url, route, slug, product_types ( name, product_categories ( name ) )';
  const tryPrefixes = [
    '/apparel/',
    '/accessories/',
    '/signage-posters/',
    '/signages-posters/',
    '/cards-stickers/',
    '/packaging/',
    '/3d-prints-services/',
  ];
  let product = null;
  try {
    // 1) route with common prefixes
    for (const p of tryPrefixes) {
      const { data } = await supabase
        .from('products')
        .select(selectCols)
        .eq('route', `${p}${slugBase}`)
        .maybeSingle();
      if (data) { product = data; break; }
    }
    // 2) slug exact
    if (!product) {
      const { data } = await supabase
        .from('products')
        .select(selectCols)
        .eq('slug', slugBase)
        .maybeSingle();
      if (data) product = data;
    }
    // 3) route equals slugBase (stored without prefix)
    if (!product) {
      const { data } = await supabase
        .from('products')
        .select(selectCols)
        .eq('route', slugBase)
        .maybeSingle();
      if (data) product = data;
    }
    // 4) name ilike
    if (!product) {
      const { data } = await supabase
        .from('products')
        .select(selectCols)
        .ilike('name', `%${slugBase.replace(/-/g, ' ')}%`)
        .limit(1)
        .maybeSingle();
      if (data) product = data;
    }
  } catch {
    // ignore fetch errors; return null below
  }

  if (!product) return { url: null, product: null };

  // Resolve bucket by category or type name
  const catName = (
    product?.product_types?.product_categories?.name ||
    product?.product_types?.name ||
    ''
  ).toLowerCase();
  let bucket = 'apparel-images';
  if (catName.includes('apparel')) bucket = 'apparel-images';
  else if (catName.includes('accessories')) bucket = 'accessoriesdecorations-images';
  else if (catName.includes('signage') || catName.includes('poster')) bucket = 'signage-posters-images';
  else if (catName.includes('cards') || catName.includes('sticker')) bucket = 'cards-stickers-images';
  else if (catName.includes('packaging')) bucket = 'packaging-images';
  else if (catName.includes('3d print')) bucket = '3d-prints-images';

  // Build public URL from image_url string
  try {
    let img = product.image_url || null;
    if (typeof img === 'string' && img.length > 0) {
      if (img.startsWith('http')) {
        return { url: img, product };
      }
      const key = img.startsWith('/') ? img.slice(1) : img;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key);
      const pub = urlData?.publicUrl;
      return { url: pub && !pub.endsWith('/') ? pub : null, product };
    }
  } catch {
    // fall through
  }
  return { url: null, product };
}
