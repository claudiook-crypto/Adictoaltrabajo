-- ============================================================
--  AdictoAlTrabajo — Schema Real (alineado con el backend)
--  Ejecutar sobre la DB: AdictoAlTrabajo
-- ============================================================

USE [AdictoAlTrabajo];
GO

-- ─────────────────────────────────────────────
--  TABLAS BASE
-- ─────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE Roles (
        id     INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(50) NOT NULL UNIQUE   -- 'Postulante' | 'Empresa' | 'Admin'
    );
    INSERT INTO Roles (nombre) VALUES ('Postulante'), ('Empresa'), ('Admin');
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Usuarios')
BEGIN
    CREATE TABLE Usuarios (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        email     NVARCHAR(255) NOT NULL UNIQUE,
        password  NVARCHAR(255) NULL,          -- NULL si usó OAuth
        rol_id    INT NOT NULL FOREIGN KEY REFERENCES Roles(id),
        google_id NVARCHAR(255) NULL,
        creado_en DATETIME DEFAULT GETDATE()
    );
END
GO

-- ─────────────────────────────────────────────
--  PERFILES
-- ─────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PerfilesPostulantes')
BEGIN
    CREATE TABLE PerfilesPostulantes (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id  INT NOT NULL UNIQUE FOREIGN KEY REFERENCES Usuarios(id) ON DELETE CASCADE,
        nombre      NVARCHAR(100) NOT NULL DEFAULT '',
        apellido    NVARCHAR(100) NOT NULL DEFAULT '',
        habilidades NVARCHAR(MAX) NULL,   -- coma-separated tags
        experiencia NVARCHAR(MAX) NULL,   -- profesión / descripción de experiencia
        telefono    NVARCHAR(50)  NULL,
        cv_url      NVARCHAR(500) NULL,
        es_publico  BIT NOT NULL DEFAULT 0,
        creado_en   DATETIME DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PerfilesEmpresas')
BEGIN
    CREATE TABLE PerfilesEmpresas (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id     INT NOT NULL UNIQUE FOREIGN KEY REFERENCES Usuarios(id) ON DELETE CASCADE,
        nombre_empresa NVARCHAR(200) NOT NULL DEFAULT '',
        descripcion    NVARCHAR(MAX) NULL,
        ubicacion      NVARCHAR(100) NULL,
        sitio_web      NVARCHAR(500) NULL,
        logo_url       NVARCHAR(500) NULL,
        creado_en      DATETIME DEFAULT GETDATE()
    );
END
GO

-- ─────────────────────────────────────────────
--  OFERTAS DE TRABAJO
-- ─────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Ofertas')
BEGIN
    CREATE TABLE Ofertas (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        empresa_id    INT NOT NULL FOREIGN KEY REFERENCES PerfilesEmpresas(id) ON DELETE CASCADE,
        titulo        NVARCHAR(200) NOT NULL,
        descripcion   NVARCHAR(MAX) NOT NULL DEFAULT '',
        zona          NVARCHAR(100) NULL,
        modalidad     NVARCHAR(50)  NULL,       -- Presencial | Remoto | Híbrido
        tipo_contrato NVARCHAR(100) NULL,
        experiencia   NVARCHAR(100) NULL,       -- Sin experiencia | Menos de 1 año | 1 a 3 años | Más de 3 años
        categoria     NVARCHAR(100) NULL,       -- Construcción | Comercio | Servicios | Tecnología | Hogar
        salario       NVARCHAR(100) NULL,       -- texto libre
        salario_valor INT NULL DEFAULT 0,       -- valor numérico para filtros de rango
        estado        NVARCHAR(50) NOT NULL DEFAULT 'Activa'
                      CHECK (estado IN ('Activa', 'Pausada', 'Cerrada')),
        creado_en     DATETIME DEFAULT GETDATE()
    );
END
GO

-- ─────────────────────────────────────────────
--  POSTULACIONES
-- ─────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Postulaciones')
BEGIN
    CREATE TABLE Postulaciones (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        oferta_id  INT NOT NULL FOREIGN KEY REFERENCES Ofertas(id) ON DELETE CASCADE,
        usuario_id INT NOT NULL FOREIGN KEY REFERENCES Usuarios(id),
        estado     NVARCHAR(50) NOT NULL DEFAULT 'Pendiente'
                   CHECK (estado IN ('Pendiente', 'Entrevista', 'Aceptado', 'Rechazado')),
        creado_en  DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_Postulacion UNIQUE (oferta_id, usuario_id)
    );
END
GO

-- ─────────────────────────────────────────────
--  NOTIFICACIONES
-- ─────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notificaciones')
BEGIN
    CREATE TABLE Notificaciones (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL FOREIGN KEY REFERENCES Usuarios(id) ON DELETE CASCADE,
        tipo       NVARCHAR(100) NULL,
        titulo     NVARCHAR(200) NOT NULL,
        contenido  NVARCHAR(MAX) NOT NULL,
        leida      BIT NOT NULL DEFAULT 0,
        data_extra NVARCHAR(MAX) NULL,     -- JSON con metadata adicional
        creada_en  DATETIME DEFAULT GETDATE()
    );
END
GO

-- ─────────────────────────────────────────────
--  SUGERENCIAS DE CONTACTO (oferente → postulante)
-- ─────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SugerenciasContacto')
BEGIN
    CREATE TABLE SugerenciasContacto (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        oferente_id   INT NOT NULL FOREIGN KEY REFERENCES Usuarios(id),
        postulante_id INT NOT NULL FOREIGN KEY REFERENCES Usuarios(id),
        mensaje       NVARCHAR(MAX) NULL,
        creado_en     DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_Sugerencia UNIQUE (oferente_id, postulante_id)
    );
END
GO

-- ─────────────────────────────────────────────
--  LOG DE INICIOS DE SESIÓN
-- ─────────────────────────────────────────────

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LoginLogs')
BEGIN
    CREATE TABLE LoginLogs (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NULL,
        email      NVARCHAR(255) NULL,
        metodo     NVARCHAR(50)  NULL,   -- 'email' | 'google'
        ip         NVARCHAR(100) NULL,
        creado_en  DATETIME DEFAULT GETDATE()
    );
END
GO

PRINT 'Schema creado exitosamente en AdictoAlTrabajo';
