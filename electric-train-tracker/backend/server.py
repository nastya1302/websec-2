from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from yaschedule.core import YaSchedule
from station_cache import load_all_stations, search_stations
from datetime import datetime
import requests

app = Flask(__name__, static_folder='../frontend/static', static_url_path='/static')
CORS(app)  

API_KEY = "fe660fb4-dea3-4df5-a4cd-6672f326b1dc"

train_api = YaSchedule(API_KEY)

print("📡 Загрузка базы станций...")
station_db = load_all_stations(API_KEY)
print("✅ База готова!")

@app.route('/')
def serve_index():
    return send_from_directory('../frontend/pages', 'index.html')

@app.route('/api/stations/find', methods=['GET'])
def find_stations():
    search_term = request.args.get('term', '')
    if len(search_term) < 2:
        return jsonify([])
    
    results = search_stations(station_db, search_term)
    return jsonify(results)

@app.route('/api/stations/nearby', methods=['GET'])
def get_nearby_stations():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    distance = request.args.get('distance', 50)
    
    if not lat or not lng:
        return jsonify([])
    
    try:
        url = "https://api.rasp.yandex.net/v3.0/nearest_stations/"
        params = {
            'apikey': API_KEY,
            'lat': lat,
            'lng': lng,
            'distance': distance,
            'transport_types': 'train,suburban',
            'station_types': 'train_station',
            'lang': 'ru_RU',
            'limit': 20
        }
        
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            stations = []
            for station in data.get('stations', []):
                if station.get('transport_type') in ['train', 'suburban']:
                    stations.append({
                        'title': station.get('title'),
                        'code': station.get('code'),
                        'distance': station.get('distance'),
                        'latitude': station.get('lat'),
                        'longitude': station.get('lng'),
                        'city': station.get('city', '')
                    })
            return jsonify(stations)
        else:
            return jsonify([])
    except Exception as e:
        print(f"Error: {e}")
        return jsonify([])

@app.route('/api/stations/top', methods=['GET'])
def get_top_stations():
    top_stations = [
        {'name': 'Москва (Киевский вокзал)', 'code': 's9603402'},
        {'name': 'Санкт-Петербург (Витебский)', 'code': 's9603551'},
        {'name': 'Москва (Казанский вокзал)', 'code': 's9603404'},
        {'name': 'Москва (Ярославский вокзал)', 'code': 's9603408'},
        {'name': 'Москва (Павелецкий вокзал)', 'code': 's9603405'},
    ]
    return jsonify(top_stations)

@app.route('/api/trains/by-station', methods=['GET'])
def get_station_trains():
    station_id = request.args.get('station')
    travel_date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    if not station_id:
        return jsonify({'error': 'Station required'}), 400
    
    try:     
        schedule = train_api.get_station_schedule(
            station=station_id, 
            transport_types='suburban',
            date=travel_date
        )
        return jsonify(schedule)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trains/route', methods=['GET'])
def find_route_trains():
    from_station = request.args.get('from')
    to_station = request.args.get('to')
    travel_date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    if not from_station or not to_station:
        return jsonify({'error': 'Both stations required'}), 400
    
    try:
        route_data = train_api.get_schedule(
            from_station=from_station, 
            to_station=to_station, 
            transport_types='suburban',
            date=travel_date
        )
        return jsonify(route_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)