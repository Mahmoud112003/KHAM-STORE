import { db, doc, getDoc, setDoc } from './firebase-config.js';

export const DEFAULT_ANNOUNCEMENT_SETTINGS = {
    enabled: false,
    text: '',
    backgroundColor: '#2B1142',
    textColor: '#FFFFFF'
};

let announcementCache = null;
let announcementRequest = null;

export function isSafeAnnouncementColor(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function normalizeAnnouncementSettings(data) {
    return {
        enabled: data.enabled === true,
        text: typeof data.text === 'string' ? data.text.trim() : '',
        backgroundColor: isSafeAnnouncementColor(data.backgroundColor) ? data.backgroundColor : DEFAULT_ANNOUNCEMENT_SETTINGS.backgroundColor,
        textColor: isSafeAnnouncementColor(data.textColor) ? data.textColor : DEFAULT_ANNOUNCEMENT_SETTINGS.textColor
    };
}

export async function loadAnnouncementSettings() {
    if (announcementCache) {
        return announcementCache;
    }

    if (announcementRequest) {
        return announcementRequest;
    }

    if (performance?.mark) {
        performance.mark('announcement-fetch-start');
    }

    const announcementRef = doc(db, 'siteSettings', 'announcement');
    announcementRequest = getDoc(announcementRef)
        .then((announcementSnapshot) => {
            if (!announcementSnapshot.exists()) {
                announcementCache = null;
                return null;
            }

            announcementCache = normalizeAnnouncementSettings(announcementSnapshot.data());
            return announcementCache;
        })
        .catch((error) => {
            console.error('Announcement settings fetch failed:', error);
            announcementCache = null;
            throw error;
        })
        .finally(() => {
            announcementRequest = null;
            if (performance?.mark && performance?.measure) {
                performance.mark('announcement-fetch-end');
                try {
                    performance.measure('announcement-fetch-duration', 'announcement-fetch-start', 'announcement-fetch-end');
                } catch (measureError) {
                    console.debug('Announcement fetch measurement skipped:', measureError);
                }
            }
        });

    return announcementRequest;
}

export function clearAnnouncementCache() {
    announcementCache = null;
    announcementRequest = null;
}

export async function saveAnnouncementSettings(settings) {
    const text = typeof settings.text === 'string' ? settings.text.trim() : '';
    const backgroundColor = settings.backgroundColor;
    const textColor = settings.textColor;

    if (!isSafeAnnouncementColor(backgroundColor) || !isSafeAnnouncementColor(textColor)) {
        throw new Error('Announcement colors must be six-digit hex values.');
    }

    const announcement = {
        enabled: settings.enabled === true,
        text,
        backgroundColor,
        textColor
    };

    await setDoc(doc(db, 'siteSettings', 'announcement'), announcement, { merge: true });
    announcementCache = announcement;
    return announcement;
}

export async function renderAnnouncement(selector = '#announcement-banner') {
    const banner = document.querySelector(selector);
    if (!banner) return false;

    banner.hidden = true;
    banner.textContent = '';

    try {
        const settings = await loadAnnouncementSettings();
        if (!settings || !settings.enabled || !settings.text) return false;

        banner.textContent = settings.text;
        banner.style.backgroundColor = settings.backgroundColor;
        banner.style.color = settings.textColor;
        banner.hidden = false;
        return true;
    } catch (error) {
        console.error('Failed to load announcement settings:', error);
        return false;
    }
}