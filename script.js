import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productosRef = collection(db, 'productos');

let carrito = []; // Solo guardaremos id y nombre
let productosGlobales = [];
let categoriaSeleccionada = "";


// ==========================================
// 1. AGREGAR AL CARRITO
// ==========================================

function actualizarCarrito() {
    const carritoFlotante = document.getElementById('carrito-flotante');
    const listaCarrito = document.getElementById('lista-carrito');
    const contadorCarrito = document.getElementById('contador-carrito');
    
    if (carrito.length === 0) {
        carritoFlotante.classList.add('carrito-oculto');
        return;
    }
    
    carritoFlotante.classList.remove('carrito-oculto');
    contadorCarrito.textContent = carrito.length;
    
    // Limpiar lista actual
    listaCarrito.innerHTML = '';
    
    // Mostrar cada producto con imagen y nombre
    carrito.forEach((producto, index) => {
        const itemCarrito = document.createElement('div');
        itemCarrito.className = 'item-carrito';
        itemCarrito.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}" class="img-item-carrito">
            <span>${producto.nombre}</span>
            <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">✕</button>
        `;
        listaCarrito.appendChild(itemCarrito);
    });
}

window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

function agregarAlCarrito(id, nombre, imagen) {
    carrito.push({ id, nombre, imagen });
    actualizarCarrito();
}


// ==========================================
// 1. BOTON DE WHATSAPP
// ==========================================
document.getElementById('btn-enviar-whatsapp').addEventListener('click', function() {
    if (carrito.length === 0) return;
    
    let mensaje = '¡Hola! Quiero hacer un pedido:%0A%0A';
    carrito.forEach((producto, index) => {
    mensaje += `${index + 1}. ${producto.nombre}%0A`;
});
    mensaje += `%0ATotal de productos: ${carrito.length}`;
    
    window.open(`https://wa.me/573167363647?text=${mensaje}`, '_blank');
});


// ==========================================
// 3. MODAL DE DETALLES Y PONQUÉS
// ==========================================
window.mostrarDetalles = function(id){
    const producto = productosGlobales.find(p => p.id === id);
    if (!producto) return;

    document.getElementById("modal-categoria").innerText = producto.categoria || "";
    document.getElementById("modal-imagen").src = producto.imagen;
    document.getElementById("modal-nombre").innerText = producto.nombre;
    document.getElementById("modal-descripcion").innerText = producto.descripcion || "Información no disponible.";

    let imagenPrecios = "";
    let esPonque = false;

    switch(producto.categoria){
        case "Tortas":
            imagenPrecios = "img/precios-torta.jpg";
            break;
        case "Postres":
            imagenPrecios = "img/precios-postres.jpg";
            break;
        case "Ponques":
        case "Ponqués":
            esPonque = true;
            break;
        case "Especiales":
            if(producto.nombre.trim() === "Merengones"){
                imagenPrecios = "img/precios-merengones.jpg";
            } else if(producto.nombre === "Waffles"){
                imagenPrecios = "img/precios-waffles.jpg";
            } else if(producto.nombre === "Crepes Dulces"){
                imagenPrecios = "img/precios-crepes dulces.jpg";
            } else if(producto.nombre === "Frappes"){
                imagenPrecios = "img/precios-frappes.jpg";
            } else {
                imagenPrecios = "img/precios-especiales.jpg";
            }
            break;
    }

    const imgPrecios = document.getElementById("modal-precios");
    const msgAsesor = document.getElementById("mensaje-asesor");
    const btnAsesor = document.getElementById("btn-whatsapp-asesor");
    
    if (esPonque) {
        imgPrecios.style.display = "none";
        msgAsesor.style.display = "block";
        if (btnAsesor) {
            btnAsesor.style.display = "inline-block";
            const mensajeAsesor = `¡Hola Sabor Amor! Quiero cotizar un/a *${producto.nombre}*. ¿Me pueden ayudar?`;
            btnAsesor.href = `https://wa.me/573167363647?text=${encodeURIComponent(mensajeAsesor)}`;
        }
    } else {
        imgPrecios.style.display = "block";
        msgAsesor.style.display = "none";
        imgPrecios.src = imagenPrecios;
        if (btnAsesor) btnAsesor.style.display = "none";
    }

    // Configurar botón del modal
    const btnAgregarModal = document.getElementById("btn-agregar-modal");
    if (btnAgregarModal) {
        const nuevoBtn = btnAgregarModal.cloneNode(true);
        btnAgregarModal.parentNode.replaceChild(nuevoBtn, btnAgregarModal);
        nuevoBtn.addEventListener('click', () => {
    agregarAlCarrito(producto.id, producto.nombre, producto.imagen);
    cerrarModal();
});
    }

    document.getElementById("vista-info").style.display = "block";
    document.getElementById("vista-precios").style.display = "none";
    document.getElementById("modal-producto").style.display = "flex";
}

window.cerrarModal = function(){
    document.getElementById("modal-producto").style.display = "none";
}

document.getElementById("btn-ver-precios").addEventListener("click", () => {
    document.getElementById("vista-info").style.display = "none";
    document.getElementById("vista-precios").style.display = "block";
});

document.getElementById("btn-volver").addEventListener("click", () => {
    document.getElementById("vista-info").style.display = "block";
    document.getElementById("vista-precios").style.display = "none";
});

// ==========================================
// 4. CARGAR PRODUCTOS (FIREBASE Y FIJOS)
// ==========================================
async function renderizarProductos() {
    const contenedor = document.getElementById('contenedor-postres');
    contenedor.innerHTML = '<p style="text-align:center; width:100%; color: #666;">Cargando deliciosos postres...</p>';

    const productosOcultos = JSON.parse(localStorage.getItem('productosOcultos')) || [];
    let productosFinales = [];
    const actualizacionesFijos = {};

    try {
        const querySnapshot = await getDocs(productosRef);
        querySnapshot.forEach((documento) => {
            const prod = documento.data();
            if (prod.tipo === 'fijo_actualizado' && prod.visible !== false) {
                actualizacionesFijos[prod.idFijo] = prod.imagen;
            } else if (prod.visible !== false && !prod.tipo) {
                productosFinales.push({ ...prod, id: documento.id });
            }
        });
    } catch (error) {
        console.error("Error cargando Firebase:", error);
        contenedor.innerHTML = '<p style="text-align:center; color: red;">Error al cargar productos.</p>';
        return;
    }

    if (window.productosDefecto) {
        window.productosDefecto.filter(p => !productosOcultos.includes(p.id)).forEach(p => {
            const imagenFinal = actualizacionesFijos[p.id] || p.imagen;
            productosFinales.push({ ...p, imagen: imagenFinal });
        });
    }

    productosGlobales = productosFinales; // IMPORTANTE: Guardar todos

    contenedor.innerHTML = '';
    if (productosFinales.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center;">No hay postres disponibles.</p>';
        return;
    }

    let productosFiltrados = productosFinales;
    if (categoriaSeleccionada !== "" && categoriaSeleccionada !== "Todos") {
        productosFiltrados = productosFinales.filter(p => p.categoria === categoriaSeleccionada);
    }

    productosFiltrados.forEach(producto => {
    contenedor.innerHTML += `
<div class="postre-card">
    <img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.src='https://via.placeholder.com/300x220?text=Sin+Imagen'">
    <h3>${producto.nombre}</h3>
    <button class="btn-detalles" onclick="mostrarDetalles('${producto.id}')">Ver Detalles</button>
</div>
`;
});
}

// ==========================================
// 5. FILTROS
// ==========================================
document.querySelectorAll('.categoria-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('activa'));
        btn.classList.add('activa');
        categoriaSeleccionada = btn.innerText.trim();
        renderizarProductos();
    });
});

renderizarProductos();

// --- LÓGICA DEL MENÚ HAMBURGUESA ---
const hamburger = document.querySelector('.hamburger');
const menu = document.querySelector('.menu');

// Abrir y cerrar menú al hacer clic en el botón
if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
        menu.classList.toggle('active');
    });

    // Cerrar el menú automáticamente cuando el usuario hace clic en un enlace
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('active');
        });
    });
}

// Botón para cerrar el carrito manualmente
const btnCerrarCarrito = document.getElementById('btn-cerrar-carrito');
if (btnCerrarCarrito) {
    btnCerrarCarrito.addEventListener('click', () => {
        document.getElementById('carrito-flotante').classList.add('carrito-oculto');
    });
}