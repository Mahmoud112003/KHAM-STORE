const META_PIXEL_ID = '1824311012064529';
const GA_MEASUREMENT_ID = 'G-W1K5P5TSDK';

function ensureGtag() {
    if (!window.dataLayer) {
        window.dataLayer = [];
    }

    if (!window.gtag) {
        window.gtag = function gtag() {
            window.dataLayer.push(arguments);
        };
    }

    if (!window.gtagInitialized) {
        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID);
        window.gtagInitialized = true;
    }
}

function ensureMetaPixel() {
    if (window.fbq) return window.fbq;

    window.fbq = function fbq() {
        if (typeof window.fbq.queue === 'undefined') {
            window.fbq.queue = [];
        }
        window.fbq.queue.push(arguments);
    };

    window.fbq.loaded = true;
    window.fbq.version = '2.0';

    const pixelScript = document.createElement('script');
    pixelScript.async = true;
    pixelScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
    pixelScript.setAttribute('data-pixel-id', META_PIXEL_ID);
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(pixelScript, firstScript);
    } else {
        document.head.appendChild(pixelScript);
    }

    if (!window.fbqInitialized) {
        window.fbq('init', META_PIXEL_ID);
        window.fbq('track', 'PageView');
        window.fbqInitialized = true;
    }

    return window.fbq;
}

export function initAnalytics() {
    ensureGtag();
    ensureMetaPixel();
    return {
        pixelId: META_PIXEL_ID,
        measurementId: GA_MEASUREMENT_ID
    };
}

export function trackViewContent(product) {
    initAnalytics();

    if (!product) return;

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'ViewContent', {
            content_ids: [product.id],
            content_name: product.name,
            content_type: 'product',
            value: Number(product.price || 0),
            currency: 'EGP'
        });
    }

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'view_item', {
            currency: 'EGP',
            value: Number(product.price || 0),
            items: [{
                item_id: product.id,
                item_name: product.name,
                price: Number(product.price || 0),
                quantity: 1
            }]
        });
    }
}

export function trackAddToCart(product, quantity = 1) {
    initAnalytics();

    if (!product) return;

    const value = Number(product.price || 0) * Number(quantity || 1);

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'AddToCart', {
            content_ids: [product.id],
            content_name: product.name,
            content_type: 'product',
            value,
            currency: 'EGP'
        });
    }

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'add_to_cart', {
            currency: 'EGP',
            value,
            items: [{
                item_id: product.id,
                item_name: product.name,
                price: Number(product.price || 0),
                quantity: Number(quantity || 1),
                item_variant: product.color ? `${product.color} / ${product.size || 'Standard'}` : (product.size || 'Standard')
            }]
        });
    }
}

export function trackInitiateCheckout(cart = []) {
    initAnalytics();

    if (!Array.isArray(cart) || cart.length === 0) return;

    const totalValue = cart.reduce((sum, item) => sum + ((Number(item.price || 0)) * (Number(item.qty || 1))), 0);

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'InitiateCheckout', {
            num_items: cart.length,
            value: totalValue,
            currency: 'EGP'
        });
    }

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'begin_checkout', {
            currency: 'EGP',
            value: totalValue,
            items: cart.map(item => ({
                item_id: item.productId || item.id,
                item_name: item.name,
                price: Number(item.price || 0),
                quantity: Number(item.qty || 1),
                item_variant: `${item.color || 'Default'} / ${item.size || 'Standard'}`
            }))
        });
    }
}

const PURCHASE_TRACKED_STORAGE_KEY = 'khamTrackedPurchaseIds';
const purchaseIdsTrackedThisPage = new Set();

export function hasPurchaseBeenTracked(orderId) {
    if (!orderId) return false;

    const transactionId = String(orderId);
    if (purchaseIdsTrackedThisPage.has(transactionId)) return true;

    try {
        const trackedIds = JSON.parse(localStorage.getItem(PURCHASE_TRACKED_STORAGE_KEY) || '[]');
        return Array.isArray(trackedIds) && trackedIds.includes(transactionId);
    } catch (error) {
        return false;
    }
}

export function markPurchaseAsTracked(orderId) {
    if (!orderId) return false;

    const transactionId = String(orderId);
    purchaseIdsTrackedThisPage.add(transactionId);

    try {
        const storedIds = JSON.parse(localStorage.getItem(PURCHASE_TRACKED_STORAGE_KEY) || '[]');
        const trackedIds = Array.isArray(storedIds) ? storedIds : [];
        if (!trackedIds.includes(transactionId)) {
            trackedIds.push(transactionId);
            localStorage.setItem(PURCHASE_TRACKED_STORAGE_KEY, JSON.stringify(trackedIds));
        }
    } catch (error) {
        // In-memory deduplication remains active when browser storage is unavailable.
    }

    return true;
}

export function trackPurchase(orderId, value, cart = []) {
    if (!orderId || hasPurchaseBeenTracked(orderId)) return false;

    markPurchaseAsTracked(orderId);

    try {
        initAnalytics();
    } catch (error) {
        console.warn('Analytics initialization failed while tracking Purchase.', error);
    }

    const numericValue = Number(value || 0);
    const items = (Array.isArray(cart) ? cart : []).map(item => ({
        item_id: item.productId || item.id,
        item_name: item.name,
        price: Number(item.price || 0),
        quantity: Number(item.qty || 1),
        item_variant: `${item.color || 'Default'} / ${item.size || 'Standard'}`
    }));

    try {
        if (typeof window.fbq === 'function') {
            window.fbq('track', 'Purchase', {
                transaction_id: String(orderId),
                value: numericValue,
                currency: 'EGP'
            });
        }
    } catch (error) {
        console.warn('Meta Purchase tracking failed.', error);
    }

    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'purchase', {
                transaction_id: String(orderId),
                currency: 'EGP',
                value: numericValue,
                items
            });
        }
    } catch (error) {
        console.warn('GA4 Purchase tracking failed.', error);
    }

    return true;
}

if (document.readyState !== 'loading') {
    initAnalytics();
} else {
    document.addEventListener('DOMContentLoaded', initAnalytics, { once: true });
}
