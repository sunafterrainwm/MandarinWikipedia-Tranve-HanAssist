// <nowiki>
/**
 *  _____________________________________________________________________________
 * |                                                                             |
 * |                    === WARNING: GLOBAL GADGET FILE ===                      |
 * |                  Changes to this page affect many users.                    |
 * |   Please discuss changes on the talk page or on [[WP:VPT]] before editing.  |
 * |_____________________________________________________________________________|
 *
 * @author [[zh:User:Tranve]]
 * @license Unlicense
 * Validated with ESLint.
 */

type ValidKey = "zh" | "hans" | "hant" | "cn" | "tw" | "hk" | "sg" | "mo" | "my" | "en";
type CandidatesRecord = Partial<Record<ValidKey, string>>;
type MessageInfo = Record<string, string | CandidatesRecord>;
type FallbackList = ValidKey[];
type CanCalled = { call: (...args: unknown[]) => unknown }

(function () {
    // 'use strict';
    const privateStorage: Record<string, any> = new WeakMap(),
        FALLBACKS: Record<string, FallbackList> = {
            'zh': ['zh', 'hans', 'hant', 'cn', 'tw', 'hk', 'sg', 'mo', 'my', 'en'],
            'zh-hans': ['hans', 'cn', 'sg', 'my', 'zh', 'hant', 'tw', 'hk', 'mo', 'en'],
            'zh-hant': ['hant', 'tw', 'hk', 'mo', 'zh', 'hans', 'cn', 'sg', 'my', 'en'],
            'zh-cn': ['cn', 'hans', 'sg', 'my', 'zh', 'hant', 'tw', 'hk', 'mo', 'en'],
            'zh-sg': ['sg', 'hans', 'cn', 'my', 'zh', 'hant', 'tw', 'hk', 'mo', 'en'],
            'zh-my': ['my', 'hans', 'cn', 'sg', 'zh', 'hant', 'tw', 'hk', 'mo', 'en'],
            'zh-tw': ['tw', 'hant', 'hk', 'mo', 'zh', 'hans', 'cn', 'sg', 'my', 'en'],
            'zh-hk': ['hk', 'hant', 'mo', 'tw', 'zh', 'hans', 'cn', 'sg', 'my', 'en'],
            'zh-mo': ['mo', 'hant', 'hk', 'tw', 'zh', 'hans', 'cn', 'sg', 'my', 'en']
        },
        DEF_FB: FallbackList = ['en', 'zh', 'hans', 'hant', 'cn', 'tw', 'hk', 'sg', 'mo', 'my'],
        MSG_STORE: MessageInfo = {
            'ha-err': {
                hans: 'HanAssist 错误：$1。\n有关 HanAssist 的更多信息，请参见 https://example.com/。',
                hant: 'HanAssist 錯誤：$1。\n有關 HanAssist 的更多資訊，請參見 https://example.com/。',
                en: 'HanAssist error: $1.\nFor more information of HanAssist, see https://example.com/.'
            },
            'ha-inv-param': {
                hans: '无效参数“$1”', hant: '無效參數“$1”', en: 'Invalid parameter "$1"'
            },
            'ha-no-msg': {
                hans: '无法获取消息，区域设置：$1', hant: '無法獲取訊息，地區設定：$1', en: 'Failed to get message in locale "$1"'
            },
            'ha-deprecated': {
                hans: '请使用 $1 作为替代。', hant: '請使用 $1 作為替代。', en: 'Use $1 instead.'
            },
            'ha-no-key': {
                hans: 'HanAssist：未找到键“$1”。$2', hant: 'HanAssist：未找到鍵「$1」。$2', en: 'HanAssist: Key "$1" not found. $2'
            },
            'ha-similar': {
                hans: '您是指“$1”吗？', hant: '您是指「$1」嗎？', en: 'Do you mean "$1"?'
            }
        };

    function assertCorrectArg(condition: boolean, name: string): void {
        if (!condition) {
            throw new TypeError(mw.msg('ha-err', mw.msg('ha-inv-param', name)));
        }
    }

    function l10n(lang: string, candidates: CandidatesRecord): string {
        const entry: FallbackList = FALLBACKS[lang] || DEF_FB;
        const index: ValidKey | undefined = entry.find((locale: ValidKey): string | undefined => candidates[locale]);
        if (index === undefined) {
            throw new Error(mw.msg('ha-no-msg', lang));
        }
        const msg: string | undefined = candidates[index];
        if (msg === undefined) {
            throw new Error(mw.msg('ha-no-msg', lang));
        }
        return msg;
    }

    function msgL10n(messages: MessageInfo, locale: string) {
        const map: Record<string, string> = Object.create(null);

        for (const entry in messages) {
            const candidates: string | CandidatesRecord = messages[entry];

            if (typeof candidates === 'string') {
                // All locales share the same message
                map[entry] = candidates;
            } else if (areLegalCandidates(candidates)) {
                map[entry] = l10n(locale, candidates);
            } else {
                assertCorrectArg(false, `messages['${entry}']`);
            }
        }
        return map;
    }

    mw.messages.set(msgL10n(MSG_STORE, mw.config.get('wgUserLanguage')));

    function areLegalCandidates(candidates: CandidatesRecord): boolean {
        return $.isPlainObject(candidates) &&
            DEF_FB.some((locale) => typeof candidates[locale] === 'string');
    }

    // From https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
    function similarity(s1: string, s2: string): number {
        function distance(left: string, right: string): number {
            const l: string = left.toLowerCase();
            const r: string = right.toLowerCase();
            const costs: number[] = [];
            for (let i = 0; i <= l.length; i++) {
                let lastVal: number = i;
                for (let j = 0; j <= r.length; j++) {
                    if (i === 0) {
                        costs[j] = j;
                    } else if (j > 0) {
                        const newVal: number =
                            l[i - 1] === r[j - 1] ?
                                costs[j - 1] :
                                Math.min(costs[j - 1], lastVal, costs[j]) + 1;
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

        const [longer, shorter]: string[] = [s1, s2].sort((a: string, b: string): number => b.length - a.length);

        const longerLength: number = longer.length;
        if (longerLength === 0) {
            return 1.0;
        }
        return (longerLength - distance(longer, shorter)) / longerLength;
    }

    /**
     * Helper class for handling Chinese variant conversions.
     */
    class HanAssist {
        /**
         * Create a new {@link HanAssist}.
         *
         * @param {Object} messages messages
         * @param {Object} [options] options
         * @param {string} [options.locale] locale, default to `wgUserLanguage`
         */
        constructor(messages: MessageInfo, { locale = mw.config.get('wgUserLanguage') }: { locale?: string } = {}) {
            assertCorrectArg($.isPlainObject(messages) && !$.isEmptyObject(messages), 'messages');
            assertCorrectArg(typeof locale === 'string', 'locale');
            const privateObj = {
                messages: Object.freeze(msgL10n(messages, locale)),
                warnedBucket: Object.create(null)
            };

            privateStorage.set(this, privateObj);
        }

        /**
         * Execute a function with a message getter as its parameter.
         *
         * @param {Function} executor function to be executed
         */
        attach(executor: CanCalled) {
            assertCorrectArg(typeof executor === 'function', 'executor');
            const storage = privateStorage.get(this);

            executor.call(this, (key: string) => {
                function missingKey(): void {
                    type ElementStruct = { rating: number, elem: string };
                    const { elem: similar } = Object.keys(storage.messages)
                        .map((elem: string): ElementStruct => ({ rating: similarity(key, elem), elem }))
                        .filter(({ rating }: ElementStruct): boolean => rating >= 0.6) // Ignore key if it is not similar enough
                        .reduce((left: ElementStruct, right: ElementStruct): ElementStruct => left.rating >= right.rating ? left : right, { rating: 0, elem: '' });

                    storage.warned[key] = true;
                    const msg: string = similar ? mw.msg('ha-similar', similar) : '';
                    mw.log.warn(mw.msg('ha-no-key', key, msg));
                }

                assertCorrectArg(typeof key === 'string', 'key');

                if (!(key in storage.messages)) {
                    if (!storage.warnedBucket[key]) {
                        setTimeout(missingKey, 0);
                    }
                    return key;
                }

                return storage.messages[key];
            });
        }

        /**
         * Get the transpiled messages.
         *
         * @return {Object} messages
         */
        dump() {
            return privateStorage.get(this).messages;
        }

        /**
         * Return the message, if any, in current user language.
         *
         * @param {Object|string} candidates messages
         * @param {string} [candidates.zh] message in `zh`
         * @param {string} [candidates.hans] message in `zh-hans`
         * @param {string} [candidates.hant] message in `zh-hant`
         * @param {string} [candidates.cn] message in `zh-cn`
         * @param {string} [candidates.tw] message in `zh-tw`
         * @param {string} [candidates.hk] message in `zh-hk`
         * @param {string} [candidates.sg] message in `zh-sg`
         * @param {string} [candidates.mo] message in `zh-mo`
         * @param {string} [candidates.my] message in `zh-my`
         * @param {string} [candidates.en] message in `en`
         * @param {string} [options] options
         * @param {string} [options.locale] locale, default to `wgUserLanguage`
         * @return {string} localized message
         */
        static localize(candidates: CandidatesRecord, { locale = mw.config.get('wgUserLanguage') }: { locale?: string } = {}): string {
            if (typeof candidates === 'string') {
                return candidates;
            }
            assertCorrectArg(areLegalCandidates(candidates), 'candidates');
            assertCorrectArg(typeof locale === 'string', 'locale');

            return l10n(locale, candidates);
        }

        /**
         * Return the message, if any, in current user variant.
         *
         * @param {Object|string} candidates messages
         * @param {string} [candidates.zh] message in `zh`
         * @param {string} [candidates.hans] message in `zh-hans`
         * @param {string} [candidates.hant] message in `zh-hant`
         * @param {string} [candidates.cn] message in `zh-cn`
         * @param {string} [candidates.tw] message in `zh-tw`
         * @param {string} [candidates.hk] message in `zh-hk`
         * @param {string} [candidates.sg] message in `zh-sg`
         * @param {string} [candidates.mo] message in `zh-mo`
         * @param {string} [candidates.my] message in `zh-my`
         * @param {string} [candidates.en] message in `en`
         * @return {string} localized message
         */
        static vary(candidates: CandidatesRecord): string {
            if (typeof candidates === 'string') {
                return candidates;
            }
            assertCorrectArg(areLegalCandidates(candidates), 'candidates');

            return l10n(
                mw.config.get('wgUserVariant') || mw.user.options.get('variant'),
                candidates
            );
        }

        /**
         * Execute a function with wgULS and wgUVS respectively as parameters.
         *
         * @param {Function} executor function to be executed
         */
        static attachLegacyUXS(executor: CanCalled): void {
            assertCorrectArg(typeof executor === 'function', 'executor');

            executor.call(this, legacyULS, legacyUVS);
        }
    }

    // -- Legacy --

    function legacyULS(hans: string, hant: string, cn: string, tw: string, hk: string, sg: string, zh: string, mo: string, my: string, en: string): string | undefined {
        try {
            return l10n(mw.config.get('wgUserLanguage'), { hans, hant, cn, tw, hk, sg, zh, mo, my, en });
        } catch (e) {
            return undefined;
        }
    }

    function legacyUVS(hans: string, hant: string, cn: string, tw: string, hk: string, sg: string, zh: string, mo: string, my: string, en: string): string | undefined {
        try {
            return l10n(mw.config.get('wgUserVariant'), { hans, hant, cn, tw, hk, sg, zh, mo, my, en });
        } catch (e) {
            return undefined;
        }
    }

    function legacyUXS(wg: string, hans: string, hant: string, cn: string, tw: string, hk: string, sg: string, zh: string, mo: string, my: string, en: string): string | undefined {
        try {
            return l10n(wg, { hans, hant, cn, tw, hk, sg, zh, mo, my, en });
        } catch (e) {
            return undefined;
        }
    }

    mw.log.deprecate(window, 'wgULS', legacyULS, mw.msg('ha-deprecated', 'HanAssist.localize()'));
    mw.log.deprecate(window, 'wgUVS', legacyUVS, mw.msg('ha-deprecated', 'HanAssist.vary()'));
    mw.log.deprecate(window, 'wgUXS', legacyUXS, mw.msg('ha-deprecated', 'HanAssist.localize()'));

    // ------------

    // export
    window.HanAssist = HanAssist;
}());
// </nowiki>
