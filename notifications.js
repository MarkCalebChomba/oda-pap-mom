export function showNotification(message, type = 'info') {
  // Remove existing notification if present
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
      existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  // Create content
  notification.innerHTML = `
      <div class="notification-content">
          <i class="fas ${getIconForType(type)}"></i>
          <span>${message}</span>
      </div>
      <button class="notification-close">
          <i class="fas fa-times"></i>
      </button>
  `;

  // Add to document
  document.body.appendChild(notification);

  // Add show class for animation
  setTimeout(() => notification.classList.add('show'), 10);

  // Setup close button
  const closeButton = notification.querySelector('.notification-close');
  closeButton.addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
  });

  // Auto close after 5 seconds
  setTimeout(() => {
      if (notification.parentElement) {
          notification.classList.remove('show');
          setTimeout(() => notification.remove(), 300);
      }
  }, 5000);
}

function getIconForType(type) {
  switch (type) {
      case 'success':
          return 'fa-check-circle';
      case 'error':
          return 'fa-exclamation-circle';
      case 'warning':
          return 'fa-exclamation-triangle';
      default:
          return 'fa-info-circle';
  }
}