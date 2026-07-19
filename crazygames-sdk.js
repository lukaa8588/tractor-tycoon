window.cgPlayer = null;

function initGameSDK(onReady) {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '';

  // Function to load save data from localStorage
  const loadSaveData = () => {
    const dataStr = localStorage.getItem('tractorTycoonSave');
    let data = {};
    if (dataStr) {
        try { data = JSON.parse(dataStr); } catch(e){}
    }
    return data;
  };

  // Determine language
  let lang = 'ru'; // Default to Russian as per project base
  if (navigator && navigator.language) {
      const parsedLang = navigator.language.substring(0, 2);
      if (parsedLang === 'en' || parsedLang === 'ru') {
          lang = parsedLang;
      }
  }

  // Helper: setup mock mode (no SDK available)
  function setupMockMode() {
    window.cgGameplayStart = () => { console.log("Mock gameplay start"); };
    window.cgGameplayStop  = () => { console.log("Mock gameplay stop"); };
    window.showRewardedBooster = (cb) => {
        console.log("Mock rewarded video");
        if (cb) cb();
    };
    window.showInterstitialAd = () => { console.log("Mock interstitial ad"); };
    window.saveProgress = (score, upgLvl, currentDay) => {
        localStorage.setItem('tractorTycoonSave', JSON.stringify({score, upgLvl, currentDay}));
    };
  }

  // If SDK script was not loaded at all
  if (typeof window.CrazyGames === 'undefined' || !window.CrazyGames.SDK) {
    console.warn("CrazyGames SDK not found. Running in mock mode.");
    setupMockMode();
    setTimeout(() => onReady(loadSaveData(), lang), 100);
    return;
  }

  const SDK = window.CrazyGames.SDK;

  // If running on github.io - mock mode
  if (location.hostname.includes('github.io')) {
    console.warn("GitHub Pages detected. Running in mock mode.");
    setupMockMode();
    setTimeout(() => onReady(loadSaveData(), lang), 100);
    return;
  }

  // --- SDK v3 initialization (async) ---
  SDK.init().then(() => {

    console.log("CrazyGames SDK v3 initialized");

    // Notify portal that game is loading
    try { SDK.game.sdkGameLoadingStart(); } catch(e) { console.warn("sdkGameLoadingStart failed", e); }

    // --- Gameplay tracking ---
    window.cgGameplayStart = () => {
      try { SDK.game.gameplayStart(); } catch(e) { console.warn("gameplayStart error", e); }
    };
    window.cgGameplayStop = () => {
      try { SDK.game.gameplayStop(); } catch(e) { console.warn("gameplayStop error", e); }
    };

    // --- Save function ---
    window.saveProgress = (score, upgLvl, currentDay) => {
      const data = { score, upgLvl, currentDay };
      localStorage.setItem('tractorTycoonSave', JSON.stringify(data));
    };

    // --- Rewarded ad ---
    window.showRewardedBooster = (onSuccess) => {
      SDK.ad.requestAd('rewarded', {
        adStarted: () => {
          if (window.cgGameplayStop) window.cgGameplayStop();
          if (typeof audioCtx !== 'undefined' && audioCtx.state === 'running') {
              audioCtx.suspend();
          }
        },
        adFinished: () => {
          if (typeof audioCtx !== 'undefined' && typeof audioMuted !== 'undefined' && !audioMuted) {
              audioCtx.resume();
          }
          if (onSuccess) onSuccess();
          if (window.cgGameplayStart) window.cgGameplayStart();
        },
        adError: (err) => {
          console.error("Rewarded ad error", err);
          if (typeof audioCtx !== 'undefined' && typeof audioMuted !== 'undefined' && !audioMuted) {
              audioCtx.resume();
          }
          // Give reward even on error so player isn't punished
          if (onSuccess) onSuccess();
        }
      });
    };

    // --- Interstitial ad ---
    window.showInterstitialAd = () => {
      SDK.ad.requestAd('midgame', {
        adStarted: () => {
          if (window.cgGameplayStop) window.cgGameplayStop();
          if (typeof audioCtx !== 'undefined' && audioCtx.state === 'running') {
              audioCtx.suspend();
          }
        },
        adFinished: () => {
          if (typeof audioCtx !== 'undefined' && typeof audioMuted !== 'undefined' && !audioMuted) {
              audioCtx.resume();
          }
          if (window.cgGameplayStart) window.cgGameplayStart();
        },
        adError: (err) => {
          console.warn("Interstitial ad error", err);
          if (typeof audioCtx !== 'undefined' && typeof audioMuted !== 'undefined' && !audioMuted) {
              audioCtx.resume();
          }
        }
      });
    };

    // --- Initial midgame ad on load ---
    SDK.ad.requestAd('midgame', {
      adStarted: () => {
        console.log("Initial midgame ad started");
      },
      adFinished: () => {
        console.log("Initial midgame ad finished");
        try { SDK.game.sdkGameLoadingStop(); } catch(e){}
        onReady(loadSaveData(), lang);
      },
      adError: (err) => {
        console.error("Initial midgame ad error", err);
        try { SDK.game.sdkGameLoadingStop(); } catch(e){}
        onReady(loadSaveData(), lang);
      }
    });

  }).catch((err) => {
    // SDK init failed - fallback to mock mode
    console.error("CrazyGames SDK v3 init failed, falling back to mock mode", err);
    setupMockMode();
    setTimeout(() => onReady(loadSaveData(), lang), 100);
  });
}
