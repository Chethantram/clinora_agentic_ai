#!/usr/bin/env node
/**
 * Seed Script: Migrate data from JSON files to MongoDB Atlas
 * Usage: node scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const fs = require('fs');
const { connectDB, getConnection } = require('../db');
const {
  Patient,
  Visit,
  Medication,
  Lab,
  Alert,
  User,
} = require('../models');

const DATA_DIR = path.join(__dirname, '../data');
const DATASET_DIR = process.env.DATASET_DIR ? path.resolve(process.env.DATASET_DIR) : null;

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ File not found: ${filePath}`);
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`✗ Error reading ${filePath}:`, e.message);
    return [];
  }
}

async function seedPatients() {
  console.log('\n📋 Seeding Patients...');
  
  let patients = [];
  
  // Try dataset first
  if (DATASET_DIR && fs.existsSync(path.join(DATASET_DIR, 'patients.json'))) {
    patients = readJson(path.join(DATASET_DIR, 'patients.json'));
    console.log(`  Loaded ${patients.length} patients from dataset`);
  } else {
    // Fallback to individual patient files
    const files = fs.readdirSync(DATA_DIR).filter((f) => /^patient_.*\.json$/.test(f));
    patients = files.map((file) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
      } catch (e) {
        console.error(`  ✗ Error reading ${file}`);
        return null;
      }
    }).filter(Boolean);
    console.log(`  Loaded ${patients.length} patients from individual files`);
  }

  let inserted = 0;
  for (const p of patients) {
    try {
      const patientId = p.patient_id || p.id;
      if (!patientId) continue;

      await Patient.findOneAndUpdate(
        { patient_id: patientId },
        {
          patient_id: patientId,
          name: p.name,
          email: p.email,
          phone: p.phone,
          age: p.age,
          gender: p.gender || '',
          blood_group: p.blood_group,
          diagnosis: p.diagnosis || [],
          allergies: p.allergies || [],
          bmi: p.bmi,
          city: p.city,
          smoking: p.smoking,
          alcohol: p.alcohol,
          status: p.status || 'stable',
        },
        { upsert: true, new: true }
      );
      inserted++;
    } catch (e) {
      console.error(`  ✗ Error seeding patient ${p.patient_id || p.id}:`, e.message);
    }
  }
  console.log(`  ✓ Seeded ${inserted} patients`);
  return inserted;
}

async function seedVisits() {
  console.log('\n📅 Seeding Visits...');
  
  let visits = [];
  
  if (DATASET_DIR && fs.existsSync(path.join(DATASET_DIR, 'visits.json'))) {
    visits = readJson(path.join(DATASET_DIR, 'visits.json'));
  }

  // Also extract from patient files
  const files = fs.readdirSync(DATA_DIR).filter((f) => /^patient_.*\.json$/.test(f));
  for (const file of files) {
    const p = readJson(path.join(DATA_DIR, file));
    if (p.visits && Array.isArray(p.visits)) {
      p.visits.forEach((v) => {
        visits.push({
          ...v,
          patient_id: p.id || p.patient_id,
        });
      });
    }
  }

  let inserted = 0;
  for (const v of visits) {
    try {
      await Visit.findOneAndUpdate(
        { patient_id: v.patient_id, date: v.date, doctor: v.doctor },
        {
          patient_id: v.patient_id,
          date: new Date(v.date),
          doctor: v.doctor,
          department: v.department,
          visit_type: v.visit_type || v.visitType,
          chiefComplaint: v.chiefComplaint,
          symptoms: Array.isArray(v.symptoms) ? v.symptoms : [],
          clinicalNote: v.clinicalNote || v.doctor_notes,
          doctor_notes: v.doctor_notes,
          plan: v.plan,
          bp_systolic: v.bp_systolic || v.bp?.systolic,
          bp_diastolic: v.bp_diastolic || v.bp?.diastolic,
          pulse_bpm: v.pulse_bpm || v.pulse,
          temperature_c: v.temperature_c || v.temperature,
          spo2_pct: v.spo2_pct || v.spo2,
          weight_kg: v.weight_kg || v.weight,
        },
        { upsert: true, new: true }
      );
      inserted++;
    } catch (e) {
      console.error(`  ✗ Error seeding visit:`, e.message);
    }
  }
  console.log(`  ✓ Seeded ${inserted} visits`);
  return inserted;
}

async function seedMedications() {
  console.log('\n💊 Seeding Medications...');
  
  let medications = [];
  
  if (DATASET_DIR && fs.existsSync(path.join(DATASET_DIR, 'medications.json'))) {
    medications = readJson(path.join(DATASET_DIR, 'medications.json'));
  }

  // Also extract from patient files
  const files = fs.readdirSync(DATA_DIR).filter((f) => /^patient_.*\.json$/.test(f));
  for (const file of files) {
    const p = readJson(path.join(DATA_DIR, file));
    if (p.medications && Array.isArray(p.medications)) {
      p.medications.forEach((m) => {
        medications.push({
          ...m,
          patient_id: p.id || p.patient_id,
        });
      });
    }
  }

  let inserted = 0;
  for (const m of medications) {
    try {
      await Medication.findOneAndUpdate(
        { patient_id: m.patient_id, drug: m.drug || m.name },
        {
          patient_id: m.patient_id,
          drug: m.drug || m.name,
          dose: m.dose || m.dosage,
          frequency: m.frequency,
          route: m.route,
          start_date: m.start_date || m.since,
          active: m.active !== false,
        },
        { upsert: true, new: true }
      );
      inserted++;
    } catch (e) {
      console.error(`  ✗ Error seeding medication:`, e.message);
    }
  }
  console.log(`  ✓ Seeded ${inserted} medications`);
  return inserted;
}

async function seedLabs() {
  console.log('\n🧪 Seeding Lab Results...');
  
  let labs = [];
  
  if (DATASET_DIR && fs.existsSync(path.join(DATASET_DIR, 'labs.json'))) {
    labs = readJson(path.join(DATASET_DIR, 'labs.json'));
  }

  // Also extract from patient files
  const files = fs.readdirSync(DATA_DIR).filter((f) => /^patient_.*\.json$/.test(f));
  for (const file of files) {
    const p = readJson(path.join(DATA_DIR, file));
    if (p.labResults && typeof p.labResults === 'object') {
      Object.entries(p.labResults).forEach(([test, results]) => {
        (results || []).forEach((r) => {
          labs.push({
            ...r,
            test,
            patient_id: p.id || p.patient_id,
          });
        });
      });
    }
  }

  let inserted = 0;
  for (const l of labs) {
    try {
      await Lab.findOneAndUpdate(
        { patient_id: l.patient_id, test: l.test, date: l.date },
        {
          patient_id: l.patient_id,
          test: l.test,
          value: l.value,
          unit: l.unit || '',
          date: new Date(l.date),
          status: l.status || 'Normal',
          normal_range: l.normal_range || l.referenceRange,
        },
        { upsert: true, new: true }
      );
      inserted++;
    } catch (e) {
      console.error(`  ✗ Error seeding lab:`, e.message);
    }
  }
  console.log(`  ✓ Seeded ${inserted} lab results`);
  return inserted;
}

async function seedUsers() {
  console.log('\n👤 Seeding Users...');
  
  const usersData = readJson(path.join(DATA_DIR, 'users.json'));
  let inserted = 0;

  if (usersData.doctors && Array.isArray(usersData.doctors)) {
    for (const doctor of usersData.doctors) {
      try {
        await User.findOneAndUpdate(
          { email: doctor.email },
          {
            id: doctor.id,
            name: doctor.name,
            email: doctor.email,
            password: doctor.password,
            role: 'doctor',
          },
          { upsert: true, new: true }
        );
        inserted++;
      } catch (e) {
        console.error(`  ✗ Error seeding doctor:`, e.message);
      }
    }
  }

  if (usersData.patients && Array.isArray(usersData.patients)) {
    for (const patient of usersData.patients) {
      try {
        await User.findOneAndUpdate(
          { email: patient.email },
          {
            id: patient.id,
            name: patient.name,
            email: patient.email,
            password: patient.password,
            role: 'patient',
          },
          { upsert: true, new: true }
        );
        inserted++;
      } catch (e) {
        console.error(`  ✗ Error seeding patient user:`, e.message);
      }
    }
  }

  console.log(`  ✓ Seeded ${inserted} users`);
  return inserted;
}

async function main() {
  console.log('\n🚀 Starting Data Seed to MongoDB Atlas...\n');

  try {
    await connectDB();
    
    // Clear existing data (optional - comment out to preserve)
    // await Promise.all([
    //   Patient.deleteMany({}),
    //   Visit.deleteMany({}),
    //   Medication.deleteMany({}),
    //   Lab.deleteMany({}),
    //   Alert.deleteMany({}),
    // ]);
    // console.log('✓ Cleared existing collections');

    const stats = {
      patients: await seedPatients(),
      visits: await seedVisits(),
      medications: await seedMedications(),
      labs: await seedLabs(),
      users: await seedUsers(),
    };

    console.log('\n📊 Seed Summary:');
    console.log(`  Patients: ${stats.patients}`);
    console.log(`  Visits: ${stats.visits}`);
    console.log(`  Medications: ${stats.medications}`);
    console.log(`  Lab Results: ${stats.labs}`);
    console.log(`  Users: ${stats.users}`);
    console.log('\n✅ Seed completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seed failed:', error.message);
    process.exit(1);
  }
}

main();
