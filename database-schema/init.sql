CREATE DABABASE if not exists web;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_authority BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS clientZone (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_client INT NOT NULL,
    Country VARCHAR(50) NULL,
    County VARCHAR(50),
    Town VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS clientPins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_client INT NOT NULL,
    pin1_lat FLOAT,
    pin1_lng FLOAT,
    pin2_lat FLOAT,
    pin2_lng FLOAT,
    pin3_lat FLOAT,
    pin3_lng FLOAT,
    pin1_name VARCHAR(15) NULL,
    pin2_name VARCHAR(15) NULL,
    pin3_name VARCHAR(15) NULL
);

CREATE TABLE IF NOT EXISTS calamities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    type VARCHAR(50),
    description TEXT,
    county VARCHAR(100),
    town VARCHAR(100),
    startdate DATETIME,
    enddate DATETIME,
    gravity VARCHAR(20),
    country VARCHAR(100),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shelters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    id_calamity INT,
    type_shelter VARCHAR(50) NOT NULL,
    permanent BOOLEAN DEFAULT false,
    description TEXT,
    calamity_type VARCHAR(50),
    FOREIGN KEY (id_calamity) REFERENCES calamities(id)
);



