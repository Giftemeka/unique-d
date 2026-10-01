const addReadingBtn = document.getElementById('addReadingBtn');
const togglePlanBtn = document.getElementById('togglePlanBtn');
const planList = document.querySelector('.plan-list');

const metricMap = {
  heartRate: 72,
  bloodPressure: 118,
  oxygen: 98,
  hydration: 2.1,
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

addReadingBtn.addEventListener('click', () => {
  metricMap.heartRate = Math.round(randomBetween(68, 81));
  metricMap.bloodPressure = Math.round(randomBetween(112, 124));
  metricMap.oxygen = Math.round(randomBetween(96, 100));
  metricMap.hydration = Number(randomBetween(1.8, 2.7)).toFixed(1);

  const heartValue = document.querySelector('.metric-card:nth-child(1) .metric-value');
  const bpValue = document.querySelector('.metric-card:nth-child(2) .metric-value');
  const oxyValue = document.querySelector('.metric-card:nth-child(3) .metric-value');
  const hydrationValue = document.querySelector('.metric-card:nth-child(4) .metric-value');

  heartValue.innerHTML = `${metricMap.heartRate} <small>bpm</small>`;
  bpValue.innerHTML = `${metricMap.bloodPressure}/76 <small>mmHg</small>`;
  oxyValue.innerHTML = `${metricMap.oxygen}% <small>SpO₂</small>`;
  hydrationValue.innerHTML = `${metricMap.hydration}L <small>today</small>`;

});

togglePlanBtn.addEventListener('click', () => {
  const isHidden = planList.style.display === 'none';
  planList.style.display = isHidden ? 'flex' : 'none';
  togglePlanBtn.textContent = isHidden ? 'Hide details' : 'Show details';
});

