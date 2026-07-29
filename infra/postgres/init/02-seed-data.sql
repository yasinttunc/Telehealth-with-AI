INSERT INTO app_user (user_id, username, password, role, email, created_at) VALUES
    (1, 'admin', '$2a$10$E6LkCtrd6qgvY3u4tFLip.bGTtJoJT0o93L3Z8XiJ57MOshVRGV.e', 'ADMIN', 'admin@telehealth.local', now() - interval '40 days'),
    (2, 'dr.sarah.patel', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4d7xMPEHVp27Li6Z0L8qRZJxQ0ZUS', 'DOCTOR', 'sarah.patel@telehealth.local', now() - interval '38 days'),
    (3, 'dr.james.wilson', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4d7xMPEHVp27Li6Z0L8qRZJxQ0ZUS', 'DOCTOR', 'james.wilson@telehealth.local', now() - interval '37 days'),
    (4, 'dr.emily.chen', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4d7xMPEHVp27Li6Z0L8qRZJxQ0ZUS', 'DOCTOR', 'emily.chen@telehealth.local', now() - interval '36 days'),
    (5, 'patient.oliver.hughes', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4d7xMPEHVp27Li6Z0L8qRZJxQ0ZUS', 'PATIENT', 'oliver.hughes@example.local', now() - interval '30 days'),
    (6, 'patient.amelia.brown', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4d7xMPEHVp27Li6Z0L8qRZJxQ0ZUS', 'PATIENT', 'amelia.brown@example.local', now() - interval '29 days'),
    (7, 'patient.noah.taylor', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4d7xMPEHVp27Li6Z0L8qRZJxQ0ZUS', 'PATIENT', 'noah.taylor@example.local', now() - interval '28 days'),
    (8, 'patient.isla.evans', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4d7xMPEHVp27Li6Z0L8qRZJxQ0ZUS', 'PATIENT', 'isla.evans@example.local', now() - interval '27 days'),
    (9, 'patient.jack.roberts', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4d7xMPEHVp27Li6Z0L8qRZJxQ0ZUS', 'PATIENT', 'jack.roberts@example.local', now() - interval '26 days'),
    (10, 'patient.sophia.walker', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi4d7xMPEHVp27Li6Z0L8qRZJxQ0ZUS', 'PATIENT', 'sophia.walker@example.local', now() - interval '25 days')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO patient (patient_id, nhs_number, first_name, last_name, date_of_birth, created_at) VALUES
    (1, '4857773456', 'Oliver', 'Hughes', '1991-04-12', now() - interval '30 days'),
    (2, '6392018842', 'Amelia', 'Brown', '1984-09-23', now() - interval '29 days'),
    (3, '7245189031', 'Noah', 'Taylor', '2000-01-16', now() - interval '28 days'),
    (4, '3901185274', 'Isla', 'Evans', '1976-11-05', now() - interval '27 days'),
    (5, '8124706395', 'Jack', 'Roberts', '1998-07-31', now() - interval '26 days'),
    (6, '5640391728', 'Sophia', 'Walker', '1969-03-18', now() - interval '25 days'),
    (7, '1038462917', 'Mia', 'Johnson', '1989-12-09', now() - interval '24 days'),
    (8, '9572301846', 'George', 'Davies', '1958-06-02', now() - interval '23 days'),
    (9, '2486915037', 'Freya', 'Thomas', '1995-10-27', now() - interval '22 days'),
    (10, '6719053824', 'Leo', 'Williams', '2003-02-14', now() - interval '21 days')
ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO doctor (doctor_id, firstName, lastName, specialty, created_at) VALUES
    (1, 'Sarah', 'Patel', 'General Practice', now() - interval '38 days'),
    (2, 'James', 'Wilson', 'Respiratory Medicine', now() - interval '37 days'),
    (3, 'Emily', 'Chen', 'Infectious Disease', now() - interval '36 days')
ON CONFLICT (doctor_id) DO NOTHING;

INSERT INTO available_times (doctor_id, available_times) VALUES
    (1, now() + interval '1 day' + interval '9 hours'),
    (1, now() + interval '1 day' + interval '11 hours'),
    (1, now() + interval '2 days' + interval '14 hours'),
    (2, now() + interval '1 day' + interval '10 hours'),
    (2, now() + interval '3 days' + interval '15 hours'),
    (3, now() + interval '2 days' + interval '9 hours'),
    (3, now() + interval '4 days' + interval '13 hours')
ON CONFLICT DO NOTHING;

INSERT INTO clinic (clinic_id, clinic_name, clinic_address, doctor_id, patient_id) VALUES
    (1, 'Swansea Central Telehealth Clinic', '12 Wind Street, Swansea SA1 1AA', 1, 1),
    (2, 'Bay Health Virtual Practice', '45 Fabian Way, Swansea SA1 8QB', 2, 2),
    (3, 'Uplands Community Medical Hub', '7 Uplands Crescent, Swansea SA2 0PG', 3, 3)
ON CONFLICT (clinic_id) DO NOTHING;

INSERT INTO consultation (
    consultation_id,
    patient_id,
    clinician_id,
    clinic_id,
    time,
    started_at,
    ended_at,
    transcript
) VALUES
    (1, 1, 2, 'CLINIC-SWANSEA-CENTRAL', now() - interval '9 days', now() - interval '9 days', now() - interval '9 days' + interval '18 minutes',
     'Patient reports a dry cough, mild fever, and fatigue for two days. Denies chest pain. Clinician advises rest, fluids, and monitoring.'),
    (2, 2, 2, 'CLINIC-SWANSEA-CENTRAL', now() - interval '8 days', now() - interval '8 days', now() - interval '8 days' + interval '16 minutes',
     'Patient describes sore throat, cough, headache, and chills. No shortness of breath reported.'),
    (3, 3, 3, 'CLINIC-SWANSEA-CENTRAL', now() - interval '7 days', now() - interval '7 days', now() - interval '7 days' + interval '22 minutes',
     'Patient has fever, cough, muscle aches, and fatigue. Clinician notes possible viral illness and recommends isolation while symptoms persist.'),
    (4, 4, 1, 'CLINIC-BAY-HEALTH', now() - interval '6 days', now() - interval '6 days', now() - interval '6 days' + interval '12 minutes',
     'Patient reports nausea and abdominal pain after eating. Denies fever and cough.'),
    (5, 5, 1, 'CLINIC-BAY-HEALTH', now() - interval '5 days', now() - interval '5 days', now() - interval '5 days' + interval '14 minutes',
     'Patient reports headache and dizziness since yesterday. No rash, no vomiting, no breathing difficulty.'),
    (6, 6, 2, 'CLINIC-SWANSEA-CENTRAL', now() - interval '4 days', now() - interval '4 days', now() - interval '4 days' + interval '20 minutes',
     'Patient reports fever, persistent cough, sore throat, and loss of smell. Several coworkers have similar symptoms.'),
    (7, 7, 2, 'CLINIC-SWANSEA-CENTRAL', now() - interval '3 days', now() - interval '3 days', now() - interval '3 days' + interval '21 minutes',
     'Patient has cough, chills, fatigue, and shortness of breath on exertion. Clinician advises urgent review if symptoms worsen.'),
    (8, 8, 3, 'CLINIC-UPLANDS', now() - interval '2 days', now() - interval '2 days', now() - interval '2 days' + interval '19 minutes',
     'Patient reports rash and itching after starting new laundry detergent. Denies fever.'),
    (9, 9, 1, 'CLINIC-UPLANDS', now() - interval '1 day', now() - interval '1 day', now() - interval '1 day' + interval '13 minutes',
     'Patient reports migraine-like headache with nausea. Denies cough and fever.'),
    (10, 10, 2, 'CLINIC-SWANSEA-CENTRAL', now() - interval '12 hours', now() - interval '12 hours', now() - interval '12 hours' + interval '17 minutes',
     'Patient reports fever, cough, sore throat, and fatigue. Family member recently had similar flu-like symptoms.')
ON CONFLICT (consultation_id) DO NOTHING;

INSERT INTO symptom_record (symptom_record_id, consultation_id, symptoms, model_name, prompt_version, created_at) VALUES
    (1, 1, '[{"name":"cough","assertion":"present","confidence":0.94},{"name":"fever","assertion":"present","confidence":0.88},{"name":"fatigue","assertion":"present","confidence":0.91},{"name":"chest pain","assertion":"negated","confidence":0.97}]', 'seed-extractor', 'seed-v1', now() - interval '9 days'),
    (2, 2, '[{"name":"sore throat","assertion":"present","confidence":0.92},{"name":"cough","assertion":"present","confidence":0.9},{"name":"headache","assertion":"present","confidence":0.87},{"name":"chills","assertion":"present","confidence":0.86},{"name":"shortness of breath","assertion":"negated","confidence":0.95}]', 'seed-extractor', 'seed-v1', now() - interval '8 days'),
    (3, 3, '[{"name":"fever","assertion":"present","confidence":0.95},{"name":"cough","assertion":"present","confidence":0.93},{"name":"myalgia","assertion":"present","confidence":0.84},{"name":"fatigue","assertion":"present","confidence":0.88}]', 'seed-extractor', 'seed-v1', now() - interval '7 days'),
    (4, 4, '[{"name":"nausea","assertion":"present","confidence":0.91},{"name":"abdominal pain","assertion":"present","confidence":0.9},{"name":"fever","assertion":"negated","confidence":0.94},{"name":"cough","assertion":"negated","confidence":0.93}]', 'seed-extractor', 'seed-v1', now() - interval '6 days'),
    (5, 5, '[{"name":"headache","assertion":"present","confidence":0.89},{"name":"dizziness","assertion":"present","confidence":0.86},{"name":"rash","assertion":"negated","confidence":0.91},{"name":"vomiting","assertion":"negated","confidence":0.9},{"name":"shortness of breath","assertion":"negated","confidence":0.93}]', 'seed-extractor', 'seed-v1', now() - interval '5 days'),
    (6, 6, '[{"name":"fever","assertion":"present","confidence":0.96},{"name":"cough","assertion":"present","confidence":0.94},{"name":"sore throat","assertion":"present","confidence":0.92},{"name":"anosmia","assertion":"present","confidence":0.89}]', 'seed-extractor', 'seed-v1', now() - interval '4 days'),
    (7, 7, '[{"name":"cough","assertion":"present","confidence":0.95},{"name":"chills","assertion":"present","confidence":0.89},{"name":"fatigue","assertion":"present","confidence":0.91},{"name":"shortness of breath","assertion":"present","confidence":0.83}]', 'seed-extractor', 'seed-v1', now() - interval '3 days'),
    (8, 8, '[{"name":"rash","assertion":"present","confidence":0.94},{"name":"itching","assertion":"present","confidence":0.92},{"name":"fever","assertion":"negated","confidence":0.96}]', 'seed-extractor', 'seed-v1', now() - interval '2 days'),
    (9, 9, '[{"name":"headache","assertion":"present","confidence":0.93},{"name":"nausea","assertion":"present","confidence":0.85},{"name":"cough","assertion":"negated","confidence":0.95},{"name":"fever","assertion":"negated","confidence":0.95}]', 'seed-extractor', 'seed-v1', now() - interval '1 day'),
    (10, 10, '[{"name":"fever","assertion":"present","confidence":0.95},{"name":"cough","assertion":"present","confidence":0.94},{"name":"sore throat","assertion":"present","confidence":0.91},{"name":"fatigue","assertion":"present","confidence":0.9}]', 'seed-extractor', 'seed-v1', now() - interval '12 hours')
ON CONFLICT (symptom_record_id) DO NOTHING;

INSERT INTO alert (
    alert_id,
    clinic_id,
    symptom_name,
    window_start,
    window_end,
    observed_count,
    baseline_count,
    score,
    threshold,
    status,
    created_at
) VALUES
    (1, 'CLINIC-SWANSEA-CENTRAL', 'cough', now() - interval '9 days', now(), 6, 2.00, 3.00, 2.50, 'OPEN', now() - interval '10 hours'),
    (2, 'CLINIC-SWANSEA-CENTRAL', 'fever', now() - interval '9 days', now(), 5, 1.50, 3.33, 2.50, 'OPEN', now() - interval '10 hours'),
    (3, 'CLINIC-UPLANDS', 'headache', now() - interval '3 days', now(), 1, 1.00, 1.00, 2.50, 'DISMISSED', now() - interval '18 hours')
ON CONFLICT (alert_id) DO NOTHING;

SELECT setval('app_user_user_id_seq', (SELECT MAX(user_id) FROM app_user));
SELECT setval('patient_patient_id_seq', (SELECT MAX(patient_id) FROM patient));
SELECT setval('doctor_doctor_id_seq', (SELECT MAX(doctor_id) FROM doctor));
SELECT setval('clinic_clinic_id_seq', (SELECT MAX(clinic_id) FROM clinic));
SELECT setval('consultation_consultation_id_seq', (SELECT MAX(consultation_id) FROM consultation));
SELECT setval('symptom_record_symptom_record_id_seq', (SELECT MAX(symptom_record_id) FROM symptom_record));
SELECT setval('alert_alert_id_seq', (SELECT MAX(alert_id) FROM alert));
