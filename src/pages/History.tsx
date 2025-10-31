import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/config';
import { toast } from 'sonner';

interface Session {
  callId: string;
  employeeName: string;
  managerName: string;
  startedAt: number;
  endedAt: number;
  duration: number;
}

const History = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen">
      <header className="p-6 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="Company Logo"
              className="w-100 h-10 mr-3 object-contain"
            />
            <h1 className="logo-text text-3xl font-bold">Performance Review History</h1>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-2xl">
              <p className="text-muted-foreground mb-4">No sessions found</p>
              <Button onClick={() => navigate('/')}>
                Start Your First Review
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => (
                <Card
                  key={session.callId}
                  className="glass-card cursor-pointer hover:scale-105 transition-transform duration-300"
                  onClick={() => navigate(`/history/${session.callId}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Performance Evaluation
                    </CardTitle>
                    <CardDescription className="text-base font-semibold">
                      of {session.employeeName || 'Unknown Employee'} with{' '}
                      {session.managerName || 'Unknown Manager'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(session.startedAt)}
                      </div>
                      {session.duration && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {formatDuration(session.duration)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
