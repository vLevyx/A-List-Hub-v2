const vehicles = [
  {
    "name": "M1025 Light Armored Vehicle",
    "price": 250000,
    "ores": 18,
    "photo": "m1025.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Vehicle Shop (Outpost)",
    "usage": "Quick transport with armor protection"
  },
  {
    "name": "M151A2 Off-Road",
    "price": 25000,
    "ores": 16,
    "photo": "m151a2_cover.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Inexpensive scouting and patrols"
  },
  {
    "name": "M151A2 Off-Road - Open Top",
    "price": 25000,
    "ores": 16,
    "photo": "m151a2offroad-opentop.png",
    "colors": "Olive, Camo, Black, Blue, Brown, Green, Khaki, Orange, Pink, Red, White, Yellow",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Recon missions and off-road traversal"
  },
  {
    "name": "M998 Light Utility Vehicle",
    "price": 150000,
    "ores": 18,
    "photo": "m998LUV.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Vehicle Shop (Outpost)",
    "usage": "Tactical mobility and personel transport"
  },
  {
    "name": "M998 Light Utility Vehicle - Canopy",
    "price": 175000,
    "ores": 18,
    "photo": "m998LUVcanopy.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Vehicle Shop (Outpost)",
    "usage": "Tactical mobility and personel transport"
  },
  {
    "name": "M923A1 Fuel Truck",
    "price": 1000000,
    "Canisters": 53,
    "photo": "m923a1_fuel.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "American Fuel Truck. Used for Fuel and Polyester refining. NOTE: American trucks CANNOT be lock picked."
  },
  {
    "name": "M923A1 Transport Truck",
    "price": 800000,
    "ores": 50,
    "photo": "m923a1.png",
    "colors": "Olive, Camo, Black, Blue, Brown, Green, Khaki, Orange, Red, White, Yellow",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Bulk personel or item transport. NOTE: American trucks CANNOT be lock picked."
  },
  {
    "name": "M923A1 Transport Truck - Canopy",
    "price": 1800000,
    "ores": 83,
    "photo": "m923a1_cover.png",
    "colors": "Olive, Camo, Black, Blue, Brown, Green, Khaki, Orange, Red, White, Yellow",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Bulk personel or item transport, comes with a canopy for better concealment. NOTE: American trucks CANNOT be lock picked."
  },
  {
    "name": "Pickup Truck",
    "price": 500000,
    "ores": 18,
    "photo": "pickuptruck.png",
    "colors": "Red, Black, Yellow, Gray, Green, Purple, White, Turquoise",
    "whereToBuy": "Luca's Vehicle Import (Levie)",
    "usage": "All-purpose civilian transport"
  },
  {
    "name": "UAZ-452 Off-Road",
    "price": 95000,
    "ores": 28,
    "photo": "uaz452offroad.png",
    "colors": "Olive, Red, Green, Purple",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Rugged off-road delivery or utility"
  },
  {
    "name": "UAZ-452 Off-Road - Laboratory",
    "price": 2000000,
    "ores": 57,
    "Canisters": 110,
    "photo": "uaz452-laboratory.png",
    "colors": "Grey",
    "whereToBuy": "Black Market",
    "usage": "Rugged off-road meth-laboratory."
  },
  {
    "name": "UAZ-452 Off-Road - Banana",
    "price": 450000,
    "ores": 28,
    "photo": "uaz452banana.png",
    "colors": "Banana",
    "whereToBuy": "Banana's Chillout Zone",
    "usage": "Drive around in a banana van. Why WOULDN'T you want to do that?"
  },
  {
    "name": "UAZ-469 Off-Road",
    "price": 10000,
    "ores": 13,
    "photo": "uaz469_cover.png",
    "colors": "Olive, Camo, Black, Brown, Green, Orange, Red, White, Teal",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Light scout and general use"
  },
  {
    "name": "UAZ-469 Off-Road - Open Top",
    "price": 10000,
    "ores": 13,
    "photo": "uaz469offroad-opentop.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Open recon with basic mobility"
  },
  {
    "name": "Ural-4320 Fuel Truck",
    "price": 2800000,
    "Canisters": 83,
    "photo": "ural4320_fuel.png",
    "colors": "Olive, Camo, Blue, Orange, White-Blue, White-Red",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Large-scale Fuel Truck. Used for Fuel and Polyester refining. NOTE: Russian trucks CAN be lock picked."
  },
  {
    "name": "Ural-4320 Transport Truck",
    "price": 2800000,
    "ores": 100,
    "photo": "ural4320transporttruck.png",
    "colors": "Olive, Camo, Blue, Orange, White-Blue",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Large-scale / Bulk personel or item transport. NOTE: Russian trucks CAN be lock picked."
  },
  {
    "name": "Ural-4320 Transport Truck - Canopy",
    "price": 4000000,
    "ores": 116,
    "photo": "ural4320_cover.png",
    "colors": "Olive, Camo, Blue, Orange, White-Blue",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Large-scale / Bulk personel or item transport, comes with a canopy for better concealment. NOTE: Russian trucks CAN be lock picked."
  },
  {
    "name": "VW Rolf",
    "price": 800000,
    "ores": 18,
    "photo": "vwrolf.png",
    "colors": "Black, White",
    "whereToBuy": "VW Car Dealer",
    "usage": "Stylish personal vehicle, quick car to get from point A to point B."
  },
  {
    "name": "S105 Car",
    "price": 85000,
    "ores": 18,
    "photo": "s105car.png",
    "colors": "Light Blue, Tan, Dark Blue, Brown, Dark Red, Green, Olive, Red, White, Yellow",
    "whereToBuy": "Import Vehicles (Meaux, Regina)",
    "usage": "Budget personal vehicle"
  },
  {
    "name": "S1203 Minibus",
    "price": 185000,
    "ores": 18,
    "photo": "S1203-Minibus.png",
    "colors": "Red, Blue, Brown, Yellow, Khaki",
    "whereToBuy": "Import Vehicles (Meaux, Regina)",
    "usage": "Small group and item transport"
  },
  {
    "name": "MI8-MT Transport Helicopter",
    "price": 68000000,
    "ores": 26,
    "photo": "mi8-mt.png",
    "colors": "Camo",
    "whereToBuy": "Only obtainable through crafting",
    "usage": "Russian High-capacity air transport. Holds: 3 Pilots - 13 Passengers"
  },
  {
    "name": "UH-1H Transport Helicopter",
    "price": 60000000,
    "ores": 26,
    "photo": "uh-1h.png",
    "colors": "Green",
    "whereToBuy": "Only obtainable through crafting",
    "usage": "United States Tactical helicopter mobility. Holds: 2 Pilots - 10 Passengers"
  }
];;

const discountRates = {
  neutral: 0,
  positive1: -5.5,
  positive2: -10.5,
  positive3: -19.10,
  negative1: 25.0,
  negative2: 28.0,
  negative3: 53.0
};

function renderVehicles() {
  const container = document.getElementById('vehicle-container');
  container.innerHTML = '';
  vehicles.forEach(vehicle => {
    const vehicleCard = document.createElement('div');
    vehicleCard.className = 'vehicle-card';
    vehicleCard.innerHTML = `
            <img src="${vehicle.photo}" alt="${vehicle.name}">
            <div class="vehicle-info">
                <h3>${vehicle.name}</h3>
                <p>Price: $${vehicle.price.toLocaleString()}</p>
                <p>
    ${vehicle["Canisters"] ? `Canisters: ${vehicle["Canisters"]}` : vehicle.honeycombs ? `Honeycombs: ${vehicle.honeycombs}` : `Ores: ${vehicle.ores}`}
                </p>
            </div>
        `;
    vehicleCard.addEventListener('click', () => {
      openModal(vehicle, Math.round(vehicle.price));
    });
    container.appendChild(vehicleCard);
  });
}

function updatePrices() {
  const selectedReputation = document.getElementById('reputation').value;
  const discount = discountRates[selectedReputation];

  const container = document.getElementById('vehicle-container');
  container.innerHTML = '';

  vehicles.forEach(vehicle => {
    const adjustedPrice = vehicle.price * (1 + (discount / 100));
    const vehicleCard = document.createElement('div');
    vehicleCard.className = 'vehicle-card';
    vehicleCard.innerHTML = `
            <img src="${vehicle.photo}" alt="${vehicle.name}">
            <div class="vehicle-info">
                <h3>${vehicle.name}</h3>
                <p>Price: $${Math.round(adjustedPrice).toLocaleString()}</p>
                <p>
    ${vehicle["Canisters"] ? `Canisters: ${vehicle["Canisters"]}` : vehicle.honeycombs ? `Honeycombs: ${vehicle.honeycombs}` : `Ores: ${vehicle.ores}`}
</p>
            </div>
        `;
    vehicleCard.addEventListener('click', () => {
      openModal(vehicle, Math.round(adjustedPrice));
    });
    container.appendChild(vehicleCard);
  });
}

function filterVehicles() {
  const query = document.getElementById('vehicleSearch').value.toLowerCase();
  const allCards = document.querySelectorAll('.vehicle-card');
  allCards.forEach(card => {
    const name = card.querySelector('h3').textContent.toLowerCase();
    card.style.display = name.includes(query) ? 'block' : 'none';
  });
}


function openModal(vehicle, adjustedPrice) {
  document.getElementById('modalTitle').textContent = vehicle.name;
  document.getElementById('modalImage').src = vehicle.photo;
  document.getElementById('modalPrice').textContent = `Price: $${adjustedPrice.toLocaleString()}`;
  document.getElementById('modalOres').textContent = vehicle.ores ? `Ores: ${vehicle.ores}` : '';
  document.getElementById('modalHoneycombs').textContent = vehicle.honeycombs ? `Honeycombs: ${vehicle.honeycombs}` : '';
  document.getElementById('modalCanisters').textContent = vehicle["Canisters"] ? `Canisters: ${vehicle["Canisters"]}` : '';
  document.getElementById('modalColors').textContent = vehicle.colors ? `Available Colors: ${vehicle.colors}` : 'Available Colors: TBD';
  document.getElementById('modalBuy').textContent = vehicle.whereToBuy ? `Where to Buy: ${vehicle.whereToBuy}` : 'Where to Buy: Vendor or Marketplace';
  document.getElementById('modalUse').textContent = vehicle.usage ? `Recommended Use: ${vehicle.usage}` : '';
  document.getElementById('vehicleModal').classList.remove('hidden');
}


function closeModal() {
  document.getElementById('vehicleModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  renderVehicles();
});