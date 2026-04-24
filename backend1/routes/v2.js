/**
 * MongoDB-backed routes for enhanced data access
 */

const express = require('express');
const router = express.Router();
const { Patient, Visit, Medication, Lab, Alert } = require('../models');
const {
  getAllPatients,
  getPatientById,
  getDashboardData,
  getLabTrends,
  getClinicalFlags,
} = require('../db/queries');

/**
 * GET /api/v2/patients
 * Get all patients
 */
router.get('/patients', async (req, res) => {
  try {
    const status = req.query.status;
    const patients = await getAllPatients(status ? { status } : {});
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/dashboard/data
 * Get aggregated dashboard data
 */
router.get('/dashboard/data', async (req, res) => {
  try {
    const data = await getDashboardData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/patient/:id
 * Get full patient record
 */
router.get('/patient/:id', async (req, res) => {
  try {
    const patient = await getPatientById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/patient/:id/labs/:testName
 * Get lab trends
 */
router.get('/patient/:id/labs/:testName', async (req, res) => {
  try {
    const result = await getLabTrends(req.params.id, req.params.testName, {
      from: req.query.from,
      to: req.query.to,
    });
    if (!result) {
      return res.status(404).json({ error: 'Lab data not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/patient/:id/flags
 * Get clinical flags
 */
router.get('/patient/:id/flags', async (req, res) => {
  try {
    const flags = await getClinicalFlags(req.params.id, req.query.type);
    res.json(flags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/patient
 * Create new patient
 */
router.post('/patient', async (req, res) => {
  try {
    const { patient_id, name, email, phone, age, gender, diagnosis, allergies } = req.body;

    if (!patient_id || !name) {
      return res.status(400).json({ error: 'patient_id and name are required' });
    }

    const patient = new Patient({
      patient_id: patient_id.toUpperCase(),
      name,
      email,
      phone,
      age,
      gender,
      diagnosis: diagnosis || [],
      allergies: allergies || [],
      status: 'stable',
    });

    await patient.save();
    res.status(201).json(patient);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Patient ID already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v2/patient/:id
 * Update patient
 */
router.put('/patient/:id', async (req, res) => {
  try {
    const normalizedId = String(req.params.id).trim().toUpperCase();
    const patient = await Patient.findOneAndUpdate(
      {
        $or: [
          { patient_id: normalizedId },
          { patient_id: new RegExp(`^${normalizedId}$`, 'i') },
        ],
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/visit
 * Create visit record
 */
router.post('/visit', async (req, res) => {
  try {
    const { patient_id, date, doctor, department, chiefComplaint, clinicalNote, plan } = req.body;

    if (!patient_id || !date) {
      return res.status(400).json({ error: 'patient_id and date are required' });
    }

    const visit = new Visit({
      patient_id: patient_id.toUpperCase(),
      date: new Date(date),
      doctor,
      department,
      chiefComplaint,
      clinicalNote,
      plan,
      ...req.body,
    });

    await visit.save();
    
    // Update patient's lastVisit
    await Patient.updateOne(
      { patient_id: patient_id.toUpperCase() },
      { lastVisit: new Date(date) }
    );

    res.status(201).json(visit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/medication
 * Add medication
 */
router.post('/medication', async (req, res) => {
  try {
    const { patient_id, drug, dose, frequency, route, start_date } = req.body;

    if (!patient_id || !drug) {
      return res.status(400).json({ error: 'patient_id and drug are required' });
    }

    const medication = new Medication({
      patient_id: patient_id.toUpperCase(),
      drug,
      dose,
      frequency,
      route,
      start_date: start_date ? new Date(start_date) : new Date(),
      active: true,
    });

    await medication.save();
    res.status(201).json(medication);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/lab
 * Add lab result
 */
router.post('/lab', async (req, res) => {
  try {
    const { patient_id, test, value, unit, date, status, normal_range } = req.body;

    if (!patient_id || !test || !date) {
      return res.status(400).json({ error: 'patient_id, test, and date are required' });
    }

    const lab = new Lab({
      patient_id: patient_id.toUpperCase(),
      test,
      value,
      unit,
      date: new Date(date),
      status: status || 'Normal',
      normal_range,
    });

    await lab.save();
    res.status(201).json(lab);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/alert
 * Create alert
 */
router.post('/alert', async (req, res) => {
  try {
    const { patient_id, message, type, severity } = req.body;

    if (!patient_id || !message) {
      return res.status(400).json({ error: 'patient_id and message are required' });
    }

    const alert = new Alert({
      patient_id: patient_id.toUpperCase(),
      message,
      type: type || 'alert',
      severity: severity || 'medium',
      timestamp: new Date(),
    });

    await alert.save();
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/search
 * Search patients and records
 */
router.get('/search', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const patients = await Patient.find({
      $or: [
        { name: new RegExp(query, 'i') },
        { email: new RegExp(query, 'i') },
        { patient_id: new RegExp(`^${query}`, 'i') },
      ],
    })
      .limit(20)
      .lean();

    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
