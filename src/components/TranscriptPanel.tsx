import { useEffect, useRef } from 'react';
import { Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface TranscriptMessage {
  id: string;
  role: 'agent' | 'user';
  text: string;
  isFinal: boolean;
  timestamp: number;
}

interface TranscriptPanelProps {
  transcripts: TranscriptMessage[];
}

const TranscriptPanel = ({ transcripts }: TranscriptPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const handleCopy = () => {
    const text = transcripts
      .filter(t => t.isFinal)
      .map(t => `${t.role === 'agent' ? 'Tara' : 'You'}: ${t.text}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(text);
    toast.success('Transcript copied to clipboard');
  };

  const handleDownloadTxt = () => {
    const text = transcripts
      .filter(t => t.isFinal)
      .map(t => `${t.role === 'agent' ? 'Tara' : 'You'}: ${t.text}`)
      .join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded');
  };

  const handleDownloadJson = () => {
    const json = JSON.stringify(transcripts, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded');
  };

  return (
    <div className="w-[360px] border-l border-glass-border flex flex-col bg-white/5 backdrop-blur-sm">
      <div className="p-4 border-b border-glass-border flex items-center justify-between">
        <h3 className="font-semibold text-lg">Live Transcript</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-8 w-8"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownloadTxt}
            className="h-8 w-8"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {transcripts.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-accent text-white'
                    : 'bg-white/10 text-foreground'
                } ${!msg.isFinal ? 'italic opacity-70' : ''}`}
              >
                <p className="text-xs font-semibold mb-1">
                  {msg.role === 'agent' ? 'Tara' : 'You'}
                </p>
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TranscriptPanel;
