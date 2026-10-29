(function () {
  window.App = window.App || {};
  let activeImage = 'a';
  let imageRequest = 0;
  let lastImage = 'lavaux-rain';
  let lastLocation = 'lavaux';
  let backdropAnimation = null;
  let transitionTimer;
  let waveFrame;
  let waveY = 48;
  function railPath(y) {
    const top = Math.max(0, y - 34);
    const bottom = Math.min(207, y + 34);
    return 'M 14 0 H 43 Q 57 0 57 14 V 193 Q 57 207 43 207 H 14 Q 0 207 0 193 V ' + bottom +
      ' C 0 ' + (y + 25) + ', 31 ' + (y + 26) + ', 31 ' + y +
      ' C 31 ' + (y - 26) + ', 0 ' + (y - 25) + ', 0 ' + top +
      ' V 14 Q 0 0 14 0 Z';
  }

  function setRailWave(target) {
    const path = document.getElementById('rail-shape-path');
    if (!path) return;
    cancelAnimationFrame(waveFrame);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      waveY = target;
      path.setAttribute('d', railPath(waveY));
      return;
    }
    const start = waveY;
    const startTime = performance.now();
    function animate(time) {
      const progress = Math.min(1, (time - startTime) / 520);
      const eased = 1 - Math.pow(1 - progress, 4);
      waveY = start + (target - start) * eased;
      path.setAttribute('d', railPath(waveY));
      if (progress < 1) waveFrame = requestAnimationFrame(animate);
    }
    waveFrame = requestAnimationFrame(animate);
  }

  function show(name, value) {
    document.querySelectorAll('[data-show="' + name + '"]').forEach(function (node) { node.textContent = value; });
  }

  // Warm the cache: the other cities in the current weather, so switching city is instant.
  const preloaded = {};
  function preloadCities(weather) {
    ['matterhorn', 'barcelona', 'lavaux', 'paris'].forEach(function (city) {
      const path = App.utils.imageFor(city, weather);
      if (preloaded[path]) return;
      preloaded[path] = new Image();
      preloaded[path].src = path;
    });
  }

  function crossfadeImage() {
    const location = App.state.get('location');
    const weather = App.state.get('weather');
    const key = location + '-' + weather;
    const serial = ++imageRequest;
    clearTimeout(transitionTimer);
    if (key === lastImage) {
      document.getElementById('salomon-app').classList.remove('is-scene-changing');
      return;
    }
    const newImage = new Image();
    const path = App.utils.imageFor(location, weather);
    newImage.onload = function () {
      if (serial !== imageRequest) return;
      setTimeout(function () { preloadCities(weather); }, 300);
      const app = document.getElementById('salomon-app');
      const cityChanged = location !== lastLocation;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (backdropAnimation) backdropAnimation.onfinish();
      app.classList.toggle('is-scene-changing', cityChanged && !reduce);
      app.dataset.backdropTransition = cityChanged ? 'city-fade' : 'weather-crossfade';
      function swap() {
        if (serial !== imageRequest) return;
        const current = document.getElementById('scene-image-' + activeImage);
        const nextKey = activeImage === 'a' ? 'b' : 'a';
        const next = document.getElementById('scene-image-' + nextKey);
        next.src = path;
        next.classList.add('is-visible');
        activeImage = nextKey;
        lastImage = key;
        lastLocation = location;
        if (cityChanged || reduce || !next.animate) {
          current.classList.remove('is-visible');
          requestAnimationFrame(function () { requestAnimationFrame(function () { if (serial === imageRequest) app.classList.remove('is-scene-changing'); }); });
          return;
        }
        // Keep the old photo opaque below the incoming one: no dip to black.
        next.style.zIndex = '2';
        const animation = next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-in-out', fill: 'forwards' });
        backdropAnimation = animation;
        animation.onfinish = function () {
          current.classList.remove('is-visible');
          next.style.zIndex = '';
          animation.cancel();
          if (backdropAnimation === animation) backdropAnimation = null;
        };
      }
      if (cityChanged && !reduce) transitionTimer = setTimeout(swap, 300);
      else swap();
    };
    newImage.onerror = function () {
      if (serial === imageRequest) {
        document.getElementById('salomon-app').classList.remove('is-scene-changing');
        App.render.toast('Scene unavailable. Try another weather.');
      }
    };
    newImage.src = path;
  }

  App.render = {
    screen() {
      const current = App.state.get('screen');
      document.querySelectorAll('[data-screen]').forEach(function (node) {
        node.hidden = node.dataset.screen !== current;
      });
    },
    focusScreenTitle() {
      const screen = document.querySelector('.screen:not([hidden])');
      const title = screen ? screen.querySelector('h1') : null;
      if (!title) return;
      screen.scrollTop = 0;
      title.focus({ preventScroll: true });
      requestAnimationFrame(function () { screen.scrollTop = 0; });
    },
    entry() {
      show('geo-label', App.state.get('geoBusy') ? 'Finding your location...' : 'Allow location');
      show('location-error', App.state.get('locationError'));
      const btn = document.querySelector('.geolocate-button');
      btn.disabled = App.state.get('geoBusy');
    },
    citySwap(direction, update) {
      const track = document.querySelector('.city-compass-track');
      if (!track || this.reduceMotion() || !track.animate) { update(); return; }
      const old = track.cloneNode(true);
      old.classList.add('compass-outgoing');
      old.setAttribute('aria-hidden', 'true');
      old.inert = true;
      old.querySelectorAll('[id]').forEach(function (node) { node.removeAttribute('id'); });
      old.querySelectorAll('[data-show]').forEach(function (node) { node.removeAttribute('data-show'); });
      track.parentNode.querySelectorAll('.compass-outgoing').forEach(function (node) { node.remove(); });
      track.getAnimations().forEach(function (animation) { animation.cancel(); });
      track.parentNode.appendChild(old);
      update();
      const distance = direction * track.getBoundingClientRect().width / 3;
      const options = { duration: 480, easing: 'cubic-bezier(.4,0,.2,1)' };
      const leaving = old.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + -distance + 'px)', opacity: 0 }], options);
      leaving.onfinish = function () { old.remove(); };
      track.animate([{ transform: 'translateX(' + distance + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], options);
      const ticks = document.querySelector('.compass-ticks');
      ticks.getAnimations().forEach(function (animation) { animation.cancel(); });
      ticks.animate([{ backgroundPositionX: '0px' }, { backgroundPositionX: (-direction * 112) + 'px' }], options);
    },
    scene() {
      const location = App.state.get('location');
      const weather = App.state.get('weather');
      const p = App.utils.places[location];
      const w = App.utils.weathers[weather];
      if (!p || !w) return;
      show('scene-location', p.label);
      const cities = ['matterhorn', 'barcelona', 'lavaux', 'paris'];
      const cityIndex = cities.indexOf(location);
      const pagination = document.querySelector('.city-pagination');
      pagination.setAttribute('aria-label', p.label + ', city ' + (cityIndex + 1) + ' of 4');
      pagination.querySelectorAll('span').forEach(function (dot, index) { dot.classList.toggle('is-current', index === cityIndex); });
      document.querySelectorAll('[data-action="cycle-location"]').forEach(function (button) {
        button.setAttribute('aria-label', p.label + ', show next city');
      });
      const previousCity = App.utils.places[cities[(cityIndex + cities.length - 1) % cities.length]].label;
      const nextCity = App.utils.places[cities[(cityIndex + 1) % cities.length]].label;
      const previousButton = document.querySelector('.city-arrow-prev');
      const nextButton = document.querySelector('.city-arrow-next');
      previousButton.textContent = previousCity;
      previousButton.setAttribute('aria-label', 'Go to ' + previousCity);
      nextButton.textContent = nextCity;
      nextButton.setAttribute('aria-label', 'Go to ' + nextCity);
      show('scene-location-small', p.label.toUpperCase());
      show('scene-temperature', App.utils.temperatures[location][weather]);
      // Weather label under the city: "Sunny Now" for the live weather, just "Sunny" when previewing another one.
      const nowTag = document.querySelector('.scene-now-tag');
      nowTag.hidden = true;
      nowTag.textContent = App.state.get('isWeatherPreview') ? w.label : w.label + ' Now';
      document.querySelector('.scene-temperature').hidden = false;
      show('weather-name', w.label);
      show('weather-detail', w.detail);
      show('weather-index', w.index);
      document.getElementById('salomon-app').dataset.location = location;
      document.getElementById('salomon-app').dataset.weather = weather;
      document.querySelectorAll('[data-weather]').forEach(function (node) {
        if (node.matches('button[data-weather]')) {
          const selected = node.dataset.weather === weather;
          node.classList.toggle('is-active', selected);
          node.setAttribute('aria-pressed', String(selected));
        }
      });
      const toggle = document.querySelector('.toggle-open-icon use');
      toggle.setAttribute('href', w.symbol);
      crossfadeImage();
    },
    menu() {
      const open = App.state.get('menuOpen');
      const cluster = document.querySelector('.control-cluster');
      cluster.dataset.menuOpen = String(open);
      cluster.dataset.menuSection = App.state.get('menuSection');
      const wavePositions = { weather: 48, shop: 101, outfit: 154 };
      setRailWave(wavePositions[App.state.get('menuSection')] || 48);
      const section = App.state.get('menuSection');
      document.getElementById('weather-rail').inert = !open;
      // Only the row of the chosen section exists on screen, so rows never stack on top of each other.
      const weatherRow = document.getElementById('step-controls');
      weatherRow.inert = !open || section !== 'weather';
      weatherRow.hidden = section !== 'weather';
      ['shop', 'outfit'].forEach(function (name) {
        const panel = document.getElementById('panel-' + name);
        panel.inert = !open || section !== name;
        panel.hidden = !open || section !== name;
      });
      const toggle = document.querySelector('.glass-menu-toggle');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close weather and navigation menu' : 'Open weather and navigation menu');
      document.querySelectorAll('[data-step]').forEach(function (button) {
        const selected = button.dataset.step === App.state.get('step');
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      document.querySelectorAll('[data-menu-section]').forEach(function (button) {
        if (!button.matches('button')) return;
        const selected = button.dataset.menuSection === App.state.get('menuSection');
        button.setAttribute('aria-pressed', String(selected));
      });
    },
    toast(value) {
      const toast = document.getElementById('scene-toast');
      toast.textContent = value || App.state.get('toast') || '';
      toast.classList.toggle('is-showing', Boolean(toast.textContent));
    },
    avatar(source) {
      if (!source) return;
      const layer = document.getElementById('avatar-layer');
      const figure = document.createElement('div');
      figure.className = 'avatar-figure';
      figure.classList.toggle('is-refined-mannequin', App.config.mannequinTest);
      const image = document.createElement('img');
      image.src = source;
      image.className = 'avatar-silhouette';
      image.alt = '';
      image.onload = function () { layer.classList.add('has-avatar'); };
      image.onerror = function () { figure.remove(); };
      const layers = document.createElement('div');
      layers.className = 'outfit-layers';
      layers.id = 'outfit-layers';
      // The same silhouette cut into zones (head, torso, arms, legs): a zone hides when a product covers it.
      const body = document.createElement('div');
      body.className = 'avatar-body';
      ['head', 'torso', 'arm-l', 'arm-r', 'legs'].forEach(function (zone) {
        const part = document.createElement('img');
        // Legs: slimmer drawn legs whose ankles land in the shoes (see assets/legs.svg).
        part.src = zone === 'legs' ? 'assets/legs.svg' : source;
        if (zone === 'legs' && App.config.mannequinTest) part.src = 'assets/legs-mannequin-test.svg';
        if (zone === 'head' && App.config.mannequinTest) part.src = App.config.mannequinHeadSrc;
        part.alt = '';
        part.className = 'b-zone b-' + zone;
        body.appendChild(part);
      });
      figure.append(image, body, layers);
      layer.replaceChildren(figure);
    },
    currentLook() {
      const city = App.outfits[App.state.get('location')];
      const looks = city && city[App.state.get('weather')];
      const mix = App.state.get('mix') || {};
      return looks ? App.outfitOrder.map(function (group) {
        return (looks[mix[group] || App.state.get('universe')] || []).find(function (piece) { return App.outfitGroups[piece.slot] === group; });
      }).filter(Boolean) : [];
    },
    selectedLook() {
      const removed = App.state.get('cartRemoved');
      return this.currentLook().filter(function (piece) { return removed.indexOf(piece.src) === -1; });
    },
    lookTotal() {
      const total = this.selectedLook().reduce(function (sum, piece) { return sum + piece.price; }, 0);
      show('look-total', 'CHF ' + total);
      document.querySelector('.cart-shortcut').setAttribute('aria-label', 'Buy the look, CHF ' + total);
    },
    cart() {
      const open = App.state.get('cartOpen');
      const overlay = document.getElementById('cart-overlay');
      overlay.hidden = !open;
      document.querySelector('.cart-shortcut').setAttribute('aria-expanded', String(open));
      ['.scene-header', '.control-cluster'].forEach(function (selector) { document.querySelector(selector).inert = open; });
      if (!open) return;
      const look = this.currentLook();
      const removed = App.state.get('cartRemoved');
      const stage = App.state.get('cartStage');
      const pieces = stage === 'bag' ? look.filter(function (piece) { return removed.indexOf(piece.src) === -1; }) : App.state.get('checkoutPieces');
      const holder = document.getElementById('cart-items');
      holder.replaceChildren();
      const descriptions = { top: 'Outer layer', pants: 'Outdoor pants', shorts: 'Technical shorts', tights: 'Technical tights', shoes: 'Outdoor footwear', hat: 'Headwear', headband: 'Technical headband' };
      pieces.forEach(function (piece) {
        const row = document.createElement('article');
        row.className = 'cart-item';
        const photo = document.createElement('div'); photo.className = 'cart-photo';
        const img = document.createElement('img'); img.src = piece.src; img.alt = piece.label; photo.appendChild(img);
        const info = document.createElement('div'); info.className = 'cart-info';
        const name = document.createElement('h3'); name.textContent = piece.label;
        const description = document.createElement('p'); description.textContent = descriptions[piece.slot] || 'Outdoor';
        const price = document.createElement('p'); price.className = 'cart-price'; price.textContent = 'CHF ' + piece.price;
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'cart-remove'; remove.dataset.action = 'remove-cart-item'; remove.dataset.src = piece.src;
        remove.setAttribute('aria-label', 'Remove ' + piece.label);
        remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg>';
        info.append(name, description, price); row.append(photo, info, remove); holder.appendChild(row);
      });
      if (!pieces.length) {
        const empty = document.createElement('p'); empty.className = 'cart-empty';
        empty.textContent = look.length ? 'Your bag is empty.' : 'No items available for this city yet.';
        holder.appendChild(empty);
      }
      document.querySelector('.cart-restore').hidden = stage !== 'bag' || !removed.length;
      document.querySelector('.cart-buy').disabled = !pieces.length;
      document.getElementById('cart-total').textContent = 'CHF ' + pieces.reduce(function (sum, piece) { return sum + piece.price; }, 0);
      this.checkout(pieces, stage);
    },
    checkout(pieces, stage) {
      const content = document.getElementById('checkout-content');
      const total = pieces.reduce(function (sum, piece) { return sum + piece.price; }, 0);
      const titles = { bag: 'Buy the look', payment: 'Payment', paid: 'All set' };
      document.getElementById('cart-title').textContent = titles[stage];
      document.getElementById('cart-continue-label').textContent = stage === 'bag' ? 'Buy the look' : stage === 'payment' ? 'Pay CHF ' + total : 'Back to outfit';
      document.querySelector('.checkout-back').hidden = stage !== 'payment';
      document.querySelector('.cart-footer').hidden = stage === 'paid';
      document.getElementById('cart-items').hidden = stage !== 'bag';
      content.hidden = stage === 'bag';
      content.replaceChildren();
      if (stage === 'bag') return;
      if (stage === 'payment') {
        const heading = document.createElement('p');
        heading.className = 'checkout-intro';
        heading.textContent = 'Payment method';
        content.appendChild(heading);
        const methods = document.createElement('div');
        methods.className = 'payment-methods';
        [{ id: 'card', title: 'Card', detail: 'Demo Visa ···· 4242' }, { id: 'apple-pay', title: 'Apple Pay', detail: 'Demo wallet' }].forEach(function (method) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'payment-method';
          button.dataset.action = 'choose-payment';
          button.dataset.method = method.id;
          button.setAttribute('aria-pressed', String(App.state.get('paymentMethod') === method.id));
          const name = document.createElement('strong'); name.textContent = method.title;
          const detail = document.createElement('span'); detail.textContent = method.detail;
          button.append(name, detail); methods.appendChild(button);
        });
        content.appendChild(methods);
        const note = document.createElement('p'); note.className = 'payment-note'; note.textContent = 'Demo checkout · no charge';
        content.appendChild(note);
      } else {
        const check = document.createElement('div'); check.className = 'payment-success'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
        const message = document.createElement('p'); message.className = 'payment-success-message'; message.textContent = 'Demo payment complete';
        const amount = document.createElement('p'); amount.className = 'payment-success-total'; amount.textContent = 'CHF ' + total;
        content.append(check, message, amount);
      }
      const summary = document.createElement('div'); summary.className = 'payment-summary';
      pieces.forEach(function (piece) {
        const row = document.createElement('div'); row.className = 'payment-summary-item';
        const image = document.createElement('img'); image.src = piece.src; image.alt = '';
        const name = document.createElement('span'); name.textContent = piece.label;
        const price = document.createElement('span'); price.textContent = 'CHF ' + piece.price;
        row.append(image, name, price); summary.appendChild(row);
      });
      content.appendChild(summary);
    },
    outfit(mode) {
      const rawLook = this.currentLook();
      const signature = rawLook.map(function (piece) { return piece.src; }).join('|');
      if (signature !== App.state.get('cartLook')) {
        App.state.set('cartLook', signature);
        if (App.state.get('cartRemoved').length) {
          App.state.set('cartRemoved', []);
          return;
        }
      }
      this.lookTotal();
      const holder = document.getElementById('outfit-layers');
      const universe = App.state.get('universe');
      const city = App.outfits[App.state.get('location')];
      const looks = city ? city[App.state.get('weather')] : null;
      const mix = App.state.get('mix') || {};
      const toggle = document.getElementById('outfit-toggle');
      if (toggle) {
        toggle.setAttribute('aria-checked', String(universe === 'sport'));
        toggle.dataset.universe = universe;
      }
      if (!holder) return;
      // Each zone comes from the global universe unless the visitor swiped that product.
      const pieces = this.selectedLook();
      const fig = holder.parentNode;
      const top = pieces.find(function (piece) { return piece.slot === 'top'; });
      fig.classList.toggle('is-dressed', pieces.length > 0);
      // Hide the mannequin parts a product already covers, so no white edge shows around it.
      fig.classList.toggle('hide-torso', Boolean(top));
      fig.classList.toggle('hide-arms', Boolean(top && !top.short));
      fig.classList.toggle('hide-feet', pieces.some(function (piece) { return piece.slot === 'shoes'; }));
      fig.classList.toggle('hide-legs', pieces.some(function (piece) { return piece.slot === 'pants' || piece.slot === 'tights'; }));
      // Each body zone keeps its own image; only zones whose product changed are animated.
      const wanted = {};
      pieces.forEach(function (piece) { wanted[App.outfitGroups[piece.slot]] = piece; });
      App.outfitOrder.forEach(function (group) {
        const current = holder.querySelector('.outfit-piece[data-group="' + group + '"]:not(.is-leaving)');
        const piece = wanted[group];
        if (current && piece && current.dataset.src === piece.src) return;
        if (current) App.render.pieceLeave(current, mode);
        if (piece) App.render.pieceEnter(App.render.pieceImage(piece), mode);
      });
    },
    pieceImage(piece) {
      const splitBoots = piece.src.indexOf('ski-boots-aligned.webp') !== -1;
      const img = document.createElement(splitBoots ? 'div' : 'img');
      const group = App.outfitGroups[piece.slot];
      img.dataset.group = group;
      img.dataset.src = piece.src;
      img.src = piece.src;
      img.alt = piece.label;
      img.draggable = false;
      img.className = 'outfit-piece slot-' + piece.slot + (piece.hood ? ' has-hood' : '');
      if (splitBoots) {
        img.classList.add('ski-boots-pair');
        img.setAttribute('role', 'img');
        img.setAttribute('aria-label', piece.label);
        ['left', 'right'].forEach(function (side) {
          const boot = document.createElement('img');
          boot.src = piece.src;
          boot.alt = '';
          boot.draggable = false;
          boot.className = 'boot-' + side;
          boot.onerror = function () { img.remove(); if (img.priceTag) img.priceTag.remove(); };
          img.appendChild(boot);
        });
      }
      if (piece.fit) Object.assign(img.style, piece.fit);
      img.onerror = function () { img.remove(); if (img.priceTag) img.priceTag.remove(); };
      // White dot on the product: tap it to see its price. It travels with the product (priceTag).
      const tag = document.createElement('div');
      tag.className = 'price-dot price-dot-' + group;
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'price-dot-button';
      dot.dataset.action = 'toggle-price';
      dot.setAttribute('aria-label', piece.label + ', price');
      dot.setAttribute('aria-expanded', 'false');
      const bubble = document.createElement('span');
      bubble.className = 'price-bubble';
      bubble.setAttribute('role', 'status');
      const name = document.createElement('span'); name.className = 'price-bubble-name'; name.textContent = piece.label;
      const amount = document.createElement('strong'); amount.textContent = 'CHF ' + piece.price;
      bubble.append(name, amount);
      tag.append(dot, bubble);
      img.priceTag = tag;
      return img;
    },
    reduceMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
    // How far a product flies when it leaves the avatar.
    flyDistance() {
      const layer = document.getElementById('outfit-layers');
      return Math.max(200, (layer ? layer.getBoundingClientRect().width : 200) * 0.9);
    },
    // mode: -1 flies out to the left, 1 to the right, anything else fades. from: current drag offset in px.
    pieceLeave(el, mode, from) {
      el.classList.add('is-leaving');
      const price = el.priceTag;
      if (price) price.classList.add('is-leaving');
      if (this.reduceMotion() || !el.animate) { if (price) price.remove(); el.remove(); return; }
      const start = from || 0;
      el.style.transform = '';
      if (price) price.style.transform = '';
      const pair = price ? [el, price] : [el];
      function removePair() { pair.forEach(function (node) { node.remove(); }); }
      if (mode === -1 || mode === 1) {
        const target = mode * this.flyDistance();
        const frames = [
          { transform: 'translate3d(' + start + 'px, 0, 0) rotate(' + (start / 24) + 'deg)', opacity: 1 },
          { transform: 'translate3d(' + target + 'px, -20px, 0) rotate(' + (mode * 13) + 'deg)', opacity: 0 }
        ];
        pair.forEach(function (node, index) {
          const animation = node.animate(frames, { duration: 450, easing: 'cubic-bezier(.22,.72,.23,1)', fill: 'forwards' });
          if (index === 0) animation.onfinish = removePair;
        });
      } else {
        pair.forEach(function (node, index) {
          const animation = node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease', fill: 'forwards' });
          if (index === 0) animation.onfinish = removePair;
        });
      }
    },
    pieceEnter(el, mode) {
      const holder = document.getElementById('outfit-layers');
      const price = el.priceTag;
      holder.appendChild(el);
      if (price) holder.appendChild(price);
      if (this.reduceMotion() || !el.animate) return;
      const sliding = mode === -1 || mode === 1;
      const frames = [
        { transform: sliding ? 'translate3d(' + (-mode * 88) + 'px, 0, 0) scale(.97)' : 'translate3d(0, 6px, 0)', opacity: 0 },
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 }
      ];
      (price ? [el, price] : [el]).forEach(function (node) {
        node.animate(frames, { duration: 390, easing: 'cubic-bezier(.18,.85,.25,1)', delay: sliding ? 60 : 0, fill: 'backwards' });
      });
    },
    // Is this point on the avatar's head (top of the silhouette)?
    onBareHead(x, y) {
      const fig = document.querySelector('.avatar-figure.is-dressed');
      if (!fig || fig.querySelector('.outfit-piece[data-group="head"]:not(.is-leaving)')) return false;
      const box = fig.getBoundingClientRect();
      return x > box.left + box.width * 0.15 && x < box.right - box.width * 0.15 && y > box.top - box.height * 0.04 && y < box.top + box.height * 0.15;
    },
    // Which product is under this point? Uses the drawn image area, not its transparent box.
    pieceAt(x, y) {
      // Check the front-most product first (highest z-index: headwear, top, shoes, bottom).
      const imgs = Array.from(document.querySelectorAll('#outfit-layers .outfit-piece:not(.is-leaving)'))
        .sort(function (a, b) { return (parseInt(getComputedStyle(b).zIndex, 10) || 0) - (parseInt(getComputedStyle(a).zIndex, 10) || 0); });
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        const source = img.querySelector('img') || img;
        const box = img.getBoundingClientRect();
        if (!source.naturalWidth || !box.width) continue;
        if (img.style.transform) continue;
        const scale = Math.min(box.width / source.naturalWidth, box.height / source.naturalHeight);
        const w = source.naturalWidth * scale;
        const h = source.naturalHeight * scale;
        const left = box.left + (box.width - w) / 2;
        const py = parseFloat((getComputedStyle(img).objectPosition.split(' ')[1]) || '50') / 100;
        const top = box.top + (box.height - h) * py;
        if (x >= left && x <= left + w && y >= top && y <= top + h) return img;
      }
      return null;
    }
  };
})();
