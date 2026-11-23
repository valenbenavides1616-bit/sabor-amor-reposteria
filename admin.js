import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productosRef = collection(db, 'productos');

// Credenciales dinámicas desde Firestore
const configRef = doc(db, 'config', 'admin');

const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const errorLogin = document.getElementById('error-login');
const btnSalir = document.getElementById('btn-salir');

if (sessionStorage.getItem('sesionAdmin') === 'activa') {
    mostrarPanelAdmin();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('usuario').value;
    const pass = document.getElementById('password').value;
    
    try {
        const configDoc = await getDoc(configRef);
        if (configDoc.exists()) {
            const config = configDoc.data();
            if (user === config.usuario && pass === config.password) {
                sessionStorage.setItem('sesionAdmin', 'activa');
                mostrarPanelAdmin();
                errorLogin.style.display = 'none';
                loginForm.reset();
            } else {
                errorLogin.style.display = 'block';
                loginForm.reset();
            }
        } else {
            alert('⚠️ Configuración de admin no encontrada en la base de datos. Contacta al desarrollador.');
        }
    } catch (error) {
        console.error('Error al verificar credenciales:', error);
        alert('❌ Error de conexión. Intenta de nuevo.');
    }
});

function mostrarPanelAdmin() {
    loginContainer.style.display = 'none';
    adminPanel.style.display = 'block';
}

btnSalir.addEventListener('click', () => {
    sessionStorage.removeItem('sesionAdmin');
    //Redirige a la página principal (tienda)
    window.location.href = 'index.html';
});

const form = document.getElementById('form-producto');
const tabla = document.getElementById('tabla-productos');

async function renderizarTabla() {
    tabla.innerHTML = '';
    let productosOcultos = JSON.parse(localStorage.getItem('productosOcultos')) || [];

    // --- PRODUCTOS FIJOS ---
    if (window.productosDefecto) {
        window.productosDefecto.forEach((producto) => {
            const estaOculto = productosOcultos.includes(producto.id);
            const btnVisible = estaOculto
                ? `<button style="background-color: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; margin-right: 5px;" onclick="toggleOculto(${producto.id})">Mostrar</button>`
                : `<button style="background-color: #FF9800; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; margin-right: 5px;" onclick="toggleOculto(${producto.id})">Ocultar</button>`;

            const btnEliminar = `<button class="btn-eliminar" onclick="simularEliminarFijo(${producto.id})">Eliminar</button>`;
            const btnCambiarFoto = `<button style="background-color: #2196F3; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; margin-right: 5px;" onclick="cambiarFotoFija(${producto.id}, '${producto.nombre}')">📷 Cambiar Foto</button>`;

            const fila = document.createElement('tr');
fila.innerHTML = `
    <td>${producto.nombre}</td>
    <td>${producto.categoria || "Sin categoría"}</td>
    <td><span style="background: #FFF9C4; color: #F57F17; padding: 3px 8px; border-radius: 10px; font-size: 12px;">Nuevo</span></td>
    <td>${btnCambiarFoto} ${btnVisible} ${btnEliminar}</td>
`;
            tabla.appendChild(fila);
        });
    }

    // --- PRODUCTOS NUEVOS (Firebase) ---
    try {
        const querySnapshot = await getDocs(productosRef);
        querySnapshot.forEach((documento) => {
            const producto = documento.data();
            if (producto.tipo === 'fijo_actualizado') return;

            const idDoc = documento.id;
            const esVisible = producto.visible !== false;

            const btnVisible = esVisible
                ? `<button style="background-color: #FF9800; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; margin-right: 5px;" onclick="toggleVisibleFirebase('${idDoc}', false)">Ocultar</button>`
                : `<button style="background-color: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; margin-right: 5px;" onclick="toggleVisibleFirebase('${idDoc}', true)">Mostrar</button>`;

            const btnEliminar = `<button class="btn-eliminar" onclick="eliminarProducto('${idDoc}')">Eliminar</button>`;
            
            // ✨ NUEVO: Botón para cambiar foto de producto de Firebase
            const btnCambiarFoto = `<button style="background-color: #2196F3; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; margin-right: 5px;" onclick="cambiarFotoFirebase('${idDoc}', '${producto.nombre}')">📷 Cambiar Foto</button>`;

            const fila = document.createElement('tr');
fila.innerHTML = `
    <td>${producto.nombre}</td>
    <td>${producto.categoria || "Sin categoría"}</td>
    <td>
        <span style="
            background:#FFF9C4;
            color:#F57F17;
            padding:3px 8px;
            border-radius:10px;
            font-size:12px;">
            Nuevo
        </span>
    </td>
    <td>${btnCambiarFoto} ${btnVisible} ${btnEliminar}</td>
`;
tabla.appendChild(fila);
        });
    } catch (error) {
        console.error("Error al cargar productos de Firebase: ", error);
    }
}

window.toggleOculto = function (id) {
    let productosOcultos = JSON.parse(localStorage.getItem('productosOcultos')) || [];
    if (productosOcultos.includes(id)) {
        productosOcultos = productosOcultos.filter(idOculto => idOculto !== id);
    } else {
        productosOcultos.push(id);
    }
    localStorage.setItem('productosOcultos', JSON.stringify(productosOcultos));
    renderizarTabla();
};

window.toggleVisibleFirebase = async function (idDoc, nuevoEstado) {
    try {
        const productoRef = doc(db, 'productos', idDoc);
        await updateDoc(productoRef, { visible: nuevoEstado });
        renderizarTabla();
    } catch (error) {
        console.error("Error al actualizar visibilidad: ", error);
    }
};

window.eliminarProducto = async function (idDoc) {
    if (confirm('¿Seguro que quieres ELIMINAR este postre definitivamente?')) {
        try {
            await deleteDoc(doc(db, 'productos', idDoc));
            renderizarTabla();
        } catch (error) {
            alert("Error al eliminar.");
        }
    }
};

window.simularEliminarFijo = function (id) {
    if (confirm("¿Deseas OCULTAR este producto fijo de la tienda?")) {
        let productosOcultos = JSON.parse(localStorage.getItem('productosOcultos')) || [];
        if (!productosOcultos.includes(id)) {
            productosOcultos.push(id);
            localStorage.setItem('productosOcultos', JSON.stringify(productosOcultos));
            renderizarTabla();
        }
    }
};

// ✨ NUEVA FUNCIÓN: Cambiar foto de producto de Firebase (usa updateDoc en vez de addDoc)
window.cambiarFotoFirebase = async function (idDoc, nombre) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const base64 = await comprimirImagen(file, 800, 0.7);

            // ✨ Actualiza el documento existente en vez de crear uno nuevo
            const productoRef = doc(db, 'productos', idDoc);
            await updateDoc(productoRef, { imagen: base64 });

            alert(`¡Foto de "${nombre}" actualizada en la nube con éxito!`);
        } catch (err) {
            alert("Error al procesar la imagen: " + err.message);
        }
    };
    input.click();
};

// Función para cambiar foto de producto fijo (la que ya teníamos)
window.cambiarFotoFija = async function (id, nombre) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const base64 = await comprimirImagen(file, 800, 0.7);

            await addDoc(productosRef, {
                tipo: 'fijo_actualizado',
                idFijo: id,
                nombre: nombre,
                imagen: base64,
                visible: true
            });

            alert(`¡Foto de "${nombre}" actualizada en la nube con éxito!`);
        } catch (err) {
            alert("Error al procesar la imagen: " + err.message);
        }
    };
    input.click();
};

function comprimirImagen(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            reject(new Error('El archivo no es una imagen válida.'));
            return;
        }
        const timeout = setTimeout(() => reject(new Error('Tiempo de espera agotado.')), 15000);
        const reader = new FileReader();
        reader.onerror = () => { clearTimeout(timeout); reject(new Error('No se pudo leer el archivo.')); };
        reader.onload = (event) => {
            const img = new Image();
            img.onerror = () => { clearTimeout(timeout); reject(new Error('La imagen está corrupta.')); };
            img.onload = () => {
                clearTimeout(timeout);
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    if (dataUrl.length > 900000) dataUrl = canvas.toDataURL('image/jpeg', 0.4);
                    resolve(dataUrl);
                } catch (err) { reject(err); }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const archivoImagen = document.getElementById('imagen').files[0];
    if (!archivoImagen) { alert("Selecciona una imagen."); return; }

    const btnGuardar = form.querySelector('button[type="submit"]');
    const textoOriginal = btnGuardar.innerText;
    btnGuardar.innerText = "Procesando imagen...";
    btnGuardar.disabled = true;

    try {
        const imagenBase64 = await comprimirImagen(archivoImagen);
        await addDoc(productosRef, {
    nombre: document.getElementById('nombre').value,
    categoria: document.getElementById('categoria-postre').value,
    descripcion: document.getElementById('descripcion-postre').value,
    imagen: imagenBase64,
    visible: true
});
        form.reset();
        renderizarTabla();
        alert('¡Postre guardado exitosamente en la nube!');
    } catch (error) {
        alert("Error al guardar: " + error.message);
    } finally {
        btnGuardar.innerText = textoOriginal;
        btnGuardar.disabled = false;
    }
});

renderizarTabla();
