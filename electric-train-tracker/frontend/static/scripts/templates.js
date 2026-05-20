// templates.js - отдельный файл для HTML шаблонов

const Templates = {
    stationSuggestion: function(station) {
        return `
            <div class="suggestion-item">
                <b>${this.escapeHtml(station.title)}</b>
                <br>
                <small>${this.escapeHtml(station.city || '')}</small>
            </div>
        `;
    },
    
    popularStation: function(station) {
        return `
            <div class="popular-item">
                ${this.escapeHtml(station.name)}
            </div>
        `;
    },
    
    trainCard: function(train, stationContextName, isFavorite) {
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
        const favContextName = stationContextName || '';
        
        return `
            <div class="train-card" data-train-number="${this.escapeHtml(trainNumber)}">
                <div class="train-header">
                    <span class="train-number">🚆 Поезд №${this.escapeHtml(trainNumber)}</span>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-name="${this.escapeHtml(favContextName)}">
                        <i class="fas ${isFavorite ? 'fa-heart' : 'fa-heart-o'}"></i>
                        <span>${isFavorite ? 'В избранном' : 'Сохранить'}</span>
                    </button>
                </div>
                <div class="train-route">
                    ${fromName && toName ? `${this.escapeHtml(fromName)} → ${this.escapeHtml(toName)}` : (direction ? this.escapeHtml(direction) : this.escapeHtml(favContextName))}
                </div>
                <div class="train-time">
                    <div class="departure-info">
                        <span class="time-label">🕐 Отправление:</span>
                        <span class="time-value">${this.escapeHtml(depTime)}</span>
                    </div>
                    <div class="arrival-info">
                        <span class="time-label">🏁 Прибытие:</span>
                        <span class="time-value">${this.escapeHtml(arrTime)}</span>
                    </div>
                </div>
                ${days ? `<div class="train-days">📅 ${this.escapeHtml(days)}</div>` : ''}
            </div>
        `;
    },
    
    favoriteCard: function(stationName) {
        return `
            <div class="favorite-card" data-name="${this.escapeHtml(stationName)}">
                <div>
                    <i class="fas fa-train"></i> 
                    <strong>${this.escapeHtml(stationName)}</strong>
                </div>
                <button class="remove-fav">🗑️ Удалить</button>
            </div>
        `;
    },
    
    nearbyStationItem: function(station, buttonId) {
        const distance = station.distance ? station.distance.toFixed(1) : '?';
        const city = station.city || '';
        
        return `
            <div class="nearby-station-item" data-code="${this.escapeHtml(station.code)}" data-name="${this.escapeHtml(station.title)}">
                <i class="fas fa-train"></i>
                <div class="station-info">
                    <strong>${this.escapeHtml(station.title)}</strong>
                    <span class="distance">${distance} км</span>
                    ${city ? `<span class="city">${this.escapeHtml(city)}</span>` : ''}
                </div>
                <button class="select-station-btn" id="${this.escapeHtml(buttonId)}">Выбрать</button>
            </div>
        `;
    },
    
    balloonContent: function(stationName, distance, buttonId) {
        return `
            <div class="station-balloon">
                <strong>${this.escapeHtml(stationName)}</strong>
                <br>
                <small>Расстояние: ${distance} км</small>
                <br>
                <button id="${this.escapeHtml(buttonId)}" style="margin-top:8px; background:#1a1a2e; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">
                    Выбрать станцию
                </button>
            </div>
        `;
    },
    
    escapeHtml: function(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};