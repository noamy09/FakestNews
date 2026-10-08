(function () {
  const widget = document.getElementById('weather-widget');
  if (!widget) return;
  const body = widget.querySelector('.weather-body');

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const renderError = () => {
    body.dataset.state = 'error';
    body.replaceChildren(el('p', 'weather-error', 'Weather is unavailable right now.'));
  };

  const render = (w) => {
    body.dataset.state = 'ready';
    const location = el('p', 'weather-location', w.country ? `${w.city}, ${w.country}` : w.city);

    const main = el('div', 'weather-main');
    if (w.icon && /^[0-9a-z]+$/i.test(w.icon)) {
      const img = el('img', 'weather-icon');
      img.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`;
      img.alt = w.description;
      img.width = 64;
      img.height = 64;
      main.append(img);
    }
    main.append(el('span', 'weather-temp', `${w.temp}°C`));

    const desc = el('p', 'weather-desc', w.description);

    const details = el('dl', 'weather-details');
    [
      ['Feels like', `${w.feelsLike}°C`],
      ['Humidity', `${w.humidity}%`],
      ['Wind', `${w.windSpeed} m/s`]
    ].forEach(([label, value]) => {
      const row = el('div');
      row.append(el('dt', '', label), el('dd', '', value));
      details.append(row);
    });

    const updated = new Date(w.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const footer = el('p', 'weather-updated', `Updated ${updated}${w.stale ? ' (cached)' : ''}`);

    body.replaceChildren(location, main, desc, details, footer);
  };

  fetch('/api/weather', { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then(render)
    .catch(renderError)
    .finally(() => widget.setAttribute('aria-busy', 'false'));
})();
