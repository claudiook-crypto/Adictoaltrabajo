-- schema.sql
USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'AdictoAlTrabajoDb')
BEGIN
    CREATE DATABASE [AdictoAlTrabajoDb];
END
GO

USE [AdictoAlTrabajoDb];
GO

-- Users Table
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('postulante', 'oferente', 'admin')),
    OAuthProvider NVARCHAR(50) NULL,
    OAuthId NVARCHAR(255) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Postulante Profiles (Candidates)
CREATE TABLE Candidates (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    AvatarUrl NVARCHAR(500) NULL,
    Phone NVARCHAR(50) NULL,
    Zone NVARCHAR(100) NOT NULL CHECK (Zone IN ('Villa del Rosario', 'Luque', 'Rincón')),
    Profession NVARCHAR(200) NULL, -- e.g. Albañil, Plomero
    Skills NVARCHAR(MAX) NULL, -- comma separated tags
    ResumeUrl NVARCHAR(500) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Oferente Profiles (Companies / Particulars)
CREATE TABLE Companies (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,
    CompanyName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    LogoUrl NVARCHAR(500) NULL,
    ContactPhone NVARCHAR(50) NULL,
    Zone NVARCHAR(100) NOT NULL CHECK (Zone IN ('Villa del Rosario', 'Luque', 'Rincón')),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Offers (Job postings)
CREATE TABLE Offers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CompanyId INT NOT NULL FOREIGN KEY REFERENCES Companies(Id) ON DELETE CASCADE,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Area NVARCHAR(100) NOT NULL, -- e.g. Construcción, Tecnología
    Modality NVARCHAR(50) NOT NULL CHECK (Modality IN ('Presencial', 'Remoto', 'Híbrido')),
    ContractType NVARCHAR(100) NOT NULL,
    Salary NVARCHAR(100) NULL,
    Zone NVARCHAR(100) NOT NULL CHECK (Zone IN ('Villa del Rosario', 'Luque', 'Rincón')),
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active', 'Paused', 'Closed')),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Applications
CREATE TABLE Applications (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OfferId INT NOT NULL FOREIGN KEY REFERENCES Offers(Id) ON DELETE CASCADE,
    CandidateId INT NOT NULL FOREIGN KEY REFERENCES Candidates(Id) ON DELETE NO ACTION,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pendiente' CHECK (Status IN ('Pendiente', 'Entrevista', 'Aceptado', 'Rechazado')),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Inbox / Messages
CREATE TABLE Inbox (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SenderUserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id) ON DELETE NO ACTION,
    ReceiverUserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id) ON DELETE NO ACTION,
    Content NVARCHAR(MAX) NOT NULL,
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Notifications
CREATE TABLE Notifications (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Favorites
CREATE TABLE Favorites (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,
    OfferId INT NOT NULL FOREIGN KEY REFERENCES Offers(Id) ON DELETE NO ACTION
);
GO
