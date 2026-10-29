(function () {
  window.App = window.App || {};
  const cache = new Map();
  const queue = [];
  let active = 0;

  function pump() {
    queue.sort(function (a, b) { return a.priority - b.priority; });
    while (active < 3 && queue.length) {
      const job = queue.shift();
      active++;
      job.started = true;
      const img = new Image();
      job.image = img;
      img.decoding = 'async';
      img.fetchPriority = job.priority === 0 ? 'high' : 'low';
      function finish(ok) {
        active--;
        if (!ok) cache.delete(job.src);
        job.resolve(ok);
        pump();
      }
      img.onload = function () {
        const decoded = img.decode ? img.decode().catch(function () {}) : Promise.resolve();
        decoded.then(function () { finish(true); });
      };
      img.onerror = function () { finish(false); };
      img.src = job.src;
    }
  }

  function ready(src, priority) {
    priority = priority || 0;
    let job = cache.get(src);
    if (job) {
      job.priority = Math.min(job.priority, priority);
      if (job.image && priority === 0) job.image.fetchPriority = 'high';
      return job.promise;
    }
    job = { src: src, priority: priority };
    job.promise = new Promise(function (resolve) { job.resolve = resolve; });
    cache.set(src, job);
    queue.push(job);
    // Batch requests so the priority order is respected before starting downloads.
    Promise.resolve().then(pump);
    return job.promise;
  }

  function paths(city, weather) {
    const looks = App.outfits[city][weather];
    return [App.utils.imageFor(city, weather)].concat(looks.lifestyle, looks.sport).map(function (item) { return typeof item === 'string' ? item : item.src; });
  }

  App.media = {
    ready: ready,
    context: function (city, weather) {
      paths(city, weather).forEach(function (src) { ready(src, 1); });
    },
    start: function () {
      const flow = [['lavaux', 'rain'], ['matterhorn', 'rain'], ['matterhorn', 'snow'], ['matterhorn', 'sun'], ['matterhorn', 'cloud']];
      const critical = [];
      flow.forEach(function (step, index) {
        // The first interaction is a swipe on the upper layer.
        const sources = paths(step[0], step[1]);
        const tops = [App.outfits[step[0]][step[1]].lifestyle, App.outfits[step[0]][step[1]].sport].map(function (look) { return look.find(function (piece) { return piece.slot === 'top'; }).src; });
        tops.concat(sources).forEach(function (src) { critical.push(ready(src, 10 + index)); });
      });
      Promise.all(critical).then(function () {
        const rest = function () {
          Object.keys(App.outfits).forEach(function (city) {
            Object.keys(App.outfits[city]).forEach(function (weather) {
              paths(city, weather).forEach(function (src) { ready(src, 100); });
            });
          });
        };
        if (window.requestIdleCallback) window.requestIdleCallback(rest);
        else setTimeout(rest, 500);
      });
    }
  };
})();
