import React, { useState, useRef, useEffect } from 'react';
import { Phone, X, Mic, MicOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Vapi from "@vapi-ai/web";

const VoiceAssistant = () => {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');

  // Ref to hold Vapi instance
  const vapiRef = useRef(null);
  const [isVapiLoaded, setIsVapiLoaded] = useState(false);

  // Initialize Vapi
  useEffect(() => {
    const initializeVapi = async () => {
      try {
        // Check if Vapi is available in the global scope first
        if (typeof window !== 'undefined') {
          const Vapi = (await import('@vapi-ai/web')).default;
          
          // Validate the public key format
          const publicApiKey = "55ebf670-7649-4cf6-b3dc-d90421220312";
          if (!publicApiKey || publicApiKey.length < 10) {
            throw new Error('Invalid Vapi api key');
          }

          vapiRef.current = new Vapi(publicApiKey);
          
          // Set up event listeners
          vapiRef.current.on('call-start', () => {
            console.log('✅ Call started successfully');
            setIsCallActive(true);
            setCallStatus('connected');
            setErrorMessage('');
          });

          vapiRef.current.on('call-end', () => {
            console.log('❌ Call ended');
            setIsCallActive(false);
            setCallStatus('disconnected');
            setIsAssistantOpen(false);
            setErrorMessage('');
          });

          vapiRef.current.on('speech-start', () => {
            console.log('🎤 Assistant started speaking');
            setCallStatus('assistant-speaking');
          });

          vapiRef.current.on('speech-end', () => {
            console.log('🔇 Assistant finished speaking');
            setCallStatus('listening');
          });

          vapiRef.current.on('error', async (error) => {
  if (error?.error instanceof Response) {
    const text = await error.error.text();
    console.error('💥 Vapi error response:', text);
    setErrorMessage(text || 'Unknown error occurred (see console)');
  } else {
    console.error('💥 Vapi error:', error);
    setErrorMessage(error?.message || 'Unknown error occurred');
  }
});

          vapiRef.current.on('message', (message) => {
            console.log('💬 Message:', message);
          });

          setIsVapiLoaded(true);
          console.log('✅ Vapi initialized successfully');
        }
      } catch (error) {
        console.error('❌ Failed to initialize Vapi:', error);
        setErrorMessage(`Failed to initialize voice assistant: ${error.message}`);
        setIsVapiLoaded(false);
      }
    };

    initializeVapi();

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Stop all tracks to release microphone
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone test failed:', error);
      throw error;
    }
  };

  const handleConnectToTara = async () => {
    try {
      setErrorMessage('');
      setCallStatus('connecting');
      setIsAssistantOpen(true);

      // Step 1: Test microphone permissions
      console.log('🎤 Testing microphone permissions...');
      await testMicrophone();
      console.log('✅ Microphone permissions granted');

      // Step 2: Check if Vapi is loaded
      if (!vapiRef.current) {
        throw new Error('Voice assistant not initialized. Please refresh the page.');
      }

      // Step 3: Start the call with minimal configuration
      console.log('🚀 Starting Vapi call...');
      
      //const startConfig = {
        //assistantId: "67540ad4-634b-4b6a-a749-d9c3c6f2a860"
        // Remove complex config for now to simplify
      //};

      //console.log('📋 Start config:', startConfig);

      //const result = await vapiRef.current.start(startConfig);
      const result = await vapiRef.current.start("67540ad4-634b-4b6a-a749-d9c3c6f2a860");
      //console.log('✅ Call start result:', result);

    } catch (error) {
      console.error('❌ Error starting call:', error);
      
      let userFriendlyError = 'Failed to connect. Please try again.';
      
      if (error.name === 'NotAllowedError') {
        userFriendlyError = 'Microphone permission denied. Please allow microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        userFriendlyError = 'No microphone found. Please check your audio devices.';
      } else if (error.message.includes('initialize')) {
        userFriendlyError = 'Voice assistant not ready. Please refresh the page.';
      } else if (error.message.includes('assistantId')) {
        userFriendlyError = 'Assistant configuration error. Please check the assistant ID.';
      }
      
      setErrorMessage(userFriendlyError);
      setCallStatus('error');
      
      // Keep modal open to show error
      setIsAssistantOpen(true);
    }
  };

  const handleEndCall = () => {
    try {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      setIsCallActive(false);
      setCallStatus('disconnected');
      setIsAssistantOpen(false);
      setIsMuted(false);
      setErrorMessage('');
    }
  };

  const toggleMute = () => {
    if (vapiRef.current && isCallActive) {
      try {
        if (isMuted) {
          vapiRef.current.setMuted(false);
          setIsMuted(false);
        } else {
          vapiRef.current.setMuted(true);
          setIsMuted(true);
        }
      } catch (error) {
        console.error('Error toggling mute:', error);
      }
    }
  };

  const getStatusMessage = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting to Tara...';
      case 'connected':
        return 'Connected! Say hello to start the conversation.';
      case 'assistant-speaking':
        return 'Tara is speaking...';
      case 'listening':
        return 'Tara is listening...';
      case 'error':
        return 'Connection error';
      default:
        return 'Ready to connect';
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connected':
      case 'listening':
        return 'bg-green-500';
      case 'assistant-speaking':
        return 'bg-blue-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const retryConnection = () => {
    setErrorMessage('');
    setCallStatus('disconnected');
    handleConnectToTara();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* TalentSpotify Header with Logo */}
      <header className="p-6">
        <div className="flex items-center">
          <img 
            src="/logo.png" 
            alt="Company Logo" 
            className="w-100 h-10 mr-3 object-contain" 
          />
          <h1 className="logo-text text-3xl font-bold">TalentSpotify</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Main Glass Card */}
          <div className="glass-card rounded-2xl p-8 text-center animate-fade-in">
            {/* Floating Company Logo */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center animate-float shadow-lg">
                  <img 
                    src="/logo.png" 
                    alt="Company Logo" 
                    className="w-20 h-20 object-contain" 
                  />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping" style={{ top: '-4px', left: '-4px', right: '-4px', bottom: '-4px' }}></div>
                <div
                  className="absolute inset-0 rounded-full border border-accent/20 animate-ping"
                  style={{ top: '-12px', left: '-12px', right: '-12px', bottom: '-12px', animationDelay: '0.5s' }}
                ></div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-foreground mb-2">TARA</h2>

            {/* Subtitle */}
            <p className="text-muted-foreground mb-8">
              Your HR performance review voice assistant
            </p>

            {/* Connect Button */}
            <Button
              onClick={handleConnectToTara}
              disabled={!isVapiLoaded}
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent/80 text-white border-0 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Phone className="w-5 h-5 mr-3" />
              {isVapiLoaded ? 'Connect with Tara' : 'Initializing...'}
            </Button>

            {/* Status indicator */}
            <div className="mt-6 flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                isVapiLoaded ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-muted-foreground">
                {isVapiLoaded ? 'Voice assistant ready' : 'Initializing voice assistant...'}
              </span>
            </div>
          </div>

          {/* Additional Info Card */}
          <div className="mt-6 glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">🎯 Performance reviews made simple</p>
            <p className="text-xs text-muted-foreground mt-1">
              Natural conversation • Instant insights • Personalized feedback
            </p>
          </div>
        </div>
      </main>

      {/* Voice Assistant Modal */}
      <Dialog open={isAssistantOpen} onOpenChange={(open) => {
        if (!open) {
          handleEndCall();
        }
      }}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 border-0 bg-transparent" onInteractOutside={(e) => e.preventDefault()}>
          <div className="glass-card rounded-2xl h-full flex flex-col overflow-hidden">
            <DialogHeader className="p-6 border-b border-glass-border">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 animate-pulse ${getStatusColor()}`}></div>
                  {callStatus === 'connected' ? 'Connected to Tara' : 
                   callStatus === 'connecting' ? 'Connecting...' : 
                   callStatus === 'error' ? 'Connection Error' : 'Tara'}
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  {isCallActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className={isMuted ? 'bg-red-500/20 text-red-600' : 'bg-green-500/20 text-green-600'}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEndCall}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {/* Error Alert */}
              {errorMessage && (
                <Alert variant="destructive" className="mb-6 max-w-md">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div
                className={`w-48 h-48 rounded-full flex items-center justify-center mb-8 transition-all duration-300 ${
                  callStatus === 'listening' 
                    ? 'bg-green-100/20 shadow-lg scale-110' 
                    : callStatus === 'assistant-speaking'
                    ? 'bg-blue-100/20 shadow-lg animate-pulse'
                    : callStatus === 'error'
                    ? 'bg-red-100/20 shadow-lg'
                    : 'bg-white/80 backdrop-blur-sm shadow-lg'
                }`}
              >
                <img 
                  src="/logo.png" 
                  alt="Company Logo" 
                  className="w-32 h-32 object-contain" 
                />
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-semibold mb-4">{getStatusMessage()}</p>
                
                {/* Voice activity indicator */}
                {(callStatus === 'listening' || callStatus === 'assistant-speaking') && (
                  <div className="flex justify-center space-x-1 mt-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-8 rounded-full bg-accent animate-pulse"
                        style={{
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: '1s',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Retry button for errors */}
                {callStatus === 'error' && (
                  <Button onClick={retryConnection} className="mt-4">
                    <Phone className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>

              {/* Call controls */}
              {isCallActive && (
                <div className="mt-8 flex space-x-4">
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? "destructive" : "outline"}
                    size="lg"
                  >
                    {isMuted ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                  
                  <Button
                    onClick={handleEndCall}
                    variant="destructive"
                    size="lg"
                  >
                    <X className="w-5 h-5 mr-2" />
                    End Call
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VoiceAssistant;