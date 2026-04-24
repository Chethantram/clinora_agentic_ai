/**
 * MongoDB Data Access Layer
 * Provides functions to fetch and transform data from MongoDB
 */

const { Patient, Visit, Medication, Lab, Alert } = require('../models');

/**
 * Get all patients with lite information
 */
async function getAllPatients(filters = {}) {
  try {
    const query = {};
    if (filters.status) query.status = filters.status;
    
    const patients = await Patient.find(query)
      .select('-password -notes')
      .sort({ name: 1 })
      .lean();
    
    return patients.map(p => ({
      _id: p._id,
      patient_id: p.patient_id,
      name: p.name,
      age: p.age,
      gender: p.gender || 'Unknown',
      email: p.email,
      phone: p.phone,
      blood_group: p.blood_group,
      bmi: p.bmi,
      city: p.city,
      diagnosis: p.diagnosis || [],
      allergies: p.allergies || [],
      status: p.status || 'stable',
      lastVisit: p.lastVisit,
    }));
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}

/**
 * Get patient by ID with full details
 */
async function getPatientById(patientId) {
  try {
    const normalizedId = String(patientId).trim().toUpperCase();
    
    const patient = await Patient.findOne({
      $or: [
        { patient_id: normalizedId },
        { patient_id: new RegExp(`^${normalizedId}$`, 'i') },
      ],
    }).lean();

    if (!patient) return null;

    const [visits, medications, labs, alerts] = await Promise.all([
      Visit.find({ patient_id: patient.patient_id })
        .sort({ date: -1 })
        .lean(),
      Medication.find({ patient_id: patient.patient_id, active: true })
        .sort({ start_date: -1 })
        .lean(),
      Lab.find({ patient_id: patient.patient_id })
        .sort({ date: -1 })
        .lean(),
      Alert.find({ patient_id: patient.patient_id, resolved: false })
        .sort({ timestamp: -1 })
        .lean(),
    ]);

    // Group labs by test name
    const labResults = {};
    labs.forEach(lab => {
      const testName = lab.test || 'Unknown';
      if (!labResults[testName]) labResults[testName] = [];
      labResults[testName].push({
        date: lab.date,
        value: lab.value,
        unit: lab.unit || '',
        status: lab.status || 'Normal',
        referenceRange: lab.normal_range || lab.referenceRange || '',
      });
    });

    // Build clinical flags from alerts and abnormal labs
    const clinicalFlags = [
      ...alerts.map(a => ({
        type: a.severity?.toUpperCase() || 'MEDIUM',
        flag: a.message,
        date: a.timestamp,
      })),
      ...labs
        .filter(l => {
          const status = String(l.status || '').toLowerCase();
          return status.includes('critical') || status.includes('high') || status.includes('abnormal');
        })
        .slice(0, 5)
        .map(l => ({
          type: 'HIGH',
          flag: `${l.test}: ${l.status} (${l.value}${l.unit || ''})`,
          date: l.date,
        })),
    ];

    return {
      id: patient.patient_id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender || 'Unknown',
      blood_group: patient.blood_group,
      diagnoses: patient.diagnosis || [],
      primaryDiagnosis: (patient.diagnosis || []).slice(0, 2),
      secondaryDiagnosis: (patient.diagnosis || []).slice(2),
      medications: medications.map(m => ({
        name: m.drug || m.name,
        dose: m.dose,
        frequency: m.frequency,
        route: m.route,
        since: m.start_date || m.since,
        active: m.active !== false,
      })),
      labResults,
      clinicalFlags,
      visits: visits.map(v => ({
        date: v.date,
        doctor: v.doctor || 'On File',
        department: v.department || 'General Medicine',
        chiefComplaint: v.chiefComplaint || Array.isArray(v.symptoms) ? v.symptoms.join(', ') : '',
        clinicalNote: v.clinicalNote || v.doctor_notes || '',
        plan: v.plan || '',
        symptoms: Array.isArray(v.symptoms) ? v.symptoms : [],
      })),
      allergies: patient.allergies || [],
      overdueTests: [],
      lastVisit: patient.lastVisit,
      status: patient.status || 'stable',
    };
  } catch (error) {
    console.error('Error fetching patient:', error);
    return null;
  }
}

/**
 * Get dashboard data with aggregations
 */
async function getDashboardData() {
  try {
    const [patients, visits, medications, labs, alerts] = await Promise.all([
      Patient.find().lean(),
      Visit.find().lean(),
      Medication.find({ active: true }).lean(),
      Lab.find().lean(),
      Alert.find({ resolved: false }).lean(),
    ]);

    // Normalize data
    const normalizedPatients = patients.map(p => ({
      _id: p._id,
      patient_id: p.patient_id,
      name: p.name,
      age: p.age,
      gender: p.gender || 'Unknown',
      email: p.email,
      phone: p.phone,
      blood_group: p.blood_group,
      bmi: p.bmi,
      city: p.city,
      diagnosis: p.diagnosis || [],
      allergies: p.allergies || [],
      status: p.status || 'stable',
      lastVisit: p.lastVisit,
    }));

    const normalizedVisits = visits.map(v => ({
      patient_id: v.patient_id,
      date: v.date,
      doctor: v.doctor || '',
      department: v.department || '',
      visit_type: v.visit_type || '',
      doctor_notes: v.doctor_notes || v.clinicalNote || '',
      symptoms: Array.isArray(v.symptoms) ? v.symptoms : [],
      bp_systolic: v.bp_systolic,
      bp_diastolic: v.bp_diastolic,
      pulse_bpm: v.pulse_bpm,
      temperature_c: v.temperature_c,
      spo2_pct: v.spo2_pct,
      weight_kg: v.weight_kg,
    }));

    const normalizedMedications = medications.map(m => ({
      patient_id: m.patient_id,
      drug: m.drug || m.name,
      dose: m.dose,
      frequency: m.frequency,
      route: m.route,
      start_date: m.start_date || m.since,
      end_date: m.end_date,
      active: m.active,
    }));

    const normalizedLabs = labs.map(l => ({
      patient_id: l.patient_id,
      test: l.test,
      value: l.value,
      unit: l.unit || '',
      date: l.date,
      status: l.status || 'Normal',
      normalRange: { min: 0, max: 0 }, // Could be enhanced
    }));

    const normalizedAlerts = alerts.map(a => ({
      id: String(a._id),
      patient_id: a.patient_id,
      type: a.type || 'alert',
      severity: a.severity || 'medium',
      message: a.message,
      timestamp: a.timestamp || new Date(),
    }));

    // Derive alerts from abnormal labs if not enough alerts
    if (normalizedAlerts.length < labs.filter(l => {
      const s = String(l.status || '').toLowerCase();
      return s.includes('high') || s.includes('critical') || s.includes('abnormal');
    }).length) {
      labs
        .filter(l => {
          const s = String(l.status || '').toLowerCase();
          return s.includes('high') || s.includes('critical') || s.includes('abnormal');
        })
        .slice(0, 5)
        .forEach(l => {
          normalizedAlerts.push({
            id: `${l.patient_id}-${l.test}-${l.date}`,
            patient_id: l.patient_id,
            type: 'lab',
            severity: (s => {
              const ss = String(s || '').toLowerCase();
              return ss.includes('critical') ? 'high' : 'medium';
            })(l.status),
            message: `${l.test}: ${l.status} (${l.value}${l.unit || ''})`,
            timestamp: l.date,
          });
        });
    }

    return {
      patients: normalizedPatients,
      visits: normalizedVisits,
      medications: normalizedMedications,
      labResults: normalizedLabs,
      labs: normalizedLabs,
      alerts: normalizedAlerts,
      drugInteractions: [],
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

/**
 * Get lab trends for a patient
 */
async function getLabTrends(patientId, testName, dateRange = {}) {
  try {
    const normalizedId = String(patientId).trim().toUpperCase();
    
    const patient = await Patient.findOne({
      $or: [
        { patient_id: normalizedId },
        { patient_id: new RegExp(`^${normalizedId}$`, 'i') },
      ],
    }).lean();

    if (!patient) return null;

    const query = {
      patient_id: patient.patient_id,
      test: new RegExp(`^${testName}$`, 'i'),
    };

    if (dateRange.from || dateRange.to) {
      query.date = {};
      if (dateRange.from) query.date.$gte = new Date(dateRange.from);
      if (dateRange.to) query.date.$lte = new Date(dateRange.to);
    }

    const labs = await Lab.find(query)
      .sort({ date: 1 })
      .lean();

    if (!labs.length) return null;

    const values = labs.map(l => Number(l.value)).filter(v => !isNaN(v));
    const trend = values.length > 1
      ? values[values.length - 1] > values[0]
        ? 'WORSENING'
        : values[values.length - 1] < values[0]
        ? 'IMPROVING'
        : 'STABLE'
      : 'INSUFFICIENT_DATA';

    return {
      test_name: labs[0].test,
      data: labs.map(l => ({
        date: l.date,
        value: l.value,
        unit: l.unit || '',
        status: l.status || 'Normal',
        referenceRange: l.normal_range || '',
      })),
      trend,
      count: labs.length,
    };
  } catch (error) {
    console.error('Error fetching lab trends:', error);
    return null;
  }
}

/**
 * Get clinical flags for a patient
 */
async function getClinicalFlags(patientId, typeFilter = '') {
  try {
    const normalizedId = String(patientId).trim().toUpperCase();
    
    const patient = await Patient.findOne({
      $or: [
        { patient_id: normalizedId },
        { patient_id: new RegExp(`^${normalizedId}$`, 'i') },
      ],
    }).lean();

    if (!patient) return [];

    const alerts = await Alert.find({
      patient_id: patient.patient_id,
      resolved: false,
    }).lean();

    const labs = await Lab.find({
      patient_id: patient.patient_id,
    }).lean();

    const flags = [
      ...alerts.map(a => ({
        type: a.severity?.toUpperCase() || 'MEDIUM',
        flag: a.message,
        date: a.timestamp,
      })),
      ...labs
        .filter(l => {
          const status = String(l.status || '').toLowerCase();
          return status.includes('critical') || status.includes('high') || status.includes('abnormal');
        })
        .map(l => ({
          type: (status => {
            const ss = String(status || '').toLowerCase();
            return ss.includes('critical') ? 'CRITICAL' : 'HIGH';
          })(l.status),
          flag: `${l.test}: ${l.status} (${l.value}${l.unit || ''})`,
          date: l.date,
        })),
    ];

    if (typeFilter) {
      return flags.filter(f => f.type.includes(typeFilter.toUpperCase()));
    }

    return flags;
  } catch (error) {
    console.error('Error fetching clinical flags:', error);
    return [];
  }
}

module.exports = {
  getAllPatients,
  getPatientById,
  getDashboardData,
  getLabTrends,
  getClinicalFlags,
};
