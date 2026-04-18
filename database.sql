CREATE TABLE Role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE "User" (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id)
        REFERENCES Role(role_id)
        ON DELETE RESTRICT
);

CREATE TABLE Home (
    home_id SERIAL PRIMARY KEY,
    owner_user_id INTEGER NOT NULL,
    home_name VARCHAR(100) NOT NULL,
    address_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_home_owner
        FOREIGN KEY (owner_user_id)
        REFERENCES "User"(user_id)
        ON DELETE CASCADE
);

CREATE TABLE Room (
    room_id SERIAL PRIMARY KEY,
    home_id INTEGER NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    floor_no INTEGER,
    CONSTRAINT fk_room_home
        FOREIGN KEY (home_id)
        REFERENCES Home(home_id)
        ON DELETE CASCADE
);

CREATE TABLE Device (
    device_id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    brand_model VARCHAR(100),
    serial_no VARCHAR(100) UNIQUE NOT NULL,
    installed_at TIMESTAMP,
    status VARCHAR(50),
    CONSTRAINT fk_device_room
        FOREIGN KEY (room_id)
        REFERENCES Room(room_id)
        ON DELETE CASCADE
);

CREATE TABLE Sensor (
    sensor_id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    unit VARCHAR(20),
    normal_min NUMERIC,
    normal_max NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_sensor_device
        FOREIGN KEY (device_id)
        REFERENCES Device(device_id)
        ON DELETE CASCADE,
    CONSTRAINT check_normal_range
        CHECK (normal_min IS NULL OR normal_max IS NULL OR normal_min <= normal_max)
);

CREATE TABLE SensorReading (
    reading_id SERIAL PRIMARY KEY,
    sensor_id INTEGER NOT NULL,
    reading_time TIMESTAMP NOT NULL,
    reading_value NUMERIC NOT NULL,
    quality_flag VARCHAR(20),
    CONSTRAINT fk_reading_sensor
        FOREIGN KEY (sensor_id)
        REFERENCES Sensor(sensor_id)
        ON DELETE CASCADE
);

CREATE TABLE Event (
    event_id SERIAL PRIMARY KEY,
    home_id INTEGER NOT NULL,
    device_id INTEGER,
    event_type VARCHAR(100) NOT NULL,
    event_time TIMESTAMP NOT NULL,
    description TEXT,
    CONSTRAINT fk_event_home
        FOREIGN KEY (home_id)
        REFERENCES Home(home_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_device
        FOREIGN KEY (device_id)
        REFERENCES Device(device_id)
        ON DELETE SET NULL
);

CREATE TABLE Alert (
    alert_id SERIAL PRIMARY KEY,
    home_id INTEGER NOT NULL,
    sensor_id INTEGER,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    CONSTRAINT fk_alert_home
        FOREIGN KEY (home_id)
        REFERENCES Home(home_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_alert_sensor
        FOREIGN KEY (sensor_id)
        REFERENCES Sensor(sensor_id)
        ON DELETE SET NULL
);

INSERT INTO Role (role_name) VALUES ('admin'), ('user'), ('technician');
