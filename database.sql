CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    phone TEXT,
    balance FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
