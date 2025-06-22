// ==UserScript==
// @name         Auto-Scriptor Logis
// @namespace    https://github.com/sagittaurius
// @version      3.6.5
// @description  Popup functions for highlight text.
// @author       sagittaurius
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @icon         https://wh40k.lexicanum.com/mediawiki/images/d/db/Machina_Opus.png
// ==/UserScript==

(function() {
    'use strict';

    if (window.AS_Loaded) return;
    window.AS_Loaded = true;

    // ========== CONFIG ========== //
    const CURR_UNITS = {
        'k': 1e3, 'm': 1e6, 'triệu': 1e6, 'tr': 1e6, 'tỷ': 1e9, 'tỉ': 1e9, 'b': 1e9,
        'thousand': 1e3, 'grand': 1e3, 'l': 1e5, 'lakh': 1e5, 'million': 1e6,
        'mil': 1e6, 'cr': 1e7, 'crore': 1e7, 'billion': 1e9, 'bn': 1e9,
        'bil': 1e9, 't': 1e12, 'trillion': 1e12, 'tril': 1e12, 'triệu tỷ':1e15,'triệu tỉ': 1e15
    };

    const CURR_SYMBOLS = {
        '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₩': 'KRW', '₫': 'VND', '₹': 'INR',
        '₱': 'PHP', '฿': 'THB', '₴': 'UAH', '₸': 'KZT', '₽': 'RUB', '₪': 'ILS', '₡': 'CRC',
        'R$': 'BRL', 'Mex$': 'MXN', 'COL$': 'COP', 'CLP$': 'CLP', 'S/.': 'PEN', 'QR': 'QAR',
        'SR': 'SAR', 'AED': 'AED', 'KD': 'KWD', 'RM': 'MYR', 'NT$': 'TWD', 'Rp': 'IDR',
        'R': 'ZAR', 'zł': 'PLN', 'CHF': 'CHF', 'A$': 'AUD', 'NZ$': 'NZD', 'CDN$': 'CAD',
        'HK$': 'HKD', 'S$': 'SGD', '$U': 'UYU', '円': 'JPY', '元': 'CNY', 'RMB': 'CNY',
        'won': 'KRW', 'wons': 'KRW', 'yen': 'JPY', 'yuan': 'CNY', 'euro': 'EUR', 'euros': 'EUR',
        'pound': 'GBP', 'pounds': 'GBP', 'dollar': 'USD', 'dollars': 'USD', 'đồng': 'VND',
        'dong': 'VND', 'dongs': 'VND', 'baht': 'THB', 'rupee': 'INR', 'rupees': 'INR',
        'real': 'BRL', 'reais': 'BRL', 'ringgit': 'MYR', 'shekel': 'ILS', 'shekels': 'ILS',
        'dinar': 'KWD', 'dinars': 'KWD', 'dirham': 'AED', 'dirhams': 'AED', 'sol': 'PEN',
        'soles': 'PEN', 'ruble': 'RUB', 'rubles': 'RUB', 'franc': 'CHF', 'francs': 'CHF',
        'colon': 'CRC', 'colones': 'CRC', 'vnd': 'VND', 'vnđ': 'VND', 'đ': 'VND', 'd': 'VND',
        'kr': ['NOK', 'SEK', 'DKK'], 'kroner': ['NOK', 'SEK', 'DKK'],
        'peso': ['MXN', 'COP', 'CLP', 'ARS', 'PHP'], 'riyal': ['SAR', 'QAR'], 'riyals': ['SAR', 'QAR']
    };

    const COMMON_CURRS = [
        'AED', 'ARS', 'AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'CRC',
        'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'IDR', 'ILS', 'INR', 'JPY', 'KRW',
        'KWD', 'KZT', 'MXN', 'MYR', 'NOK', 'NZD', 'PEN', 'PHP', 'PLN', 'QAR',
        'RUB', 'SAR', 'SEK', 'SGD', 'THB', 'TWD', 'UAH', 'USD', 'UYU', 'VND',
        'ZAR'
    ];

    const escRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const getCurrSyms = () => {
        return Object.keys(CURR_SYMBOLS).map(s => escRegExp(s)).join('|');
    };

    const getCurrCodes = () => COMMON_CURRS.join('|');

    const CFG = {
        CURR: {
            debug: false,
            baseCurr: GM_getValue('baseCurr', 'VND'),
            api: {
                primary: 'https://open.er-api.com/v6/latest/',
                fallback: 'https://api.exchangerate-api.com/v4/latest/'
            },
            cache: {
                minRefresh: 864e5,
                maxAge: 1728e5
            }
        },
        RX: {
            TEMP: /^([-+]?\d+[,.]?\d*)\s*°?\s*(C|F|℃|℉|celsius|fahrenheit)\b/i,
            TLD: /\b[\w.-]+\.[a-z]{2,}\b/i,
            MEAS: /^([-+]?\d+(?:[.,]\d+)?)\s*(mm|cm|km|m|in|ft|yd|mi|["']|millimeters?|centimeters?|meters?|kilometers?|inches?|feet|foot|yards?|miles?)\b/i,
            MASS: /^([\d,\.]+)\s*(kg|g|lb|oz|lbs|pound|pounds|kilograms|grams|ounces|tons)$/i,
            TIME: /^(\d{1,2}):?(\d{2})?\s*(AM|PM|a\.m\.|p\.m\.)\s*\(?([A-Z]{2,4})\)?$/i,
            TIME24: /^(\d{1,2}):?(\d{2})?\s*\(?([A-Z]{2,4})\)?$/i,
            INT_CURR: /^([\d,.]+)\s*(?!gal|qt|fl|liter|ml|oz|L)([A-Z]{3})$/i,
            VND: /^(?:([\d,.]+)\s*(k|ngàn|nghìn|m|triệu|tr|tỷ|tỉ|b)?\s*(₫|đ|d|vnd|vnđ|đồng|dongs?)|(₫|đ|d|vnd|vnđ|đồng|dongs?)\s*([\d,.]+)\s*(k|ngàn|nghìn|m|triệu|tr|tỷ|tỉ|b)?)$/i,
            PRE_CURR: new RegExp(`^(${getCurrSyms()}|${getCurrCodes()})\\s*([\\d,.]+)(?:\\s*([a-z]+))?`, 'i'),
            SUF_CURR: new RegExp(`^([\\d,.]+)\\s*([a-z]+)?\\s*(?!lbs|lb)(${getCurrSyms()}|${getCurrCodes()})$`, 'i'),
            LIQ: /^([\d,\.]+)\s*(gal(?:lons?)?|qt|quarts?|(?:fl(?:uid)?\.?\s*)+oz(?:es)?|m(?:illi)?l(?:iters?)?|l(?:iters?)?)\b/i,
            SPEED: /^([\d,\.]+)\s*(km\/h|kph|mph|knots?)\s*$/i,
            FUEL: /^([\d,\.]+)\s*(mpg|l\/100km|km\/l)\s*$/i,
            POWER: /^([\d,\.]+)\s*(kw|hp|ps)(?!\s*[A-Z]{3}$)\s*$/i,
            TORQUE: /^([\d,\.]+)\s*(nm|lb-?ft|lb-?f?t)(?!\s*[A-Z]{3}$)\s*$/i,
            AREA: /^([\d,\.]+)\s*(sq\s*ft|sq\s*m|m²|ft²|acre|hectare|ha)\s*$/i,
            PRESSURE: /^([\d,\.]+)\s*(psi|bar|kpa|atm|mmhg)(?!\s*[A-Z]{3}$)\s*$/i
        }
    };

    const SEARCH_ENG = {
        'Google': 'https://www.google.com/search?q=',
        'Ecosia': 'https://www.ecosia.org/search?q=',
        'Startpage':'https://www.startpage.com/sp/search?q=',
        'Yandex': 'https://yandex.com/?q=',
        'DuckDuckGo': 'https://duckduckgo.com/?q=',
        'Bing': 'https://www.bing.com/search?q='
    };

    const TZ = {
        'PT': { o: -8, d: -7, r: 'NA' },
        'PST': { o: -8, d: null },
        'PDT': { o: -7, d: null },
        'MT': { o: -7, d: -6, r: 'NA' },
        'CT': { o: -6, d: -5, r: 'NA' },
        'ET': { o: -5, d: -4, r: 'NA' },
        'EST': { o: -5, d: -4, r: 'NA' },
        'EDT': { o: -4, d: null },
        'GMT': { o: 0, d: null },
        'BST': { o: 0, d: 1, r: 'EU' },
        'IST': { o: 0, d: 1, r: 'EU' },
        'CET': { o: 1, d: 2, r: 'EU' },
        'CEST': { o: 2, d: null },
        'EET': { o: 2, d: 3, r: 'EU' },
        'EEST': { o: 3, d: null },
        'WAT': { o: 1, d: null },
        'CAT': { o: 2, d: null },
        'EAT': { o: 3, d: null },
        'IST-INDIA': { o: 5.5, d: null },
        'BST-BANGLADESH': { o: 6, d: null },
        'PKT': { o: 5, d: null },
        'NPT': { o: 5.75, d: null },
        'ICT': { o: 7, d: null },
        'CST': { o: 8, d: null },
        'JST': { o: 9, d: null },
        'KST': { o: 9, d: null },
        'AEST': { o: 10, d: null },
        'AEDT': { o: 11, d: null },
        'ACST': { o: 9.5, d: null },
        'BRT': { o: -3, d: null },
        'ART': { o: -3, d: null },
        'AST': { o: 3, d: null },
        'GST': { o: 4, d: null },
        'UTC': { o: 0, d: null },
        'Z': { o: 0, d: null },
    'MDT': { o: -6, d: null },
    'MST': { o: -7, d: null },
    'CDT': { o: -5, d: null },
    'ADT': { o: -3, d: null },
    'NST': { o: -3.5, d: -2.5 },
    'NDT': { o: -2.5, d: null },
    'MET': { o: 1, d: 2, r: 'EU' },
    'WET': { o: 0, d: 1, r: 'EU' },
    'WEST': { o: 1, d: null },
    'MSK': { o: 3, d: null }
};

    const DST_R = {
        'NA': {
            getStart: (y) => {
                const m = new Date(y, 2, 1);
                const d = (7 - m.getDay()) % 7;
                const s = new Date(m);
                s.setDate(1 + d + 7);
                return new Date(s.getFullYear(), s.getMonth(), s.getDate(), 2);
            },
            getEnd: (y) => {
                const n = new Date(y, 10, 1);
                const d = (7 - n.getDay()) % 7;
                const f = new Date(n);
                f.setDate(1 + d);
                return new Date(f.getFullYear(), f.getMonth(), f.getDate(), 2);
            }
        },
        'EU': {
            getStart: (y) => {
                const m = new Date(y, 2, 31);
                m.setDate(31 - m.getDay());
                return new Date(Date.UTC(y, 2, m.getDate(), 1));
            },
            getEnd: (y) => {
                const o = new Date(y, 9, 31);
                o.setDate(31 - o.getDay());
                return new Date(Date.UTC(y, 9, o.getDate(), 1));
            }
        }
    };

    class AutoScriptor {
        static POPUP_HIDE = 1e4;

        constructor() {
            this.fmt = (num) => num.toLocaleString(undefined, { maximumFractionDigits: 2 });
            this.currBase = CFG.CURR.baseCurr;
            this.lastBase = GM_getValue('lastBaseCurr');
            this.popup = null;
            this.rates = null;
            this.lastFetch = 0;
            this.btnHandlers = new WeakMap();
            this.mousePos = { x: 0, y: 0 };
            this.currCheckInt = null;
            this.init();
        }

        init() {
            this.handleCurrChange();
            this.setupEvents();
            this.currCheckInt = setInterval(() => this.checkCurrChange(), 86400);
        }

        clearSel() {
            window.getSelection ? window.getSelection().removeAllRanges() : document.selection.empty();
        }

        get cacheKey() {
            return `currRates_${this.currBase}`;
        }

        handleCurrChange() {
            this.lastBase = GM_getValue('lastBaseCurr', this.currBase);
            if (this.lastBase && this.lastBase !== this.currBase) {
                console.log(`Curr changed from ${this.lastBase} to ${this.currBase}`);
                this.cleanupOldCurr(this.lastBase);
                GM_setValue('lastBaseCurr', this.currBase);
                this.lastBase = this.currBase;
                this.rates = null;
                this.fetchRates(true);
            }
        }

        checkCurrChange() {
            const newCurr = GM_getValue('baseCurr', this.currBase);
            if (newCurr !== this.currBase) {
                console.log(`Curr changed from ${this.currBase} to ${newCurr}`);
                this.cleanupOldCurr(this.currBase);
                this.currBase = newCurr;
                GM_setValue('lastBaseCurr', newCurr);
                this.rates = null;
                this.fetchRates(true);
            }
        }

        cleanupOldCurr(oldCurr) {
            if (!oldCurr) return;
            GM_deleteValue(`currRates_${oldCurr}`);
            console.log(`Cleaned up old curr data for ${oldCurr}`);
        }

        async fetchRates(force = false) {
            const now = Date.now();
            const cached = GM_getValue(this.cacheKey);

            if (!force && cached) {
                const age = now - cached.t;
                if (age < CFG.CURR.cache.minRefresh) {
                    this.rates = cached.r;
                    return cached.r;
                }
                if (age < CFG.CURR.cache.maxAge) {
                    this.rates = cached.r;
                    this._refreshBG();
                    return cached.r;
                }
            }

            try {
                const ep = `${CFG.CURR.api.primary}${this.currBase}`;
                const res = await new Promise((res, rej) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: ep,
                        timeout: 5000,
                        onload: (r) => r.status === 200 ? res(r.responseText) : rej(new Error(`HTTP ${r.status}`)),
                        onerror: rej
                    });
                });

                const newR = JSON.parse(res).rates;
                GM_setValue(this.cacheKey, { r: newR, t: Date.now() });
                this.rates = newR;
                return newR;
            } catch (e) {
                console.error('Failed to fetch rates:', e);
                return cached?.r || null;
            }
        }

        _refreshBG() {
            const cached = GM_getValue(this.cacheKey);
            if (!cached) return;

            const age = Date.now() - cached.t;
            if (age < CFG.CURR.cache.minRefresh) return;

            this.fetchRates()
                .then(() => console.log('BG rate refresh done'))
                .catch(e => console.warn('BG refresh failed:', e));
        }

        setupEvents() {
            document.addEventListener('mouseup', this.deb(this.handleMouseUp.bind(this), 10));
            document.addEventListener('click', this.handleClick.bind(this));
            document.addEventListener('mousemove', this.trackMouse.bind(this));
            window.addEventListener('unload', this.cleanup.bind(this));
        }

        cleanup() {
            document.removeEventListener('mouseup', this.handleMouseUp);
            document.removeEventListener('click', this.handleClick);
            document.removeEventListener('mousemove', this.trackMouse);
            clearInterval(this.currCheckInt);
            this.removePopup();
        }

        handleMouseUp(e) {
            const sel = window.getSelection().toString().trim();
            if (sel && !e.target.closest('.as-popup')) {
                this.mousePos = { x: e.clientX, y: e.clientY };
                const popup = this.createPopup();

                if (CFG.RX.TLD.test(sel)) {
                    this.addBtn(popup, '🌐 Open', () => {
                        window.open(sel.startsWith('http') ? sel : `https://${sel}`, '_blank');
                    });
                    popup.appendChild(this.createSep());
                }

                this.addBtn(popup, '📋 Copy', () => {
                    navigator.clipboard.writeText(sel);
                });
                popup.appendChild(this.createSep());

                this.addSearchBtn(popup, sel);
                this.addConvRes(popup, sel);
                document.body.appendChild(popup);

                setTimeout(() => {
                    if (this.popup === popup && !popup.matches(':hover')) {
                        this.clearSel();
                        this.removePopup();
                    }
                }, AutoScriptor.POPUP_HIDE);
            }
        }

        handleClick(e) {
            if (!e.target.closest('.as-popup')) this.removePopup();
        }

        trackMouse(e) {
            this.mousePos = { x: e.pageX, y: e.pageY };
        }

        createPopup() {
    this.removePopup();

    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed !important;
        background: ${GM_getValue('bgColor', '#212121')} !important;
        border-radius: 6px !important;
        padding: 4px !important;
        z-index: 2147483647 !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
        color: white !important;
        font-size: 16px !important;
        display: flex !important;
        gap: 4px !important;
        align-items: center !important;
        pointer-events: auto !important;
        transform: translateY(5px) !important;
        max-width: calc(100vw - 20px) !important;
        overflow: hidden !important;
        white-space: nowrap !important;
    `;

    // Create temporary container to measure content width
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: absolute !important;
        visibility: hidden !important;
        display: flex !important;
        gap: 4px !important;
        padding: 4px !important;
        white-space: nowrap !important;
    `;

    // Add sample buttons to measure (using longest likely text)
    const sampleBtn = document.createElement('button');
    sampleBtn.textContent = '📋 Copy Long Text'; // Using longer text for measurement
    tempContainer.appendChild(sampleBtn.cloneNode(true));
    tempContainer.appendChild(this.createSep());
    tempContainer.appendChild(sampleBtn.cloneNode(true));
    document.body.appendChild(tempContainer);

    // Get estimated width before adding actual buttons
    const estimatedWidth = tempContainer.offsetWidth;
    const estimatedHeight = tempContainer.offsetHeight;
    tempContainer.remove();

    // Calculate initial position with edge avoidance
    const margin = 10;
    let x = Math.min(
        Math.max(this.mousePos.x - estimatedWidth / 2, margin),
        window.innerWidth - estimatedWidth - margin
    );

    let y = Math.min(
        Math.max(this.mousePos.y + 20, margin),
        window.innerHeight - estimatedHeight - margin
    );

    // Apply initial position
    popup.style.setProperty('left', `${x}px`, 'important');
    popup.style.setProperty('top', `${y}px`, 'important');

    popup.className = 'as-popup';
    this.popup = popup;

    // Final adjustment after content is added
    const adjustPosition = () => {
        if (!this.popup) return;

        const rect = this.popup.getBoundingClientRect();
        let adjustedX = parseFloat(this.popup.style.left);
        let adjustedY = parseFloat(this.popup.style.top);

        // Right edge check
        if (rect.right > window.innerWidth - margin) {
            adjustedX = window.innerWidth - rect.width - margin;
        }
        // Left edge check
        if (rect.left < margin) {
            adjustedX = margin;
        }
        // Bottom edge check
        if (rect.bottom > window.innerHeight - margin) {
            adjustedY = window.innerHeight - rect.height - margin;
            this.popup.style.setProperty('transform', 'translateY(-5px)', 'important');
        }
        // Top edge check
        if (rect.top < margin) {
            adjustedY = margin;
            this.popup.style.setProperty('transform', 'translateY(5px)', 'important');
        }

        // Apply adjustments if needed
        if (adjustedX !== x || adjustedY !== y) {
            this.popup.style.setProperty('left', `${adjustedX}px`, 'important');
            this.popup.style.setProperty('top', `${adjustedY}px`, 'important');
        }
    };

    // Adjust position after the popup is added to DOM and has actual content
    setTimeout(adjustPosition, 0);

    return popup;
}

        addBtn(popup, text, action) {
            const btn = document.createElement('button');
            btn.style.cssText = `
                background: none !important;
                border: none !important;
                align-items: center !important;
                color: ${GM_getValue('btnColor', 'white')} !important;
                cursor: pointer !important;
                padding: 4px 8px !important;
                gap: 4px !important;
                font-size: inherit !important;
                transition: opacity 0.2s !important;
                white-space: nowrap !important
            `;

            btn.textContent = text;

            const handler = (e) => {
                e.stopPropagation();
                action();
                this.clearSel();
                this.removePopup();
            };

            btn.addEventListener('click', handler);
            this.btnHandlers.set(btn, handler);
            popup.appendChild(btn);
            return btn;
        }

        addSearchBtn(popup, sel) {
            return this.addBtn(popup, '🔍 Search', () => {
                try {
                    const eng = GM_getValue('searchEng', 'Google');
                    const url = SEARCH_ENG[eng] || SEARCH_ENG['Google'];
                    window.open(url + encodeURIComponent(sel), '_blank');
                } catch (e) {
                    console.error('Search failed:', e);
                    window.open(SEARCH_ENG['Google'] + encodeURIComponent(sel), '_blank');
                }
            });
        }

        createSep() {
            const sep = document.createElement('span');
            sep.textContent = '|';
            sep.style.cssText = 'margin: 0 3px !important; color: #ccc !important;';
            return sep;
        }

        removePopup() {
            if (this.popup) {
                this.popup.querySelectorAll('button').forEach(btn => {
                    const h = this.btnHandlers.get(btn);
                    if (h) btn.removeEventListener('click', h);
                });
                this.popup.remove();
                this.popup = null;
            }
        }

        async addConvRes(popup, text) {
            const res = await this.convert(text);
            if (res) {
                popup.appendChild(this.createSep());
                const conv = document.createElement('span');
                conv.textContent = res;
                conv.style.cssText = 'margin-left: 5px; color: ' + GM_getValue('btnColor', 'white');
                popup.appendChild(conv);
            }
        }

        deb(func, wait) {
            let t;
            return (...a) => {
                clearTimeout(t);
                t = setTimeout(() => func(...a), wait);
            };
        }

        safeMatch(i, r) {
            return typeof i === 'string' ? i.match(r) : null;
        }

parseNum(i) {
    if (typeof i !== 'string') return NaN;

    // Match numbers with optional thousands separators and decimals
    const numMatch = i.match(/^[-+]?[\d,.]+/);
    if (!numMatch) return NaN;

    let s = numMatch[0];
    const neg = s.startsWith('-');
    if (neg) s = s.substring(1);

    // Special case for INR format (##,##,###.##)
    const isINRFormat = /^\d{1,2}(,\d{2})+(,\d{3})(\.\d+)?$/.test(s);

    if (isINRFormat) {
        // Indian format: 12,34,567.89 → 1234567.89
        s = s.replace(/,/g, '');
        const r = parseFloat(s);
        return neg ? -r : r;
    }

    // Check if comma is used as thousand separator (has 3 digits after comma)
    const hasThousandsComma = /,\d{3}(?:\D|$)/.test(s);

    // Check if period is used as thousand separator (European format)
    const hasThousandsPeriod = /\.\d{3}(?:\D|$)/.test(s);

    if (hasThousandsComma) {
        // American/international format: 1,234.56 → 1234.56
        s = s.replace(/,/g, '');
    }
    else if (hasThousandsPeriod) {
        // European format: 1.234,56 → 1234.56
        s = s.replace(/\./g, '');
        s = s.replace(',', '.');
    }
    // If no clear thousands separators, assume comma is decimal
    else if (s.includes(',')) {
        s = s.replace(',', '.');
    }

    const r = parseFloat(s);
    return neg ? -r : r;
}

/**
 * Converts unit abbreviations to numeric multipliers
 * - Case insensitive (k/K, m/M)
 * - Supports international units (k, m, b) and Vietnamese (ngàn, triệu, tỷ)
 * - Uses the existing CURR_UNITS constant
 */
getMult(u) {
    if (!u) return 1;

    // Normalize input (lowercase, remove plural 's', trim whitespace)
    const normalized = u.toLowerCase().replace(/s$/, '').trim();

    // Return multiplier from the existing CURR_UNITS or 1 if not found
    return CURR_UNITS[normalized] || 1;
}

        getCurrFromSym(s) {
            if (!s) return CFG.CURR.baseCurr;
            const n = s.toLowerCase();

            const c = CURR_SYMBOLS[s] || CURR_SYMBOLS[n];
            if (!c) {
                for (const [sym, curr] of Object.entries(CURR_SYMBOLS)) {
                    if (typeof curr === 'string' && curr.toLowerCase() === n) return curr;
                    if (Array.isArray(curr) && curr.some(c => c.toLowerCase() === n)) return curr[0];
                }
                return s;
            }

            return Array.isArray(c) ? c[0] : c;
        }

        formatCurr(a, c) {
            try {
                return new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency: c,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).format(a);
            } catch (e) {
                return `${a.toFixed(2)} ${c}`;
            }
        }

        async convertCurr(a, f) {
            const t = CFG.CURR.baseCurr;
            if (f === t) return null;

            const r = await this.fetchRates();
            if (!r) return "Rates unavailable";

            const b = f === CFG.CURR.baseCurr ? a : a / (r[f] || 1);
            const conv = b;

            return {
                from: this.formatCurr(a, f),
                to: this.formatCurr(conv, t)
            };
        }

        parseCurr(i) {

          if (CFG.RX.SPEED.test(i) || CFG.RX.FUEL.test(i)|| CFG.RX.LIQ.test(i)) {
        return null;
    }
          //if (this.convertLiq(i)) return null;
    const pats = [
        {
    test: (s) => s.match(CFG.RX.VND),
    parse: (m) => {
        const numStr = m[1] || m[5];
        const unit = m[2] || m[6] || '';
        return {
            a: this.parseNum(numStr) * this.getMult(unit),
            c: 'VND'
        };
    }
},
      {
            test: (s) => s.match(/^(₹|INR|Rs?\.?)\s*(\d{1,2}(?:,\d{2})*(?:,\d{3})(?:\.\d+)?)\b/i),
            parse: (m) => ({
                a: this.parseNum(m[2]),
                c: 'INR'
            })
        },
        {
            test: (s) => s.match(/^(\d{1,2}(?:,\d{2})*(?:,\d{3})(?:\.\d+)?)\s*(₹|INR|Rs?\.?|rupees?)\b/i),
            parse: (m) => ({
                a: this.parseNum(m[1]),
                c: 'INR'
            })
        },
       /* // GBP patterns
        {
            test: (s) => s.match(/^£\s*([\d,\.]+)\s*(pounds?|gbp)?$/i),
            parse: (m) => ({
                a: this.parseNum(m[1]),
                c: 'GBP'
            })
        },
        {
            test: (s) => s.match(/^([\d,\.]+)\s*(pounds?|gbp)\s*$/i),
            parse: (m) => ({
                a: this.parseNum(m[1]),
                c: 'GBP'
            })
        },*/
        // General currency patterns
        {
            test: (s) => this.safeMatch(s, CFG.RX.INT_CURR),
            parse: (m) => ({
                a: this.parseNum(m[1]),
                c: m[2].toUpperCase()
            })
        },
        {
            test: (s) => this.safeMatch(s, CFG.RX.PRE_CURR),
            parse: (m) => {
                const baseValue = this.parseNum(m[2]);
                const multiplier = m[3] ? this.getMult(m[3]) : 1;
                return {
                    a: baseValue * multiplier,
                    c: this.getCurrFromSym(m[1])
                };
            }
        },
        {
            test: (s) => this.safeMatch(s, CFG.RX.SUF_CURR),
            parse: (m) => {
                const baseValue = this.parseNum(m[1]);
                const multiplier = m[2] ? this.getMult(m[2]) : 1;
                return {
                    a: baseValue * multiplier,
                    c: this.getCurrFromSym(m[3])
                };
            }
        }
    ];

    for (const {test, parse} of pats) {
        const m = test(i);
        if (m) {
            const r = parse(m);
            if (!isNaN(r.a)) return r;
        }
    }
    return null;
}

        convertMeas(i) {
    const m = i.match(CFG.RX.MEAS);
    if (!m) return false;

    const val = this.parseNum(m[1]);
    const raw = m[2].toLowerCase();

    const u = raw.replace(/s$/, ''); // remove plural

    if (['mm', 'millimeter'].includes(u)) {
        const inches = val * 0.0393701;
        return `${this.fmt(inches)} in`;
    }
    if (['cm', 'centimeter'].includes(u)) {
        const inches = val * 0.393701;
        return inches >= 12
            ? `${this.fmt(inches / 12)} ft (${inches.toLocaleString()} in)`
            : `${this.fmt(inches)} in`;
    }
    if (['m', 'meter'].includes(u)) {
        const feet = val * 3.28084;
        return feet >= 5280
            ? `${this.fmt(feet / 5280)} mi (${feet.toLocaleString()} ft)`
            : `${this.fmt(feet)} ft`;
    }
    if (['km', 'kilometer'].includes(u)) {
        const miles = val * 0.621371;
        return `${this.fmt(miles)} mi`;
    }
    if (['yd', 'yard'].includes(u)) {
        const meters = val * 0.9144;
        return meters >= 1000
            ? `${this.fmt(meters / 1000)} km (${meters.toLocaleString()} m)`
            : `${this.fmt(meters)} m`;
    }
    if (['in', 'inch', '"'].includes(u)) {
        const mm = val * 25.4;
        return mm >= 1000
            ? `${this.fmt(mm / 1000)} m (${mm.toLocaleString()} mm)`
            : `${this.fmt(mm)} mm`;
    }
    if (['ft', 'foot', 'feet', "'"].includes(u)) {
        const cm = val * 30.48;
        return cm >= 100
            ? `${this.fmt(cm / 100)} m (${cm.toLocaleString()} cm)`
            : `${this.fmt(cm)} cm`;
    }
    if (['mi', 'mile'].includes(u)) {
        const km = val * 1.60934;
        return `${this.fmt(km)} km`;
    }

    return false;
}

        convertMass(i) {
    const m = i.match(CFG.RX.MASS);
    if (!m) return false;

    const a = this.parseNum(m[1]);
    let u = m[2].toLowerCase();

    // Normalize units
    if (['pound', 'pounds', 'lbs'].includes(u)) u = 'lb';
    if (['kilograms', 'kilogram'].includes(u)) u = 'kg';
    if (['grams', 'gram'].includes(u)) u = 'g';
    if (['ounces', 'ounce'].includes(u)) u = 'oz';
    if (['ton', 'tons', 'short ton', 'short tons'].includes(u)) u = 'short ton';
    if (['tonne', 'tonnes', 'metric ton', 'metric tons'].includes(u)) u = 't';

    // Conversion logic with rounding to higher units
    if (u === 'kg') {
        const lb = a * 2.20462;
        if (lb >= 2000) {
            const tons = lb / 2000;
            return `${this.fmt(tons)} short tons (${lb.toLocaleString()} lb)`;
        }
        return `${this.fmt(lb)} lb`;
    }
    if (u === 'g') {
        if (a >= 1000) {
            const kg = a / 1000;
            return `${this.fmt(kg)} kg (${a.toLocaleString()} g)`;
        }
        const oz = a * 0.035274;
        return `${this.fmt(oz)} oz`;
    }
    if (u === 'lb') {
        const kg = a * 0.453592;
        if (kg >= 1000) {
            const tons = kg / 1000;
            return `${this.fmt(tons)} t (${kg.toLocaleString()} kg)`;
        }
        return `${this.fmt(kg)} kg`;
    }
    if (u === 'oz') {
        const g = a * 28.3495;
        if (g >= 1000) {
            const kg = g / 1000;
            return `${this.fmt(kg)} kg (${g.toLocaleString()} g)`;
        }
        return `${this.fmt(g)} g`;
    }
    if (u === 'short ton') {
        const kg = a * 907.185;
        if (kg >= 1000) {
            const metricTons = kg / 1000;
            return `${this.fmt(metricTons)} t (${kg.toLocaleString()} kg)`;
        }
        return `${this.fmt(kg)} kg`;
    }
    if (u === 't') {  // metric tons
        const kg = a * 1000;
        const lb = kg * 2.20462;
        if (lb >= 2000) {
            const shortTons = lb / 2000;
            return `${this.fmt(shortTons)} short tons (${kg.toLocaleString()} kg)`;
        }
        return `${this.fmt(lb)} lb`;
    }

    return false;
}

        convertTime(i) {
            const m = i.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM|a\.m\.|p\.m\.)?\s*\(?([A-Z]{2,4}(?:-[A-Z]+)?)\)?$/i);
            if (!m) return false;

            let [_, h, min, p, tz] = m;
            h = parseInt(h, 10);
            min = min ? parseInt(min, 10) : 0;
            tz = tz.toUpperCase();

            if (p) {
                p = p.replace(/\./g, '').toUpperCase();
                if (p === 'PM' && h < 12) h += 12;
                if (p === 'AM' && h === 12) h = 0;
            }

            const o = this.getTZOffset(tz);
            if (o === null) return false;

            const now = new Date();
            const utc = Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                h,
                min
            );

            const d = new Date(utc - (o * 60 * 60 * 1e3));

            try {
                return `Your Time: ${d.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZoneName: 'short'
                })}`;
            } catch (e) {
                return `Your Time: ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
            }
        }

        getTZOffset(tz, d = new Date()) {
            if (tz === 'IST') return 5.5;

            const t = TZ[tz];
            if (!t) return null;

            if (t.r) {
                const y = d.getFullYear();
                const rule = DST_R[t.r];
                const start = rule.getStart(y);
                const end = rule.getEnd(y);

                if (d >= start && d < end) {
                    return t.d;
                } else {
                    return t.o;
                }
            }

            if (t.d !== null) {
                const m = d.getUTCMonth();
                const day = d.getUTCDate();

                if (m > 2 && m < 9) return t.d;
                if (m === 2 && day >= 25) return t.d;
                if (m === 9 && day <= 7) return t.d;
            }

            return t.o;
        }

        convertTemp(i) {
    const m = i.match(CFG.RX.TEMP);
    if (!m) return false;

    const a = this.parseNum(m[1]);
    const u = m[2].toLowerCase();
    const unit = ['c', '℃', 'celsius'].includes(u) ? 'C'
               : ['f', '℉', 'fahrenheit'].includes(u) ? 'F'
               : null;

    if (unit === 'C') {
        const f = (a * 9/5) + 32;
        return `${f.toFixed(1)}°F`;
    } else if (unit === 'F') {
        const c = (a - 32) * 5/9;
        return `${c.toFixed(1)}°C`;
    }
    return false;
}


        convertLiq(i) {
            const m = i.match(CFG.RX.LIQ);
            if (!m) return false;

            const a = this.parseNum(m[1]);
            const u = m[2].toLowerCase();

            let l;
            switch(u) {
                case 'gal':
                case 'gallon':
                case 'gallons':
                    l = a * 3.78541;
                    return `${l.toFixed(2)} l | ${(l * 1e3).toFixed(0)} ml`;
                case 'qt':
                case 'quart':
                case 'quarts':
                    l = a * 0.946353;
                    return `${l.toFixed(2)} l | ${(l * 1e3).toFixed(0)} ml`;
                case 'fl oz':
                case 'fluid ounce':
                case 'fluid ounces':
                    const ml = a * 29.5735;
                    return `${ml.toFixed(1)} ml | ${(ml / 1e3).toFixed(3)} l`;
                case 'l':
                case 'liter':
                case 'liters':
                    return `${(a * 0.264172).toFixed(2)} gal | ${(a * 33.814).toFixed(1)} fl oz`;
                case 'ml':
                case 'milliliter':
                case 'milliliters':
                    return `${(a / 29.5735).toFixed(2)} fl oz | ${(a / 1e3).toFixed(3)} l`;
            }
            return false;
        }

        convertSpeed(i) {
        const m = i.match(CFG.RX.SPEED);
        if (!m) return false;

        const a = this.parseNum(m[1]);
        const u = m[2].toLowerCase();

        if (u === 'km/h' || u === 'kph') {
            const mph = a * 0.621371;
            return `${this.fmt(mph)} mph`;
        }
        else if (u === 'mph') {
            const kmh = a * 1.60934;
            return `${this.fmt(kmh)} km/h`;
        }
        else if (u === 'knot' || u === 'knots') {
            const kmh = a * 1.852;
            const mph = a * 1.15078;
            return `${this.fmt(kmh)} km/h | ${this.fmt(mph)} mph`;
        }
        return false;
    }

    convertFuel(i) {
        const m = i.match(CFG.RX.FUEL);
        if (!m) return false;

        const a = this.parseNum(m[1]);
        const u = m[2].toLowerCase();

        if (u === 'mpg') {
            // US mpg to l/100km
            const l100km = 235.215 / a;
            return `${this.fmt(l100km)} l/100km`;
        }
        else if (u === 'l/100km') {
            // l/100km to mpg
            const mpg = 235.215 / a;
            return `${this.fmt(mpg)} mpg`;
        }
        else if (u === 'km/l') {
            // km/l to mpg
            const mpg = a * 2.35215;
            return `${this.fmt(mpg)} mpg`;
        }
        return false;
    }

    convertPower(i) {
        const m = i.match(CFG.RX.POWER);
        if (!m) return false;

        const a = this.parseNum(m[1]);
        const u = m[2].toLowerCase();

        if (u === 'kw') {
            const hp = a * 1.34102;
            return `${this.fmt(hp)} hp`;
        }
        else if (u === 'hp' || u === 'ps') {
            const kw = a * 0.7457;
            return `${this.fmt(kw)} kW`;
        }
        return false;
    }

    convertTorque(i) {
        const m = i.match(CFG.RX.TORQUE);
        if (!m) return false;

        const a = this.parseNum(m[1]);
        const u = m[2].toLowerCase();

        if (u === 'nm') {
            const lbft = a * 0.737562;
            return `${this.fmt(lbft)} lb-ft`;
        }
        else if (u === 'lbft' || u === 'lb-ft' || u === 'lbf t') {
            const nm = a * 1.35582;
            return `${this.fmt(nm)} Nm`;
        }
        return false;
    }

    convertArea(i) {
        const m = i.match(CFG.RX.AREA);
        if (!m) return false;

        const a = this.parseNum(m[1]);
        const u = m[2].toLowerCase().replace(/\s+/g, '');

        if (u === 'sqft' || u === 'ft²') {
            const sqm = a * 0.092903;
            return `${this.fmt(sqm)} m²`;
        }
        else if (u === 'sqm' || u === 'm²') {
            const sqft = a * 10.7639;
            return `${this.fmt(sqft)} ft²`;
        }
        else if (u === 'acre') {
            const hectares = a * 0.404686;
            return `${this.fmt(hectares)} ha`;
        }
        else if (u === 'hectare' || u === 'ha') {
            const acres = a * 2.47105;
            return `${this.fmt(acres)} acres`;
        }
        return false;
    }

    convertPressure(i) {
        const m = i.match(CFG.RX.PRESSURE);
        if (!m) return false;

        const a = this.parseNum(m[1]);
        const u = m[2].toLowerCase();

        if (u === 'psi') {
            const bar = a * 0.0689476;
            const kpa = a * 6.89476;
            return `${this.fmt(bar)} bar | ${this.fmt(kpa)} kPa`;
        }
        else if (u === 'bar') {
            const psi = a * 14.5038;
            return `${this.fmt(psi)} psi`;
        }
        else if (u === 'kpa') {
            const psi = a * 0.145038;
            return `${this.fmt(psi)} psi`;
        }
        else if (u === 'atm') {
            const psi = a * 14.6959;
            return `${this.fmt(psi)} psi`;
        }
        else if (u === 'mmhg') {
            const psi = a * 0.0193368;
            return `${this.fmt(psi)} psi`;
        }
        return false;
    }

        async convert(i) {
    const res = [];

    // First check for unambiguous unit conversions
    const unitResults = await Promise.all([
        this.convertSpeed(i),
        this.convertFuel(i),
        this.convertPower(i),
        this.convertTorque(i),
        this.convertArea(i),
        this.convertPressure(i),
        this.convertMass(i),
        this.convertMeas(i),
        this.convertTemp(i),
        this.convertLiq(i),
        (CFG.RX.TIME.test(i) || CFG.RX.TIME24.test(i)) ? this.convertTime(i) : null
    ].filter(Boolean));

    unitResults.forEach(result => {
        if (result) res.push(result);
    });

    // Only check for currency if no unit conversions were found
    if (res.length === 0) {
        const curr = this.parseCurr(i);
        if (curr) {
            try {
                const conv = await this.convertCurr(curr.a, curr.c);
                if (conv) res.push(conv.to);
            } catch (e) {
                console.warn('Currency conversion failed:', e);
            }
        }
    }

    return res.length > 0 ? res.join(' | ') : false;
  }
}


    // ========== SETTINGS ========== //
    let settingsOverlay, settingsDialog;

    function showSettings() {
        if (settingsOverlay) {
            document.body.appendChild(settingsOverlay);
            return;
        }

        const ov = document.createElement('div');
        ov.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0,0,0,0.5) !important;
            z-index: 10000 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
        `;

        const d = document.createElement('div');
        d.style.cssText = `
            background: #fff !important;
            color: black !important;
            padding: 20px !important;
            border-radius: 8px !important;
            width: 300px !important;
            max-width: 90% !important;
            max-height: 90vh !important;
            overflow: auto !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
        `;

        const t = document.createElement('h3');
        t.textContent = 'Auto-Scriptor Logis Settings';
        t.style.cssText = 'margin-top: 0 !important; margin-bottom: 20px !important;';

        const f = document.createElement('div');
        f.style.cssText = 'display: grid !important; gap: 12px !important;';

        const fields = [
            {
                id: 'bg-color',
                label: 'Background Color',
                type: 'color',
                value: GM_getValue('bgColor', '#212121')
            },
            {
                id: 'btn-color',
                label: 'Button Color',
                type: 'color',
                value: GM_getValue('btnColor', 'white')
            },
            {
                id: 'search-engine',
                label: 'Search Engine',
                type: 'select',
                options: Object.keys(SEARCH_ENG),
                value: GM_getValue('searchEng', 'Google')
            },
            {
                id: 'base-currency',
                label: 'Base Currency',
                type: 'select',
                options: COMMON_CURRS,
                value: GM_getValue('baseCurr')
            }
        ];

        fields.forEach(field => {
            const c = document.createElement('div');
            c.style.cssText = 'display: flex !important; justify-content: space-between !important; align-items: center !important;';

            const l = document.createElement('label');
            l.textContent = field.label;
            l.style.cssText = 'margin-right: 10px !important; font-size: 14px !important;';

            let i;
            if (field.type === 'select') {
                i = document.createElement('select');
                i.id = field.id;
                i.style.cssText = 'padding: 4px !important; width: 150px !important; background: white !important; color: black !important; border: 1px solid #ccc !important;';

                field.options.forEach(o => {
                    const opt = document.createElement('option');
                    opt.value = o;
                    opt.textContent = o;
                    if (o === field.value) opt.selected = true;
                    i.appendChild(opt);
                });
            } else {
                i = document.createElement('input');
                i.type = field.type;
                i.id = field.id;
                i.value = field.value;
                i.style.cssText = 'padding: 4px !important; width: 150px !important; background: white !important; color: black !important; border: 1px solid #ccc !important; height: 30px !important;';
            }

            c.appendChild(l);
            c.appendChild(i);
            f.appendChild(c);
        });

        const btns = document.createElement('div');
        btns.style.cssText = 'display: flex !important; justify-content: flex-end !important; margin-top: 20px !important; gap: 10px !important;';

        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';
        cancel.style.cssText = 'padding: 6px 12px !important; cursor: pointer !important; color: black !important;';
        cancel.onclick = () => document.body.removeChild(ov);

        const save = document.createElement('button');
        save.textContent = 'Save';
        save.style.cssText = 'padding: 6px 12px !important; cursor: pointer !important; color: black !important;';
        save.onclick = () => {
            const newC = document.getElementById('base-currency').value;
            const oldC = GM_getValue('baseCurr');

            GM_setValue('bgColor', document.getElementById('bg-color').value);
            GM_setValue('btnColor', document.getElementById('btn-color').value);
            GM_setValue('searchEng', document.getElementById('search-engine').value);

            if (newC !== oldC) {
                GM_deleteValue(`currRates_${oldC}`);
                GM_setValue('baseCurr', newC);
                GM_setValue('lastBaseCurr', newC);
            }

            document.body.removeChild(ov);
            window.location.reload();
        };

        const footer = document.createElement('div');
        footer.style.cssText = 'text-align: center !important; font-size: 0.9em !important; margin-top: 20px !important; color: #000 !important;';
        footer.textContent = 'Page will reload to apply settings';

        btns.appendChild(cancel);
        btns.appendChild(save);

        d.appendChild(t);
        d.appendChild(f);
        d.appendChild(footer);
        d.appendChild(btns);
        ov.appendChild(d);
        document.body.appendChild(ov);

        settingsOverlay = ov;
        settingsDialog = d;
    }

    GM_registerMenuCommand('⚙️ Settings', showSettings);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new AutoScriptor());
    } else {
        new AutoScriptor();
    }
})();
