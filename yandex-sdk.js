window.ysdk = null;
window.ysdkPlayer = null;

function initYandexGame(onReady) {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (isLocal || typeof YaGames === 'undefined') {
    console.warn("Running in mock/localhost mode. Real Yandex SDK is disabled locally.");
    // Mock SDK for local testing
    window.ysdk = {
      adv: {
        showFullscreenAdv: (opts) => {
          console.log("[Mock SDK] Showing interstitial ad...");
          if (opts && opts.callbacks && opts.callbacks.onClose) opts.callbacks.onClose();
        },
        showRewardedVideo: (opts) => {
          console.log("[Mock SDK] Showing rewarded video ad...");
          if (opts && opts.callbacks && opts.callbacks.onRewarded) opts.callbacks.onRewarded();
          if (opts && opts.callbacks && opts.callbacks.onClose) opts.callbacks.onClose();
        }
      },
      getPlayer: () => Promise.resolve({
        getData: () => {
          console.log("[Mock SDK] Loading player data from localStorage...");
          const data = localStorage.getItem('mockYsdkData');
          return Promise.resolve(data ? JSON.parse(data) : {});
        },
        setData: (data) => {
          console.log("[Mock SDK] Saving player data to localStorage...", data);
          localStorage.setItem('mockYsdkData', JSON.stringify(data));
          return Promise.resolve();
        }
      }),
      environment: {
        i18n: { lang: 'ru' }
      }
    };
    initPlayerAndStart(onReady);
    return;
  }

  // Inject SDK script dynamically
  const script = document.createElement('script');
  script.src = "https://yandex.ru/games/sdk/v2";
  script.onload = () => {
    YaGames.init().then(_ysdk => {
      console.log("Yandex SDK initialized");
      window.ysdk = _ysdk;
      initPlayerAndStart(onReady);
    }).catch(err => {
      console.error("Yandex SDK init failed", err);
      onReady({}); 
    });
  };
  script.onerror = () => {
    console.error("Failed to load Yandex SDK script");
    onReady({});
  };
  document.head.appendChild(script);
}

function initPlayerAndStart(onReady) {
  const lang = (window.ysdk && window.ysdk.environment && window.ysdk.environment.i18n) 
                 ? window.ysdk.environment.i18n.lang 
                 : 'ru';
                 
  window.ysdk.getPlayer().then(_player => {
    window.ysdkPlayer = _player;
    console.log("Player initialized");
    return _player.getData();
  }).then(data => {
    console.log("Player data loaded", data);
    
    // Show interstitial ad on load
    window.ysdk.adv.showFullscreenAdv({
      callbacks: {
        onClose: function(wasShown) {
          console.log("Interstitial closed, starting game.");
          onReady(data, lang);
        },
        onError: function(error) {
          console.error("Interstitial error", error);
          onReady(data, lang);
        }
      }
    });
  }).catch(err => {
    console.error("Player init failed", err);
    onReady({}, lang);
  });
}

function saveProgress(score, upgLvl, currentDay) {
  if (!window.ysdkPlayer) return;
  const data = {
    score: score,
    upgLvl: upgLvl,
    currentDay: currentDay || 1
  };
  window.ysdkPlayer.setData(data).then(() => {
    console.log("Progress saved to Yandex Cloud");
  }).catch(err => {
    console.error("Failed to save progress", err);
  });
}

function showRewardedBooster(onSuccess) {
  if (!window.ysdk) {
    console.error("SDK not ready");
    return;
  }
  
  window.ysdk.adv.showRewardedVideo({
    callbacks: {
      onOpen: () => {
        console.log('Rewarded Video opened');
      },
      onRewarded: () => {
        console.log('Rewarded Video granted reward');
        if(onSuccess) onSuccess();
      },
      onClose: () => {
        console.log('Rewarded Video closed');
      },
      onError: (e) => {
        console.error('Rewarded Video Error', e);
      }
    }
  });
}
