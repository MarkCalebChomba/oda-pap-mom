const galleryImage = document.querySelector('.product-image');
const imageDropdown = document.querySelector('.image-dropdown');
const dropdownImage = document.getElementById('galleryImage');
const description = document.getElementById('description');

const images = [
    { src: 'images/furniture4.jpg', desc: 'Description for furniture set 4.' },
    { src: 'images/furniture5.jpg', desc: 'Description for furniture set 5.' },
    { src: 'images/furniture6.jpg', desc: 'Description for furniture set 6.' }
];

let currentImageIndex = 0;

function showImage(index) {
    dropdownImage.src = images[index].src;
    description.innerHTML = `<p>${images[index].desc}</p>`;
}

function changeImage(direction) {
    currentImageIndex += direction;
    if (currentImageIndex < 0) {
        currentImageIndex = images.length - 1;
    } else if (currentImageIndex >= images.length) {
        currentImageIndex = 0;
    }
    showImage(currentImageIndex);
}

function toggleDropdown(element) {
    const dropdown = element.nextElementSibling;
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
        showImage(currentImageIndex);
    }
}

window.onclick = function(event) {
    if (!event.target.matches('.product-image')) {
        const dropdowns = document.querySelectorAll('.image-dropdown');
        dropdowns.forEach(dropdown => dropdown.style.display = 'none');
    }
};

function addToCart() {
    alert('Item added to cart');
    // Add item to cart logic
}

function buyNow() {
    alert('Proceed to checkout');
    window.location.href = 'checkout.html';
    // Buy now logic
}

function addToWishlist() {
    alert('Item added to wishlist');
    // Add item to wishlist logic
}
