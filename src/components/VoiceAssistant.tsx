import React, { useState } from 'react';
import { Phone, X, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const VoiceAssistant = () => {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const handleConnectToTara = () => {
    setIsAssistantOpen(true);
  };

  const closeAssistant = () => {
    setIsAssistantOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* TalentSpotify Header */}
      <header className="p-6">
        <div className="flex items-center">
          <h1 className="logo-text text-3xl font-bold">TalentSpotify</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Main Glass Card */}
          <div className="glass-card rounded-2xl p-8 text-center animate-fade-in">
            {/* Floating Microphone Icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-accent to-accent/80 flex items-center justify-center animate-float">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping"></div>
                <div className="absolute inset-[-8px] rounded-full border border-accent/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Voice Assistant
            </h2>
            
            {/* Subtitle */}
            <p className="text-muted-foreground mb-8">
              Tara, your HR performance review voice assistant
            </p>

            {/* Connect Button */}
            <Button
              onClick={handleConnectToTara}
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent/80 text-white border-0 rounded-xl pulse-on-hover transition-all duration-300 hover:scale-105"
            >
              <Phone className="w-5 h-5 mr-3" />
              Connect with Tara
            </Button>

            {/* Status indicator */}
            <div className="mt-6 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">
                Voice assistant ready
              </span>
            </div>
          </div>

          {/* Additional Info Card */}
          <div className="mt-6 glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              🎯 Performance reviews made simple
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Natural conversation • Instant insights • Personalized feedback
            </p>
          </div>
        </div>
      </main>

      {/* Voice Assistant Modal */}
      <Dialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 border-0 bg-transparent">
          <div className="glass-card rounded-2xl h-full flex flex-col overflow-hidden">
            <DialogHeader className="p-6 border-b border-glass-border">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                  Connected to Tara
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeAssistant}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </DialogHeader>
            
            <div className="flex-1 p-4">
              <iframe
                src="https://vapi.ai?demo=true&shareKey=e1e2b696-70a7-43b5-b492-a5f4345b7975&assistantId=17f068ab-b964-43e2-a7a5-486cc80f6a81"
                className="w-full h-full rounded-xl border-0"
                title="Tara Voice Assistant"
                allow="microphone; autoplay"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VoiceAssistant;