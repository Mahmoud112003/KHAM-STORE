export function normalizeHomeHeroPosition(position = {}) {
    position ||= {};
    const numberOrDefault = (value, fallback) => {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    };

    return {
        x: Math.min(100, Math.max(0, numberOrDefault(position.x, 50))),
        y: Math.min(100, Math.max(0, numberOrDefault(position.y, 50))),
        scale: Math.min(3, Math.max(1, numberOrDefault(position.scale, 1)))
    };
}

export function applyHomeHeroPosition(frame, image, position) {
    const normalized = normalizeHomeHeroPosition(position);
    frame.style.setProperty("--hero-x", `${normalized.x}%`);
    frame.style.setProperty("--hero-y", `${normalized.y}%`);
    frame.style.setProperty("--hero-scale", normalized.scale);
    image.style.objectPosition = `${normalized.x}% ${normalized.y}%`;
    image.style.transformOrigin = `${normalized.x}% ${normalized.y}%`;
}
