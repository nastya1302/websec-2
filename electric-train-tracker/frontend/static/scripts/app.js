const API_URL = 'http://localhost:5000/api';

let selectedStationCode = null;
let selectedStationName = null;
let fromStationCode = null;
let toStationCode = null;
let favorites = [];
let map = null;
let mapMarkers = [];

$(document).ready(function() {
    const saved = localStorage.getItem('railway_favorites');
    if (saved) favorites = JSON.parse(saved);
    
    const today = new Date().toISOString().split('T')[0];
    $('#station-date').val(today);
    $('#route-date').val(today);
    
    initTabs();
    initSearch();
    loadRecommendedStations();
    renderFavorites();
    
    $('#search-station-btn').click(loadStationTimetable);
    $('#search-route-btn').click(findRouteTimetable);
});

function initTabs() {
    $('.tab-btn').click(function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        
        const tab = $(this).data('tab');
        $('.tab-content').removeClass('active');
        $(`#${tab}-tab`).addClass('active');
        $('#results').hide();
        
        if (tab === 'map') setTimeout(() => initMap(), 100);
        if (tab === 'favorites') renderFavorites();
    });
}

function initSearch() {
    const fields = [
        { input: '#station-input', suggestions: '#station-suggestions', setCode: (c) => selectedStationCode = c, setName: (n) => selectedStationName = n },
        { input: '#from-input', suggestions: '#from-suggestions', setCode: (c) => fromStationCode = c },
        { input: '#to-input', suggestions: '#to-suggestions', setCode: (c) => toStationCode = c }
    ];
    
    fields.forEach(field => {
        let timeout;
        $(field.input).on('input', function() {
            clearTimeout(timeout);
            const query = $(this).val();
            if (query.length < 2) {
                $(field.suggestions).hide();
                return;
            }
            timeout = setTimeout(() => {
                $.get(`${API_URL}/search/stations?q=${encodeURIComponent(query)}`, function(data) {
                    $(field.suggestions).empty().show();
                    data.forEach(s => {
                        const item = $(`<div class="suggestion-item"><b>${s.title}</b><br><small>${s.city || ''}</small></div>`);
                        item.click(() => {
                            $(field.input).val(s.title);
                            if (field.setCode) field.setCode(s.code);
                            if (field.setName) field.setName(s.title);
                            $(field.suggestions).hide();
                        });
                        $(field.suggestions).append(item);
                    });
                });
            }, 300);
        });
        $(document).click(e => {
            if (!$(e.target).closest(field.input).length) $(field.suggestions).hide();
        });
    });
}

function loadRecommendedStations() {
    $.get(`${API_URL}/recommended/stations`, function(data) {
        const container = $('#popular-list');
        container.empty();
        data.forEach(s => {
            const item = $(`<div class="popular-item">${s.name}</div>`);
            item.click(() => {
                selectedStationCode = s.code;
                selectedStationName = s.name;
                $('#station-input').val(s.name);
                loadStationTimetable();
            });
            container.append(item);
        });
    });
}

function loadStationTimetable() {
    if (!selectedStationCode) {
        showMessage('Выберите станцию!');
        return;
    }
    const date = $('#station-date').val();
    showLoading();
    $('#results').show();
    $.get(`${API_URL}/timetable/station?station=${selectedStationCode}&date=${date}`)
        .done(data => displayTimetable(data, selectedStationName))
        .fail(() => $('#schedule-list').html('<div class="error">Ошибка загрузки</div>'))
        .always(() => hideLoading());
}

function findRouteTimetable() {
    if (!fromStationCode || !toStationCode) {
        showMessage('Выберите обе станции!');
        return;
    }
    const date = $('#route-date').val();
    showLoading();
    $('#results').show();
    $.get(`${API_URL}/timetable/route?from=${fromStationCode}&to=${toStationCode}&date=${date}`)
        .done(data => displayTimetable(data))
        .fail(() => $('#schedule-list').html('<div class="error">Ошибка загрузки</div>'))
        .always(() => hideLoading());
}

function displayTimetable(data, stationContextName) {
    let trains = [];
    
    if (data && data.schedule && Array.isArray(data.schedule)) {
        trains = data.schedule;
    } else if (data && data.segments && Array.isArray(data.segments)) {
        trains = data.segments;
    } else if (Array.isArray(data)) {
        trains = data;
    }
    
    if (trains.length === 0) {
        $('#schedule-list').html('<div class="empty-message">🚂 Поездов не найдено</div>');
        $('#results-count').text('');
        return;
    }
    
    $('#results-count').text(`${trains.length} поезд(ов)`);
    $('#schedule-list').empty();
    
    const favContextName = stationContextName || $('#station-input').val() || 'Станция';
    
    trains.forEach(train => {
        let trainNumber = '---';
        let depTime = '---';
        let arrTime = '---';
        let days = '';
        let direction = '';
        
        if (train.thread && train.thread.number) trainNumber = train.thread.number;
        else if (train.number) trainNumber = train.number;
        
        if (train.departure) depTime = train.departure;
        if (train.arrival) arrTime = train.arrival;
        if (train.days) days = train.days;
        if (train.direction) direction = train.direction;
        else if (train.thread && train.thread.title) direction = train.thread.title;
        
        const fromName = train.from?.title || '';
        const toName = train.to?.title || '';
        
        const isFav = favorites.includes(favContextName);
        
        const card = $(`
            <div class="train-card">
                <div class="train-header">
                    <span class="train-number">🚆 Поезд №${trainNumber}</span>
                    <button class="favorite-btn ${isFav ? 'active' : ''}" data-name="${favContextName}">
                        <i class="fas ${isFav ? 'fa-heart' : 'fa-heart-o'}"></i>
                        <span>${isFav ? 'В избранном' : 'Сохранить'}</span>
                    </button>
                </div>
                <div class="train-route">
                    ${fromName && toName ? `${fromName} → ${toName}` : (direction || favContextName)}
                </div>
                <div class="train-time">
                    <div class="departure-info">
                        <span class="time-label">🕐 Отправление:</span>
                        <span class="time-value">${depTime}</span>
                    </div>
                    <div class="arrival-info">
                        <span class="time-label">🏁 Прибытие:</span>
                        <span class="time-value">${arrTime}</span>
                    </div>
                </div>
                ${days ? `<div class="train-days">📅 ${days}</div>` : ''}
            </div>
        `);
        
        card.find('.favorite-btn').click(function(e) {
            e.stopPropagation();
            const name = $(this).data('name');
            toggleFavorite(name);
            updateFavButton($(this), name);
        });
        
        $('#schedule-list').append(card);
    });
}

function toggleFavorite(name) {
    const idx = favorites.indexOf(name);
    if (idx === -1) {
        favorites.push(name);
        showMessage(`❤️ ${name} добавлена в избранное`);
    } else {
        favorites.splice(idx, 1);
        showMessage(`💔 ${name} удалена из избранного`);
    }
    localStorage.setItem('railway_favorites', JSON.stringify(favorites));
    renderFavorites();
}

function isFavorite(name) {
    return favorites.includes(name);
}

function updateFavButton(btn, name) {
    const fav = isFavorite(name);
    btn.toggleClass('active', fav);
    btn.find('i').attr('class', `fas ${fav ? 'fa-heart' : 'fa-heart-o'}`);
    btn.find('span').text(fav ? 'В избранном' : 'Сохранить');
}

function renderFavorites() {
    const container = $('#favorites-list');
    if (favorites.length === 0) {
        container.html('<p class="empty-message">⭐ Нет избранных станций. Добавьте их из расписания!</p>');
        return;
    }
    container.empty();
    favorites.forEach(name => {
        const card = $(`
            <div class="favorite-card" data-name="${name}">
                <div><i class="fas fa-train"></i> <strong>${name}</strong></div>
                <button class="remove-fav">🗑️ Удалить</button>
            </div>
        `);
        card.click(e => {
            if (!$(e.target).hasClass('remove-fav')) {
                selectedStationName = name;
                $('#station-input').val(name);
                $('.tab-btn[data-tab="station"]').click();
                findStationCodeByName(name);
            }
        });
        card.find('.remove-fav').click(e => {
            e.stopPropagation();
            toggleFavorite(name);
        });
        container.append(card);
    });
}

function findStationCodeByName(stationName) {
    $.get(`${API_URL}/search/stations?q=${encodeURIComponent(stationName)}`, function(data) {
        if (data && data.length > 0) {
            selectedStationCode = data[0].code;
            selectedStationName = data[0].title;
            loadStationTimetable();
        } else {
            showMessage(`❌ Станция "${stationName}" не найдена`);
        }
    });
}

function initMap() {
    if (map) return;
    if (typeof ymaps === 'undefined') { setTimeout(initMap, 200); return; }
    
    ymaps.ready(() => {
        map = new ymaps.Map('map', { 
            center: [55.751574, 37.573856], 
            zoom: 10, 
            controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
        });
        
        const searchControl = new ymaps.control.SearchControl({ options: { provider: 'yandex#search', size: 'large', noSelect: true } });
        map.controls.add(searchControl);
        
        map.events.add('click', function(e) {
            const coords = e.get('coords');
            findNearbyStations(coords[0], coords[1]);
        });
        
        $('#find-my-location').click(function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    map.setCenter([lat, lng], 14);
                    findNearbyStations(lat, lng);
                    showMessage(`📍 Определено ваше местоположение`);
                }, function() { showMessage(`❌ Не удалось определить местоположение`); });
            } else { showMessage(`❌ Геолокация не поддерживается`); }
        });
    });
}

function findNearbyStations(lat, lng) {
    showMessage(`🔍 Поиск станций рядом...`);
    $('#nearby-stations-list').html('<div class="loading-small">Загрузка...</div>');
    $('#selected-station-info').show();
    
    $.get(`${API_URL}/geo/nearby?lat=${lat}&lng=${lng}&distance=50`)
        .done(data => displayNearbyStations(data))
        .fail(() => $('#nearby-stations-list').html('<div class="error-small">Ошибка поиска станций</div>'));
}

function displayNearbyStations(stations) {
    if (!stations || stations.length === 0) {
        $('#nearby-stations-list').html('<div class="error-small">🚉 ЖД станции не найдены</div>');
        return;
    }
    
    $('#nearby-stations-list').empty();
    mapMarkers.forEach(marker => map.geoObjects.remove(marker));
    mapMarkers = [];
    
    stations.forEach(station => {
        const stationLat = station.latitude;
        const stationLng = station.longitude;
        const stationName = station.title;
        const stationCode = station.code;
        const distance = station.distance ? station.distance.toFixed(1) : '?';
        const city = station.city || '';
        const buttonId = 'btn_' + Math.random().toString(36).substr(2, 9);
        
        if (stationLat && stationLng) {
            const marker = new ymaps.Placemark([stationLat, stationLng], {
                hintContent: stationName,
                balloonContent: `<div class="station-balloon"><strong>${stationName}</strong><br><small>Расстояние: ${distance} км</small><br><button id="${buttonId}" style="margin-top:8px; background:#1a1a2e; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">Выбрать станцию</button></div>`
            }, { preset: 'islands#blueRailwayIcon' });
            
            marker.events.add('balloonopen', function() {
                const button = document.getElementById(buttonId);
                if (button) button.onclick = () => { selectStationFromMap(stationCode, stationName); marker.balloon.close(); };
            });
            
            map.geoObjects.add(marker);
            mapMarkers.push(marker);
        }
        
        const stationItem = $(`<div class="nearby-station-item" data-code="${stationCode}" data-name="${stationName}"><i class="fas fa-train"></i><div class="station-info"><strong>${stationName}</strong><span class="distance">${distance} км</span>${city ? `<span class="city">${city}</span>` : ''}</div><button class="select-station-btn">Выбрать</button></div>`);
        stationItem.find('.select-station-btn').click(() => selectStationFromMap(stationCode, stationName));
        stationItem.click(() => selectStationFromMap(stationCode, stationName));
        $('#nearby-stations-list').append(stationItem);
    });
}

function selectStationFromMap(code, name) {
    if (code) selectedStationCode = code;
    selectedStationName = name;
    $('#station-input').val(name);
    showMessage(`✅ Выбрана станция: ${name}`);
    $('.tab-btn[data-tab="station"]').click();
    if (code) setTimeout(() => loadStationTimetable(), 100);
}

window.selectStationFromMap = selectStationFromMap;

function showMessage(text) {
    let toast = $('#toast');
    if (!toast.length) {
        $('body').append('<div id="toast" style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#2d3436; color:white; padding:12px 20px; border-radius:30px; z-index:1000; display:none;"></div>');
        toast = $('#toast');
    }
    toast.text(text).fadeIn(200);
    setTimeout(() => toast.fadeOut(500), 2000);
}

function showLoading() {
    $('#schedule-list').html('<div class="loader"><i class="fas fa-spinner fa-spin"></i> Загрузка расписания...</div>');
}

function hideLoading() {}