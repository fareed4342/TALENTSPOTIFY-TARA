import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { API_BASE_URL } from '@/lib/config';
import { toast } from 'sonner';

interface TranscriptMessage {
  id: string;
  role: 'agent' | 'user';
  text: string;
  isFinal: boolean;
  timestamp: number;
}

interface SessionDetail {
  metadata: {
    callId: string;
    employeeName: string;
    managerName: string;
    startedAt: number;
    endedAt: number;
    duration: number;
    messageCount: number;
  };
  transcript: TranscriptMessage[];
  recordingUrl: string | null;
}

const HistoryDetail = () => {
  const navigate = useNavigate();
  const { callId } = useParams<{ callId: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (callId) {
      fetchSessionDetail(callId);
    }
  }, [callId]);

  const fetchSessionDetail = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/${id}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      const data = await response.json();
      setSession(data);
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const handleDownloadTranscript = () => {
    if (!session) return;
    
    const text = session.transcript
      .filter(t => t.isFinal)
      .map(t => `${t.role === 'agent' ? 'Tara' : t.role === 'user' ? 'Employee' : 'Unknown'}: ${t.text}`)
      .join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${session.metadata.callId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Session not found</p>
          <Button onClick={() => navigate('/history')}>Back to History</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="p-6 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/history')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Performance Evaluation
              </h1>
              <p className="text-xl text-muted-foreground">
                of {session.metadata.employeeName} with {session.metadata.managerName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(session.metadata.startedAt)}</p>
                  </div>
                </div>
                {session.metadata.duration && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{formatDuration(session.metadata.duration)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Messages</p>
                    <p className="font-medium">{session.metadata.messageCount}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <Button onClick={handleDownloadTranscript}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Transcript
                </Button>
                {session.recordingUrl && (
                  <Button variant="outline" asChild>
                    <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer">
                      <Play className="w-4 h-4 mr-2" />
                      Play Recording
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                Full conversation transcript from the session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {session.transcript
                    .filter(msg => msg.isFinal)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            msg.role === 'user'
                              ? 'bg-accent text-white'
                              : 'bg-white/10 text-foreground'
                          }`}
                        >
                          <p className="text-xs font-semibold mb-2">
                            {msg.role === 'agent' ? 'Tara' : 'Employee'}
                          </p>
                          <p className="text-sm">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HistoryDetail;
