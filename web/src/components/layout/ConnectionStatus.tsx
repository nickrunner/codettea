import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { wsClient } from '@/api/websocket';
import { Badge } from '@/components/ui/badge';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = React.useState(wsClient.isConnected);

  React.useEffect(() => {
    const checkConnection = () => {
      setIsConnected(wsClient.isConnected);
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Badge
      variant={isConnected ? 'success' : 'destructive'}
      className="gap-1"
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          Connected
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Disconnected
        </>
      )}
    </Badge>
  );
}