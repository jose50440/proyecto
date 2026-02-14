# Migración a Supabase – IHSS A TU CASA

## 1. Crear proyecto en Supabase (si no existe)

- Entra en [supabase.com](https://supabase.com) → tu proyecto.
- La URL de tu BD es: `db.nevnnxjicyhwkzrgtadu.supabase.co` → el **Project Ref** es: `nevnnxjicyhwkzrgtadu`.
- La URL del API para el navegador es: `https://nevnnxjicyhwkzrgtadu.supabase.co`.

## 2. Ejecutar el esquema SQL

1. En Supabase: **SQL Editor** → **New query**.
2. Abre el archivo **`supabase-schema.sql`** de este proyecto.
3. Copia todo el contenido y pégalo en el editor.
4. Pulsa **Run**.
5. Debe terminar sin errores (tablas y políticas creadas).

## 3. Obtener la Anon Key

1. En Supabase: **Settings** (engranaje) → **API**.
2. En **Project API keys** copia la clave **anon** (public).
3. Esa clave es la que usarás en `index.html` como `SUPABASE_ANON_KEY`.

## 4. Configurar index.html

En `index.html` busca el bloque de configuración de Supabase (cerca del inicio del script principal). Debe tener algo así:

```javascript
window.SUPABASE_URL = 'https://nevnnxjicyhwkzrgtadu.supabase.co';
window.SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';  // ← Pegar la anon key aquí
```

Sustituye `TU_ANON_KEY_AQUI` por la anon key copiada en el paso 3.

## 5. Servir la aplicación

La app carga `supabase-db-adapter.js` desde la misma ruta que `index.html`. Debes servir los archivos por HTTP (no abrir `index.html` directamente como archivo):

- **Opción A:** `npx serve .` en la carpeta del proyecto (puerto 3000).
- **Opción B:** Cualquier servidor estático (XAMPP, Live Server, etc.).

Abre en el navegador la URL que sirve `index.html` (ej. `http://localhost:3000`).

## 6. Crear el primer usuario (login)

Tras ejecutar el SQL, crea al menos un usuario en `prod_users` para poder entrar:

En Supabase → **SQL Editor** → New query, ejecuta (cambia usuario y contraseña):

```sql
INSERT INTO prod_users (username, password, nombre, role, departamento, "rolesDepartamento")
VALUES ('admin', 'tu_contraseña', 'Administrador', 'admin', 'farmacia', '["admin"]');
```

Luego inicia sesión en la app con ese `username` y `password`.

## 7. Resumen de lo que crea el SQL

| Tabla                    | Uso                                      |
|--------------------------|------------------------------------------|
| `prod_patients`          | Pacientes / derechohabientes             |
| `prod_kits`              | Kits de medicamentos (payload JSONB)     |
| `prod_users`             | Usuarios y login (username/password)     |
| `prod_medicines`         | Catálogo de medicamentos                 |
| `prod_contacts`          | Contactos                                |
| `prod_patient_reports`   | Reportes de carga Excel y manual         |
| `prod_templates`         | Plantillas de kits                       |
| `prod_templates_ruta`    | Plantilla RUTA (id = 'current')          |
| `_health`                | Ping de conexión                         |

## 8. Migrar datos desde Firebase (opcional)

Si ya tienes datos en Firestore:

1. Exporta las colecciones desde Firebase (consola o script).
2. Convierte documentos JSON a filas (por tabla).
3. Inserta en Supabase con **SQL Editor** o con un script que use la API REST de Supabase (`INSERT` por tabla).

## 9. Seguridad

- Las políticas RLS creadas permiten todo (`USING (true)`). En producción conviene restringir por `auth.uid()` o por rol.
- La contraseña de usuarios está en texto plano en `prod_users`. Recomendable migrar a Supabase Auth o al menos hashear contraseñas (por ejemplo con `pgcrypto`).

## 10. Realtime (opcional)

Si quieres actualizaciones en vivo (como antes con Firestore):

- En Supabase: **Database** → **Replication**.
- Activa la replicación para las tablas que necesites (`prod_patients`, `prod_kits`, etc.).

Si no activas Realtime, la app seguirá funcionando usando polling cada pocos segundos para las suscripciones.
