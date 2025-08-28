import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY in env to run this test.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  try {
    const svgPath = path.resolve(process.cwd(), 'scripts', 'test.svg');
    if (!fs.existsSync(svgPath)) {
      fs.writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>');
      console.log('Created test SVG at', svgPath);
    }

    const file = fs.readFileSync(svgPath);
    const fileName = `test-svg-${Date.now()}.svg`;
    const filePath = `tests/${fileName}`;
    console.log('Uploading', filePath);

    const { data, error } = await supabase.storage.from('product-files').upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: 'image/svg+xml' });
    if (error) {
      console.error('Upload error:', error);
      process.exit(1);
    }
    console.log('Upload success:', data);

    const { data: urlData } = supabase.storage.from('product-files').getPublicUrl(filePath);
    console.log('Public URL:', urlData?.publicUrl);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
})();
