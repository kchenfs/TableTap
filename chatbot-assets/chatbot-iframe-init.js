console.log('🚀 Starting chatbot iframe initialization');

window.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM ready, checking for LexWebUi...');

  function initLexWebUi() {
    if (typeof LexWebUi === 'undefined') {
      console.error('❌ LexWebUi is not defined');
      return;
    }

    console.log('✅ LexWebUi found, initializing loader...');

    try {
      // In this build, LexWebUi.Loader itself is the loader class
      const LoaderClass = LexWebUi.Loader;

      if (typeof LoaderClass !== 'function') {
        console.error('❌ LexWebUi.Loader is not a class/function:', LoaderClass);
        return;
      }

      console.log('🔧 Creating LexWebUi.Loader instance...');
      const loader = new LoaderClass({
        shouldIgnoreConfigWhenEmbedded: false,
        shouldLoadMinDeps: true
      });

      console.log('✅ Chatbot iframe loader created successfully');
    } catch (error) {
      console.error('❌ Error initializing chatbot:', error);
    }
  }

  if (typeof LexWebUi !== 'undefined') {
    initLexWebUi();
  } else {
    console.log('⏳ Waiting for LexWebUi to load...');
    setTimeout(initLexWebUi, 500);
  }
});

window.addEventListener('message', function(event) {
  console.log('📨 Iframe received message:', event.data);
}, false);
