((): void => {
    'use strict';
    const CANDIDATE_KEYS: readonly string[] = ['en', 'zh', 'hans', 'hant', 'cn', 'tw', 'hk', 'sg', 'mo', 'my'] as const;
    type CandidateKey = typeof CANDIDATE_KEYS[number];

    /**
     * Check if {@link obj} is a candidate key.
     * @param {string} obj The string to check.
     * @returns {boolean} `true` if the given string is a candidate key.
     */
    function isCandidateKeys(obj: string): obj is CandidateKey {
        return CANDIDATE_KEYS.indexOf(obj) !== -1;
    }

    type RequireAtLeastOne<T> = {
        [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
    }[keyof T];

    type PlainObject = Record<string, unknown>;

    /**
     * Check if {@link obj} is a plain object.
     * @param {unknown} obj The object to check.
     * @returns {boolean} `true` if the given object is a plain object.
     */
    function isPlainObject(obj: unknown): obj is PlainObject {
        // return $.isPlainObject(obj);
        if (!obj || toString.call(obj) !== '[object Object]') {
            return false;
        }
        const proto = Object.getPrototypeOf(obj);
        if (!proto) {
            return true;
        }
        const constructor: unknown = Object.hasOwnProperty.call(proto, 'constructor') && proto.constructor;
        return typeof constructor === 'function' && Object.toString.call(constructor) === Object.toString.call(Object);
    }

    type EmptyObject = Record<string, never>;

    /**
     * Check if {@link obj} is an empty object.
     * @param {PlainObject} obj The object to check.
     * @returns {boolean} `true` if the given object is an empty object.
     */
    function isEmptyObject(obj: PlainObject): obj is EmptyObject {
        // return $.isEmptyObject(obj);
        for (const _ in obj) {
            return false;
        }
        return true;
    }

    type Candidates = RequireAtLeastOne<{ [K in CandidateKey]?: string }>;

    /**
     * Check if {@link val} are valid candidates.
     * @param {unknown} obj The object to check.
     * @returns {boolean} `true` if the given object is a valid candidates.
     */
    function areCandidates(obj: unknown): obj is Candidates {
        return isPlainObject(obj) && !isEmptyObject(obj) &&
            Object.keys(obj).every(
                (key: string): boolean =>
                    isCandidateKeys(key) &&
                    typeof obj[key] === 'string'
            );
    }

    type TranspiledMessages = Record<string, string | undefined>;

    const FALLBACK_TABLE: Record<string, readonly CandidateKey[] | undefined> = {
        'zh': ['zh', 'hans', 'hant', 'cn', 'tw', 'hk', 'sg', 'mo', 'my', 'en'],
        'zh-hans': ['hans', 'cn', 'sg', 'my', 'zh', 'hant', 'tw', 'hk', 'mo', 'en'],
        'zh-hant': ['hant', 'tw', 'hk', 'mo', 'zh', 'hans', 'cn', 'sg', 'my', 'en'],
        'zh-cn': ['cn', 'hans', 'sg', 'my', 'zh', 'hant', 'tw', 'hk', 'mo', 'en'],
        'zh-sg': ['sg', 'hans', 'cn', 'my', 'zh', 'hant', 'tw', 'hk', 'mo', 'en'],
        'zh-my': ['my', 'hans', 'cn', 'sg', 'zh', 'hant', 'tw', 'hk', 'mo', 'en'],
        'zh-tw': ['tw', 'hant', 'hk', 'mo', 'zh', 'hans', 'cn', 'sg', 'my', 'en'],
        'zh-hk': ['hk', 'hant', 'mo', 'tw', 'zh', 'hans', 'cn', 'sg', 'my', 'en'],
        'zh-mo': ['mo', 'hant', 'hk', 'tw', 'zh', 'hans', 'cn', 'sg', 'my', 'en']
    };
    const MESSAGE_STORAGE: Record<string, Candidates> = {
        'ha-err': {
            hans: 'HanAssist 错误：$1。\n有关 HanAssist 的更多信息，请参见 https://example.com/。',
            hant: 'HanAssist 錯誤：$1。\n有關 HanAssist 的更多資訊，請參見 https://example.com/。',
            en: 'HanAssist error: $1.\nFor more information of HanAssist, see https://example.com/.'
        },
        'ha-inv-param': {
            hans: '无效参数“$1”$2',
            hant: '無效參數「$1」$2',
            en: 'Invalid parameter "$1"$2'
        },
        'ha-inv-param-detailed': {
            hans: '，应为“$1”，实为“$2”',
            hant: '，應為「$1」，實為「$2」',
            en: ', Expected $1 but got $2'
        },
        'ha-no-msg': {
            hans: '无法从“$1”中选择正确的消息，当前区域设置：$2',
            hant: '無法從「$1」中選擇正確的訊息，地區設定：$2',
            en: 'Failed to select message from "$1" in locale "$2"'
        },
        'ha-deprecated': {
            hans: '请使用 $1 作为替代。',
            hant: '請使用 $1 作為替代。',
            en: 'Use $1 instead.'
        },
        'ha-no-key': {
            hans: 'HanAssist：未找到键“$1”。$2',
            hant: 'HanAssist：未找到鍵「$1」。$2',
            en: 'HanAssist: Key "$1" not found. $2'
        },
        'ha-similar': {
            hans: '您是指“$1”吗？',
            hant: '您是指「$1」嗎？',
            en: 'Do you mean "$1"?'
        }
    };

    /**
     * Localize messages in batches. It turns a object like this
```
{
    apple: { hans: '苹果', hant: '蘋果', en: 'apple' },
    banana: { hans: '香蕉', hant: '香蕉', en: 'banana' }
}
```
into this
```
{ apple: '苹果', banana: '香蕉' }
```
     * @param {PlainObject} messages raw messages
     * @param locale locale
     * @returns {TranspiledMessages} transpiled messages
     */
    function batchElect(messages: PlainObject, locale: string): TranspiledMessages {
        const transpiledMsg: TranspiledMessages = Object.create(null);
        for (const key in messages) {
            const candidates: unknown = messages[key];

            if (typeof candidates === 'string') {
                // All locales share the same message
                transpiledMsg[key] = candidates;
            } else if (areCandidates(candidates)) {
                transpiledMsg[key] = elect(candidates, locale);
            } else {
                raiseValidParamError(key.includes(' ') ? `rawMsg['${key}']` : `rawMsg.${key}`,
                    { expected: 'string | Candidates', actual: getTypeName(candidates) });
            }
        }
        return transpiledMsg;
    }

    /**
     * Throw `TypeError` with details about invalid parameters in its message.
     * @param {string} name parameter name
     * @param {{ expected: string, actual: string } | undefined} typeInfo structure to store expected value and actual value.
     */
    function raiseValidParamError(name: string, typeInfo: { expected: string, actual: string } | undefined = undefined): never {
        const typeMessage: string = typeInfo !== undefined ?
            mw.msg('ha-inv-param-detailed', typeInfo.expected, typeInfo.actual) :
            '';
        throw new TypeError(mw.msg('ha-err', mw.msg('ha-inv-param', name, typeMessage)
        ));
    }

    /**
     * Select the target localized entry based on locale.
     * @private
     * @param {Partial<Record<CandidateKey, T>>} candidates candidates
     * @param {string} locale locale
     * @returns {T} target localized entry
     */
    function elect<T>(candidates: Partial<Record<CandidateKey, T>>, locale: string): T {
        const fallback: readonly CandidateKey[] = FALLBACK_TABLE[locale] ?? CANDIDATE_KEYS;

        for (const key of fallback) {
            const winner: T | undefined = candidates[key];
            if (winner !== undefined) {
                return winner;
            }
        }

        let serialized;
        try {
            serialized = JSON.stringify(candidates);
        } catch {
            serialized = null;
        }
        throw new Error(mw.msg('ha-err',
            mw.msg('ha-no-msg', serialized ?? Object.prototype.toString.call(candidates), locale)
        ));
    }

    /**
     * Get the type name of an object to display.
     * @private
     * @param {unknown} obj object to get the type name.
     * @returns {string} type name of the object.
     */
    function getTypeName(obj: unknown): string {
        return Object.prototype.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
    }

    mw.messages.set(batchElect(MESSAGE_STORAGE, mw.config.get('wgUserLanguage')));

    /**
     * Check the type of {@link candidates} in runtime.
     * @param {Candidates | string | [string] | [string, string] | unknown} candidates candidate objects
     * @param {string} arg locale
     * @returns {string} selected string
     */
    function electionProcess(candidates: Candidates | string | [string] | [string, string] | unknown, arg: string): string {
        /**
         * Return a string representing types of values in an array, separated with commas.
         * @param {unknown[]} arr array of values
         * @returns {string} string representation of types of values in an array
         */
        function arrayToStringOfTypes(arr: unknown[]): string {
            return `[${arr.map((i: unknown): string => getTypeName(i)).join(',')}]`;
        }

        if (typeof candidates === 'string') {
            return candidates;
        }

        if (Array.isArray(candidates)) {
            if (candidates.length === 1 && typeof candidates[0] === 'string') {
                return candidates[0];
            }

            if (candidates.length !== 2 || !candidates.every((i: unknown): boolean => typeof i === 'string')) {
                raiseValidParamError('candidates', {
                    expected: 'string | [string] | [string, string]',
                    actual: arrayToStringOfTypes(candidates)
                });
            }
            const reCandidates: Candidates = { hans: candidates[0], hant: candidates[1] };
            return electionProcess(reCandidates, arg);
        }

        if (!areCandidates(candidates)) {
            raiseValidParamError('candidates');
        }
        return elect(candidates, arg);
    }

    // #region HanAssist

    class HanAssist {

        // #region implementable

        #messages: TranspiledMessages;
        #warnedBucket: Record<string, boolean | undefined>;

        /**
         * Instantiate a new instance of {@link HanAssist}.
         * @example Assume `wgUserLanguage` is set to `zh-cn`:
```
let ha = new HanAssist( {
        'article': { hans: '条目', hant: '條目' },
        'category': { hans: '分类', hant: '分類' },
        'categories': { hans: '分类', hant: '分類' },
        'image': { hans: '文件', hant: '檔案' },
        'images': { hans: '文件', hant: '檔案' },
        'minute': '分',
        'minutes': '分',
        'second': '秒',
        'seconds': '秒',
        'week': '周',
        'weeks': '周',
        'search': { hans: '搜索', hant: '搜尋' },
        'SearchHint': { hans: '搜索包含%s的页面', hant: '搜尋包含%s的頁面' },
        'web': { hans: '站点', hant: '站點' },
    } );

ha.dump(); // => { 'article': '条目', 'category': '分类', 'categories': '分类', ... }

ha.attach( function( msg ) {
    msg( 'image' ); // => '文件'
    msg( 'image1' ); // => 'image1' (get a warning 'HanAssist：未找到键“image1”。您是指“image”吗？')
} );
```
         * @param {PlainObject} messages raw messages
         * @param {{ locale?: string }} param1 options
         * @param {string} [param1.locale] locale, default to `wgUserLanguage`
         */
        public constructor(messages: PlainObject, { locale }: { locale?: string } = { locale: mw.config.get('wgUserLanguage') }) {
            if (!isPlainObject(messages) || isEmptyObject(messages)) {
                raiseValidParamError('messages');
            }
            if (typeof locale !== 'string') {
                raiseValidParamError('locale');
            }

            this.#messages = Object.freeze(batchElect(messages, locale));
            this.#warnedBucket = Object.create(null);
        }

        /**
         * Execute a function with a message getter as its first parameter.
         * @param {(msg: (key: string) => string | undefined) => unknown} executor function to execute
         */
        public attach(executor: (msg: (key: string) => string | undefined) => unknown): void {
            if (typeof executor !== 'function') {
                raiseValidParamError('executor');
            }

            executor.call(this, (key: string): string | undefined => {
                if (!(key in this.#messages)) {
                    if (!this.#warnedBucket[key]) {
                        setTimeout((): void => this.#missingKey(key), 0);
                    }
                    return key;
                }
                return this.#messages[key];
            });
        }

        /**
         * Get the transpiled messages.
         * @returns {TranspiledMessages} transpiled messages
         */
        public dump(): TranspiledMessages {
            return this.#messages;
        }

        /**
         * Show a warning message about missing keys and similar occurrences.
         * @param {string} key missing key
         */
        #missingKey(key: string): void {
            /**
             * Return the similarity of two strings, from 0.0 to 1.0.
             *
             * From https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
             * @param {string} s1 string to compare
             * @param {string} s2 string to compare
             * @returns {number} similarity of the two strings
             */
            function similarity(s1: string, s2: string): number {
                function editDistance(left: string, right: string): number {
                    const l: string = left.toLowerCase();
                    const r: string = right.toLowerCase();
                    const costs: number[] = new Array<number>();
                    for (let i = 0; i <= l.length; i++) {
                        let lastVal: number = i;
                        for (let j = 0; j <= r.length; j++) {
                            if (i === 0) {
                                costs[j] = j;
                            } else if (j > 0) {
                                let newVal: number = costs[j - 1];
                                if (l[i - 1] !== r[j - 1]) {
                                    newVal = Math.min(newVal, lastVal, costs[j]) + 1;
                                }
                                costs[j - 1] = lastVal;
                                lastVal = newVal;
                            }
                        }
                        if (i > 0) {
                            costs[r.length] = lastVal;
                        }
                    }
                    return costs[r.length];
                }

                const [longer, shorter] = s1.length > s2.length ? [s1, s2] : [s2, s1];
                if (longer.length === 0) {
                    return 1.0;
                }
                return (longer.length - editDistance(longer, shorter)) / longer.length;
            }
            type ElementStruct = { rating: number, elem: string };
            const { elem: similar } = Object.keys(this.#messages)
                .map((elem: string): ElementStruct => ({ rating: similarity(elem, key), elem }))
                .filter(({ rating }: ElementStruct): boolean => rating >= 0.6) // Ignore dissimilar keys
                .reduce((l: ElementStruct, r: ElementStruct): ElementStruct => l.rating >= r.rating ? l : r, { rating: 0, elem: '' });

            this.#warnedBucket[key] = true;
            mw.log.warn(mw.msg('ha-no-key', key, similar ? mw.msg('ha-similar', similar) : ''));
        }

        // #endregion implementable

        // #region static

        /**
         * Return the string, if any, in the current user language.
         * @example Assume `wgUserLanguage` is set to `zh-cn`:
```
HanAssist.localize( { hans: '一天一苹果，医生远离我。', hant: '一天一蘋果，醫生遠離我。' } ) // => '一天一苹果，医生远离我。'

// Shorthand syntax
HanAssist.localize( [ '一天一苹果，医生远离我。', '一天一蘋果，醫生遠離我。' ] ) // => '一天一苹果，医生远离我。'

// Advanced: custom locale
HanAssist.localize(
    { hans: '一天一苹果，医生远离我。', hant: '一天一蘋果，醫生遠離我。' },
    { locale: 'zh-tw' }
    ) // => '一天一蘋果，醫生遠離我。'
```
         * @param {unknown} candidates candidate objects
         * @param {string} [candidates.zh] string in `zh`
         * @param {string} [candidates.hans] string in `zh-hans`
         * @param {string} [candidates.hant] string in `zh-hant`
         * @param {string} [candidates.cn] string in `zh-cn`
         * @param {string} [candidates.tw] string in `zh-tw`
         * @param {string} [candidates.hk] string in `zh-hk`
         * @param {string} [candidates.sg] string in `zh-sg`
         * @param {string} [candidates.mo] string in `zh-mo`
         * @param {string} [candidates.my] string in `zh-my`
         * @param {string} [candidates.en] string in `en`
         * @param {{ locale?: string }} param1 options
         * @param {string} [param1.locale] locale, default to `wgUserLanguage`
         * @returns {string} selected string
         */
        public static localize(candidates: unknown, { locale }: { locale: string } = { locale: mw.config.get('wgUserLanguage') }): string {
            return electionProcess(candidates, locale);
        }

        /**
         * Return the string, if any, in the current user variant.
         *
         * If `wgUserVariant` is undefined, preferred variant in Special:Preference will be used.
         * @example Assume preferred variant is `zh-cn`:
```
HanAssist.vary( { hans: '一天一苹果，医生远离我。', hant: '一天一蘋果，醫生遠離我。' } ) // => '一天一苹果，医生远离我。'

// Shorthand syntax
HanAssist.vary( [ '一天一苹果，医生远离我。', '一天一蘋果，醫生遠離我。' ] ) // => '一天一苹果，医生远离我。'
```
         * @param {Candidates|[string,string]|[string]|string} candidates candidate strings
         * @param {string} [candidates.zh] string in `zh`
         * @param {string} [candidates.hans] string in `zh-hans`
         * @param {string} [candidates.hant] string in `zh-hant`
         * @param {string} [candidates.cn] string in `zh-cn`
         * @param {string} [candidates.tw] string in `zh-tw`
         * @param {string} [candidates.hk] string in `zh-hk`
         * @param {string} [candidates.sg] string in `zh-sg`
         * @param {string} [candidates.mo] string in `zh-mo`
         * @param {string} [candidates.my] string in `zh-my`
         * @param {string} [candidates.en] string in `en`
         * @return {string} selected string
         */
        public static vary(candidates: unknown): string {
            return electionProcess(candidates, mw.config.get('wgUserVariant') || mw.user.options.get('variant'));
        }
        // #endregion static
    }

    // export HanAssist
    window.HanAssist = HanAssist;

    // #endregion HanAssist

    // #region legacy

    // wgULS
    function legacyULS(
        hans: unknown, hant: unknown, cn: unknown, tw: unknown, hk: unknown, sg: unknown,
        zh: unknown, mo: unknown, my: unknown
    ): unknown {
        return legacyUXS(mw.config.get('wgUserLanguage'), hans, hant, cn, tw, hk, sg, zh, mo, my);
    }

    // wgUVS
    function legacyUVS(
        hans: unknown, hant: unknown, cn: unknown, tw: unknown, hk: unknown, sg: unknown,
        zh: unknown, mo: unknown, my: unknown
    ): unknown {
        return legacyUXS(mw.config.get('wgUserVariant'), hans, hant, cn, tw, hk, sg, zh, mo, my);
    }

    // wgUXS
    function legacyUXS(
        wg: string, hans: unknown, hant: unknown, cn: unknown, tw: unknown, hk: unknown,
        sg: unknown, zh: unknown, mo: unknown, my: unknown
    ): unknown {
        try {
            return elect({ hans, hant, cn, tw, hk, sg, zh, mo, my }, wg);
        } catch {
            return undefined;
        }

    }

    mw.log.deprecate(window, 'wgULS', legacyULS, mw.msg('ha-deprecated', 'HanAssist.localize()'));

    mw.log.deprecate(window, 'wgUVS', legacyUVS, mw.msg('ha-deprecated', 'HanAssist.vary()'));

    mw.log.deprecate(window, 'wgUXS', legacyUXS, mw.msg('ha-deprecated', 'HanAssist.localize()'));

    // #endregion legacy
})();
