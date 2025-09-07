// Thumbnail Performance Test
// Run this in the browser console on a signage product page

console.log('🧪 Starting Thumbnail Performance Test...');

const startTime = performance.now();

// Monitor thumbnail loading
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            const thumbnails = document.querySelectorAll('img[alt*="thumbnail"], img[src*="poster"], img[src*="clothing"], img[src*="banner"]');
            if (thumbnails.length > 0) {
                console.log(`📸 Found ${thumbnails.length} thumbnail images`);

                thumbnails.forEach((img, index) => {
                    img.addEventListener('load', () => {
                        const loadTime = performance.now() - startTime;
                        console.log(`✅ Thumbnail ${index + 1} loaded in ${loadTime.toFixed(2)}ms: ${img.src}`);
                    });

                    img.addEventListener('error', () => {
                        const errorTime = performance.now() - startTime;
                        console.log(`❌ Thumbnail ${index + 1} failed to load in ${errorTime.toFixed(2)}ms: ${img.src}`);
                    });
                });

                // Stop observing after finding thumbnails
                observer.disconnect();
            }
        }
    });
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Also check for existing thumbnails immediately
setTimeout(() => {
    const existingThumbnails = document.querySelectorAll('img[alt*="thumbnail"], img[src*="poster"], img[src*="clothing"], img[src*="banner"]');
    if (existingThumbnails.length > 0) {
        console.log(`📸 Found ${existingThumbnails.length} existing thumbnail images`);

        existingThumbnails.forEach((img, index) => {
            if (img.complete) {
                const loadTime = performance.now() - startTime;
                console.log(`✅ Thumbnail ${index + 1} already loaded in ${loadTime.toFixed(2)}ms: ${img.src}`);
            } else {
                img.addEventListener('load', () => {
                    const loadTime = performance.now() - startTime;
                    console.log(`✅ Thumbnail ${index + 1} loaded in ${loadTime.toFixed(2)}ms: ${img.src}`);
                });
            }
        });
    }
}, 100);

// Timeout after 10 seconds
setTimeout(() => {
    const totalTime = performance.now() - startTime;
    console.log(`⏱️  Test completed in ${totalTime.toFixed(2)}ms`);
    observer.disconnect();
}, 10000);
