"use strict";
(() => {
  var V = Object.defineProperty,
    Z = Object.defineProperties;
  var tt = Object.getOwnPropertyDescriptors;
  var k = Object.getOwnPropertySymbols;
  var et = Object.prototype.hasOwnProperty,
    ot = Object.prototype.propertyIsEnumerable;
  var M = (e, i, t) => i in e ? V(e, i, { enumerable: !0, configurable: !0, writable: !0, value: t }) : e[i] = t,
    C = (e, i) => {
      for (var t in i || (i = {})) et.call(i, t) && M(e, t, i[t]);
      if (k) for (var t of k(i)) ot.call(i, t) && M(e, t, i[t]);
      return e;
    },
    P = (e, i) => Z(e, tt(i));
  var R = (e, i, t) => new Promise((l, s) => {
    var f = n => {
        try { a(t.next(n)) } catch (c) { s(c) }
      },
      r = n => {
        try { a(t.throw(n)) } catch (c) { s(c) }
      },
      a = n => n.done ? l(n.value) : Promise.resolve(n.value).then(f, r);
    a((t = t.apply(e, i)).next());
  });

  var U = () => {
    let e = () => {
      let i = document.location.href,
        t = document.querySelector("body"),
        l = new MutationObserver(() => {
          if (i !== document.location.href) {
            i = document.location.href;
            window.top && (window.top.postMessage({ type: "URL_CHANGED", url: document.location.href }, "https://lovable.dev"),
              window.top.postMessage({ type: "URL_CHANGED", url: document.location.href }, "http://localhost:3000"));
          }
        });
      t && l.observe(t, { childList: !0, subtree: !0 });
    };
    window.addEventListener("load", e);
  };
  var O = e => {
    var i, t, l;
    (i = window.top) == null || i.postMessage(e, "https://lovable.dev");
    (t = window.top) == null || t.postMessage(e, "https://gptengineer.app");
    (l = window.top) == null || l.postMessage(e, "http://localhost:3000");
  };
  var nt = e => {
    let i = window.fetch;
    window.fetch = function (...t) {
      return R(this, null, function* () {
        var l, s, f;
        try {
          let r = yield i(...t);
          if (!r.ok) {
            let a = r != null && r.text ? yield r.text() : void 0;
            e("non_200_response", P(C({}, r), { status: r.status, url: (t == null ? void 0 : t[0]) || r.url, body: a, method: ((l = t == null ? void 0 : t[1]) == null ? void 0 : l.method) || "GET", origin: window.location.origin }));
          }
          return r;
        } catch (r) {
          if (r instanceof TypeError) e("fetch_error", { message: r == null ? void 0 : r.message, stack: r == null ? void 0 : r.stack, url: t == null ? void 0 : t[0], method: ((s = t == null ? void 0 : t[1]) == null ? void 0 : s.method) || "GET", origin: window.location.origin });
          else {
            let a = { url: t == null ? void 0 : t[0], method: ((f = t == null ? void 0 : t[1]) == null ? void 0 : f.method) || "GET", origin: window.location.origin, message: "Unknown fetch error", stack: "Not available" };
            typeof r == "object" && r !== null && "message" in r && typeof r.message == "string" && (a.message = r.message);
            typeof r == "object" && r !== null && "stack" in r && typeof r.stack == "string" && (a.stack = r.stack);
            e("fetch_error", a);
          }
          throw r;
        }
      });
    };
  };
  var W = (() => {
    let e = !1, i = ({ message: t, lineno: l, colno: s, filename: f, error: r }) => ({ message: t, lineno: l, colno: s, filename: f, stack: r == null ? void 0 : r.stack });
    return () => {
      if (e) return;
      let t = new Set,
        l = a => {
          let { lineno: n, colno: c, filename: E, message: y } = a;
          return `${y}|${E}|${n}|${c}`;
        };
      nt((a, n) => R(void 0, null, function* () {
        a === "non_200_response" ?
          O({ type: "FETCH_ERROR", error: { message: `failed to call url ${n.url} with status ${n.status} and statusText ${n.statusText}`, status: n.status, statusText: n.statusText, url: n.url, body: n.body } }) :
          a === "fetch_error" && O({ type: "FETCH_ERROR", error: n });
      }));
      let f = a => t.has(a) ? !0 : (t.add(a), setTimeout(() => t.delete(a), 5e3), !1),
        r = a => {
          let n = l(a);
          if (f(n)) return;
          let c = i(a);
          O({ type: "RUNTIME_ERROR", error: c });
        };
      window.addEventListener("error", r), window.addEventListener("unhandledrejection", a => {
        var E, y, _, T, A;
        if (!((E = a.reason) != null && E.stack)) return;
        let n = ((y = a.reason) == null ? void 0 : y.stack) || ((_ = a.reason) == null ? void 0 : _.message) || String(a.reason);
        if (f(n)) return;
        let c = { message: ((T = a.reason) == null ? void 0 : T.message) || "Unhandled promise rejection", stack: ((A = a.reason) == null ? void 0 : A.stack) || String(a.reason) };
        O({ type: "UNHANDLED_PROMISE_REJECTION", error: c });
      }), e = !0;
    };
  })();

  var G = class { constructor(i) { this.message = `[Circular Reference to ${i}]` } };
  var u = class { constructor(i, t) { this._type = i, this.value = t } };
  var rt = { maxDepth: 10, indent: 2, includeSymbols: !0, preserveTypes: !0, maxStringLength: 1e4, maxArrayLength: 100, maxObjectKeys: 100 };

  function L(e, i = {}, t = new WeakMap, l = "root") {
    let s = C(C({}, rt), i);
    if (l.split(".").length > s.maxDepth) return new u("MaxDepthReached", `[Max depth of ${s.maxDepth} reached]`);
    if (e === void 0) return new u("undefined", "undefined");
    if (e === null) return null;
    if (typeof e == "string") return e.length > s.maxStringLength ? new u("String", `${e.slice(0, s.maxStringLength)}... [${e.length - s
