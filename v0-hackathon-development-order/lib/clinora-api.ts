/**
 * Clinora Frontend API Hooks & Utilities
 * Provides React hooks for data fetching from MongoDB-backed endpoints
 */

import { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface Patient {
  _id?: string;
  patient_id: string;
  name: string;
  age?: number;
  gender?: string;
  email?: string;
  phone?: string;
  diagnosis?: string[];
  allergies?: string[];
  blood_group?: string;
  status?: 'stable' | 'monitoring' | 'critical';
  lastVisit?: string;
  bmi?: number;
  city?: string;
}

export interface Visit {
  _id?: string;
  patient_id: string;
  date: string;
  doctor?: string;
  department?: string;
  visit_type?: string;
  chiefComplaint?: string;
  clinicalNote?: string;
  doctor_notes?: string;
  symptoms?: string[];
  plan?: string;
}

export interface Medication {
  _id?: string;
  patient_id: string;
  drug: string;
  dose?: string;
  frequency?: string;
  route?: string;
  active?: boolean;
  start_date?: string;
}

export interface Lab {
  _id?: string;
  patient_id: string;
  test: string;
  value: number | string;
  unit?: string;
  date: string;
  status?: string;
  normal_range?: string;
}

export interface Alert {
  _id?: string;
  patient_id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  timestamp?: string;
}

/**
 * Fetch patients from backend
 */
export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/v2/patients`);
        if (!res.ok) throw new Error(`Failed to fetch patients: ${res.status}`);
        const data = await res.json();
        setPatients(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return { patients, loading, error };
}

/**
 * Fetch single patient with full details
 */
export function usePatient(patientId: string | undefined) {
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(!!patientId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setLoading(false);
      return;
    }

    const fetchPatient = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/v2/patient/${patientId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Patient not found');
          throw new Error(`Failed to fetch patient: ${res.status}`);
        }
        const data = await res.json();
        setPatient(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  return { patient, loading, error };
}

/**
 * Fetch dashboard data with aggregations
 */
export function useDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/v2/dashboard/data`);
        if (!res.ok) throw new Error(`Failed to fetch dashboard data: ${res.status}`);
        const dashData = await res.json();
        setData(dashData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return { data, loading, error };
}

/**
 * Fetch lab trends for a patient
 */
export function useLabTrends(patientId: string | undefined, testName: string | undefined) {
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(!!patientId && !!testName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId || !testName) {
      setTrends(null);
      setLoading(false);
      return;
    }

    const fetchTrends = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/v2/patient/${patientId}/labs/${testName}`);
        if (!res.ok) throw new Error(`Failed to fetch lab trends: ${res.status}`);
        const data = await res.json();
        setTrends(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setTrends(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [patientId, testName]);

  return { trends, loading, error };
}

/**
 * Search patients
 */
export function useSearch(query: string) {
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/v2/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setResults(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(query);
  }, [query, search]);

  return { results, loading, error };
}

/**
 * Create patient mutation
 */
export function useCreatePatient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPatient = useCallback(async (patientData: Partial<Patient>) => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/v2/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });
      if (!res.ok) throw new Error(`Failed to create patient: ${res.status}`);
      const data = await res.json();
      setError(null);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createPatient, loading, error };
}

/**
 * Create visit mutation
 */
export function useCreateVisit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVisit = useCallback(async (visitData: Partial<Visit>) => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/v2/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitData),
      });
      if (!res.ok) throw new Error(`Failed to create visit: ${res.status}`);
      const data = await res.json();
      setError(null);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createVisit, loading, error };
}

/**
 * Add medication mutation
 */
export function useAddMedication() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMedication = useCallback(async (medData: Partial<Medication>) => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/v2/medication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medData),
      });
      if (!res.ok) throw new Error(`Failed to add medication: ${res.status}`);
      const data = await res.json();
      setError(null);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { addMedication, loading, error };
}

/**
 * Add lab result mutation
 */
export function useAddLab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLab = useCallback(async (labData: Partial<Lab>) => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/v2/lab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(labData),
      });
      if (!res.ok) throw new Error(`Failed to add lab result: ${res.status}`);
      const data = await res.json();
      setError(null);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { addLab, loading, error };
}

/**
 * Update patient mutation
 */
export function useUpdatePatient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePatient = useCallback(async (patientId: string, updates: Partial<Patient>) => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/v2/patient/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`Failed to update patient: ${res.status}`);
      const data = await res.json();
      setError(null);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updatePatient, loading, error };
}
