USE AdictoAlTrabajo;
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Chats' and xtype='U')
BEGIN
    CREATE TABLE Chats (
        id INT IDENTITY(1,1) PRIMARY KEY,
        oferente_id INT NOT NULL FOREIGN KEY REFERENCES Usuarios(id),
        postulante_id INT NOT NULL FOREIGN KEY REFERENCES Usuarios(id),
        oferta_id INT NULL FOREIGN KEY REFERENCES Ofertas(id),
        ultimo_mensaje_fecha DATETIME DEFAULT GETDATE(),
        creado_en DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_Chat UNIQUE (oferente_id, postulante_id, oferta_id)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Mensajes' and xtype='U')
BEGIN
    CREATE TABLE Mensajes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        chat_id INT NOT NULL FOREIGN KEY REFERENCES Chats(id),
        remitente_id INT NOT NULL FOREIGN KEY REFERENCES Usuarios(id),
        contenido NVARCHAR(MAX) NOT NULL,
        leido BIT DEFAULT 0,
        creado_en DATETIME DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Bloqueos' and xtype='U')
BEGIN
    CREATE TABLE Bloqueos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        bloqueador_id INT NOT NULL FOREIGN KEY REFERENCES Usuarios(id),
        bloqueado_id INT NOT NULL FOREIGN KEY REFERENCES Usuarios(id),
        creado_en DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_Bloqueo UNIQUE (bloqueador_id, bloqueado_id)
    );
END
GO
