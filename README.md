# KHAM Store

## Overview
KHAM Store is a modern clothing storefront built around a transparent home navbar, a full-screen hero slider, product catalog, cart, checkout, returns, and admin management.

## Features
- Full-screen homepage hero slider with autoplay, indicators, and swipe support
- Transparent navigation on the home page that becomes solid on scroll
- Product listing, filtering, and detail pages
- Shopping cart and checkout flow
- Return request form
- Admin dashboard for product and content management
- Firebase-backed data and auth flow
- Responsive layout for desktop and mobile

## Project structure
```text
KHAM-STORE/
├── home.html
├── index.html
├── product.html
├── details.html
├── cart.html
├── checkout.html
├── contact.html
├── return.html
├── login.html
├── admin.html
├── README.md
├── firebase.json
├── firestore.rules
├── asset/
│   ├── css/
│   │   ├── admin.css
│   │   ├── all.min.css
│   │   ├── motion.css
│   │   ├── responsive.css
│   │   ├── style.css
│   │   └── ...
│   ├── images/
│   ├── js/
│   │   ├── admin.js
│   │   ├── cart.js
│   │   ├── checkout.js
│   │   ├── details.js
│   │   ├── firebase-config.js
│   │   ├── kham-slider.js
│   │   ├── login.js
│   │   ├── main.js
│   │   ├── product.js
│   │   ├── return.js
│   │   ├── store.js
│   │   └── ...
│   └── webfonts/
│       ├── fa-brands-400.woff2
│       ├── fa-regular-400.woff2
│       └── fa-solid-900.woff2
```

## Homepage
The homepage uses a modern hero slider instead of the legacy single static banner. The header overlaps the slider and switches to a solid background after the user scrolls.

## Run locally
```bash
cd "E:\The project\Clothing"
python -m http.server 8000
```
Then open:
```text
http://localhost:8000/home.html
```

## Firebase and config
The project uses Firebase Firestore and Firebase Authentication. Configuration and rules are kept in the project root and JS config files.

## Notes
- The old home banner system was removed.
- The homepage now uses a lightweight local hero slider.
- Missing Font Awesome webfonts were restored in `asset/webfonts`.
- This README reflects the current storefront architecture.

## Maintenance
The project is organized for ongoing storefront updates, product management, and UI improvements without a full app rewrite.

