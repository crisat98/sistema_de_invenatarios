import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STORAGE_KEY = 'stockia-usability-sessions-v1';
const remote = globalThis.__SUPABASE_URL__ && globalThis.__SUPABASE_ANON_KEY__ ? createClient(globalThis.__SUPABASE_URL__, globalThis.__SUPABASE_ANON_KEY__) : null;
const $ = (selector) => document.querySelector(selector);
let currentStep = 1;

function setStep(step) {
  currentStep = step;
  document.querySelectorAll('.form-step').forEach((item) => item.classList.toggle('active', Number(item.dataset.step) === step));
  $('#form-step').textContent = `PASO ${step} DE 3`;
  $('#progress-label').textContent = ['Datos del participante', 'Tareas del prototipo', 'Experiencia general'][step - 1];
  $('#progress-fill').style.width = `${step * 33.333}%`;
}

function validateStep(step) {
  const container = document.querySelector(`[data-step="${step}"]`);
  const fields = [...container.querySelectorAll('input, select')];
  for (const field of fields) if (!field.checkValidity()) { field.reportValidity(); return false; }
  return true;
}

async function saveSession(event) {
  event.preventDefault();
  if (!validateStep(3)) return;
  const taskResults = [1, 2, 3, 4, 5].map((number) => ({ task: number, result: document.querySelector(`input[name="task-${number}"]:checked`)?.value || '' }));
  const session = { participant_name: $('#participant-name').value.trim(), role: $('#participant-role').value, task_results: taskResults, satisfaction: Number(document.querySelector('input[name="satisfaction"]:checked')?.value), comments: $('#comments').value.trim() };
  const error = $('#form-error'); error.textContent = '';
  if (remote) {
    const { error: saveError } = await remote.from('usability_test_sessions').insert(session);
    if (saveError) { error.textContent = 'No fue posible guardar la evaluación. Intenta nuevamente.'; return; }
  } else {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); stored.push({ ...session, created_at: new Date().toISOString() }); localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }
  $('#usability-form').classList.add('hidden'); $('#success-state').classList.remove('hidden'); $('#progress-fill').style.width = '100%'; $('#form-step').textContent = 'COMPLETADO'; $('#progress-label').textContent = 'Evaluación registrada';
}

function resetForm() { $('#usability-form').reset(); $('#usability-form').classList.remove('hidden'); $('#success-state').classList.add('hidden'); setStep(1); }
document.addEventListener('click', (event) => { const button = event.target.closest('[data-next]'); if (button) { const nextStep = Number(button.dataset.next); if (nextStep > currentStep && !validateStep(currentStep)) return; setStep(nextStep); } if (event.target.closest('#new-test')) resetForm(); });
$('#usability-form').addEventListener('submit', saveSession);
setStep(1);
