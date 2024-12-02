document.addEventListener("DOMContentLoaded", function () {
    const navBar = document.getElementById('navBar')
     navBar.innerHTML += '<li><a href="/home">Home</a></li>'
    navBar.innerHTML += '<li class="dropdown"> <a href="/perfil">Perfil</a><div class="dropdown-content"><a href="/perfil">Editar perfil</a><hr><a href="/login">Sair</a></div></li>'

});