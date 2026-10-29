// SALOMON — ELEMENTS / V1. No server, no APIs, no framework.
(function () {
  window.App = window.App || {};
  App.config = {
    avatarSrc: 'assets/silhouette.svg',
    mannequinHeadSrc: 'assets/mannequin-head.svg',
    mannequinTest: new URLSearchParams(window.location.search).get('mannequin') !== 'original'
  };

  let toastTimer;
  let swipeStart = null;
  let suppressToggleClick = false;

  let holdOutfit = false;
  let screenTransition = null;
  let suppressCityClick = false;

  function animateSceneEntry(startRect, sourceSrc) {
    const entry = document.querySelector('[data-screen="entry"]');
    const scene = document.querySelector('[data-screen="scene"]');
    const source = document.querySelector('.entry-brand img');
    const target = document.querySelector('.scene-logo');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!entry || !scene || !source || !target || reduce || !startRect.width || !target.animate) return;

    const endRect = target.getBoundingClientRect();
    if (!endRect.width) return;

    entry.classList.add('is-leaving-entry');
    entry.hidden = false;
    entry.inert = true;
    entry.setAttribute('aria-hidden', 'true');
    source.style.visibility = 'hidden';
    target.style.visibility = 'hidden';

    const flight = document.createElement('div');
    flight.className = 'logo-flight';
    flight.style.left = startRect.left + 'px';
    flight.style.top = startRect.top + 'px';
    flight.style.width = startRect.width + 'px';
    flight.style.height = startRect.height + 'px';

    const startLogo = document.createElement('img');
    startLogo.src = sourceSrc;
    startLogo.alt = '';
    const endLogo = document.createElement('img');
    endLogo.src = target.currentSrc || target.src;
    endLogo.alt = '';
    endLogo.style.opacity = '0';
    flight.appendChild(startLogo);
    flight.appendChild(endLogo);
    document.body.appendChild(flight);

    const dx = endRect.left - startRect.left;
    const dy = endRect.top - startRect.top;
    const sx = endRect.width / startRect.width;
    const sy = endRect.height / startRect.height;
    const timing = { duration: 920, easing: 'cubic-bezier(.22,.82,.2,1)', fill: 'forwards' };
    const move = flight.animate([
      { transform: 'translate3d(0,0,0) scale(1,1)' },
      { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) scale(' + sx + ',' + sy + ')' }
    ], timing);
    const reveal = scene.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 760, easing: 'ease-in-out', fill: 'forwards' });
    startLogo.animate([{ opacity: 1 }, { opacity: 1, offset: .35 }, { opacity: 0 }], { duration: 920, easing: 'ease-in-out', fill: 'forwards' });
    endLogo.animate([{ opacity: 0 }, { opacity: 0, offset: .28 }, { opacity: 1 }], { duration: 920, easing: 'ease-in-out', fill: 'forwards' });

    screenTransition = Promise.all([move.finished, reveal.finished]).catch(function () {}).then(function () {
      flight.remove();
      entry.hidden = true;
      entry.classList.remove('is-leaving-entry');
      entry.inert = false;
      entry.removeAttribute('aria-hidden');
      source.style.visibility = '';
      target.style.visibility = '';
      scene.style.opacity = '';
      screenTransition = null;
    });
  }

  // Whole outfit: every product slides together. Sport comes in from the right, lifestyle from the left.
  function setUniverse(value) {
    const changed = App.state.get('universe') !== value;
    holdOutfit = true;
    App.state.set('mix', {});
    App.state.set('universe', value);
    holdOutfit = false;
    App.render.outfit(value === 'sport' ? -1 : 1);
  }

  function setScreen(name) {
    const source = document.querySelector('.entry-brand img');
    const shouldAnimate = name === 'scene' && App.state.get('screen') === 'entry' && !screenTransition && source;
    const startRect = shouldAnimate ? source.getBoundingClientRect() : null;
    const sourceSrc = shouldAnimate ? (source.currentSrc || source.src) : '';
    App.state.set('screen', name);
    if (shouldAnimate) animateSceneEntry(startRect, sourceSrc);
    App.render.focusScreenTitle();
  }

  function resetCityWeather(location) {
    App.state.set('isWeatherPreview', false);
    const conditions = { barcelona: 'sun', matterhorn: 'rain', lavaux: 'rain', paris: 'cloud' };
    App.state.set('weather', conditions[location] || 'cloud');
    if (location === 'barcelona') {
      App.state.set('mix', { top: 'lifestyle', shoes: 'lifestyle' });
    }
    if (location === 'paris' || location === 'matterhorn') {
      App.state.set('mix', { head: 'lifestyle', top: 'lifestyle', bottom: 'lifestyle', shoes: 'lifestyle' });
    }
  }

  function enterScene(location) {
    if (!App.utils.places[location]) return;
    App.state.set('location', location);
    resetCityWeather(location);
    App.state.set('menuOpen', false);
    App.state.set('menuSection', 'outfit');
    App.state.set('step', 'outfit');
    App.state.set('locationError', '');
    setScreen('scene');
  }

  // Every section opens in the same glass row above the rail: weather, location, shop, outfit.
  function openSection(section) {
    App.state.set('menuSection', section);
    App.state.set('menuOpen', true);
    if (section === 'shop') App.shop.start(true); else App.shop.stop();
  }

  function toast(message) {
    clearTimeout(toastTimer);
    App.state.set('toast', message);
    toastTimer = setTimeout(function () { App.state.set('toast', ''); }, 3200);
  }

  function chooseCityFromInput() {
    const input = document.getElementById('city-input');
    const city = App.utils.parseCity(input.value);
    if (city) {
      enterScene(city);
    } else {
      App.state.set('locationError', 'Choose Barcelona, Matterhorn, Lavaux or Paris.');
      input.focus();
    }
  }

  function geolocate() {
    enterScene('lavaux');
  }

  function cycleCity(direction) {
    const cities = ['barcelona', 'lavaux', 'matterhorn', 'paris'];
    const current = cities.indexOf(App.state.get('location'));
    const next = cities[(current + direction + cities.length) % cities.length];
    App.render.citySwap(direction, function () {
      App.state.set('location', next);
      resetCityWeather(next);
    });
  }

  const actions = {
    'back-to-entry'() {
      if (screenTransition) { screenTransition.then(function () { actions['back-to-entry'](); }); return; }
      App.shop.stop();
      App.state.set('cartOpen', false);
      App.state.set('menuOpen', false);
      setScreen('entry');
    },
    'open-product'(button) {
      actions['open-cart']();
      const holder = document.getElementById('cart-items');
      const row = Array.from(holder.querySelectorAll('.cart-item')).find(function (item) { return item.dataset.src === button.dataset.src; });
      if (row) {
        requestAnimationFrame(function () {
          if (!row.isConnected || !App.state.get('cartOpen')) return;
          const offset = (holder.clientHeight - row.offsetHeight) / 2;
          const target = holder.scrollTop + row.getBoundingClientRect().top - holder.getBoundingClientRect().top - offset;
          holder.scrollTop = Math.max(0, Math.min(target, holder.scrollHeight - holder.clientHeight));
          row.focus({ preventScroll: true });
        });
      }
    },
    'select-location'(button) { enterScene(button.dataset.location); },
    'use-location'() { geolocate(); },
    'cycle-location'() {
      if (suppressCityClick) return;
      cycleCity(1);
    },
    'cycle-location-prev'() {
      if (suppressCityClick) return;
      cycleCity(-1);
    },
    'toggle-menu'() {
      const isOpen = App.state.get('menuOpen');
      App.state.set('menuOpen', !isOpen);
      if (isOpen) App.shop.stop(); else if (App.state.get('menuSection') === 'shop') App.shop.start(true);
    },
    'set-weather'(button) {
      App.state.set('isWeatherPreview', true);
      App.state.set('weather', button.dataset.weather);
      if (App.state.get('location') === 'matterhorn' && button.dataset.weather === 'snow') {
        App.state.set('mix', { head: 'lifestyle', top: 'lifestyle', bottom: 'lifestyle', shoes: 'lifestyle' });
      }
      App.state.set('step', 'weather');
      App.state.set('menuSection', 'weather');
      App.state.set('menuOpen', true);
      App.shop.stop();
    },
    'select-menu-section'(button) {
      const section = button.dataset.menuSection;
      if (App.state.get('menuOpen') && App.state.get('menuSection') === section) {
        App.state.set('menuOpen', false);
        App.shop.stop();
        return;
      }
      openSection(section);
    },
    'open-cart'() {
      const look = App.render.currentLook().map(function (piece) { return piece.src; }).join('|');
      if (look !== App.state.get('cartLook')) {
        App.state.set('cartLook', look);
        App.state.set('cartRemoved', []);
      }
      App.shop.stop();
      App.state.set('cartStage', 'bag');
      App.state.set('cartOpen', true);
      document.getElementById('cart-items').scrollTop = 0;
      document.querySelector('.cart-close').focus({ preventScroll: true });
    },
    'close-cart'() {
      App.state.set('cartOpen', false);
      document.querySelector('[data-action="open-cart"]').focus({ preventScroll: true });
      document.querySelector('[data-screen="scene"]').scrollTop = 0;
    },
    'buy-look'() {
      const stage = App.state.get('cartStage');
      if (stage === 'bag') {
        if (!App.render.selectedLook().length) return;
        App.state.set('checkoutPieces', App.render.selectedLook().slice());
      }
      if (stage === 'paid') { actions['close-cart'](); return; }
      const next = { bag: 'payment', payment: 'paid' };
      App.state.set('cartStage', next[stage]);
      document.getElementById('cart-title').focus({ preventScroll: true });
    },
    'checkout-back'() {
      App.state.set('cartStage', 'bag');
      document.getElementById('cart-title').focus({ preventScroll: true });
    },
    'choose-payment'(button) {
      App.state.set('paymentMethod', button.dataset.method);
      document.querySelectorAll('[data-action="choose-payment"]').forEach(function (option) { option.setAttribute('aria-pressed', String(option.dataset.method === button.dataset.method)); });
    },
    'remove-cart-item'(button) {
      const items = Array.from(document.querySelectorAll('.cart-remove'));
      const index = items.indexOf(button);
      const scroll = document.getElementById('cart-items').scrollTop;
      App.state.set('cartRemoved', App.state.get('cartRemoved').concat(button.dataset.src));
      document.getElementById('cart-items').scrollTop = scroll;
      const remaining = document.querySelectorAll('.cart-remove');
      (remaining[Math.min(index, remaining.length - 1)] || document.querySelector('.cart-restore')).focus({ preventScroll: true });
    },
    'restore-cart'() {
      App.state.set('cartRemoved', []);
      document.querySelector('.cart-close').focus({ preventScroll: true });
    },
    'start-compass'() { App.shop.start(true); },
    'toggle-universe'() {
      if (suppressToggleClick) { suppressToggleClick = false; return; }
      setUniverse(App.state.get('universe') === 'sport' ? 'lifestyle' : 'sport');
    },
  };

  const redraw = {
    isWeatherPreview() { App.render.scene(); },
    cartOpen() { App.render.cart(); },
    cartStage() { if (App.state.get('cartOpen')) App.render.cart(); },
    cartRemoved() { App.render.outfit(); if (App.state.get('cartOpen')) App.render.cart(); },
    screen() { App.render.screen(); App.render.focusScreenTitle(); },
    location() { App.state.set('mix', {}); App.render.scene(); App.render.outfit(); App.shop.refresh(); },
    weather() { App.state.set('mix', {}); App.render.scene(); App.render.outfit(); },
    universe: function () { if (!holdOutfit) App.render.outfit(); },
    mix: function () { if (!holdOutfit) App.render.outfit(); },
    menuOpen: App.render.menu,
    menuSection: App.render.menu,
    step: App.render.menu,
    geoBusy: App.render.entry,
    locationError: App.render.entry,
    toast: function () { App.render.toast(); }
  };

  function closePrices(except) {
    document.querySelectorAll('.price-dot.is-open').forEach(function (tag) {
      if (tag === except) return;
      tag.classList.remove('is-open');
      tag.querySelector('.price-dot-button').setAttribute('aria-expanded', 'false');
    });
  }

  function tapHandler(event) {
    const priceButton = event.target.closest('[data-action="toggle-price"]');
    if (!priceButton) closePrices();
    if (App.state.get('menuOpen') && !App.state.get('cartOpen') && !event.target.closest('.control-cluster')) {
      App.state.set('menuOpen', false);
      App.shop.stop();
    }
    const button = event.target.closest('[data-action]');
    if (button && actions[button.dataset.action]) actions[button.dataset.action](button);
  }

  // Product carousel: drag a product sideways, the same zone from the other universe follows the finger.
  // Release past the threshold to swap it, otherwise it snaps back. Endless: it keeps alternating.
  let drag = null;

  function otherPiece(group) {
    const city = App.outfits[App.state.get('location')];
    const looks = city ? city[App.state.get('weather')] : null;
    if (!looks) return null;
    const current = (App.state.get('mix') || {})[group] || App.state.get('universe');
    const target = current === 'sport' ? 'lifestyle' : 'sport';
    const piece = (looks[target] || []).find(function (p) { return App.outfitGroups[p.slot] === group; });
    if (piece) App.media.ready(piece.src);
    return { universe: target, piece: piece || null };
  }

  // While dragging, the product follows the finger and tilts slightly.
  function moveDrag(dx) {
    const transform = 'translate3d(' + dx + 'px, 0, 0) rotate(' + (dx / 24) + 'deg)';
    (drag.el.motionNode || drag.el).style.transform = transform;
  }

  function endDrag(dx, fast) {
    const d = drag;
    drag = null;
    const direction = dx < 0 ? -1 : 1;
    const commit = Math.abs(dx) > 70 || (fast && Math.abs(dx) > 24);
    if (!commit) {
      // Not far enough: spring back into place.
      const unit = d.el.motionNode || d.el;
      const frames = [
        { transform: unit.style.transform || 'translate3d(0,0,0)' },
        { transform: 'translate3d(0, 0, 0) rotate(0deg)' }
      ];
      const back = unit.animate(frames, { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      if (d.el.priceTag) {
        d.el.priceTag.classList.remove('is-dragging');
      }
      unit.style.transform = '';
      unit.classList.remove('is-dragging');
      d.el.classList.remove('is-dragging');
      return back;
    }
    // Swap: the worn product flies off, the other universe's product settles in.
    App.render.pieceLeave(d.el, direction, dx);
    if (d.target.piece) App.render.pieceEnter(App.render.pieceImage(d.target.piece), direction);
    holdOutfit = true;
    const mix = Object.assign({}, App.state.get('mix'));
    mix[d.group] = d.target.universe;
    App.state.set('mix', mix);
    holdOutfit = false;
    App.render.outfit();
  }

  function bindSwipe() {
    const scene = document.querySelector('[data-screen="scene"]');
    scene.addEventListener('pointerdown', function (event) {
      if (App.state.get('cartOpen')) return;
      if (event.target.closest('button, input, form, .weather-rail, .scene-header')) return;
      const el = App.render.pieceAt(event.clientX, event.clientY);
      swipeStart = { x: event.clientX, y: event.clientY, time: Date.now() };
      // Bare head: a swipe there brings back the headwear of the other universe.
      if (App.render.onBareHead(event.clientX, event.clientY)) {
        const target = otherPiece('head');
        if (target && target.piece) drag = { el: null, group: 'head', target: target, started: false };
        return;
      }
      if (el && !App.render.reduceMotion()) {
        const target = otherPiece(el.dataset.group);
        drag = { el: el, group: el.dataset.group, target: target, incoming: null, started: false };
        try { scene.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
      }
    });
    scene.addEventListener('pointermove', function (event) {
      if (!drag || !drag.el || !swipeStart) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      if (!drag.started) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        drag.started = true;
        drag.el.classList.add('is-dragging');
        if (drag.el.motionNode) drag.el.motionNode.classList.add('is-dragging');
        if (drag.el.priceTag) drag.el.priceTag.classList.add('is-dragging');
      }
      moveDrag(dx);
    });
    scene.addEventListener('pointerup', function (event) {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      const fast = Date.now() - swipeStart.time < 260;
      swipeStart = null;
      if (drag && drag.started) { endDrag(dx, fast); return; }
      if (drag && !drag.el) {
        const d = drag; drag = null;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
          App.render.pieceEnter(App.render.pieceImage(d.target.piece), dx < 0 ? -1 : 1);
          holdOutfit = true;
          const mix = Object.assign({}, App.state.get('mix'));
          mix.head = d.target.universe;
          App.state.set('mix', mix);
          holdOutfit = false;
          App.render.outfit();
        }
        return;
      }
      if (drag) {
        // A product swiped with reduced motion, or a tap: swap without the drag.
        const d = drag; drag = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          const mix = Object.assign({}, App.state.get('mix'));
          mix[d.group] = d.target.universe;
          App.state.set('mix', mix);
        }
        return;
      }
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) setUniverse(dx < 0 ? 'sport' : 'lifestyle');
    });
    scene.addEventListener('pointercancel', function () {
      swipeStart = null;
      if (drag && drag.started) endDrag(0, false); else drag = null;
    });
  }

  // The outfit switch also follows a swipe: right = sport, left = lifestyle.
  function bindToggleSwipe() {
    const toggle = document.getElementById('outfit-toggle');
    let from = null;
    toggle.addEventListener('pointerdown', function (event) { from = event.clientX; });
    toggle.addEventListener('pointerup', function (event) {
      if (from === null) return;
      const dx = event.clientX - from;
      from = null;
      if (Math.abs(dx) > 14) {
        suppressToggleClick = true;
        setUniverse(dx > 0 ? 'sport' : 'lifestyle');
        setTimeout(function () { suppressToggleClick = false; }, 300);
      }
    });
    toggle.addEventListener('pointercancel', function () { from = null; });
  }

  function bindCitySwipe() {
    document.querySelectorAll('.scene-header').forEach(bindCityGesture);
  }

  function bindCityGesture(city) {
    let gesture = null;
    city.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      suppressCityClick = false;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
      const target = event.target.closest('button') || city;
      target.setPointerCapture(event.pointerId);
    });
    city.addEventListener('pointerup', function (event) {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      gesture = null;
      if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      suppressCityClick = true;
      cycleCity(dx < 0 ? 1 : -1);
      setTimeout(function () { suppressCityClick = false; }, 350);
    });
    city.addEventListener('pointercancel', function () { gesture = null; });
  }

  function bindCartDrag() {
    const sheet = document.querySelector('.look-cart');
    let gesture = null;
    sheet.addEventListener('pointerdown', function (event) {
      if (event.button !== 0 || !event.target.closest('.cart-handle, .cart-header') || event.target.closest('button')) return;
      gesture = { id: event.pointerId, y: event.clientY, time: performance.now(), offset: 0, scale: sheet.getBoundingClientRect().width / sheet.offsetWidth };
      sheet.setPointerCapture(event.pointerId);
    });
    sheet.addEventListener('pointermove', function (event) {
      if (!gesture || event.pointerId !== gesture.id) return;
      gesture.offset = Math.max(0, (event.clientY - gesture.y) / gesture.scale);
      sheet.classList.add('is-dragging');
      sheet.style.translate = '0 ' + gesture.offset + 'px';
    });
    function release(event, cancelled) {
      if (!gesture || event.pointerId !== gesture.id) return;
      const current = gesture; gesture = null;
      sheet.classList.remove('is-dragging');
      const dismiss = !cancelled && (current.offset > 75 || (current.offset > 30 && performance.now() - current.time < 250));
      sheet.style.translate = '';
      const destination = dismiss ? sheet.offsetHeight + 24 : 0;
      if (App.render.reduceMotion() || !sheet.animate) { if (dismiss) actions['close-cart'](); return; }
      const animation = sheet.animate([{ translate: '0 ' + current.offset + 'px' }, { translate: '0 ' + destination + 'px' }], { duration: 230, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      animation.onfinish = function () { if (dismiss) actions['close-cart'](); animation.cancel(); };
    }
    sheet.addEventListener('pointerup', function (event) { release(event, false); });
    sheet.addEventListener('pointercancel', function (event) { release(event, true); });
  }

  function start() {
    App.media.start();
    App.shared.keep(['location', 'weather', 'universe']);
    if (App.state.get('location') === 'lausanne') App.state.set('location', 'lavaux');
    document.addEventListener('click', tapHandler);
    document.getElementById('city-form').addEventListener('submit', function (event) {
      event.preventDefault();
      chooseCityFromInput();
    });
    document.getElementById('city-input').addEventListener('input', function () {
      if (App.state.get('locationError')) App.state.set('locationError', '');
    });
    document.addEventListener('keydown', function (event) {
      if (App.state.get('cartOpen')) {
        if (event.key === 'Escape') { event.preventDefault(); actions['close-cart'](); }
        if (event.key === 'Tab') {
          const controls = Array.from(document.querySelectorAll('.look-cart button:not(:disabled), .look-cart select:not(:disabled)')).filter(function (el) { return el.getClientRects().length > 0; });
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement.id === 'cart-title')) { event.preventDefault(); first.focus(); }
        }
        return;
      }
      if (event.key === 'Escape') {
        App.state.set('menuOpen', false);
        App.shop.stop();
      }
    });
    document.addEventListener('state-change', function (event) {
      if (redraw[event.detail.key]) redraw[event.detail.key]();
    });
    App.render.screen();
    App.render.entry();
    App.render.scene();
    App.render.menu();
    App.render.toast();
    App.render.avatar(App.config.avatarSrc);
    App.render.outfit();
    bindSwipe();
    bindToggleSwipe();
    bindCartDrag();
    bindCitySwipe();

  }
  start();
})();
