// favorites.js - работа с избранными станциями

const FavoritesStorage = {
    isAvailable: function() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            console.error('localStorage недоступен:', e);
            return false;
        }
    },
    
    getAll: function() {
        if (!this.isAvailable()) {
            console.warn('localStorage недоступен, избранное не будет сохраняться');
            return [];
        }
        
        try {
            const saved = localStorage.getItem('railway_favorites');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch(e) {
            console.error('Ошибка при чтении избранного:', e);
        }
        return [];
    },
    
    save: function(favorites) {
        if (!this.isAvailable()) {
            console.warn('localStorage недоступен, избранное не сохранено');
            return false;
        }
        
        try {
            localStorage.setItem('railway_favorites', JSON.stringify(favorites));
            return true;
        } catch(e) {
            console.error('Ошибка при сохранении избранного:', e);
            return false;
        }
    },
    
    add: function(favorites, name) {
        if (favorites.includes(name)) {
            return { favorites, changed: false, message: `"${name}" уже в избранном` };
        }
        
        const newFavorites = [...favorites, name];
        const saved = this.save(newFavorites);
        
        return {
            favorites: newFavorites,
            changed: saved,
            message: `❤️ "${name}" добавлена в избранное`
        };
    },
    
    remove: function(favorites, name) {
        if (!favorites.includes(name)) {
            return { favorites, changed: false, message: `"${name}" не найдена в избранном` };
        }
        
        const newFavorites = favorites.filter(fav => fav !== name);
        const saved = this.save(newFavorites);
        
        return {
            favorites: newFavorites,
            changed: saved,
            message: `💔 "${name}" удалена из избранного`
        };
    },
    
    toggle: function(favorites, name) {
        if (favorites.includes(name)) {
            return this.remove(favorites, name);
        } else {
            return this.add(favorites, name);
        }
    },
    
    isFavorite: function(favorites, name) {
        return favorites.includes(name);
    }
};