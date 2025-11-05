import { useState, useRef, useEffect } from 'react';
import { Phone, X, Mic, MicOff, AlertCircle, ScrollText, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
//import { Input } from '@/components/ui/input'; //UNCOMMENT TO REDO EMAIL STUFF
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Vapi from "@vapi-ai/web";
import { VAPI_CONFIG, API_BASE_URL } from '@/lib/config';
import TranscriptPanel from './TranscriptPanel';

interface TranscriptMessage {
  id: string;
  role: 'agent' | 'user';
  text: string;
  isFinal: boolean;
  timestamp: number;
}

const VoiceAssistant = () => {
  const navigate = useNavigate();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  // UNCOMMENT TO REDO EMAIL STUFF
  //const [userEmail, setUserEmail] = useState('');
  const okrSummaryRef = useRef<string | null>(null);

  const vapiRef = useRef<any>(null);
  const [isVapiLoaded, setIsVapiLoaded] = useState(false);
  const callIdRef = useRef<string | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const participantsRef = useRef<{ employeeName?: string; managerName?: string }>({});

  useEffect(() => {
    const initializeVapi = async () => {
      try {
        if (typeof window !== 'undefined') {
          const publicApiKey = VAPI_CONFIG.PUBLIC_API_KEY;
          if (!publicApiKey || publicApiKey.length < 10) {
            throw new Error('Invalid Vapi api key');
          }

          vapiRef.current = new Vapi(publicApiKey);

          vapiRef.current.on('call-start', () => {
            console.log('✅ Call started successfully');
            setIsCallActive(true);
            setCallStatus('connected');
            setErrorMessage('');
            callStartedAtRef.current = Date.now();
          });

          vapiRef.current.on('call-end', async () => {
            console.log('❌ Call ended');

            // Save session before cleanup
            if (callIdRef.current && callStartedAtRef.current) {
              try {
                await fetch(`${API_BASE_URL}/api/sessions/finalize`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    callId: callIdRef.current,
                    startedAt: callStartedAtRef.current,
                    endedAt: Date.now(),
                    participants: participantsRef.current,
                    transcript: transcripts,
                  }),
                });
                console.log('✅ Session saved to S3');
              } catch (error) {
                console.error('❌ Failed to save session:', error);
              }
            }

            setIsCallActive(false);
            setCallStatus('disconnected');
            setIsAssistantOpen(false);
            setErrorMessage('');
            setShowTranscript(false);
            setTranscripts([]);
            callIdRef.current = null;
            callStartedAtRef.current = null;
            participantsRef.current = {};
          });

          vapiRef.current.on('speech-start', () => {
            console.log('🎤 Assistant started speaking');
            setCallStatus('assistant-speaking');
          });

          vapiRef.current.on('speech-end', () => {
            console.log('🔇 Assistant finished speaking');
            setCallStatus('listening');
          });

          vapiRef.current.on('error', async (error: any) => {
            if (error?.error instanceof Response) {
              const text = await error.error.text();
              console.error('💥 Vapi error response:', text);
              setErrorMessage(text || 'Unknown error occurred (see console)');
            } else {
              console.error('💥 Vapi error:', error);
              setErrorMessage(error?.message || 'Unknown error occurred');
            }
          });

          vapiRef.current.on('message', (message: any) => {
            console.log('💬 Message:', message);

            // Handle transcript messages
            if (message.type === 'transcript') {
              const role = message.role === 'assistant' ? 'agent' : 'user';
              const text = message.transcript || message.text || '';
              const isFinal = message.transcriptType === 'final';

              if (text) {
                setTranscripts(prev => {
                  let base = prev;
                
                  if (!isFinal) {
                    // Replace last partial of the same role if it exists
                    let lastIndex = -1;
                    for (let i = prev.length - 1; i >= 0; i--) {
                      if (prev[i].role === role && !prev[i].isFinal) {
                        lastIndex = i;
                        break;
                      }
                    }
                    if (lastIndex !== -1) {
                      const updated = [...prev];
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        text,
                        timestamp: Date.now(),
                      };
                      return updated;
                    }
                  } else {
                    // Remove the last partial of the same role, then append the final below
                    let lastPartialIndex = -1;
                    for (let i = prev.length - 1; i >= 0; i--) {
                      if (prev[i].role === role && !prev[i].isFinal) {
                        lastPartialIndex = i;
                        break;
                      }
                    }
                    if (lastPartialIndex !== -1) {
                      base = prev.filter((_, i) => i !== lastPartialIndex);
                    }
                  }
                
                  // Append new message (partial or final)
                  return [
                    ...base,
                    {
                      id: `${role}-${Date.now()}-${Math.random()}`,
                      role,
                      text,
                      isFinal,
                      timestamp: Date.now(),
                    },
                  ];
                });
              }
            }

            // Handle tool calls for participant names
            if (message.type === 'tool-calls' && message.toolCalls) {
              const setParticipantsTool = message.toolCalls.find(
                (tc: any) => tc.function?.name === 'setParticipants'
              );

              if (setParticipantsTool?.function?.arguments) {
                const args = setParticipantsTool.function.arguments;
                participantsRef.current = {
                  employeeName: args.employeeName,
                  managerName: args.managerName,
                };
                console.log('👥 Participants set:', participantsRef.current);
              }
            }
          });

          setIsVapiLoaded(true);
          console.log('✅ Vapi initialized successfully');
        }
      } catch (error: any) {
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

      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone test failed:', error);
      throw error;
    }
  };
      // UNCOMMENT TO REDO EMAIL STUFF
  // const fetchOkrsForEmail = async (email: string) => {
  //   const url = `${API_BASE_URL}/api/okr?email=${encodeURIComponent(email)}`;
  //   const resp = await fetch(url);
  //   if (!resp.ok) {
  //     const text = await resp.text();
  //     throw new Error(text || 'Failed to fetch OKRs');
  //   }
  //   const data = await resp.json();
  //   okrSummaryRef.current = data?.summary || null;
  //   return data;
  // };

  const handleConnectToTara = async () => {
    try {
      setErrorMessage('');
      setCallStatus('connecting');
      setIsAssistantOpen(true);

      console.log('🎤 Testing microphone permissions...');
      await testMicrophone();
      console.log('✅ Microphone permissions granted');
          // UNCOMMENT TO REDO EMAIL STUFF
      // if (!userEmail || userEmail.indexOf('@') === -1) {
      //   throw new Error('Please enter a valid email address.');
      // }

      // console.log('📡 Fetching OKRs for', userEmail);
      // try {
      //   await fetchOkrsForEmail(userEmail);
      //   console.log('✅ OKRs fetched');
      // } catch (e: any) {
      //   console.warn('⚠️ Failed to fetch OKRs, continuing without summary:', e?.message);
      // }

      if (!vapiRef.current) {
        throw new Error('Voice assistant not initialized. Please refresh the page.');
      }

      console.log('🚀 Starting Vapi call...');

      const result = await vapiRef.current.start(VAPI_CONFIG.AGENT_ID);

      // Capture call ID
      if (result?.call?.id) {
        callIdRef.current = result.call.id;
        console.log('📞 Call ID:', callIdRef.current);
      }

      // After call starts, send OKR summary as a user message to prime the AI
      if (okrSummaryRef.current && vapiRef.current) {
        try {
          // Many Vapi SDKs accept plain strings for user input; fall back to known shape if needed
          if (typeof vapiRef.current.send === 'function') {
            await vapiRef.current.send(okrSummaryRef.current);
          }
        } catch (e) {
          console.warn('Could not send OKR summary to assistant:', e);
        }
      }

    } catch (error: any) {
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
      setShowTranscript(false);
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
      <header className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="Company Logo"
              className="w-100 h-10 mr-3 object-contain"
            />
            <h1 className="logo-text text-3xl font-bold">TalentSpotify</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/history')}
            className="glass-button"
          >
            <History className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 text-center animate-fade-in">
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

            <h2 className="text-2xl font-bold text-foreground mb-2">TARA</h2>

            <p className="text-muted-foreground mb-8">
              Your HR performance review voice assistant
            </p>
                  {/* UNCOMMENT TO REDO EMAIL STUFF */}
            {/* <div className="mb-4 text-left">
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                placeholder="Please enter your email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div> */}

            <Button
              onClick={handleConnectToTara}
              disabled={!isVapiLoaded}
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent/80 text-white border-0 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Phone className="w-5 h-5 mr-3" />
              {isVapiLoaded ? 'Connect with Tara' : 'Initializing...'}
            </Button>

            <div className="mt-6 flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isVapiLoaded ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
              <span className="text-sm text-muted-foreground">
                {isVapiLoaded ? 'Voice assistant ready' : 'Initializing voice assistant...'}
              </span>
            </div>
          </div>

          <div className="mt-6 glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">🎯 Performance reviews made simple</p>
            <p className="text-xs text-muted-foreground mt-1">
              Natural conversation • Instant insights • Personalized feedback
            </p>
          </div>
        </div>
      </main>

      <Dialog open={isAssistantOpen} onOpenChange={(open) => {
        if (!open) {
          handleEndCall();
        }
      }}>
        <DialogContent
          className="max-w-6xl h-[80vh] p-0 border-0 bg-transparent"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="glass-card rounded-2xl h-full flex overflow-hidden">
            <div className="flex-1 flex flex-col">
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
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowTranscript(!showTranscript)}
                          className={showTranscript ? 'bg-accent/20 text-accent' : 'glass-button'}
                        >
                          <ScrollText className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleMute}
                          className={isMuted ? 'bg-red-500/20 text-red-600' : 'bg-green-500/20 text-green-600'}
                        >
                          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </Button>
                      </>
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
                {errorMessage && (
                  <Alert variant="destructive" className="mb-6 max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <div
                  className={`w-48 h-48 rounded-full flex items-center justify-center mb-8 transition-all duration-300 ${callStatus === 'listening'
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

                  {callStatus === 'error' && (
                    <Button onClick={retryConnection} className="mt-4">
                      <Phone className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                </div>

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

            {showTranscript && (
              <TranscriptPanel transcripts={transcripts} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VoiceAssistant;
