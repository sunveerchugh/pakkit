/* global alert, confirm */

let sharedVars
let getVersionSpecificVar
let setVersionSpecificVar

const MAX_PRESETS = 25

function setup (passedSharedVars, storageHelpers) {
  sharedVars = passedSharedVars
  getVersionSpecificVar = storageHelpers.getVersionSpecificVar
  setVersionSpecificVar = storageHelpers.setVersionSpecificVar

  // Bind event listeners
  document.getElementById('savePresetBtn').onclick = () => {
    saveCurrentAsPreset(document.getElementById('presetNameInput').value)
  }

  document.getElementById('presetNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveCurrentAsPreset(e.target.value)
    }
  })

  renderCustomPresets()
}

function getCustomPresets () {
  const stored = getVersionSpecificVar('customPresets', { schemaVersion: 1, presets: [] })

  // Defensive: handle legacy or malformed data
  if (Array.isArray(stored)) {
    // Legacy format (bare array) - migrate
    return stored
  }
  if (!stored || typeof stored !== 'object' || !Array.isArray(stored.presets)) {
    return []
  }
  return stored.presets
}

function saveCustomPresets (presets) {
  setVersionSpecificVar('customPresets', {
    schemaVersion: 1,
    presets: presets
  })
}

function generateUniqueId () {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 5)
  return `preset_${timestamp}_${random}`
}

function saveCurrentAsPreset (name) {
  const trimmedName = (name || '').trim()
  if (!trimmedName) return

  const presets = getCustomPresets()

  // Enforce limit
  if (presets.length >= MAX_PRESETS) {
    alert(`Maximum of ${MAX_PRESETS} presets reached. Delete some to add more.`)
    return
  }

  // Find unique name with loop (handles "Name (2)" already existing)
  let finalName = trimmedName
  let counter = 2
  while (presets.some(p => p.name === finalName)) {
    finalName = `${trimmedName} (${counter++})`
  }

  // Deep copy using same pattern as findPreset() in main.js
  const newPreset = {
    id: generateUniqueId(),
    name: finalName,
    hiddenPackets: {
      serverbound: [...sharedVars.hiddenPackets.serverbound],
      clientbound: [...sharedVars.hiddenPackets.clientbound]
    }
  }

  presets.push(newPreset)
  saveCustomPresets(presets)

  document.getElementById('presetNameInput').value = ''
  renderCustomPresets()
}

function loadCustomPreset (id) {
  const presets = getCustomPresets()
  const preset = presets.find(p => p.id === id)
  if (!preset) return

  // Deep copy to sharedVars (same pattern as findPreset)
  sharedVars.hiddenPackets = {
    serverbound: [...preset.hiddenPackets.serverbound],
    clientbound: [...preset.hiddenPackets.clientbound]
  }

  // updateFilteringTab is global in main.js
  window.updateFilteringTab()
}

function deleteCustomPreset (id) {
  const presets = getCustomPresets()
  const preset = presets.find(p => p.id === id)
  if (!preset) return

  // Truncate name in confirm dialog to prevent misleading injected content
  const displayName = preset.name.length > 30 ? preset.name.substring(0, 30) + '...' : preset.name
  if (!confirm(`Delete preset "${displayName}"?`)) return

  const filtered = presets.filter(p => p.id !== id)
  saveCustomPresets(filtered)
  renderCustomPresets()
}

function renderCustomPresets () {
  const container = document.getElementById('customPresets')
  container.innerHTML = ''

  const presets = getCustomPresets()

  presets.forEach(preset => {
    const btn = document.createElement('button')
    btn.className = 'custom-preset-btn'
    btn.style.marginLeft = '8px'
    btn.onclick = () => loadCustomPreset(preset.id)

    const nameSpan = document.createElement('span')
    nameSpan.textContent = preset.name // textContent auto-escapes
    btn.appendChild(nameSpan)

    const deleteBtn = document.createElement('span')
    deleteBtn.className = 'preset-delete-btn'
    deleteBtn.textContent = '×'
    deleteBtn.onclick = (e) => {
      e.stopPropagation()
      deleteCustomPreset(preset.id)
    }
    btn.appendChild(deleteBtn)

    container.appendChild(btn)
  })
}

module.exports = {
  setup,
  saveCurrentAsPreset,
  loadCustomPreset,
  deleteCustomPreset,
  renderCustomPresets,
  getCustomPresets
}
