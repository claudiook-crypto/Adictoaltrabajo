USE [AdictoAlTrabajo];
GO

-- 1. Crear tabla Ofertas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Ofertas')
BEGIN
    CREATE TABLE Ofertas (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        empresa_id    INT NOT NULL FOREIGN KEY REFERENCES PerfilesEmpresas(id) ON DELETE CASCADE,
        titulo        NVARCHAR(200) NOT NULL,
        descripcion   NVARCHAR(MAX) NOT NULL DEFAULT '',
        zona          NVARCHAR(100) NULL,
        modalidad     NVARCHAR(50)  NULL,
        tipo_contrato NVARCHAR(100) NULL,
        experiencia   NVARCHAR(100) NULL,
        categoria     NVARCHAR(100) NULL,
        salario       NVARCHAR(100) NULL,
        salario_valor INT NULL DEFAULT 0,
        estado        NVARCHAR(50) NOT NULL DEFAULT 'Activa'
                      CHECK (estado IN ('Activa', 'Pausada', 'Cerrada')),
        creado_en     DATETIME DEFAULT GETDATE()
    );
END
GO

-- 2. Crear tabla Postulaciones
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

PRINT 'Tablas Ofertas y Postulaciones creadas correctamente';
