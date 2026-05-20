const API_URL = 'http://localhost:5000/api';

let selectedStationCode = null;
let selectedStationName = null;
let fromStationCode = null;
let toStationCode = null;
let favorites = [];
let map = null;
let mapMarkers = [];
let ymapsReady = false;

$(document).ready(function() {
    favorites = FavoritesStorage.getAll();
    
    if (!FavoritesStorage.isAvailable()) {
        showMessage('⚠️ Хранение избранного недоступно в вашем браузере');
    }
    
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
        
        if (tab === 'map') {
            setTimeout(() => initMap(), 100);
        }
    });
}

function initSearch() {
    const fields = [
        { 
            input: '#station-input', 
            suggestions: '#station-suggestions', 
            setCode: (c) => selectedStationCode = c, 
            setName: (n) => selectedStationName = n 
        },
        { 
            input: '#from-input', 
            suggestions: '#from-suggestions', 
            setCode: (c) => fromStationCode = c 
        },
        { 
            input: '#to-input', 
            suggestions: '#to-suggestions', 
            setCode: (c) => toStationCode = c 
        }
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
                        const itemHtml = Templates.stationSuggestion(s);
                        const $item = $(itemHtml);
                        
                        $item.click(() => {
                            $(field.input).val(s.title);
                            if (field.setCode) field.setCode(s.code);
                            if (field.setName) field.setName(s.title);
                            $(field.suggestions).hide();
                        });
                        
                        $(field.suggestions).append($item);
                    });
                });
            }, 300);
        });
        
        $(document).click(e => {
            if (!$(e.target).closest(field.input).length) {
                $(field.suggestions).hide();
            }
        });
    });
}

function loadRecommendedStations() {
    $.get(`${API_URL}/recommended/stations`, function(data) {
        const container = $('#popular-list');
        container.empty();
        data.forEach(s => {
            const itemHtml = Templates.popularStation(s);
            const $item = $(itemHtml);
            $item.click(() => {
                selectedStationCode = s.code;
                selectedStationName = s.name;
                $('#station-input').val(s.name);
                loadStationTimetable();
            });
            container.append($item);
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
        const isFav = favorites.includes(favContextName);
        const cardHtml = Templates.trainCard(train, favContextName, isFav);
        const $card = $(cardHtml);
        
        $card.find('.favorite-btn').click(function(e) {
            e.stopPropagation();
            const name = $(this).data('name');
            toggleFavorite(name);
            updateFavButton($(this), name);
        });
        
        $('#schedule-list').append($card);
    });
}

function toggleFavorite(name) {
    if (!name) {
        console.warn('toggleFavorite: имя станции не указано');
        return false;
    }
    
    const result = FavoritesStorage.toggle(favorites, name);
    
    if (result.changed) {
        favorites = result.favorites;
        showMessage(result.message);
        renderFavorites();
        return true;
    } else {
        showMessage(result.message);
        return false;
    }
}

function isFavorite(name) {
    return FavoritesStorage.isFavorite(favorites, name);
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
        const cardHtml = Templates.favoriteCard(name);
        const $card = $(cardHtml);
        
        $card.click(e => {
            if (!$(e.target).hasClass('remove-fav')) {
                selectedStationName = name;
                $('#station-input').val(name);
                $('.tab-btn[data-tab="station"]').click();
                findStationCodeByName(name);
            }
        });
        
        $card.find('.remove-fav').click(e => {
            e.stopPropagation();
            toggleFavorite(name);
        });
        
        container.append($card);
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
    if (map !== null) {
        console.log('Карта уже создана');
        setTimeout(function() {
            if (map && typeof map.container.fitToViewport === 'function') {
                map.container.fitToViewport();
            }
        }, 100);
        return;
    }
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.log('Контейнер #map не найден');
        setTimeout(initMap, 200);
        return;
    }
    
    if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
        console.log('Контейнер карты имеет нулевые размеры, откладываем инициализацию');
        setTimeout(initMap, 200);
        return;
    }
    
    if (typeof window.ymaps === 'undefined') {
        console.log('Ожидание загрузки Яндекс.Карт API...');
        setTimeout(initMap, 200);
        return;
    }
    
    console.log('Инициализация карты...');
    
    window.ymaps.ready(function() {
        if (map !== null) {
            console.log('Карта уже создана внутри ymaps.ready');
            return;
        }
        
        try {
            map = new window.ymaps.Map('map', { 
                center: [55.751574, 37.573856], 
                zoom: 10, 
                controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
            });
            
            console.log('Карта успешно создана');
            
            var searchControl = new window.ymaps.control.SearchControl({ 
                options: { 
                    provider: 'yandex#search', 
                    size: 'large', 
                    noSelect: true 
                } 
            });
            map.controls.add(searchControl);
            
            map.events.add('click', function(e) {
                var coords = e.get('coords');
                findNearbyStations(coords[0], coords[1]);
            });
            
            $('#find-my-location').off('click').on('click', function() {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        function(position) {
                            var lat = position.coords.latitude;
                            var lng = position.coords.longitude;
                            map.setCenter([lat, lng], 14);
                            findNearbyStations(lat, lng);
                            showMessage('📍 Определено ваше местоположение');
                        }, 
                        function() { 
                            showMessage('❌ Не удалось определить местоположение'); 
                        }
                    );
                } else { 
                    showMessage('❌ Геолокация не поддерживается'); 
                }
            });
            
        } catch(e) {
            console.error('Ошибка при создании карты:', e);
            $('#map').html('<div style="padding:20px;text-align:center;color:red;">Ошибка загрузки карты: ' + e.message + '</div>');
        }
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
    
    if (mapMarkers.length) {
        mapMarkers.forEach(marker => {
            if (map && map.geoObjects) {
                map.geoObjects.remove(marker);
            }
        });
        mapMarkers = [];
    }
    
    stations.forEach(station => {
        const stationLat = station.latitude;
        const stationLng = station.longitude;
        const stationName = station.title;
        const stationCode = station.code;
        const distance = station.distance ? station.distance.toFixed(1) : '?';
        const buttonId = 'btn_' + Math.random().toString(36).substr(2, 9);
        
        if (stationLat && stationLng && typeof window.ymaps !== 'undefined') {
            const balloonHtml = Templates.balloonContent(stationName, distance, buttonId);
            const marker = new window.ymaps.Placemark(
                [stationLat, stationLng],
                {
                    hintContent: stationName,
                    balloonContent: balloonHtml
                },
                { preset: 'islands#blueRailwayIcon' }
            );
            
            marker.events.add('balloonopen', function() {
                const button = document.getElementById(buttonId);
                if (button) {
                    button.onclick = () => {
                        selectStationFromMap(stationCode, stationName);
                        marker.balloon.close();
                    };
                }
            });
            
            map.geoObjects.add(marker);
            mapMarkers.push(marker);
        }
        
        const stationItemHtml = Templates.nearbyStationItem(station, buttonId);
        const $stationItem = $(stationItemHtml);
        
        $stationItem.find('.select-station-btn').click(() => {
            selectStationFromMap(stationCode, stationName);
        });
        
        $stationItem.click(() => {
            selectStationFromMap(stationCode, stationName);
        });
        
        $('#nearby-stations-list').append($stationItem);
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