const addReadingBtn = document.getElementById('addReadingBtn');
const togglePlanBtn = document.getElementById('togglePlanBtn');
const planList = document.querySelector('.plan-list');
const liveSyncBtn = document.getElementById('liveSyncBtn');
const liveSyncStatus = document.getElementById('liveSyncStatus');
const readingHistoryList = document.getElementById('readingHistoryList');
const sendSummaryBtn = document.getElementById('sendSummaryBtn');
const summaryDialog = document.getElementById('summaryDialog');
const summaryText = document.getElementById('summaryText');
const summaryStatus = document.getElementById('summaryStatus');
const demoAuthorization = document.getElementById('demoAuthorization');
const scannerType = document.getElementById('scannerType');
const hospitalTarget = document.getElementById('hospitalTarget');
const connectScannerBtn = document.getElementById('connectScannerBtn');
const disconnectScannerBtn = document.getElementById('disconnectScannerBtn');
const runScanBtn = document.getElementById('runScanBtn');
const sendToHospitalBtn = document.getElementById('sendToHospitalBtn');
const scannerConnectionStatus = document.getElementById('scannerConnectionStatus');
const scannerDemoStatus = document.getElementById('scannerDemoStatus');
const scannerResult = document.getElementById('scannerResult');
const scannerEventLog = document.getElementById('scannerEventLog');
const mockEhrStatus = document.getElementById('mockEhrStatus');
const mockEhrCount = document.getElementById('mockEhrCount');
const mockEhrRecordsElement = document.getElementById('mockEhrRecords');
const providerTargetStatus = document.getElementById('providerTargetStatus');
const providerAuthorizationStatus = document.getElementById('providerAuthorizationStatus');
const providerHandoffStatus = document.getElementById('providerHandoffStatus');
const bigfixConsent = document.getElementById('bigfixConsent');
const sendToBigfixBtn = document.getElementById('sendToBigfixBtn');
const bigfixStatus = document.getElementById('bigfixStatus');
const bigfixSubmissionBadge = document.getElementById('bigfixSubmissionBadge');
const exportTrendsBtn = document.getElementById('exportTrendsBtn');
const trendExportStatus = document.getElementById('trendExportStatus');
const hydrationAlertValue = document.getElementById('hydrationAlertValue');
let syncInterval = null;
let handoffTimeout = null;
let isDemoSyncActive = false;
let isScannerConnected = false;
let isHandoffInProgress = false;
let isBigfixSubmissionInProgress = false;
let latestScannerResult = null;
let lastVerifiedBigfixValues = null;
let mockEhrRecords = [];
let isMockEhrAvailable = true;
const readingHistory = [];
const mockEhrStorageKey = 'biofluid-demo-mock-ehr-v1';

const metricMap = {
  heartRate: 72,
  bloodPressure: 118,
  oxygen: 98,
  hydration: 2.1,
};

const metricElements = {
  heartRate: document.getElementById('heartRateValue'),
  bloodPressure: document.getElementById('bloodPressureValue'),
  oxygen: document.getElementById('oxygenValue'),
  hydration: document.getElementById('hydrationValue'),
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getBigfixValuesSnapshot() {
  return JSON.stringify({
    heartRate: metricMap.heartRate,
    bloodPressure: metricMap.bloodPressure,
    oxygen: metricMap.oxygen,
    hydration: Number(metricMap.hydration),
  });
}

function updateBigfixValuesStatus() {
  if (lastVerifiedBigfixValues && getBigfixValuesSnapshot() !== lastVerifiedBigfixValues) {
    bigfixSubmissionBadge.textContent = 'New values · not sent';
    bigfixStatus.textContent = 'Dashboard readings changed since the last verified submission. Approve and send again to update BIGFIX.';
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function renderReadingHistory() {
  readingHistoryList.replaceChildren();

  readingHistory.forEach((reading) => {
    const item = document.createElement('li');
    const time = document.createElement('time');
    const values = document.createElement('span');

    time.dateTime = reading.timestamp.toISOString();
    time.textContent = formatTime(reading.timestamp);
    values.textContent = `${reading.heartRate} bpm · ${reading.bloodPressure}/76 mmHg · ${reading.oxygen}% SpO₂ · ${reading.hydration}L hydration`;
    item.append(time, values);
    readingHistoryList.append(item);
  });
}

function updateMockReadings() {
  metricMap.heartRate = Math.round(randomBetween(68, 81));
  metricMap.bloodPressure = Math.round(randomBetween(112, 124));
  metricMap.oxygen = Math.round(randomBetween(96, 100));
  metricMap.hydration = Number(randomBetween(1.8, 2.7)).toFixed(1);

  metricElements.heartRate.innerHTML = `${metricMap.heartRate} <small>bpm</small>`;
  metricElements.bloodPressure.innerHTML = `${metricMap.bloodPressure}/76 <small>mmHg</small>`;
  metricElements.oxygen.innerHTML = `${metricMap.oxygen}% <small>SpO₂</small>`;
  metricElements.hydration.innerHTML = `${metricMap.hydration}L <small>today</small>`;
  hydrationAlertValue.textContent = `${metricMap.hydration}L today`;

  const reading = {
    ...metricMap,
    timestamp: new Date(),
  };
  readingHistory.unshift(reading);
  readingHistory.splice(8);
  renderReadingHistory();
  updateBigfixValuesStatus();

  if (isDemoSyncActive) {
    liveSyncStatus.textContent = `Demo sync active · last mock update ${formatTime(reading.timestamp)}. No external connection.`;
  }
}

function createSummary() {
  const latest = readingHistory[0];
  const recentReadings = readingHistory.slice(0, 5);
  const lines = [
    'BIOFLUID HEALTH MONITOR — DEMO SUMMARY',
    'Simulated data only. Not a diagnosis or a real patient record.',
    `Generated: ${formatTime(new Date())}`,
    '',
    'Latest demo readings:',
    `Heart rate: ${latest.heartRate} bpm`,
    `Blood pressure: ${latest.bloodPressure}/76 mmHg`,
    `Oxygen: ${latest.oxygen}% SpO₂`,
    `Hydration: ${latest.hydration}L`,
    `Recorded: ${formatTime(latest.timestamp)}`,
    '',
    `Recent demo readings (${recentReadings.length}):`,
    ...recentReadings.map((reading) =>
      `${formatTime(reading.timestamp)} — ${reading.heartRate} bpm, ${reading.bloodPressure}/76 mmHg, ${reading.oxygen}% SpO₂, ${reading.hydration}L hydration`
    ),
  ];

  if (latestScannerResult) {
    lines.push(
      '',
      'Latest synthetic scanner result:',
      `Sample: ${latestScannerResult.sampleId}`,
      `Demo device: ${latestScannerResult.device}`,
      `Demo assay: ${latestScannerResult.assay}`,
      `Result: ${latestScannerResult.value}`,
      `Quality check: ${latestScannerResult.quality}`,
      `Handoff: ${latestScannerResult.handoffState}`
    );
  }

  lines.push('', 'All values are synthetic placeholders. Scanner data and the local mock EHR are browser-only. BIGFIX is an optional external test submission, sent only after approval.');
  return lines.join('\n');
}

function addScannerEvent(message) {
  const entry = document.createElement('li');
  entry.textContent = `${formatTime(new Date())} — ${message}`;
  scannerEventLog.prepend(entry);

  while (scannerEventLog.children.length > 8) {
    scannerEventLog.lastElementChild.remove();
  }
}

function updateProviderDemoStatus() {
  const target = hospitalTarget.value;
  providerTargetStatus.textContent = `${target} · demo only`;
  providerAuthorizationStatus.textContent = isScannerConnected ? 'Authorized simulator link' : 'Not active';
  scannerConnectionStatus.textContent = isScannerConnected ? 'Simulator connected · demo only' : 'Simulator disconnected';
  connectScannerBtn.disabled = !demoAuthorization.checked || isScannerConnected;
  disconnectScannerBtn.disabled = !isScannerConnected;
  runScanBtn.disabled = !isScannerConnected || isHandoffInProgress;
  sendToHospitalBtn.disabled = !isScannerConnected
    || !latestScannerResult
    || latestScannerResult.receiverStatus === 'accepted'
    || !isMockEhrAvailable
    || isHandoffInProgress;
  scannerType.disabled = isScannerConnected;
  hospitalTarget.disabled = isScannerConnected || isHandoffInProgress;
}

function isValidMockEhrBundle(bundle) {
  if (!bundle
    || bundle.resourceType !== 'Bundle'
    || bundle.type !== 'collection'
    || !Array.isArray(bundle.entry)
    || !Number.isFinite(Date.parse(bundle.timestamp))) {
    return false;
  }

  const resources = bundle.entry.map((entry) => entry && entry.resource);
  const hasDemoPatient = resources.some((resource) =>
    resource
    && resource.resourceType === 'Patient'
    && resource.id === 'synthetic-demo-patient'
  );
  const hasValidObservation = resources.some((resource) =>
    resource
    && resource.resourceType === 'Observation'
    && typeof resource.id === 'string'
    && resource.id.startsWith('DEMO-')
    && resource.subject
    && resource.subject.reference === 'Patient/synthetic-demo-patient'
    && resource.code
    && typeof resource.code.text === 'string'
    && resource.valueQuantity
    && Number.isFinite(resource.valueQuantity.value)
    && typeof resource.valueQuantity.unit === 'string'
  );

  return hasDemoPatient && hasValidObservation;
}

function renderMockEhrRecords() {
  mockEhrRecordsElement.replaceChildren();
  mockEhrStatus.textContent = mockEhrRecords.length === 0
    ? 'Ready · local only'
    : `${mockEhrRecords.length} received · local only`;
  mockEhrCount.textContent = mockEhrRecords.length === 0
    ? 'No readings received.'
    : `${mockEhrRecords.length} synthetic reading${mockEhrRecords.length === 1 ? '' : 's'} received by the local mock EHR.`;

  if (mockEhrRecords.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.textContent = 'No records in this demo session.';
    mockEhrRecordsElement.append(emptyState);
    return;
  }

  mockEhrRecords.forEach((bundle) => {
    const observation = bundle.entry.find((entry) => entry.resource.resourceType === 'Observation').resource;
    const item = document.createElement('li');
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const payload = document.createElement('pre');

    summary.textContent = `${observation.id} · ${observation.code.text} · ${observation.valueQuantity.value} ${observation.valueQuantity.unit} · ${formatTime(new Date(bundle.timestamp))}`;
    payload.textContent = JSON.stringify(bundle, null, 2);
    details.append(summary, payload);
    item.append(details);
    mockEhrRecordsElement.append(item);
  });
}

function loadMockEhrRecords() {
  try {
    const savedRecords = sessionStorage.getItem(mockEhrStorageKey);
    if (savedRecords === null) {
      renderMockEhrRecords();
      return;
    }

    const parsedRecords = JSON.parse(savedRecords);
    if (!Array.isArray(parsedRecords) || !parsedRecords.every(isValidMockEhrBundle)) {
      throw new Error('Stored demo records are invalid.');
    }

    mockEhrRecords = parsedRecords;
    renderMockEhrRecords();
  } catch (error) {
    isMockEhrAvailable = false;
    mockEhrStatus.textContent = 'Unavailable · browser storage error';
    mockEhrCount.textContent = 'The local mock EHR could not load its demo session. Reload the page or use a browser that allows session storage.';
    scannerDemoStatus.textContent = 'Local mock EHR unavailable. No data has been sent.';
    addScannerEvent('Local mock EHR could not access session storage.');
  }
}

function createMockFhirBundle() {
  const recordedAt = new Date().toISOString();
  const demoPatient = {
    resourceType: 'Patient',
    id: 'synthetic-demo-patient',
    active: true,
    name: [{ text: 'Synthetic Demo Patient' }],
  };
  const demoDevice = {
    resourceType: 'Device',
    id: 'biofluid-scanner-simulator',
    status: 'active',
    deviceName: [{ name: latestScannerResult.device, type: 'user-friendly-name' }],
  };
  const observation = {
    resourceType: 'Observation',
    id: latestScannerResult.sampleId,
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'laboratory',
        display: 'Laboratory',
      }],
    }],
    code: { text: latestScannerResult.assay },
    subject: { reference: 'Patient/synthetic-demo-patient' },
    effectiveDateTime: recordedAt,
    valueQuantity: {
      value: Number.parseFloat(latestScannerResult.value),
      unit: 'demo units',
      system: 'urn:demo:units',
      code: 'demo-unit',
    },
    device: { reference: 'Device/biofluid-scanner-simulator' },
    note: [{ text: 'Synthetic demo result. Not clinical data.' }],
  };

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: recordedAt,
    entry: [
      { resource: demoPatient },
      { resource: demoDevice },
      { resource: observation },
    ],
  };
}

function createBigfixBundle() {
  const patientId = 'BFX-4E7A21C9';
  const effectiveDateTime = new Date().toISOString();
  const demoNote = [{
    text: 'SYNTHETIC BIOFLUID DEMO DATA ONLY. Placeholder values; not measured from a real person or specimen. Not for clinical use.',
  }];
  const vitalSignCategory = [{
    coding: [{
      system: 'http://terminology.hl7.org/CodeSystem/observation-category',
      code: 'vital-signs',
      display: 'Vital Signs',
    }],
  }];
  const loinc = (code, display) => ({
    coding: [{ system: 'http://loinc.org', code, display }],
  });
  const idSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const observations = [
    {
      resourceType: 'Observation',
      id: `bf-demo-hr-${idSuffix}`,
      status: 'final',
      category: vitalSignCategory,
      code: loinc('8867-4', 'Heart rate'),
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime,
      valueQuantity: {
        value: metricMap.heartRate,
        unit: 'beats/minute',
        system: 'http://unitsofmeasure.org',
        code: '/min',
      },
      note: demoNote,
    },
    {
      resourceType: 'Observation',
      id: `bf-demo-bp-${idSuffix}`,
      status: 'final',
      category: vitalSignCategory,
      code: loinc('85354-9', 'Blood pressure panel'),
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime,
      component: [
        {
          code: loinc('8480-6', 'Systolic blood pressure'),
          valueQuantity: {
            value: metricMap.bloodPressure,
            unit: 'mmHg',
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
          },
        },
        {
          code: loinc('8462-4', 'Diastolic blood pressure'),
          valueQuantity: {
            value: 76,
            unit: 'mmHg',
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
          },
        },
      ],
      note: demoNote,
    },
    {
      resourceType: 'Observation',
      id: `bf-demo-spo2-${idSuffix}`,
      status: 'final',
      category: vitalSignCategory,
      code: loinc('59408-5', 'Oxygen saturation in blood by pulse oximetry'),
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime,
      valueQuantity: {
        value: metricMap.oxygen,
        unit: '%',
        system: 'http://unitsofmeasure.org',
        code: '%',
      },
      note: demoNote,
    },
    {
      resourceType: 'Observation',
      id: `bf-demo-hydration-${idSuffix}`,
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'social-history',
          display: 'Social History',
        }],
      }],
      code: {
        coding: [{
          system: 'urn:biofluid-demo:observation-codes',
          code: 'daily-hydration-intake',
          display: 'Daily hydration intake (demo)',
        }],
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime,
      valueQuantity: {
        value: Number(metricMap.hydration),
        unit: 'L/day',
        system: 'http://unitsofmeasure.org',
        code: 'L/d',
      },
      note: demoNote,
    },
  ];

  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: observations.map((resource) => ({ resource })),
  };
}

function isReadingVerified(readings, acceptedReadings) {
  return Array.isArray(readings)
    && Array.isArray(acceptedReadings)
    && acceptedReadings.length === 5
    && acceptedReadings.every((accepted) =>
      readings.some((reading) => reading.id === accepted.id
        && reading.patientId === accepted.patientId
        && reading.code === accepted.code
        && reading.value === accepted.value)
    );
}

async function submitToBigfix() {
  if (!bigfixConsent.checked || isBigfixSubmissionInProgress) {
    return;
  }

  isBigfixSubmissionInProgress = true;
  sendToBigfixBtn.disabled = true;
  bigfixStatus.textContent = 'Sending synthetic readings to BIGFIX…';
  let acceptedCount = 0;
  let wasAccepted = false;

  try {
    const patientId = 'BFX-4E7A21C9';
    const submittedValues = getBigfixValuesSnapshot();
    const bundle = createBigfixBundle();
    const response = await fetch(`https://bigfix.vercel.app/api/readings?patient=${patientId}`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json, application/json',
      },
      body: JSON.stringify(bundle),
    });
    const responseText = await response.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch (error) {
      throw new Error(`BIGFIX returned a non-JSON response (HTTP ${response.status}).`);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('BIGFIX requires server-authorized API credentials. This browser-only app will not store or send API keys.');
      }
      const detail = typeof responseBody.error === 'string' ? `: ${responseBody.error}` : '';
      throw new Error(`BIGFIX rejected the submission (HTTP ${response.status})${detail}`);
    }

    acceptedCount = Number(responseBody.accepted);
    if (acceptedCount !== 5 || !Array.isArray(responseBody.readings)) {
      throw new Error('BIGFIX response did not confirm acceptance of all five expected observations.');
    }
    wasAccepted = true;
    bigfixSubmissionBadge.textContent = 'Accepted · verifying';

    bigfixStatus.textContent = `BIGFIX accepted ${acceptedCount} synthetic observations. Checking whether they are available in the test record…`;
    const verificationResponse = await fetch(
      `https://bigfix.vercel.app/api/readings?patient=${patientId}&verify=${Date.now()}`,
      { mode: 'cors', credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } }
    );
    if (!verificationResponse.ok) {
      throw new Error(`BIGFIX accepted the submission, but verification failed (HTTP ${verificationResponse.status}).`);
    }

    const verificationBody = await verificationResponse.json();
    if (!isReadingVerified(verificationBody.readings, responseBody.readings)) {
      throw new Error('BIGFIX acknowledged the submission, but the readings could not be verified in the test record.');
    }

    lastVerifiedBigfixValues = submittedValues;
    if (getBigfixValuesSnapshot() === submittedValues) {
      bigfixSubmissionBadge.textContent = 'Verified in test record';
      bigfixStatus.textContent = `Verified: BIGFIX accepted and returned all five synthetic observations for test record ${patientId}.`;
    } else {
      bigfixSubmissionBadge.textContent = 'New values · not sent';
      bigfixStatus.textContent = `BIGFIX verified the submitted values, but the dashboard changed during submission. Approve and send again to submit the latest readings.`;
    }
  } catch (error) {
    bigfixSubmissionBadge.textContent = wasAccepted ? 'Accepted · not verified' : 'Not sent · see status';
    bigfixStatus.textContent = wasAccepted
      ? `BIGFIX accepted ${acceptedCount} observations, but verification could not be completed: ${error.message}`
      : `BIGFIX submission failed: ${error.message}`;
  } finally {
    isBigfixSubmissionInProgress = false;
    sendToBigfixBtn.disabled = !bigfixConsent.checked;
  }
}

function receiveAtLocalMockEhr(bundle) {
  if (!isMockEhrAvailable) {
    throw new Error('Local mock EHR is unavailable.');
  }
  if (!isValidMockEhrBundle(bundle)) {
    throw new Error('The local mock EHR rejected an invalid demo FHIR bundle.');
  }

  const nextRecords = [bundle, ...mockEhrRecords]
    .filter((record, index, records) =>
      records.findIndex((candidate) =>
        candidate.entry.some((entry) => entry.resource.resourceType === 'Observation' && entry.resource.id
          === record.entry.find((item) => item.resource.resourceType === 'Observation').resource.id)
      ) === index
    )
    .slice(0, 20);
  sessionStorage.setItem(mockEhrStorageKey, JSON.stringify(nextRecords));
  mockEhrRecords = nextRecords;
  renderMockEhrRecords();
}

function cancelDemoHandoff() {
  if (handoffTimeout !== null) {
    window.clearTimeout(handoffTimeout);
    handoffTimeout = null;
    mockEhrStatus.textContent = mockEhrRecords.length === 0 ? 'Ready · local only' : `${mockEhrRecords.length} received · local only`;
    providerHandoffStatus.textContent = latestScannerResult ? 'Synthetic result ready' : 'Not simulated';
    addScannerEvent('Pending handoff cancelled; no data was transmitted.');
  }
  isHandoffInProgress = false;
}

readingHistory.push({
  ...metricMap,
  timestamp: new Date(),
});
renderReadingHistory();
loadMockEhrRecords();
addReadingBtn.addEventListener('click', updateMockReadings);

sendSummaryBtn.addEventListener('click', () => {
  if (readingHistory.length === 0) {
    updateMockReadings();
  }
  summaryText.textContent = createSummary();
  summaryStatus.textContent = '';
  summaryDialog.showModal();
});

document.getElementById('closeSummaryBtn').addEventListener('click', () => {
  summaryDialog.close();
});

document.getElementById('copySummaryBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(summaryText.textContent);
    summaryStatus.textContent = 'Summary copied. You can paste it into a message.';
  } catch (error) {
    summaryStatus.textContent = 'Could not copy automatically. Select the summary text above and copy it manually.';
  }
});

document.getElementById('shareSummaryBtn').addEventListener('click', async () => {
  if (!navigator.share) {
    summaryStatus.textContent = 'Sharing is not supported in this browser. Use Copy or Download instead.';
    return;
  }

  try {
    await navigator.share({
      title: 'Biofluid Health Monitor demo summary',
      text: summaryText.textContent,
    });
    summaryStatus.textContent = 'Share sheet opened.';
  } catch (error) {
    if (error.name !== 'AbortError') {
      summaryStatus.textContent = 'Could not open the share sheet. Use Copy or Download instead.';
    }
  }
});

document.getElementById('downloadSummaryBtn').addEventListener('click', () => {
  const file = new Blob([summaryText.textContent], { type: 'text/plain;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'biofluid-demo-summary.txt';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  summaryStatus.textContent = 'Summary downloaded to this device.';
});

bigfixConsent.addEventListener('change', () => {
  sendToBigfixBtn.disabled = !bigfixConsent.checked || isBigfixSubmissionInProgress;
  bigfixStatus.textContent = bigfixConsent.checked
    ? 'Approval recorded for this page session. Click Send to submit current synthetic values.'
    : 'Approval withdrawn. No further BIGFIX submission can be started.';
});

sendToBigfixBtn.addEventListener('click', submitToBigfix);

exportTrendsBtn.addEventListener('click', () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const percentages = [54, 68, 72, 61, 82, 76, 89];
  const csv = [
    'day,illustrative_demo_trend_percent',
    ...days.map((day, index) => `${day},${percentages[index]}`),
    '',
    'Synthetic illustrative chart data only; not patient measurements.',
  ].join('\r\n');
  const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'biofluid-demo-weekly-trends.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  trendExportStatus.textContent = 'Illustrative weekly demo data downloaded as CSV.';
});

demoAuthorization.addEventListener('change', () => {
  if (!demoAuthorization.checked && isScannerConnected) {
    isScannerConnected = false;
    cancelDemoHandoff();
    scannerDemoStatus.textContent = 'Demo authorization revoked. The simulator is disconnected; no real connection was made.';
    addScannerEvent('Demo authorization revoked; simulator disconnected.');
  } else if (demoAuthorization.checked) {
    scannerDemoStatus.textContent = 'Demo authorization enabled. Connect the simulator to continue.';
    addScannerEvent('Local demo authorization enabled.');
  } else {
    scannerDemoStatus.textContent = 'Review the demo notice and authorize the simulation to begin.';
  }
  updateProviderDemoStatus();
});

hospitalTarget.addEventListener('change', updateProviderDemoStatus);

connectScannerBtn.addEventListener('click', () => {
  if (!demoAuthorization.checked || isScannerConnected) {
    return;
  }

  isScannerConnected = true;
  latestScannerResult = null;
  scannerResult.hidden = true;
  providerHandoffStatus.textContent = 'Not simulated';
  scannerDemoStatus.textContent = `${scannerType.value} linked in local simulation. No physical scanner or hospital system is connected.`;
  addScannerEvent(`${scannerType.value} connected in the local simulator.`);
  updateProviderDemoStatus();
});

disconnectScannerBtn.addEventListener('click', () => {
  if (!isScannerConnected) {
    return;
  }

  isScannerConnected = false;
  cancelDemoHandoff();
  scannerDemoStatus.textContent = 'Simulator disconnected. Previous synthetic scan remains visible for this page session.';
  addScannerEvent('Simulator disconnected.');
  updateProviderDemoStatus();
});

runScanBtn.addEventListener('click', () => {
  if (!isScannerConnected || isHandoffInProgress) {
    return;
  }

  const timestamp = new Date();
  latestScannerResult = {
    sampleId: `DEMO-${timestamp.getTime().toString().slice(-6)}`,
    device: scannerType.value,
    assay: 'Synthetic demo assay',
    value: `${Math.round(randomBetween(10, 90))} demo units`,
    quality: 'PASS · simulated',
    handoffState: 'Not handed off',
    receiverStatus: 'ready',
  };

  document.getElementById('scanSampleId').textContent = latestScannerResult.sampleId;
  document.getElementById('scanAssay').textContent = latestScannerResult.assay;
  document.getElementById('scanValue').textContent = latestScannerResult.value;
  document.getElementById('scanQuality').textContent = latestScannerResult.quality;
  document.getElementById('scanHandoffState').textContent = latestScannerResult.handoffState;
  scannerResult.hidden = false;
  providerHandoffStatus.textContent = 'Synthetic result ready';
  scannerDemoStatus.textContent = 'Synthetic scan complete. Review the placeholder result before simulating a handoff.';
  addScannerEvent(`Synthetic scan ${latestScannerResult.sampleId} generated; no specimen was measured.`);
  updateProviderDemoStatus();
});

sendToHospitalBtn.addEventListener('click', () => {
  if (!isScannerConnected || !latestScannerResult || latestScannerResult.receiverStatus === 'accepted' || isHandoffInProgress) {
    return;
  }

  isHandoffInProgress = true;
  providerHandoffStatus.textContent = 'Simulating…';
  mockEhrStatus.textContent = 'Receiving synthetic FHIR bundle…';
  scannerDemoStatus.textContent = `Sending a synthetic FHIR bundle to the local mock EHR for ${hospitalTarget.value}. No network request will be sent.`;
  updateProviderDemoStatus();

  handoffTimeout = window.setTimeout(() => {
    handoffTimeout = null;
    isHandoffInProgress = false;
    try {
      const bundle = createMockFhirBundle();
      receiveAtLocalMockEhr(bundle);
      latestScannerResult.receiverStatus = 'accepted';
      latestScannerResult.handoffState = 'Accepted by local mock EHR · not a real provider';
      document.getElementById('scanHandoffState').textContent = latestScannerResult.handoffState;
      providerHandoffStatus.textContent = 'Accepted locally · not transmitted';
      mockEhrStatus.textContent = 'Reading accepted · local only';
      scannerDemoStatus.textContent = `Local mock EHR accepted synthetic reading ${latestScannerResult.sampleId}. No real health record was contacted.`;
      addScannerEvent(`Local mock EHR accepted FHIR Observation ${latestScannerResult.sampleId}; no network request was made.`);
    } catch (error) {
      latestScannerResult.handoffState = 'Not received · local mock EHR error';
      document.getElementById('scanHandoffState').textContent = latestScannerResult.handoffState;
      providerHandoffStatus.textContent = 'Not received · see status';
      mockEhrStatus.textContent = 'Receive failed · local only';
      scannerDemoStatus.textContent = `The local mock EHR could not accept this reading: ${error.message}`;
      addScannerEvent(`Mock EHR rejected ${latestScannerResult.sampleId}: ${error.message}`);
    }
    updateProviderDemoStatus();
  }, 650);
});

liveSyncBtn.addEventListener('click', () => {
  isDemoSyncActive = !isDemoSyncActive;
  liveSyncBtn.setAttribute('aria-pressed', String(isDemoSyncActive));

  if (isDemoSyncActive) {
    liveSyncBtn.textContent = 'Pause demo sync';
    updateMockReadings();
    syncInterval = window.setInterval(updateMockReadings, 10000);
    return;
  }

  window.clearInterval(syncInterval);
  syncInterval = null;
  liveSyncBtn.textContent = 'Enable demo sync';
  liveSyncStatus.textContent = 'Demo sync is paused. Mock data only; no external connection.';
});

togglePlanBtn.addEventListener('click', () => {
  const isHidden = planList.style.display === 'none';
  planList.style.display = isHidden ? 'flex' : 'none';
  togglePlanBtn.textContent = isHidden ? 'Hide details' : 'Show details';
});
