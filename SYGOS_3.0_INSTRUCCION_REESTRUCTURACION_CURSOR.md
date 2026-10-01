# SYGOS 3.0 — INSTRUCCIÓN DE REESTRUCTURACIÓN FUNCIONAL PARA CURSOR

**Documento de referencia funcional:** `SYGOS_3.0_DISCOVERY_FINAL.md`  
**Objetivo de este archivo:** corregir la forma en que Cursor interpreta y construye el Discovery sin modificar las decisiones funcionales ya acordadas.

---

# 1. Regla principal

El Discovery vigente contiene las decisiones de negocio de SYGOS 3.0, pero **no debe interpretarse como una lista plana de requisitos independientes**.

Cursor debe construir el sistema respetando una jerarquía funcional explícita:

**Sistema → Áreas → Módulos → Entidades → Vistas → Relaciones → Acciones → Estados → Transiciones → Historial**

Una entidad o módulo **no se considera terminado** únicamente porque exista:

- un menú;
- un listado;
- un formulario de alta;
- una tabla;
- o una pantalla aislada.

Para considerarse funcionalmente construido, cuando corresponda debe poder:

1. nacer;
2. encontrarse;
3. abrirse;
4. consultarse en detalle;
5. operarse según su estado;
6. navegar hacia sus relaciones;
7. recibir acciones según permisos;
8. cambiar de estado correctamente;
9. conservar trazabilidad;
10. terminar su ciclo de vida.

---

# 2. Estructura obligatoria del Discovery

El Discovery consolidado debe quedar organizado con esta jerarquía general:

1. Objetivo.
2. Alcance.
3. Contexto.
4. Usuarios y roles.
5. Mapa funcional.
6. Módulos.
7. Entidades y relaciones.
8. Reglas generales.
9. Campos relevantes.
10. Procedencia de datos.
11. Estados.
12. Transiciones.
13. Acciones.
14. Permisos.
15. Validaciones.
16. Automatizaciones.
17. Excepciones.
18. Documentos.
19. Integraciones.
20. Dependencias.
21. Comportamiento ante errores.
22. Criterios de aceptación.
23. Fuera de alcance.
24. Plan de construcción y validación.

El documento debe ser **autocontenido**.

Las decisiones funcionales vigentes del Discovery actual deben preservarse. La reestructuración no autoriza a inventar reglas nuevas ni eliminar reglas existentes.

---

# 3. Mapa funcional antes del detalle

Antes de describir cada módulo debe existir un mapa funcional que deje clara la pertenencia de cada capacidad.

Como mínimo debe distinguir:

## 3.1 Maestros y relaciones base

- Clientes.
- Prospectos.
- Proveedores.
- Colaboradores.
- EQUI.
- MOT.
- Catálogos funcionales aplicables.

## 3.2 Operación técnica

- Atenciones.
- Diagnósticos.
- Diagnóstico de Garantía.
- Reparaciones.
- Órdenes de Servicio.
- Bitácora Técnica.
- Refacciones.
- Servicios externos.

## 3.3 Comercial

- Pendientes de cotizar.
- Cotizaciones.
- Ventas.
- Seguimiento comercial.
- Agenda y metas donde apliquen.

## 3.4 Custodia e inventario

- Almacén SYSTRON.
- Ingreso / Resguardo / Egreso Servomotores.
- Inventario.
- Salidas a prueba.

## 3.5 Compras

- Compras directas.
- Órdenes de Compra.

## 3.6 Administración y finanzas

- Facturación.
- Remisiones.
- Pagos.
- CxC.
- Cobranza.
- CxP.
- Ingresos.
- Egresos.
- Bancos.
- Efectivo.
- Dashboard financiero.

## 3.7 Personal

- Colaboradores.
- Asistencia.
- Vacaciones.
- Horas extra.
- Nómina.
- Bonos.
- Aguinaldo.
- Comisiones.

## 3.8 Control y soporte

- Paneles.
- Reportes.
- Configuración.
- Integraciones.
- Modo de Pruebas.
- Búsqueda global.

---

# 4. Estructura obligatoria de cada módulo

Cada módulo relevante debe documentarse y construirse siguiendo, cuando corresponda, esta estructura.

## 4.1 Objetivo

Explicar qué problema resuelve el módulo y qué resultado funcional produce.

## 4.2 Alcance del módulo

Aclarar qué pertenece al módulo y qué queda en otros módulos.

## 4.3 Usuarios

Definir qué roles pueden:

- consultar;
- crear;
- modificar;
- ejecutar acciones;
- autorizar;
- cancelar;
- ver información restringida.

## 4.4 Entidades principales

Identificar las entidades operadas por el módulo y sus relaciones.

## 4.5 Cómo nace cada entidad

Definir todos los orígenes válidos.

Ejemplo: una Cotización puede nacer desde una solicitud del Vendedor, un Diagnóstico validado, una Reparación, un MOT relacionado o una Garantía no procedente.

## 4.6 Listado

Cuando exista listado, debe definir:

- información mínima visible;
- estado;
- responsable;
- fechas relevantes;
- filtros;
- búsqueda;
- acceso al detalle.

**Toda fila o elemento relevante debe poder abrir su vista de detalle.**

## 4.7 Vista de detalle

Toda entidad operativa relevante debe tener una vista de detalle funcional.

La vista debe mostrar, cuando aplique:

- encabezado e identidad;
- estado actual;
- información principal;
- relaciones;
- documentos;
- acciones disponibles;
- historial relevante;
- errores o pendientes.

No se considera completa una entidad que solo pueda verse dentro de un listado o formulario de edición.

## 4.8 Relaciones navegables

Las relaciones entre entidades deben ser visibles y navegables según permisos.

Ejemplos:

- Cliente → EQUI/MOT.
- Cliente → Cotizaciones.
- Cliente → Facturas.
- MOT/EQUI → Atenciones.
- Diagnóstico → Equipo.
- Diagnóstico → Cotización.
- Cotización → Cliente.
- Cotización → EQUI/MOT.
- Cotización → Diagnóstico/OS de origen.
- Cotización → Factura/Remisión.
- Factura → Cliente.
- Factura → Cotización u operación origen.
- O.C. → Egreso o CxP.
- CxP → Proveedor.
- OS → Refacciones.
- Colaborador → incidencias / vacaciones / horas extra / nóminas.

No basta con guardar un identificador interno. El usuario autorizado debe poder **abrir la entidad relacionada desde el detalle**.

## 4.9 Estados y transiciones

Para cada estado se debe indicar:

- cómo se entra;
- quién puede provocar la transición;
- qué acción la provoca;
- qué validaciones deben cumplirse;
- qué automatizaciones se disparan;
- qué queda bloqueado después.

## 4.10 Acciones

Las acciones disponibles deben depender de:

- rol;
- empresa activa;
- estado;
- existencia de dependencias;
- permisos particulares.

## 4.11 Procedencia y propagación de datos

Cada dato relevante debe indicar, cuando aplique:

- si se captura;
- si se hereda;
- si se calcula;
- si se consulta de otra entidad;
- si se congela como fotografía histórica;
- si cambios futuros deben propagarse o no.

## 4.12 Validaciones

Las validaciones deben impedir inconsistencias funcionales, duplicados y acciones fuera de secuencia.

## 4.13 Automatizaciones

Toda automatización debe indicar:

- evento disparador;
- resultado;
- entidad afectada;
- qué usuario debe recibir el pendiente o aviso;
- qué ocurre si no puede completarse.

## 4.14 Excepciones y errores

Debe contemplarse:

- estado vacío;
- configuración faltante;
- integración desconectada;
- error recuperable;
- operación ya modificada por otro usuario;
- reintento;
- dependencia incompatible;
- duplicado potencial.

## 4.15 Documentos

Cuando una entidad genere o utilice documentos, definir:

- qué documento;
- cuándo se genera;
- quién puede generarlo;
- dónde se consulta;
- cómo se descarga;
- qué información histórica conserva.

## 4.16 Criterios de aceptación

Los criterios deben comprobar recorridos funcionales completos, no solamente existencia de pantallas.

---

# 5. Regla transversal: Altas rápidas de entidades relacionadas

SYGOS 3.0 debe permitir **altas rápidas** cuando un usuario se encuentre dentro de un proceso y necesite una entidad previa que todavía no existe.

El objetivo es evitar obligar al usuario a abandonar el flujo actual, navegar a otro módulo, crear la entidad y después regresar manualmente.

## 5.1 Comportamiento general

Cuando un campo relacional requiera seleccionar una entidad existente:

1. el usuario puede buscarla;
2. si no existe y tiene permiso para crearla, debe aparecer la acción `Crear nuevo`;
3. el usuario captura únicamente la información mínima necesaria para darla de alta;
4. se aplican las mismas reglas de validación y prevención de duplicados que en el alta normal;
5. al finalizar, el usuario vuelve al proceso original;
6. la nueva entidad queda seleccionada automáticamente;
7. la información que el usuario ya había capturado en el proceso original no se pierde.

El alta rápida no crea una entidad “provisional” con reglas diferentes. Crea una entidad válida mediante un recorrido reducido.

## 5.2 Permisos

El alta rápida solo debe estar disponible si el usuario **ya tiene permiso funcional para crear esa entidad**.

Si puede consultar pero no crear:

- podrá buscar y seleccionar existentes;
- no verá una acción de creación que evada sus permisos.

## 5.3 Empresa activa

Toda alta rápida debe respetar la empresa activa.

Una entidad creada rápidamente en SYSTRON no debe aparecer como una nueva entidad propia de Servomotores, salvo relaciones intercompañía expresamente definidas.

## 5.4 Prevención de duplicados

Antes de confirmar un alta rápida debe buscarse la posibilidad de que la entidad ya exista usando los datos relevantes disponibles.

El sistema debe advertir coincidencias razonables y permitir al usuario abrir/seleccionar la entidad existente cuando corresponda.

No debe fusionar automáticamente entidades por inferencia.

## 5.5 Regreso al proceso

Después del alta rápida:

- regresar al punto exacto donde estaba el usuario;
- conservar todos los datos ya capturados;
- seleccionar la entidad recién creada;
- permitir continuar inmediatamente.

## 5.6 Entidades donde aplica

Aplicar altas rápidas en todos los procesos donde una entidad previa sea necesaria y el usuario tenga permiso para crearla.

Como mínimo revisar:

### Cliente

Ejemplo:

`Nueva Cotización → buscar Cliente → no existe → Crear Cliente → guardar → regresar a Cotización con Cliente seleccionado`.

### Contacto de Cliente

Dentro de procesos de Cotización, envío u otras acciones:

`Seleccionar contacto → Crear contacto → guardar → queda disponible y seleccionado`.

### Prospecto / conversión a Cliente

Cuando corresponda según el flujo comercial vigente.

### EQUI / MOT

Cuando el proceso requiera identificar un equipo y sea funcionalmente válido crearlo en ese momento.

Debe respetarse la diferencia entre:

- alta previa;
- alta al recibir físicamente;
- MOT intercompañía;
- reglas de identidad ya definidas.

### Proveedor

En Compras, CxP u otros recorridos donde el usuario autorizado necesite un proveedor inexistente.

### Catálogos permitidos

Cuando ya se haya definido creación rápida de catálogos operativos, por ejemplo:

- Tipo de equipo;
- Marca;
- Courier;
- otros catálogos funcionales expresamente permitidos.

## 5.7 Entidades donde NO debe asumirse alta rápida

No habilitar altas rápidas indiscriminadamente en entidades sensibles o cuyo ciclo requiera un proceso propio.

No asumir alta rápida para:

- usuarios;
- colaboradores;
- cuentas bancarias;
- configuraciones fiscales;
- roles;
- documentos fiscales;
- Facturas;
- pagos;
- Nóminas;
- entidades que requieran autorización previa.

Estas entidades deben seguir su flujo formal.

## 5.8 Regla de información mínima

El alta rápida debe pedir solamente los campos indispensables para que la nueva entidad sea válida.

Los campos no indispensables podrán completarse posteriormente desde su vista de detalle.

Esto no autoriza omitir campos obligatorios establecidos por reglas funcionales.

---

# 6. Regla transversal: navegación después de crear una entidad

Después de crear cualquier entidad relevante, el sistema debe ofrecer acceso inmediato a su detalle.

Ejemplos:

- Crear Cliente → abrir detalle del Cliente o continuar el proceso que lo originó.
- Crear Cotización → poder abrir la Cotización.
- Crear O.C. → poder abrir la O.C.
- Crear Diagnóstico → poder abrir el Diagnóstico.
- Crear MOT → poder abrir el MOT.

Crear una entidad sin forma funcional de volver a consultarla o abrirla se considera implementación incompleta.

---

# 7. Regla transversal: relaciones visibles

Toda vista de detalle debe mostrar las relaciones que sean útiles operativamente.

Las relaciones deben agruparse de manera comprensible y no convertirse en una lista técnica de identificadores.

Ejemplo para una Cotización:

- Cliente.
- Contactos.
- EQUI/MOT.
- Origen.
- Diagnóstico relacionado.
- OS relacionada.
- Venta relacionada.
- Factura(s).
- Remisión(es).
- Pagos relacionados, cuando corresponda.

Solo deben mostrarse relaciones que existan y que el usuario tenga permiso de consultar.

---

# 8. Regla de completitud para Cursor

Cursor no debe declarar un módulo o entidad como terminado hasta comprobar como mínimo:

- aparece donde corresponde en la navegación;
- puede crearse por todos sus orígenes válidos;
- puede encontrarse;
- puede abrirse;
- tiene vista de detalle;
- muestra relaciones relevantes;
- permite navegar esas relaciones;
- presenta acciones válidas según estado/rol;
- respeta permisos;
- ejecuta sus transiciones;
- conserva historial requerido;
- maneja vacío, error y configuración faltante;
- genera/consulta documentos cuando corresponda;
- satisface los criterios de aceptación del módulo.

---

# 9. Ejemplo de criterio de aceptación correcto

No usar criterios vagos como:

`Cotizaciones implementadas`.

Usar recorridos completos, por ejemplo:

1. Vendedor inicia una Cotización para un Cliente nuevo.
2. Desde el campo Cliente utiliza `Crear nuevo`.
3. Da de alta el Cliente sin abandonar la Cotización.
4. Regresa con el Cliente seleccionado.
5. Completa el contexto comercial.
6. Guarda la Cotización sin precio.
7. La Cotización aparece en `Pendientes de cotizar`.
8. CEO abre la Cotización.
9. Desde su detalle puede abrir el Cliente relacionado.
10. CEO regresa a la Cotización y asigna precio.
11. Vendedor puede consultar el precio final pero no modificarlo.
12. Vendedor aplica un descuento dentro de su límite.
13. Genera/consulta el PDF.
14. Registra la decisión del cliente.
15. El estado cambia correctamente.
16. Las entidades posteriores pueden navegar de regreso a la Cotización origen.

Ese recorrido sí representa una capacidad terminada.

---

# 10. Plan de construcción y validación

El Plan de Construcción y Validación debe seguir dependencias funcionales.

No avanzar a un módulo dependiente si las entidades base necesarias todavía no tienen:

- alta;
- búsqueda;
- detalle;
- relaciones;
- permisos;
- ciclo mínimo funcional.

Ejemplo:

No considerar Cotizaciones listas si Cliente existe únicamente como selector sin detalle navegable.

No considerar Facturación lista si la Factura no puede mostrar y abrir su Cliente y operación origen.

No considerar Compras lista si una O.C. no puede abrirse, consultar su estado y navegar al Egreso/CxP que finalmente la procesó.

Las fases definitivas del Discovery y del Plan de Validación deben coincidir exactamente.

---

# 11. Restricción técnica

Este documento define **qué comportamiento funcional debe existir**.

Cursor conserva libertad para decidir **cómo implementarlo**.

No interpretar estas instrucciones como autorización para introducir arquitectura, frameworks, estructuras internas, endpoints, tablas, componentes o patrones técnicos no requeridos por la funcionalidad.

---

# 12. Resultado esperado de la reestructuración

El resultado debe permitir que una persona o agente que no participó en las conversaciones anteriores pueda comprender:

- qué es SYGOS 3.0;
- cómo se divide;
- qué módulos existen;
- qué entidades opera cada módulo;
- cómo nacen;
- cómo se encuentran;
- cómo se abren;
- qué relaciones tienen;
- cómo se navegan;
- quién puede actuar;
- qué estados existen;
- cómo cambian;
- qué información heredan;
- qué historial conservan;
- qué documentos generan;
- cómo responden ante errores;
- y cómo se valida que cada módulo esté realmente terminado.

El Discovery final debe ser la fuente de verdad funcional para la construcción.
