"use strict";
(() => {
  // Utility to safely get parent origin
  const getParentOrigin = () => {
    try {
      // Get the parent window's origin dynamically
      return window.parent !== window ? 
        window.parent.location.origin : 
        window.location.origin;
    } catch (e) {
      // If we can't access parent origin due to cross-origin restrictions,
      // we'll get the origin from the referrer or document location
      const referrer = document.referrer;
      if (referrer) {
        const url = new URL(referrer);
        return url.origin;
      }
      return window.location.origin;
    }
  };

  // Safe postMessage helper
  const postMessageToParent = (message) => {
    if (window.parent && window.parent !== window) {
      try {
        const parentOrigin = getParentOrigin();
        window.parent.postMessage(message, parentOrigin);
      } catch (e) {
        console.warn('Failed to post message to parent:', e);
      }
    }
  };

  // URL change monitoring
  const setupUrlChangeMonitor = () => {
    const monitorChanges = () => {
      let currentUrl = document.location.href;
      const body = document.querySelector("body");
      
      if (!body) return;

      const observer = new MutationObserver(() => {
        if (currentUrl !== document.location.href) {
          currentUrl = document.location.href;
          postMessageToParent({
            type: "URL_CHANGED",
            url: document.location.href
          });
        }
      });

      observer.observe(body, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', monitorChanges);
    } else {
      monitorChanges();
    }
  };

  // Error tracking setup
  const setupErrorTracking = () => {
    let isInitialized = false;
    
    // Enhanced fetch error handling
    const wrapFetch = (errorHandler) => {
      const originalFetch = window.fetch;
      
      window.fetch = async function(...args) {
        try {
          const response = await originalFetch.apply(this, args);
          
          if (!response.ok) {
            const errorBody = await response.text().catch(() => undefined);
            errorHandler("non_200_response", {
              status: response.status,
              statusText: response.statusText,
              url: args?.[0] || response.url,
              body: errorBody,
              method: args?.[1]?.method || "GET",
              origin: window.location.origin
            });
          }
          
          return response;
        } catch (error) {
          const errorData = {
            url: args?.[0],
            method: args?.[1]?.method || "GET",
            origin: window.location.origin,
            message: error?.message || "Unknown fetch error",
            stack: error?.stack || "Not available"
          };
          
          errorHandler("fetch_error", errorData);
          throw error;
        }
      };
    };

    if (!isInitialized) {
      setupUrlChangeMonitor();
      
      // Set up error tracking
      const errorCache = new Set();
      const errorCacheTimeout = 5000; // 5 seconds
      
      const handleError = (error) => {
        const errorKey = `${error.message}|${error.filename}|${error.lineno}|${error.colno}`;
        
        if (!errorCache.has(errorKey)) {
          errorCache.add(errorKey);
          setTimeout(() => errorCache.delete(errorKey), errorCacheTimeout);
          
          postMessageToParent({
            type: "RUNTIME_ERROR",
            error: {
              message: error.message,
              lineno: error.lineno,
              colno: error.colno,
              filename: error.filename,
              stack: error?.stack
            }
          });
        }
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        const errorKey = error?.stack || error?.message || String(error);
        
        if (!errorCache.has(errorKey)) {
          errorCache.add(errorKey);
          setTimeout(() => errorCache.delete(errorKey), errorCacheTimeout);
          
          postMessageToParent({
            type: "UNHANDLED_PROMISE_REJECTION",
            error: {
              message: error?.message || "Unhandled promise rejection",
              stack: error?.stack || String(error)
            }
          });
        }
      });

      wrapFetch((type, data) => {
        if (type === "non_200_response") {
          postMessageToParent({
            type: "FETCH_ERROR",
            error: {
              message: `Failed to call URL ${data.url} with status ${data.status}`,
              status: data.status,
              statusText: data.statusText,
              url: data.url,
              body: data.body
            }
          });
        } else if (type === "fetch_error") {
          postMessageToParent({
            type: "FETCH_ERROR",
            error: data
          });
        }
      });

      isInitialized = true;
    }
  };

  // Initialize
  setupErrorTracking();
})();
