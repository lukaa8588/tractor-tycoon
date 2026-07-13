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

  if (typeof window.CrazyGames === 'undefined' || !window.CrazyGames.SDK || window.CrazyGames.SDK.environment === 'disabled') {
    console.warn("CrazyGames SDK not found or disabled on this domain. Running in local/mock mode.");
    
    // Mock callbacks
    window.showRewardedBooster = (cb) => { 
        console.log("Mock rewarded video"); 
        if (cb) cb(); 
    };
    window.showInterstitialAd = () => {
        console.log("Mock interstitial ad");
    };
    window.saveProgress = (score, upgLvl, currentDay) => {
        localStorage.setItem('tractorTycoonSave', JSON.stringify({score, upgLvl, currentDay}));
    };
    
    // Slight delay to ensure the game doesn't load instantly before fonts
    setTimeout(() => {
      onReady(loadSaveData(), lang);
    }, 100);
    return;
  }

  // SDK is loaded
  const SDK = window.CrazyGames.SDK;
  
  // Start game loading UI of the portal
  SDK.game.sdkGameLoadingStart();
  
  console.log("CrazyGames SDK initialized");

  // Global save function
  window.saveProgress = (score, upgLvl, currentDay) => {
    const data = { score, upgLvl, currentDay };
    localStorage.setItem('tractorTycoonSave', JSON.stringify(data));
  };

  // Global rewarded ad function
  window.showRewardedBooster = (onSuccess) => {
    SDK.ad.requestAd('rewarded', {
      adStarted: () => {
        console.log("Rewarded ad started");
        // Pause audio in game
        if (typeof audioCtx !== 'undefined' && audioCtx.state === 'running') {
            audioCtx.suspend();
        }
      },
      adFinished: () => {
        console.log("Rewarded ad finished");
        if (typeof audioCtx !== 'undefined' && typeof audioMuted !== 'undefined' && !audioMuted) {
            audioCtx.resume();
        }
        if (onSuccess) onSuccess();
      },
      adError: (err) => {
        console.error("Rewarded ad error", err);
        if (typeof audioCtx !== 'undefined' && typeof audioMuted !== 'undefined' && !audioMuted) {
            audioCtx.resume();
        }
      }
    });
  };

  // Global interstitial ad function
  window.showInterstitialAd = () => {
    SDK.ad.requestAd('midgame', {
      adStarted: () => {
        if (typeof audioCtx !== 'undefined' && audioCtx.state === 'running') {
            audioCtx.suspend();
        }
      },
      adFinished: () => {
        if (typeof audioCtx !== 'undefined' && typeof audioMuted !== 'undefined' && !audioMuted) {
            audioCtx.resume();
        }
      },
      adError: (err) => {
        if (typeof audioCtx !== 'undefined' && typeof audioMuted !== 'undefined' && !audioMuted) {
            audioCtx.resume();
        }
      }
    });
  };

  // Show Interstitial on initial load
  SDK.ad.requestAd('midgame', {
    adStarted: () => {
      console.log("Initial midgame ad started");
    },
    adFinished: () => {
      console.log("Initial midgame ad finished");
      SDK.game.sdkGameLoadingStop();
      onReady(loadSaveData(), lang);
    },
    adError: (err) => {
      console.error("Initial midgame ad error", err);
      SDK.game.sdkGameLoadingStop();
      onReady(loadSaveData(), lang);
    }
  });
}
