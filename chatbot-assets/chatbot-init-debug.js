// Save this as: chatbot-assets/chatbot-init-debug.js
// This script helps debug the chatbot initialization

console.log('🔍 Chatbot Debug Script Loaded');

// Check if we're in an iframe
if (window.self !== window.top) {
  console.log('✅ Running inside iframe');
  console.log('📍 Iframe location:', window.location.href);
  console.log('📍 Parent origin:', document.referrer);
} else {
  console.log('⚠️ NOT running inside iframe');
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM Content Loaded');
  
  // Check if required elements exist
  const fullpageDiv = document.getElementById('lex-web-ui-fullpage');
  console.log('🎯 lex-web-ui-fullpage element:', fullpageDiv ? 'Found ✅' : 'Missing ❌');
  
  // Check if required scripts are loaded
  console.log('📦 Checking loaded scripts:');
  console.log('  - Vue:', typeof Vue !== 'undefined' ? '✅' : '❌');
  console.log('  - Vuetify:', typeof Vuetify !== 'undefined' ? '✅' : '❌');
  console.log('  - Vuex:', typeof Vuex !== 'undefined' ? '✅' : '❌');
  console.log('  - AWS SDK:', typeof AWS !== 'undefined' ? '✅' : '❌');
  console.log('  - LexWebUi:', typeof LexWebUi !== 'undefined' ? '✅' : '❌');
  
  // Listen for postMessage from parent
  window.addEventListener('message', function(event) {
    console.log('📨 Received message from parent:', event.data);
  }, false);
  
  // Check if LexWebUi is available after a delay
  setTimeout(function() {
    if (typeof LexWebUi !== 'undefined') {
      console.log('✅ LexWebUi is available');
      console.log('🔧 LexWebUi object:', LexWebUi);
    } else {
      console.error('❌ LexWebUi is NOT available after 2 seconds');
    }
  }, 2000);
});

// Log any errors
window.addEventListener('error', function(event) {
  console.error('❌ Error in iframe:', event.error || event.message);
});

// Log unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  console.error('❌ Unhandled promise rejection in iframe:', event.reason);
});