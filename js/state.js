(function () {
  window.App = window.App || {};
  const data = {
    screen: 'entry',
    location: 'lavaux',
    weather: 'rain',
    isWeatherPreview: false,
    universe: 'lifestyle',
    mix: {},
    menuOpen: false,
    cartOpen: false,
    cartStage: 'bag',
    paymentMethod: 'card',
    checkoutPieces: [],
    cartRemoved: [],
    cartLook: '',
    menuSection: 'outfit',
    step: 'outfit',
    toast: '',
    geoBusy: false,
    locationError: ''
  };
  App.state = {
    get(key) { return data[key]; },
    set(key, value) {
      if (data[key] === value) return;
      data[key] = value;
      document.dispatchEvent(new CustomEvent('state-change', { detail: { key, value } }));
    }
  };
})();
