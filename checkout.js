document.addEventListener("DOMContentLoaded", function() {
    const mpesaButton = document.querySelector('.mpesa-button');
    const cardButton = document.querySelector('.card-button');
    const otherButton = document.querySelector('.other-button');

    function promptMpesa() {
        const phoneNumber = document.getElementById('phone-number').value;
        if (phoneNumber) {
            alert(`M-Pesa payment prompt sent to ${phoneNumber}`);
        } else {
            alert('Please enter your phone number.');
        }
    }

    cardButton.addEventListener('click', function() {
        alert('Pay with Card selected');
        // Add your Card payment logic here
    });

    otherButton.addEventListener('click', function() {
        alert('Other Payment Options selected');
        // Add your other payment logic here
    });
});
document.addEventListener("DOMContentLoaded", function () {
    updateCities(); // Initialize city dropdown on page load
});

function updateCities() {
    const citySelect = document.getElementById("shipping-city");
    const stateSelect = document.getElementById("shipping-state");
    const selectedState = stateSelect.value;

    const cities = {
        nairobi: ["Nairobi West", "Starehe", "Kamukunji", "Makadara", "Embakasi" ,"Dagoretti", "Lang'ata", "Westlands", "Kasarani,", "Ruaraka,", "Mathare,", "Kibra,"],
        mombasa: ["Changamwe", "Jomvu","Kisauni","Likoni", "Mvita", "Nyali"],
        kisumu: ["Kisumu East,", "Kisumu West,", "Kisumu Central,", "Seme,", "Nyando," ,"Muhoroni,", "Nyakach,"]
    };

    citySelect.innerHTML = ""; // Clear current city options

    if (cities[selectedState]) {
        cities[selectedState].forEach(city => {
            const option = document.createElement("option");
            option.value = city.toLowerCase();
            option.textContent = city;
            citySelect.appendChild(option);
        });
    }
}

