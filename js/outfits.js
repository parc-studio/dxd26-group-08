// Outfits per city / weather / universe. Edit here to change a look.
// short: true on a top shows the mannequin's arms (short sleeves).
// slot: top, pants, shorts, tights, shoes, hat, headband (sets where the layer sits on the avatar).
// To add a missing product, drop its PNG in assets/products/<city>/ (then export a .webp copy) with the same file name.
(function () {
  window.App = window.App || {};
  const dir = 'assets/products/barcelona/';
  const prices = {
    'aero-glide-4': 160,
    'bonatti-waterproof': 220,
    'genesis-2-gore-tex-spike': 210,
    'mountain-flex': 280,
    'outerpath-utility': 180,
    'outquest-shell': 250,
    's-lab-phantasm-3': 250,
    's-lab-salomon-ultra-bob': 50,
    'sense-aero-bandeau': 30,
    'sense-aero-graphic': 80,
    'sense-aero-stow-tights': 140,
    'sense-aero-wind': 160,
    'shakeout-casquette': 35,
    'shakeout-core-5-short': 60,
    'shakeout-core-tshirt': 50,
    'shakeout-fly': 120,
    'snowbird': 45,
    'thernova-demi-zip': 130,
    'wayfarer-2-0': 120,
    'wayfarer-warm': 140,
    'x-ultra-snowpilot-waterproof': 200,
    'xt-6-gore-tex': 200,
    'xt-6': 180
  };
  function item(file, slot, label, extra) {
    return Object.assign({ src: dir + file + '.webp', slot: slot, label: label, price: prices[file] }, extra || {});
  }
  // Body zones: a swipe on one product swaps only its zone to the other universe.
  App.outfitGroups = { top: 'top', pants: 'bottom', shorts: 'bottom', tights: 'bottom', shoes: 'shoes', hat: 'head', headband: 'head' };
  App.outfitOrder = ['bottom', 'shoes', 'top', 'head'];

  App.outfits = {
    barcelona: {
      rain: {
        lifestyle: [
          item('outerpath-utility', 'pants', 'Outerpath Utility'),
          item('xt-6-gore-tex', 'shoes', 'XT-6 Gore-Tex'),
          item('outquest-shell', 'top', 'Outquest shell 2,5 L')
        ],
        sport: [
          item('shakeout-core-5-short', 'shorts', 'ShakeOut Core 5"'),
          item('aero-glide-4', 'shoes', 'Aero Glide 4'),
          item('bonatti-waterproof', 'top', 'Bonatti Waterproof', { hood: true }),
          item('shakeout-casquette', 'hat', 'ShakeOut cap')
        ]
      },
      snow: {
        lifestyle: [
          item('wayfarer-warm', 'pants', 'Wayfarer Warm'),
          item('x-ultra-snowpilot-waterproof', 'shoes', 'X Ultra Snowpilot WP'),
          item('mountain-flex', 'top', 'Mountain Flex'),
          item('snowbird', 'hat', 'Snowbird')
        ],
        sport: [
          item('sense-aero-stow-tights', 'tights', 'Sense Aero Stow Tights'),
          item('genesis-2-gore-tex-spike', 'shoes', 'Genesis 2 GTX Spike'),
          item('thernova-demi-zip', 'top', 'Thernova half-zip'),
          item('sense-aero-bandeau', 'headband', 'Sense Aero headband')
        ]
      },
      sun: {
        lifestyle: [
          item('shakeout-core-5-short', 'shorts', 'ShakeOut Core 5"'),
          item('xt-6', 'shoes', 'XT-6'),
          item('shakeout-core-tshirt', 'top', 'ShakeOut Core tee', { short: true }),
          item('s-lab-salomon-ultra-bob', 'hat', 'S/Lab Ultra bob')
        ],
        sport: [
          item('shakeout-core-5-short', 'shorts', 'ShakeOut Core 5"'),
          item('s-lab-phantasm-3', 'shoes', 'S/Lab Phantasm 3'),
          item('sense-aero-graphic', 'top', 'Sense Aero Graphic', { short: true }),
          item('shakeout-casquette', 'hat', 'ShakeOut cap')
        ]
      },
      cloud: {
        lifestyle: [
          item('wayfarer-2-0', 'pants', 'Wayfarer 2.0'),
          item('xt-6', 'shoes', 'XT-6'),
          item('shakeout-fly', 'top', 'ShakeOut Fly')
        ],
        sport: [
          item('shakeout-core-5-short', 'shorts', 'ShakeOut Core 5"'),
          item('aero-glide-4', 'shoes', 'Aero Glide 4'),
          item('sense-aero-wind', 'top', 'Sense Aero Wind'),
          item('sense-aero-bandeau', 'headband', 'Sense Aero headband')
        ]
      }
    }
  };

  // Matterhorn: prices are prototype values; summer pieces reuse Barcelona assets.
  function alpine(file, slot, label, price, fit) {
    const fits = {
      'alpine-shell': { top: '3%', left: '-5%', width: '110%', height: '48%' },
      'black-shell': { top: '5%', left: '-7%', width: '114%', height: '46%' },
      'black-puffer': { top: '9%', left: '-8%', width: '116%', height: '42%' },
      'lilac-puffer': { top: '5%', left: '-5%', width: '110%', height: '46%' },
      'brown-fleece': { top: '11.5%', left: '-7%', width: '114%', height: '40%' },
      'black-beanie': { top: '-0.6%', left: '29.5%', width: '41%', height: '10.4%' },
      'cream-beanie': { top: '-0.6%', left: '29.5%', width: '41%', height: '10.4%' },
      'hiking-shoes': { left: '5%', width: '90%', height: 'auto' },
      'trail-shoes': { left: '5%', width: '90%', height: 'auto' }
    };
    return { src: 'assets/products/matterhorn/' + file + '.webp', slot: slot, label: label, price: price, fit: Object.assign({ objectFit: 'contain' }, fit || {}, fits[file] || {}) };
  }
  function helmet(file, label) {
    return alpine(file, 'hat', label, 180, { top: '-1%', left: '28%', width: '44%', height: '15.5%' });
  }
  const bootFit = { bottom: '-.6%', left: '0', width: '100%', height: '14.5%', objectFit: 'contain' };
  const bibFit = { top: '22%', left: '6%', width: '88%', height: '74%', objectPosition: '50% 0' };
  App.outfits.matterhorn = {
    snow: {
      lifestyle: [
        alpine('snow-pants', 'pants', 'Snow pants', 240),
        alpine('hiking-shoes', 'shoes', 'Hiking shoes', 180),
        alpine('black-puffer', 'top', 'Black puffer', 320),
        alpine('cream-beanie', 'hat', 'Cream beanie', 40)
      ],
      sport: [
        alpine('ski-bib', 'pants', 'Ski bib', 350, bibFit),
        alpine('ski-boots-aligned', 'shoes', 'Ski boots', 450, bootFit),
        alpine('alpine-shell', 'top', 'Alpine shell', 390, { top: '2%', height: '49%' }),
        helmet('ski-helmet-goggles', 'Ski helmet and goggles')
      ]
    },
    rain: {
      lifestyle: [
        alpine('technical-pants', 'pants', 'Technical pants', 180),
        alpine('hiking-shoes', 'shoes', 'Hiking shoes', 180),
        alpine('black-shell', 'top', 'Waterproof shell', 280, { top: '3%', height: '48%' }),
        alpine('black-beanie', 'hat', 'Black beanie', 40)
      ],
      sport: [
        alpine('technical-pants', 'pants', 'Technical pants', 180),
        alpine('trail-shoes', 'shoes', 'Trail shoes', 170),
        alpine('alpine-shell', 'top', 'Alpine shell', 390, { top: '2%', height: '49%' }),
        item('shakeout-casquette', 'hat', 'ShakeOut cap')
      ]
    },
    cloud: {
      lifestyle: [
        alpine('sage-pants', 'pants', 'Sage pants', 140),
        alpine('hiking-shoes', 'shoes', 'Hiking shoes', 180),
        alpine('lilac-puffer', 'top', 'Lilac puffer', 290, { top: '3%', height: '48%' }),
        alpine('cream-beanie', 'hat', 'Cream beanie', 40)
      ],
      sport: [
        alpine('technical-pants', 'pants', 'Technical pants', 180),
        alpine('trail-shoes', 'shoes', 'Trail shoes', 170),
        alpine('brown-fleece', 'top', 'Brown fleece', 150),
        alpine('black-beanie', 'hat', 'Black beanie', 40)
      ]
    },
    sun: {
      lifestyle: [
        alpine('sage-pants', 'pants', 'Sage pants', 140),
        alpine('hiking-shoes', 'shoes', 'Hiking shoes', 180),
        item('shakeout-core-tshirt', 'top', 'ShakeOut Core tee', { short: true }),
        item('s-lab-salomon-ultra-bob', 'hat', 'S/Lab Ultra bob')
      ],
      sport: [
        item('shakeout-core-5-short', 'shorts', 'ShakeOut Core 5"'),
        alpine('trail-shoes', 'shoes', 'Trail shoes', 170),
        item('sense-aero-graphic', 'top', 'Sense Aero Graphic', { short: true }),
        item('shakeout-casquette', 'hat', 'ShakeOut cap')
      ]
    }
  };
  // Reuse the fitted pieces, including their prices and silhouette positions.
  const wardrobe = {};
  [App.outfits.barcelona, App.outfits.matterhorn].forEach(function (city) {
    Object.values(city).forEach(function (weather) {
      Object.values(weather).forEach(function (pieces) {
        pieces.forEach(function (piece) {
          const key = piece.src.split('/').pop().replace(/\.(png|webp)$/, '');
          wardrobe[key] = piece;
        });
      });
    });
  });
  function styledLook(names) {
    return names.map(function (name) { return wardrobe[name]; });
  }
  App.outfits.paris = {
    sun: {
      lifestyle: styledLook(['technical-pants', 'xt-6', 'shakeout-core-tshirt', 's-lab-salomon-ultra-bob']),
      sport: styledLook(['shakeout-core-5-short', 's-lab-phantasm-3', 'sense-aero-graphic', 'shakeout-casquette'])
    },
    cloud: {
      lifestyle: styledLook(['outerpath-utility', 'xt-6', 'lilac-puffer', 'black-beanie']),
      sport: styledLook(['sense-aero-stow-tights', 'aero-glide-4', 'sense-aero-wind', 'sense-aero-bandeau'])
    },
    rain: {
      lifestyle: styledLook(['technical-pants', 'xt-6-gore-tex', 'black-shell', 'black-beanie']),
      sport: styledLook(['sense-aero-stow-tights', 'genesis-2-gore-tex-spike', 'bonatti-waterproof', 'shakeout-casquette'])
    },
    snow: {
      lifestyle: styledLook(['wayfarer-warm', 'x-ultra-snowpilot-waterproof', 'black-puffer', 'cream-beanie']),
      sport: styledLook(['technical-pants', 'genesis-2-gore-tex-spike', 'mountain-flex', 'sense-aero-bandeau'])
    }
  };
  App.outfits.lavaux = {
    sun: {
      lifestyle: styledLook(['sage-pants', 'hiking-shoes', 'shakeout-core-tshirt', 's-lab-salomon-ultra-bob']),
      sport: styledLook(['shakeout-core-5-short', 'trail-shoes', 'sense-aero-graphic', 'shakeout-casquette'])
    },
    cloud: {
      lifestyle: styledLook(['sage-pants', 'hiking-shoes', 'brown-fleece', 'cream-beanie']),
      sport: styledLook(['wayfarer-2-0', 'trail-shoes', 'sense-aero-wind', 'sense-aero-bandeau'])
    },
    rain: {
      lifestyle: styledLook(['outerpath-utility', 'xt-6-gore-tex', 'outquest-shell', 'black-beanie']),
      sport: styledLook(['technical-pants', 'trail-shoes', 'alpine-shell', 'shakeout-casquette'])
    },
    snow: {
      lifestyle: styledLook(['wayfarer-warm', 'x-ultra-snowpilot-waterproof', 'lilac-puffer', 'cream-beanie']),
      sport: styledLook(['sense-aero-stow-tights', 'genesis-2-gore-tex-spike', 'thernova-demi-zip', 'snowbird'])
    }
  };
})();
