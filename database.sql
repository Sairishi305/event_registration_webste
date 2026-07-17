CREATE DATABASE IF NOT EXISTS warangal_wie;
USE warangal_wie;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  registration_id VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  college_name VARCHAR(255) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  year VARCHAR(20) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  ieee_member TINYINT(1) DEFAULT 0,
  ieee_membership_number VARCHAR(100),
  registration_fee DECIMAL(10,2) NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  payment_proof VARCHAR(255),
  qr_code VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  registration_id VARCHAR(50) NOT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admins (username, password) VALUES ('admin', '$2a$10$V8j1sj2m7l9v2bXnFq9g7e.sv7yGm9xq0Nf2QBeZ8i6K2e7a1xQb2');
