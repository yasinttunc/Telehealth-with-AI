CREATE TABLE IF NOT EXISTS app_user (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('DOCTOR', 'ADMIN', 'PATIENT')),
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient (
    patient_id BIGSERIAL PRIMARY KEY,
    nhs_number VARCHAR(10) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor (
    doctor_id BIGSERIAL PRIMARY KEY,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS available_times (
    doctor_id BIGINT NOT NULL REFERENCES doctor(doctor_id) ON DELETE CASCADE,
    available_times TIMESTAMP NOT NULL,
    PRIMARY KEY (doctor_id, available_times)
);

CREATE TABLE IF NOT EXISTS clinic (
    clinic_id BIGSERIAL PRIMARY KEY,
    clinic_name VARCHAR(160) NOT NULL,
    clinic_address VARCHAR(255) NOT NULL,
    doctor_id BIGINT REFERENCES doctor(doctor_id),
    patient_id BIGINT REFERENCES patient(patient_id)
);

CREATE TABLE IF NOT EXISTS consultation (
    consultation_id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    clinician_id BIGINT NOT NULL REFERENCES app_user(user_id),
    clinic_id VARCHAR(50),
    time TIMESTAMP NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    transcript TEXT
);

CREATE TABLE IF NOT EXISTS symptom_record (
    symptom_record_id BIGSERIAL PRIMARY KEY,
    consultation_id BIGINT REFERENCES consultation(consultation_id) ON DELETE CASCADE,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_name VARCHAR(100) NOT NULL DEFAULT 'seed-data',
    prompt_version VARCHAR(50) NOT NULL DEFAULT 'seed-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert (
    alert_id BIGSERIAL PRIMARY KEY,
    clinic_id VARCHAR(50) NOT NULL,
    symptom_name VARCHAR(100) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    observed_count INTEGER NOT NULL,
    baseline_count NUMERIC(8, 2) NOT NULL,
    score NUMERIC(8, 2) NOT NULL,
    threshold NUMERIC(8, 2) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'DISMISSED', 'RESOLVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_patient_id ON consultation(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_clinician_id ON consultation(clinician_id);
CREATE INDEX IF NOT EXISTS idx_consultation_clinic_id ON consultation(clinic_id);
CREATE INDEX IF NOT EXISTS idx_symptom_record_consultation_id ON symptom_record(consultation_id);
CREATE INDEX IF NOT EXISTS idx_symptom_record_symptoms_gin ON symptom_record USING GIN (symptoms);
CREATE INDEX IF NOT EXISTS idx_alert_clinic_status ON alert(clinic_id, status);
