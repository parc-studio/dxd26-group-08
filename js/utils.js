(function () {
  window.App = window.App || {};
  App.utils = {
    places: {
      barcelona: { label: 'Barcelona', lat: 41.3874, lon: 2.1686 },
      matterhorn: { label: 'Matterhorn', lat: 45.9763, lon: 7.6586 },
      lavaux: { label: 'Lavaux', lat: 46.49, lon: 6.74 },
      paris: { label: 'Paris', lat: 48.8566, lon: 2.3522 }
    },
    weathers: {
      sun: { label: 'Sunny', detail: 'Blue skies. All-day movement.', index: '01', symbol: '#i-sun' },
      rain: { label: 'Rainstorm', detail: 'Stay out. Stay protected.', index: '02', symbol: '#i-rain' },
      snow: { label: 'Snow', detail: 'Cold air. New terrain.', index: '03', symbol: '#i-snow' },
      cloud: { label: 'Overcast', detail: 'Quiet skies. Open horizons.', index: '04', symbol: '#i-wind' }
    },
    temperatures: {
      barcelona: { sun: '+24°', rain: '+14°', snow: '+2°', cloud: '+17°' },
      matterhorn: { sun: '+12°', rain: '+4°', snow: '−8°', cloud: '+1°' },
      lavaux: { sun: '+22°', rain: '+10°', snow: '−2°', cloud: '+13°' },
      paris: { sun: '+23°', rain: '+12°', snow: '0°', cloud: '+15°' }
    },
    imageFor(location, weather) {
      const place = this.places[location];
      const backdrop = place && place.backdrop ? place.backdrop : location;
      return 'assets/backgrounds/' + backdrop + '-' + weather + '.webp';
    },
    parseCity(text) {
      const term = String(text).trim().toLocaleLowerCase();
      if (/(barcelona|barcelone|barca|bcn)/.test(term)) return 'barcelona';
      if (/(matterhorn|zermatt|cervin|cervino)/.test(term)) return 'matterhorn';
      if (/(lavaux|lausanne|lsn)/.test(term)) return 'lavaux';
      if (/(paris)/.test(term)) return 'paris';
      return '';
    },
    distanceSquared(lat, lon, place) {
      const rad = Math.PI / 180;
      const dlat = (lat - place.lat) * rad;
      const dlon = (lon - place.lon) * rad;
      return dlat * dlat + dlon * dlon * Math.cos(lat * rad) * Math.cos(place.lat * rad);
    },
    nearestPlace(lat, lon) {
      const cities = this.places;
      return Object.keys(cities).reduce(function (nearest, key) {
        return this.distanceSquared(lat, lon, cities[key]) < this.distanceSquared(lat, lon, cities[nearest]) ? key : nearest;
      }.bind(this), 'barcelona');
    }
  };
})();
