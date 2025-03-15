const converter = new showdown.Converter()

// Configure showdown options
converter.setOption('tables', true)
converter.setOption('tasklists', true)
converter.setOption('emoji', true)

// Variable to track thinking start time
let thinkStartTime = null

async function generate() {
  const promptElement = document.querySelector('#prompt')
  const responseElement = document.querySelector('#response')
  const generateBtn = document.querySelector('#generateBtn')
  const generateBtnText = document.querySelector('#generateBtnText')
  const loadingSpinner = document.querySelector('#loadingSpinner')

  // Reset thinking time tracker
  thinkStartTime = null

  // Get prompt text
  let prompt = promptElement.value.trim()

  // Validate prompt
  if (!prompt) {
    showToast('Please enter a prompt first')
    promptElement.focus()
    return
  }

  // Show loading state with animation
  generateBtn.disabled = true
  generateBtnText.textContent = 'Generating...'
  loadingSpinner.classList.remove('d-none')
  responseElement.classList.add('loading')
  responseElement.innerHTML =
    '<div class="text-center text-muted animate__animated animate__pulse animate__infinite"><em>Generating response...</em></div>'

  // Add subtle animation to the button
  generateBtn.classList.add(
    'animate__animated',
    'animate__pulse',
    'animate__infinite',
    'animate__slow'
  )

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-r1:1.5b',
        prompt: prompt,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    let formattedResponse = ''
    responseElement.innerHTML = ''
    responseElement.classList.add('animate__animated', 'animate__fadeIn')

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      try {
        let chunkJson = JSON.parse(chunk)
        formattedResponse += chunkJson.response

        // Check for think tag opening and track time
        if (formattedResponse.includes('<think>') && !thinkStartTime) {
          thinkStartTime = new Date()
        }

        // Calculate thinking time if applicable
        let thinkingTimeDisplay = ''
        if (thinkStartTime && formattedResponse.includes('</think>')) {
          const thinkEndTime = new Date()
          const thinkingTimeMs = thinkEndTime - thinkStartTime
          const thinkingTimeSec = (thinkingTimeMs / 1000).toFixed(1)
          thinkingTimeDisplay = `${thinkingTimeSec}s`
        }

        // Process think tags
        let processedResponse = formattedResponse
          .replace(
            /<think>/g,
            `<div id="think" class="think-section">
            <div class="think-header" onclick="toggleThinkSection(this, event)">
              <span class="think-title">${
                thinkingTimeDisplay ? 'Thought for ' : 'Thinking...'
              }</span>
              <span class="think-time">${thinkingTimeDisplay}</span>
              <button class="think-toggle${
                thinkingTimeDisplay ? '' : ' collapsed'
              }" aria-label="Toggle thinking section">
                <i class="bi bi-chevron-down"></i>
              </button>
            </div>
            <div class="think-content${
              thinkingTimeDisplay ? '' : ' collapsed'
            }">`
          )
          .replace(/<\/think>/g, '</div></div>')

        // Convert markdown to HTML
        let htmlResponse = converter.makeHtml(processedResponse)

        // Don't add action buttons during generation, only show the response content
        responseElement.innerHTML = htmlResponse

        // Auto-scroll to bottom of response
        responseElement.scrollTop = responseElement.scrollHeight
      } catch (e) {
        console.error('Error parsing chunk:', e, chunk)
      }
    }
  } catch (error) {
    console.error('Error generating response:', error)
    responseElement.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`
  } finally {
    // Reset UI state
    generateBtn.disabled = false
    generateBtnText.textContent = 'Generate'
    loadingSpinner.classList.add('d-none')
    responseElement.classList.remove('loading')

    // Remove button animations
    generateBtn.classList.remove(
      'animate__animated',
      'animate__pulse',
      'animate__infinite',
      'animate__slow'
    )

    // Add a subtle completion animation
    responseElement.classList.add('animate__animated', 'animate__fadeIn')

    // Add response action buttons after the response is fully generated
    if (
      responseElement.innerHTML &&
      !responseElement.querySelector('.response-action-buttons')
    ) {
      const actionButtons = document.createElement('div')
      actionButtons.className = 'response-action-buttons mt-3'
      actionButtons.innerHTML = `
        <button class="btn btn-sm btn-outline-secondary me-2 copy-btn" aria-label="Copy response" data-bs-toggle="tooltip" data-bs-placement="top" title="Copy to clipboard">
          <i class="bi bi-clipboard"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary regenerate-btn" aria-label="Regenerate response" data-bs-toggle="tooltip" data-bs-placement="top" title="Regenerate with same prompt">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      `
      responseElement.appendChild(actionButtons)

      // Initialize tooltips for the newly added buttons
      const tooltipTriggerList = [].slice.call(
        actionButtons.querySelectorAll('[data-bs-toggle="tooltip"]')
      )
      tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
      })
    }
  }
}

// Helper function to show toast notifications
function showToast(message) {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container')
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className =
      'toast-container position-fixed bottom-0 end-0 p-3'
    document.body.appendChild(toastContainer)
  }

  // Create toast element
  const toastId = 'toast-' + Date.now()
  const toastHtml = `
    <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <strong class="me-auto">Notification</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `

  toastContainer.insertAdjacentHTML('beforeend', toastHtml)

  // Initialize and show the toast
  const toastElement = document.getElementById(toastId)
  const toast = new bootstrap.Toast(toastElement, { delay: 3000 })
  toast.show()

  // Remove toast after it's hidden
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove()
  })
}

// Add event listener for Enter key in prompt textarea
document.querySelector('#prompt').addEventListener('keydown', function (event) {
  // Check if Ctrl+Enter or Cmd+Enter was pressed
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    generate()
  }
})

// Copy response to clipboard
function copyResponse(event) {
  let responseText = ''

  // Handle different button sources
  if (event && event.target) {
    // If clicked from a dynamically added button in the response
    const button =
      event.target.closest('.copy-btn') ||
      (event.target.tagName === 'I' ? event.target.parentElement : event.target)
    if (button) {
      // Get the parent response element
      const responseActionButtons = button.closest('.response-action-buttons')
      if (responseActionButtons) {
        // Get the response content (which is the parent of the action buttons)
        const responseElement = responseActionButtons.parentElement
        if (responseElement) {
          // Clone the response element to manipulate it
          const tempElement = responseElement.cloneNode(true)

          // Remove the action buttons from the clone
          const actionButtons = tempElement.querySelector(
            '.response-action-buttons'
          )
          if (actionButtons) {
            actionButtons.remove()
          }

          // Remove any think sections
          const thinkSections = tempElement.querySelectorAll('.think-section')
          thinkSections.forEach((section) => section.remove())

          responseText = tempElement.innerText.trim()
        }
      }
    }
  }

  // If we couldn't get the text from a specific button, fall back to the entire response
  if (!responseText) {
    const responseElement = document.querySelector('#response')
    if (responseElement) {
      // Clone the response element to manipulate it
      const tempElement = responseElement.cloneNode(true)

      // Remove the action buttons from the clone
      const actionButtons = tempElement.querySelectorAll(
        '.response-action-buttons'
      )
      actionButtons.forEach((button) => button.remove())

      // Remove any think sections
      const thinkSections = tempElement.querySelectorAll('.think-section')
      thinkSections.forEach((section) => section.remove())

      // Get the text content
      responseText = tempElement.innerText || tempElement.textContent
      responseText = responseText ? responseText.trim() : ''
    }
  }

  if (!responseText) {
    showToast('No response to copy')
    return
  }

  // First try using the Clipboard API (modern approach)
  const copyToClipboard = async (text) => {
    // Add a brief animation to the copy button
    const copyBtn =
      event && event.target
        ? event.target.closest('.copy-btn') ||
          (event.target.tagName === 'I'
            ? event.target.parentElement
            : event.target)
        : document.querySelector('#copyBtn')

    if (copyBtn) {
      copyBtn.classList.add('animate__animated', 'animate__bounceIn')
      setTimeout(() => {
        copyBtn.classList.remove('animate__animated', 'animate__bounceIn')
      }, 1000)
    }

    try {
      // Try the modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        showToast('Response copied to clipboard')
        return true
      } else {
        throw new Error('Clipboard API not available')
      }
    } catch (err) {
      console.warn('Clipboard API failed:', err)

      // Fallback to the older execCommand method
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text

        // Make the textarea out of viewport
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)

        // Focus and select the text
        textArea.focus()
        textArea.select()

        // Execute the copy command
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (successful) {
          showToast('Response copied to clipboard')
          return true
        } else {
          throw new Error('execCommand copy failed')
        }
      } catch (fallbackErr) {
        console.error('Fallback clipboard method failed:', fallbackErr)
        showToast(
          'Unable to copy: ' +
            (err.message === 'Write permission denied'
              ? 'Please use keyboard shortcut (Ctrl+C/Cmd+C) instead'
              : err.message || 'Unknown error')
        )
        return false
      }
    }
  }

  // Execute the copy operation
  copyToClipboard(responseText)
}

// Regenerate response with the same prompt
function regenerateResponse(event) {
  const promptElement = document.querySelector('#prompt')

  if (!promptElement.value.trim()) {
    showToast('No prompt to regenerate')
    return
  }

  // Add a brief animation to the regenerate button
  let regenerateBtn

  if (event && event.target) {
    regenerateBtn = event.target.closest('.regenerate-btn') || event.target
  }

  if (!regenerateBtn) {
    regenerateBtn = document.querySelector('#regenerateBtn')
  }

  if (regenerateBtn) {
    regenerateBtn.classList.add('animate__animated', 'animate__rotateIn')
    setTimeout(() => {
      regenerateBtn.classList.remove('animate__animated', 'animate__rotateIn')
      // Call the generate function
      generate()
    }, 500)
  } else {
    // If no button found, just generate
    generate()
  }
}

// Add tooltip to generate button and initialize theme
document.addEventListener('DOMContentLoaded', function () {
  // Initialize all tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  )
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  })

  // Theme toggle removed - dark mode is now permanent

  // Set up copy and regenerate buttons in the header
  const copyBtn = document.getElementById('copyBtn')
  const regenerateBtn = document.getElementById('regenerateBtn')

  if (copyBtn) {
    copyBtn.addEventListener('click', function (event) {
      // Prevent default behavior
      event.preventDefault()
      // Call copyResponse with the event
      copyResponse(event)
    })
  }

  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', regenerateResponse)
  }

  // Set up event delegation for dynamically added buttons after responses
  document.addEventListener('click', function (event) {
    // Handle copy buttons
    if (
      event.target.closest('.copy-btn') ||
      (event.target.tagName === 'I' &&
        event.target.parentElement.classList.contains('copy-btn'))
    ) {
      event.preventDefault()
      copyResponse(event)
    }

    // Handle regenerate buttons
    if (
      event.target.closest('.regenerate-btn') ||
      (event.target.tagName === 'I' &&
        event.target.parentElement.classList.contains('regenerate-btn'))
    ) {
      event.preventDefault()
      regenerateResponse(event)
    }
  })

  // Dark mode is now permanently enabled by default

  // Global function to toggle think section
  window.toggleThinkSection = function (element, event) {
    const thinkSection = element.closest('.think-section')
    if (thinkSection) {
      const thinkContent = thinkSection.querySelector('.think-content')
      const thinkToggle = thinkSection.querySelector('.think-toggle')

      // Toggle collapsed state
      thinkContent.classList.toggle('collapsed')
      thinkToggle.classList.toggle('collapsed')

      // Prevent default action if event is provided
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
  }

  // Set up event delegation for think section toggles as a backup
  document.addEventListener('click', function (event) {
    // Check if the click was on a think toggle button or think header
    if (
      event.target.closest('.think-toggle') ||
      (event.target.closest('.think-header') &&
        !event.target.closest('.think-header').hasAttribute('onclick'))
    ) {
      const thinkSection = event.target.closest('.think-section')
      if (thinkSection) {
        const thinkContent = thinkSection.querySelector('.think-content')
        const thinkToggle = thinkSection.querySelector('.think-toggle')

        // Toggle collapsed state
        thinkContent.classList.toggle('collapsed')
        thinkToggle.classList.toggle('collapsed')

        // Prevent the default action and stop propagation
        event.preventDefault()
        event.stopPropagation()
      }
    }
  })

  // Initialize any existing think sections on page load
  const initThinkSections = () => {
    document.querySelectorAll('.think-section').forEach((section) => {
      const thinkContent = section.querySelector('.think-content')
      const thinkToggle = section.querySelector('.think-toggle')
      const thinkTime = section.querySelector('.think-time')

      // If thinking is in progress (no time displayed), keep it collapsed
      if (thinkTime && !thinkTime.textContent.trim()) {
        thinkContent.classList.add('collapsed')
        thinkToggle.classList.add('collapsed')
      }
    })
  }

  // Run initialization
  initThinkSections()
})
