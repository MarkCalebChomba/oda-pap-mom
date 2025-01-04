document.addEventListener("DOMContentLoaded", function () {
    const toggleBalanceBtn = document.getElementById("toggle-balance");
    const balanceAmount = document.getElementById("balance-amount");

    toggleBalanceBtn.addEventListener("click", function () {
        if (balanceAmount.style.display === "none") {
            balanceAmount.style.display = "inline";
            toggleBalanceBtn.innerHTML = '<i class="fas fa-eye"></i>';
        } else {
            balanceAmount.style.display = "none";
            toggleBalanceBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        }
    });
});
