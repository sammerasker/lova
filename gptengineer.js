"use strict";
(() => {
  // Simplified property definitions
  const defineProperty = (obj, key, value) => {
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      writable: true,
      value
    });
  };

  // URL change monitoring
  const setupUrlChangeMonitor = () => {
    const monitorChanges = () => {
      let currentUrl = document.location.href;
      const body = document.querySelector("body");
      
      if (!body) return; // Guard clause for missing body

      const observer = new MutationObserver(() => {
        if (currentUrl !== document.location.href) {
          currentUrl = document.location.href;
          if (window.top) {
            // Use array of allowed origins
            const allowedOrigins = [
              'https://lovable.dev',
              'https://gptengineer.app',
              'http://localhost:3000'
            ];
            
            allowedOrigins.forEach(origin => {
              try {
                window.top.postMessage(
                  { type: "URL_CHANGED", url: document.location.href },
                  origin
                );
              } catch (e) {
                console.warn(`Failed to post message to ${origin}:`, e);
              }
            });
          }
        }
      });

      observer.observe(body, { childList: true, subtree: true });
    };

    // Use DOMContentLoaded instead of load for earlier execution
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', monitorChanges);
    } else {
      monitorChanges();
    }
  };

  // Error tracking setup
  const setupErrorTracking = () => {
    let isInitialized = false;
    
    const postMessageToParent = (message) => {
      const allowedOrigins = [
        'https://lovable.dev',
        'https://gptengineer.app',
        'http://localhost:3000'
      ];
      
      allowedOrigins.forEach(origin => {
        if (window.top) {
          try {
            window.top.postMessage(message, origin);
          } catch (e) {
            console.warn(`Failed to post error message to ${origin}:`, e);
          }
        }
      });
    };

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

      // Set up event listeners
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
