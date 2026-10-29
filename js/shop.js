// Store compass, relative to the phone heading.
(function () {
  window.App = window.App || {};

  // Edit here. Barcelona: Salomon Brand Store, Rambla de Catalunya 54.
  // Matterhorn: PLACEHOLDER position in Zermatt village, to verify before the presentation.
  const stores = {
    barcelona: { label: 'Salomon Barcelona', lat: 41.3919, lon: 2.1636 },
    matterhorn: { label: 'Salomon Zermatt', lat: 46.0215, lon: 7.7487 },
    lavaux: { label: 'Salomon · Lavaux', lat: 46.49, lon: 6.74 },
    paris: { label: 'Salomon · Paris', lat: 48.8566, lon: 2.3522 }
  };

  let heading = null;
  let listening = false;
  let active = false;
  let compassGranted = false;
  let permissionPending = false;
  let needleAngle = null;

  function bearing(a, b) {
    const rad = Math.PI / 180;
    const delta = (b.lon - a.lon) * rad;
    const y = Math.sin(delta) * Math.cos(b.lat * rad);
    const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos(delta);
    return (Math.atan2(y, x) / rad + 360) % 360;
  }

  function set(name, value) {
    document.querySelectorAll('[data-show="' + name + '"]').forEach(function (n) { n.textContent = value; });
  }

  function refresh() {
    const city = App.state.get('location');
    const store = stores[city];
    const place = App.utils.places[city];
    if (!store || !place) return;
    set('shop-distance', '1.2 km');
    set('shop-name', store.label);
    const turn = bearing(place, store) - (heading == null ? 0 : heading);
    // Cross north by the short route instead of spinning almost a full turn.
    needleAngle = needleAngle == null ? turn : needleAngle + ((turn - needleAngle + 540) % 360 + 360) % 360 - 180;
    const needle = document.getElementById('compass-needle');
    if (needle) needle.style.transform = 'rotate(' + needleAngle + 'deg)';
    if (needle) needle.style.opacity = '1';
  }

  function onOrientation(event) {
    if (!active) return;
    let h = null;
    if (typeof event.webkitCompassHeading === 'number') h = event.webkitCompassHeading;
    else if (event.absolute && typeof event.alpha === 'number') h = 360 - event.alpha;
    if (!Number.isFinite(h)) return;
    heading = (h % 360 + 360) % 360;
    refresh();
  }

  function listenOrientation() {
    if (listening) return;
    listening = true;
    window.addEventListener('deviceorientationabsolute', onOrientation);
    window.addEventListener('deviceorientation', onOrientation);
  }

  App.shop = {
    stores: stores,
    refresh: refresh,
    start(fromTap) {
      active = true;
      refresh();
      // iPhone asks for compass permission, and only after a tap.
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function') {
        if (compassGranted) listenOrientation();
        else if (fromTap && !permissionPending) {
          permissionPending = true;
          D.requestPermission().then(function (result) {
            compassGranted = result === 'granted';
            if (compassGranted && active) listenOrientation();
          }).catch(function () {}).finally(function () { permissionPending = false; });
        }
      } else if (D) {
        listenOrientation();
      }
    },
    stop() {
      active = false;
      window.removeEventListener('deviceorientationabsolute', onOrientation);
      window.removeEventListener('deviceorientation', onOrientation);
      listening = false;
    }
  };
})();
