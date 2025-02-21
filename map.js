let map = L.map('map').setView([30.2672, -97.7431], 12); // Center on Austin, TX

// Add a tile layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = []; // Store vehicle markers
let allVehicles = []; // Store all vehicle data
let busRoutesLayer = null; // Store displayed bus routes
let allBusRoutes = {}; // Store all bus routes
let routeFilter = document.getElementById('routeFilter');

// Fetch vehicle positions
fetch('vehiclepositions.json')
    .then(response => response.json())
    .then(data => {
        let tableBody = document.getElementById('vehicleTable');
        let routes = new Set();

        allVehicles = data.entity.map(v => {
            let lat = v.vehicle.position.latitude;
            let lon = v.vehicle.position.longitude;
            let label = v.vehicle.vehicle.label;
            let speed = v.vehicle.position.speed || 0;
            let timestamp = new Date(v.vehicle.timestamp * 1000).toLocaleString();
            let route = v.vehicle.trip ? v.vehicle.trip.routeId : 'N/A';

            routes.add(route);
            return { lat, lon, label, speed, timestamp, route, id: v.vehicle.vehicle.id };
        });

        // Populate the route filter dropdown
        routes.forEach(route => {
            let option = document.createElement('option');
            option.value = route;
            option.textContent = `Route ${route}`;
            routeFilter.appendChild(option);
        });

        if (routes.has("20")) {
            routeFilter.value = "20";
        }

        updateMapAndTable();
    })
    .catch(error => console.error('Error loading vehicle data:', error));

// Fetch bus routes from GeoJSON
fetch('busroutes.geojson')
    .then(response => response.json())
    .then(data => {
        data.features.forEach(feature => {
            let routeId = feature.properties.ROUTE_ID.toString();
            allBusRoutes[routeId] = feature; // Store by route ID
        });

        updateMapAndTable();
    })
    .catch(error => console.error('Error loading bus routes:', error));

// Function to update both vehicles and routes
function updateMapAndTable() {
    let selectedRoute = routeFilter.value;
    let tableBody = document.getElementById('vehicleTable');

    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    tableBody.innerHTML = '';

    // Display vehicles for selected route
    allVehicles.forEach(v => {
        if (selectedRoute === "all" || v.route === selectedRoute) {
            let marker = L.marker([v.lat, v.lon]).addTo(map)
                .bindPopup(`<b>Vehicle: ${v.label}</b><br>Route: ${v.route}<br>Speed: ${v.speed.toFixed(2)} m/s`);
            markers.push(marker);

            let row = `<tr>
                <td>${v.id}</td>
                <td>${v.label}</td>
                <td>${v.route}</td>
                <td>${v.lat}</td>
                <td>${v.lon}</td>
                <td>${v.speed.toFixed(2)}</td>
                <td>${v.timestamp}</td>
            </tr>`;
            tableBody.innerHTML += row;
        }
    });

    // Remove old polyline before adding a new one
    if (busRoutesLayer) {
        map.removeLayer(busRoutesLayer);
    }

    // Display the selected route's polyline
    if (selectedRoute !== "all" && allBusRoutes[selectedRoute]) {
        busRoutesLayer = L.geoJSON(allBusRoutes[selectedRoute], {
            style: function (feature) {
                return {
                    color: "#00008B", // Dark blue color
                    weight: 3,
                    opacity: 0.7
                };
            },
            onEachFeature: function (feature, layer) {
                layer.bindPopup(`Route: ${feature.properties.ROUTENAME} (${feature.properties.DIRECTION})`);
            }
        }).addTo(map);
    }
}

// Event listener for dropdown change
routeFilter.addEventListener('change', updateMapAndTable);
