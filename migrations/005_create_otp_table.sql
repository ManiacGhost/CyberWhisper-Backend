-- Create OTP (One-Time Password) table for admin MFA
CREATE TABLE IF NOT EXISTS otp_cw (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    CONSTRAINT otp_valid_length CHECK (LENGTH(otp_code) = 6)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_cw(email);
CREATE INDEX IF NOT EXISTS idx_otp_code ON otp_cw(otp_code);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_cw(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_is_verified ON otp_cw(is_verified);
