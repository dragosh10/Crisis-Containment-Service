-- Creăm baza de date cri_users dacă nu există
CREATE DATABASE IF NOT EXISTS cri_users;

-- Conectare la baza de date
\c cri_users;

-- Creăm tabelul pentru utilizatori
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_authority BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adăugăm câmpul is_authority dacă nu există (pentru cazul când tabelul există deja)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_authority BOOLEAN DEFAULT FALSE;